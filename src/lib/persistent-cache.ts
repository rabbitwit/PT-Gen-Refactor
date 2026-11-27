import type {
    Bindings,
    CacheKeys,
    CacheStore,
    FsCacheBackend,
    ObjectStoreLike,
    VercelBlobStore,
} from '../types'
import type {TtlCache} from './cache'
import {readEnv} from './env'
import {fetchWithTimeout} from './timeout'

/**
 * 持久化缓存。
 *
 * 进程内 `TtlCache` 在 Serverless / Workers / 多实例部署下命中率很低：
 * 每个实例、每次冷启动都是全新的内存，请求基本都会回源。因此把同样的
 * 数据再落一份到平台存储，键格式与旧 Worker 版本保持一致：
 *
 *   对象键: `douban/1292052.json`、`tmdb/movie/27205.json`
 *   D1:     `douban_1292052`、`tmdb_movie_27205`
 *
 * 各运行时用各自的免费存储：
 *
 * - Cloudflare Workers：R2 / D1 绑定
 * - Vercel：Blob（`BLOB_READ_WRITE_TOKEN`，关联 Blob Store 后自动注入）
 * - EdgeOne：`@edgeone/pages-blob`（`getStore('pt-gen-cache')`，不用 KV）
 * - Node / Bun：工作目录下的 `data/cache`（可用 `CACHE_DIR` 覆盖）
 *
 * `ENABLED_CACHE=false` 时整套逻辑退回进程内缓存。
 *
 * 与旧实现的两点区别：
 *
 * - 写入带 `ts` 信封，读取时按 TTL 判断是否过期；旧实现只写了
 *   `timestamp` 列却从不校验，条目永不过期。
 * - 所有读写异常都在内部吞掉。缓存只是加速手段，存储故障不能让
 *   `/api/*` 整体 500。
 */

/** D1 单行上限约 1 MB（键 + 值 + 开销），留出余量 */
const D1_MAX_VALUE_BYTES = 900_000

/** 信封版本，便于以后调整落盘格式时兼容旧数据 */
const ENVELOPE_VERSION = 1

const encoder = new TextEncoder()

const EO_BINDING_KEYS = ['BLOB', 'EO_BLOB', 'EO_BUCKET', 'BUCKET', 'COS', 'STORAGE'] as const

const VERCEL_BLOB_API = 'https://vercel.com/api/blob'
/** 与官方 `@vercel/blob` 当前协议版本对齐，过旧会被服务端拒绝 */
const VERCEL_BLOB_API_VERSION = '13'
const PERSIST_TIMEOUT_MS = 8_000

/** 落盘格式：带上写入时间，读出来时才能判断是否过期 */
interface CacheEnvelope<T> {
    v: number
    ts: number
    data: T
}

export type CacheLayer = 'memory' | 'r2' | 'd1' | 'blob' | 'eo' | 'fs' | 'database'

export type PersistentCacheLayer = Exclude<CacheLayer, 'memory' | 'database'>

export interface CacheHit<T> {
    value: T
    layer: PersistentCacheLayer
    /** 信封里的写入时间；旧版裸数据没有该字段 */
    cachedAt?: number
}

function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

/** 只匹配评分字段（如 `douban_rating`、`imdb_rating_average`、`rating`、`score`），忽略票数 */
const RATING_KEY_RE = /^(?:[a-z0-9]+_)*(?:rating|score)(?:_average)?$/i

/**
 * 提取数据里的评分快照，用于比对缓存与回源结果。
 * 只比较评分本身：`8.5 / 10 from 120 users` 与 `8.5 / 10 from 999 users`
 * 视为同一评分，避免票数增长也触发一次缓存重写。
 */
export function ratingSignature(value: unknown): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
    const record = value as Record<string, unknown>
    const source =
        record.data && typeof record.data === 'object' && !Array.isArray(record.data)
            ? {...(record.data as Record<string, unknown>), ...record}
            : record

    const parts: string[] = []
    for (const key of Object.keys(source).sort()) {
        if (!RATING_KEY_RE.test(key)) continue
        const raw = source[key]
        if (raw === undefined || raw === null) continue
        parts.push(`${key}=${normalizeRating(raw)}`)
    }
    return parts.join('&')
}

/** 评分统一成数字字符串；带票数的文本只取前面的分值 */
function normalizeRating(raw: unknown): string {
    if (typeof raw === 'number') return Number.isFinite(raw) ? String(raw) : ''
    const text = String(raw).trim()
    const match = text.match(/-?\d+(?:\.\d+)?/)
    return match ? match[0] : text
}

const OBJECT_KEY_SUFFIX = '.json'

function withObjectSuffix(key: string): string {
    return key.endsWith(OBJECT_KEY_SUFFIX) ? key : `${key}${OBJECT_KEY_SUFFIX}`
}

function withoutObjectSuffix(key: string): string | undefined {
    if (!key.endsWith(OBJECT_KEY_SUFFIX)) return undefined
    const bare = key.slice(0, -OBJECT_KEY_SUFFIX.length)
    return bare || undefined
}

/**
 * 生成同一份数据在对象存储与 D1 里的两种键。
 *
 * 对象键带 `.json`（R2 / Vercel Blob / EdgeOne Blob / 本地目录都靠扩展名识别类型）。
 * D1 是表主键，不加文件后缀。读取对象层时会回退无后缀的旧键，避免打空已有缓存。
 *
 * TMDb / Trakt 的数字 ID 在 movie 与 tv 下会重复，必须带 `subType` 区分。
 */
export function buildCacheKeys(source: string, resourceId: string, subType?: string | null): CacheKeys {
    if (!source) return {r2: withObjectSuffix(resourceId), d1: resourceId}
    if (subType) {
        return {
            r2: withObjectSuffix(`${source}/${subType}/${resourceId}`),
            d1: `${source}_${subType}_${resourceId}`,
        }
    }
    return {r2: withObjectSuffix(`${source}/${resourceId}`), d1: `${source}_${resourceId}`}
}

/**
 * 详情接口的键。
 *
 * `full` 与精简版必须分开存，否则先请求精简版会污染后续的全量请求。
 * `full=true` 时不加 `_base` 变体，对象键仍带 `.json`。
 */
export function buildVariantKeys(
    source: string,
    resourceId: string,
    subType?: string | null,
    full = true,
): CacheKeys {
    const variant = [subType?.trim() || null, full ? null : 'base'].filter(Boolean).join('_')
    return buildCacheKeys(source, resourceId, variant || null)
}

let registeredFs: FsCacheBackend | undefined
let registeredEo: ObjectStoreLike | undefined

/** 由 Node / Bun 入口注册本地目录缓存，Workers 构建图不会碰到 `node:fs` */
export function registerFsCacheBackend(backend: FsCacheBackend | undefined): void {
    registeredFs = backend
}

/** 由 EdgeOne 入口补注册运行时 Blob（`context.env` 没有绑定时的兜底） */
export function registerEoCacheStore(store: ObjectStoreLike | undefined): void {
    registeredEo = store
}

function asObjectStore(value: unknown): ObjectStoreLike | undefined {
    if (!value || typeof value !== 'object') return undefined
    const candidate = value as { get?: unknown; put?: unknown; prepare?: unknown }
    // D1 也是对象，但它靠 prepare()，不能当成对象存储
    if (typeof candidate.prepare === 'function') return undefined
    if (typeof candidate.get !== 'function' || typeof candidate.put !== 'function') return undefined
    return candidate as ObjectStoreLike
}

function pickFromRecord(record: Record<string, unknown> | undefined): ObjectStoreLike | undefined {
    if (!record) return undefined
    for (const name of EO_BINDING_KEYS) {
        const found = asObjectStore(record[name])
        if (found) return found
    }
    const nested = record.eo
    if (nested && typeof nested === 'object') {
        const child = nested as Record<string, unknown>
        for (const name of EO_BINDING_KEYS) {
            const found = asObjectStore(child[name])
            if (found) return found
        }
        return asObjectStore(child.blob) ?? asObjectStore(child.bucket)
    }
    return undefined
}

function pickEoStore(env: Bindings | undefined): ObjectStoreLike | undefined {
    const fromEnv = pickFromRecord(env as unknown as Record<string, unknown> | undefined)
    if (fromEnv) return fromEnv
    return pickFromRecord(globalThis as unknown as Record<string, unknown>) ?? registeredEo
}

function normalizeBlobStoreId(value: string | undefined): string | undefined {
    const trimmed = value?.trim()
    if (!trimmed) return undefined
    return trimmed.startsWith('store_') ? trimmed.slice('store_'.length) : trimmed
}

function parseStoreIdFromReadWriteToken(token: string): string | undefined {
    const parts = token.trim().split('_')
    // vercel_blob_rw_<storeId>_<secret>
    return parts[0] === 'vercel' && parts[1] === 'blob' && parts[2] === 'rw'
        ? normalizeBlobStoreId(parts[3])
        : undefined
}

function resolveBlobAccess(env: Bindings | undefined): 'public' | 'private' {
    const raw = readEnv(env, 'BLOB_ACCESS')?.toLowerCase()
    return raw === 'public' ? 'public' : 'private'
}

function resolveVercelBlobStore(env: Bindings | undefined): VercelBlobStore | undefined {
    const access = resolveBlobAccess(env)
    const rwToken = readEnv(env, 'BLOB_READ_WRITE_TOKEN') ?? readEnv(env, 'VERCEL_BLOB_READ_WRITE_TOKEN')
    const storeIdFromEnv = normalizeBlobStoreId(readEnv(env, 'BLOB_STORE_ID'))
    if (rwToken) {
        return {
            token: rwToken,
            storeId: parseStoreIdFromReadWriteToken(rwToken) ?? storeIdFromEnv,
            access,
        }
    }

    // 控制台「连接 Blob」的新项目往往只注入 OIDC + BLOB_STORE_ID，没有读写令牌
    const oidc = readEnv(env, 'VERCEL_OIDC_TOKEN')
    if (oidc && storeIdFromEnv) {
        return {token: oidc, storeId: storeIdFromEnv, access}
    }

    return undefined
}

/**
 * 从平台绑定 / 环境变量中取出各层句柄。
 *
 * `ENABLED_CACHE=false` 时整体关闭持久层（进程内缓存仍然生效）。
 */
export function createCacheStore(env: Bindings | undefined): CacheStore {
    const flag = readEnv(env, 'ENABLED_CACHE')?.toLowerCase()
    return {
        enabled: flag !== 'false',
        r2: env?.R2_BUCKET,
        d1: env?.DB,
        blob: resolveVercelBlobStore(env),
        eo: pickEoStore(env),
        fs: registeredFs,
    }
}

/** 是否至少有一层持久化存储可用；否则整套逻辑退回进程内缓存 */
export function hasPersistentCache(store: CacheStore | undefined): boolean {
    return Boolean(store?.enabled && (store.r2 || store.d1 || store.blob || store.eo || store.fs))
}

/** 列出已绑定的持久层，供 /health 与文档页展示 */
export function describeCacheStore(store: CacheStore | undefined): PersistentCacheLayer[] {
    if (!store?.enabled) return []
    const layers: PersistentCacheLayer[] = []
    if (store.r2) layers.push('r2')
    if (store.d1) layers.push('d1')
    if (store.blob) layers.push('blob')
    if (store.eo) layers.push('eo')
    if (store.fs) layers.push('fs')
    return layers
}

function encode(value: unknown): string {
    const envelope: CacheEnvelope<unknown> = {
        v: ENVELOPE_VERSION,
        ts: Date.now(),
        data: value,
    }
    return JSON.stringify(envelope)
}

/**
 * 解析落盘数据并判断是否超过 `ttlSeconds`。
 *
 * 旧版本写入的是裸数据（没有信封），这里兼容读取：没有时间戳时
 * 一律视为有效，等下一次写入自然覆盖成新格式。
 */
function decode<T>(text: string, ttlSeconds?: number): { value: T; cachedAt?: number } | undefined {
    let parsed: unknown
    try {
        parsed = JSON.parse(text)
    } catch {
        return undefined
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined

    const candidate = parsed as { v?: unknown; ts?: unknown; data?: unknown }
    const wrapped =
        candidate.v === ENVELOPE_VERSION && typeof candidate.ts === 'number' && 'data' in candidate

    if (wrapped && ttlSeconds !== undefined) {
        const ageSeconds = (Date.now() - (candidate.ts as number)) / 1000
        if (ageSeconds > ttlSeconds) return undefined
    }

    return {
        value: (wrapped ? candidate.data : parsed) as T,
        cachedAt: wrapped ? (candidate.ts as number) : undefined,
    }
}

function blobObjectUrl(storeId: string, key: string, access: 'public' | 'private'): string {
    const path = key.split('/').filter(Boolean).map(encodeURIComponent).join('/')
    return `https://${storeId}.${access}.blob.vercel-storage.com/${path}`
}

function vercelBlobAuthHeaders(blob: VercelBlobStore): Record<string, string> {
    const headers: Record<string, string> = {
        authorization: `Bearer ${blob.token}`,
        'x-api-version': VERCEL_BLOB_API_VERSION,
    }
    if (blob.storeId) headers['x-vercel-blob-store-id'] = blob.storeId
    return headers
}

async function blobErrorDetail(response: Response): Promise<string> {
    const text = await response.text().catch(() => '')
    return text ? `${response.status}: ${text.slice(0, 300)}` : String(response.status)
}

async function readFirstObjectKey(
    key: string,
    read: (candidate: string) => Promise<string | undefined>,
): Promise<string | undefined> {
    const hit = await read(key)
    if (hit) return hit
    const legacy = withoutObjectSuffix(key)
    if (!legacy) return undefined
    return read(legacy)
}

async function readR2(store: CacheStore, key: string): Promise<string | undefined> {
    if (!store.r2) return undefined
    return readFirstObjectKey(key, async (candidate) => {
        try {
            const object = await store.r2!.get(candidate)
            if (!object) return undefined

            const text = await object.text()
            if (!text) return undefined

            console.info(`[Cache Hit] R2 for: ${candidate}`)
            return text
        } catch (error) {
            console.warn(`[Cache] R2 read failed for ${candidate}:`, describe(error))
            return undefined
        }
    })
}

async function readD1(store: CacheStore, key: string): Promise<string | undefined> {
    if (!store.d1) return undefined
    try {
        const row = await store.d1
            .prepare('SELECT data FROM cache WHERE key = ?')
            .bind(key)
            .first<{ data?: string }>()
        if (!row?.data) return undefined

        console.info(`[Cache Hit] D1 for: ${key}`)
        return row.data
    } catch (error) {
        console.warn(`[Cache] D1 read failed for ${key}:`, describe(error))
        return undefined
    }
}

async function readBlobViaHead(blob: VercelBlobStore, key: string): Promise<string | undefined> {
    const headUrl = `${VERCEL_BLOB_API}?url=${encodeURIComponent(key)}`
    const head = await fetchWithTimeout(headUrl, {
        method: 'GET',
        headers: vercelBlobAuthHeaders(blob),
    })
    if (head.status === 404) return undefined
    if (!head.ok) throw new Error(`blob head ${await blobErrorDetail(head)}`)
    const meta = (await head.json()) as { url?: string; downloadUrl?: string }
    const blobUrl = meta.downloadUrl || meta.url
    if (!blobUrl) return undefined
    const body = await fetchWithTimeout(blobUrl, {
        headers: vercelBlobAuthHeaders(blob),
    })
    if (body.status === 404) return undefined
    if (!body.ok) throw new Error(`blob get ${await blobErrorDetail(body)}`)
    const text = await body.text()
    return text || undefined
}

async function readBlob(store: CacheStore, key: string): Promise<string | undefined> {
    if (!store.blob) return undefined
    const blob = store.blob
    return readFirstObjectKey(key, async (candidate) => {
        try {
            if (blob.storeId) {
                const direct = await fetchWithTimeout(blobObjectUrl(blob.storeId, candidate, blob.access), {
                    headers: vercelBlobAuthHeaders(blob),
                })
                if (direct.ok) {
                    const text = await direct.text()
                    if (text) {
                        console.info(`[Cache Hit] Blob for: ${candidate}`)
                        return text
                    }
                }
                if (direct.status !== 404 && direct.status !== 403 && direct.status !== 401) {
                    throw new Error(`blob get ${await blobErrorDetail(direct)}`)
                }
            }

            const viaHead = await readBlobViaHead(blob, candidate)
            if (viaHead) {
                console.info(`[Cache Hit] Blob for: ${candidate}`)
                return viaHead
            }
            return undefined
        } catch (error) {
            console.warn(`[Cache] Blob read failed for ${candidate}:`, describe(error))
            return undefined
        }
    })
}

async function unwrapObjectValue(raw: unknown): Promise<string | undefined> {
    if (raw == null) return undefined
    if (typeof raw === 'string') return raw || undefined
    if (raw instanceof Uint8Array) {
        return raw.byteLength > 0 ? new TextDecoder().decode(raw) : undefined
    }
    if (typeof Response !== 'undefined' && raw instanceof Response) {
        if (raw.status === 404) return undefined
        const text = await raw.text()
        return text || undefined
    }
    if (typeof raw === 'object') {
        const object = raw as {
            text?: () => Promise<string>;
            body?: unknown;
            value?: unknown;
            arrayBuffer?: () => Promise<ArrayBuffer>
        }
        if (typeof object.text === 'function') {
            const text = await object.text()
            return text || undefined
        }
        if (typeof object.body === 'string') return object.body || undefined
        if (typeof object.value === 'string') return object.value || undefined
        if (typeof object.arrayBuffer === 'function') {
            const buffer = await object.arrayBuffer()
            return buffer.byteLength > 0 ? new TextDecoder().decode(buffer) : undefined
        }
    }
    return undefined
}

async function readEo(store: CacheStore, key: string): Promise<string | undefined> {
    if (!store.eo) return undefined
    return readFirstObjectKey(key, async (candidate) => {
        try {
            const text = await unwrapObjectValue(await store.eo!.get(candidate))
            if (!text) return undefined
            console.info(`[Cache Hit] EO Blob for: ${candidate}`)
            return text
        } catch (error) {
            console.warn(`[Cache] EO read failed for ${candidate}:`, describe(error))
            return undefined
        }
    })
}

async function readFs(store: CacheStore, key: string): Promise<string | undefined> {
    if (!store.fs) return undefined
    return readFirstObjectKey(key, async (candidate) => {
        try {
            const text = await store.fs!.read(candidate)
            if (!text) return undefined
            console.info(`[Cache Hit] FS for: ${candidate}`)
            return text
        } catch (error) {
            console.warn(`[Cache] FS read failed for ${candidate}:`, describe(error))
            return undefined
        }
    })
}

/** 读持久化缓存：R2 → D1 → Blob → EdgeOne → 本地目录；任一层异常都视为未命中 */
export async function readCache<T>(
    store: CacheStore | undefined,
    keys: CacheKeys,
    ttlSeconds?: number,
): Promise<CacheHit<T> | undefined> {
    if (!store || !hasPersistentCache(store)) return undefined

    const layers: Array<{ name: PersistentCacheLayer; read: () => Promise<string | undefined> }> = [
        {name: 'r2', read: () => readR2(store, keys.r2)},
        {name: 'd1', read: () => readD1(store, keys.d1)},
        {name: 'blob', read: () => readBlob(store, keys.r2)},
        {name: 'eo', read: () => readEo(store, keys.r2)},
        {name: 'fs', read: () => readFs(store, keys.r2)},
    ]

    for (const layer of layers) {
        const text = await layer.read()
        if (!text) continue
        const decoded = decode<T>(text, ttlSeconds)
        if (decoded) return {...decoded, layer: layer.name}
    }

    return undefined
}

async function writeR2(store: CacheStore, key: string, json: string): Promise<void> {
    if (!store.r2) return
    try {
        await store.r2.put(key, json, {
            httpMetadata: {contentType: 'application/json'},
        })
        console.info(`[Cache Write] R2 for: ${key}`)
    } catch (error) {
        console.warn(`[Cache] R2 write failed for ${key}:`, describe(error))
    }
}

async function writeD1(store: CacheStore, key: string, json: string): Promise<void> {
    if (!store.d1) return

    if (encoder.encode(json).length > D1_MAX_VALUE_BYTES) {
        console.warn(`[Cache] Skip D1 write for ${key}: value exceeds 900 KB`)
        return
    }

    try {
        await store.d1
            .prepare('INSERT OR REPLACE INTO cache (key, data, timestamp) VALUES (?, ?, ?)')
            .bind(key, json, Date.now())
            .run()
        console.info(`[Cache Write] D1 for: ${key}`)
    } catch (error) {
        console.warn(`[Cache] D1 write failed for ${key}:`, describe(error))
    }
}

async function writeBlob(store: CacheStore, key: string, json: string): Promise<void> {
    if (!store.blob) return
    try {
        const url = `${VERCEL_BLOB_API}?pathname=${encodeURIComponent(key)}`
        const response = await fetchWithTimeout(url, {
            method: 'PUT',
            headers: {
                ...vercelBlobAuthHeaders(store.blob),
                'x-vercel-blob-access': store.blob.access,
                'x-content-type': 'application/json',
                'x-add-random-suffix': '0',
                'x-allow-overwrite': '1',
            },
            body: json,
        })
        if (!response.ok) throw new Error(`blob put ${await blobErrorDetail(response)}`)
        console.info(`[Cache Write] Blob for: ${key}`)
    } catch (error) {
        console.warn(`[Cache] Blob write failed for ${key}:`, describe(error))
    }
}

async function writeEo(store: CacheStore, key: string, json: string): Promise<void> {
    if (!store.eo) return
    try {
        await store.eo.put(key, json, {contentType: 'application/json'})
        console.info(`[Cache Write] EO Blob for: ${key}`)
    } catch (error) {
        console.warn(`[Cache] EO write failed for ${key}:`, describe(error))
    }
}

async function writeFs(store: CacheStore, key: string, json: string): Promise<void> {
    if (!store.fs) return
    try {
        await store.fs.write(key, json)
        console.info(`[Cache Write] FS for: ${key}`)
    } catch (error) {
        console.warn(`[Cache] FS write failed for ${key}:`, describe(error))
    }
}

/**
 * 并行写所有已配置的持久层；任一层失败都只记日志，不影响响应。
 *
 * 调用方通常应当 `await`：Workers 在响应返回后可能立刻回收 isolate，
 * 未 await 的写入经常丢失。
 */
export async function writeCache(
    store: CacheStore | undefined,
    keys: CacheKeys,
    value: unknown,
): Promise<void> {
    if (!store?.enabled || value === undefined || value === null) return

    let json: string
    try {
        json = encode(value)
    } catch (error) {
        console.warn('[Cache] serialize failed:', describe(error))
        return
    }

    await Promise.all([
        writeR2(store, keys.r2, json),
        writeD1(store, keys.d1, json),
        writeBlob(store, keys.r2, json),
        writeEo(store, keys.r2, json),
        writeFs(store, keys.r2, json),
    ])
}

export interface ReadThroughOptions<T> {
    /** 进程内缓存实例；不需要时留空 */
    memory?: TtlCache<T>
    /** 进程内缓存键 */
    memoryKey: string
    /** 持久化存储句柄；未绑定时留空 */
    store?: CacheStore
    /** 持久化键；留空表示跳过持久层 */
    keys?: CacheKeys
    /** 持久化条目的存活时间（秒） */
    ttlSeconds?: number
    /**
     * 评分比对间隔（秒）。命中缓存后，距离上次写入/比对超过该间隔时回源一次：
     * 评分有变化就重写持久层，并把新条目返回给格式化。0 或未设置表示关闭。
     */
    ratingRefreshSeconds?: number
    /**
     * 持久层未命中时的静态数据库回退（PT-Gen-Database）。
     * 返回 `undefined` 表示静态库里也没有，再回源上游。
     */
    databaseFallback?: () => Promise<T | undefined>
    /** 回源实现 */
    loader: () => Promise<T>
}

/** 同一 key 的评分比对只跑一次，避免并发请求同时回源 */
const ratingRevalidations = new Map<string, Promise<{ value: unknown; layer?: CacheLayer }>>()
/** key → 上一次评分比对时间（毫秒） */
const lastRatingCheck = new Map<string, number>()

/**
 * 多层 read-through：进程内 TTL → 持久层 → 回源。
 *
 * - 进程内命中直接返回；
 * - 持久层命中会回填进程内，同一实例后续请求走最快那层；
 * - 回源结果写入进程内，并（若配置了持久层）写回各存储。
 * - 配置 `ratingRefreshSeconds` 后，命中缓存但距上次检查已超时的条目会回源
 *   比对评分；有变化则重写缓存并返回新条目，失败时继续返回旧缓存。
 *
 * 返回值里的 `layer` 表示命中的层；`undefined` 表示真正回源了。
 */
export async function readThrough<T>(
    options: ReadThroughOptions<T>,
): Promise<{ value: T; layer?: CacheLayer }> {
    const {memory, memoryKey, store, keys, ttlSeconds, ratingRefreshSeconds = 0, databaseFallback, loader} = options
    const intervalMs = Math.max(0, ratingRefreshSeconds) * 1000
    const canRefresh = intervalMs > 0
    const revalidationKey = `${memoryKey}\u0000${keys?.r2 ?? ''}\u0000${keys?.d1 ?? ''}`

    const isDue = (checkedAt: number | undefined): boolean =>
        canRefresh && (checkedAt === undefined || Date.now() - checkedAt >= intervalMs)

    const isFailed = (value: T): boolean =>
        Boolean(value && typeof value === 'object' && (value as { success?: unknown }).success === false)

    const revalidate = async (
        cached: T,
        layer?: CacheLayer,
        checkedAt?: number,
    ): Promise<{ value: T; layer?: CacheLayer }> => {
        if (!isDue(checkedAt)) return {value: cached, layer}

        const pending = ratingRevalidations.get(revalidationKey)
        if (pending) return pending as Promise<{ value: T; layer?: CacheLayer }>

        const task = (async () => {
            try {
                const fresh = await loader()
                memory?.set(memoryKey, fresh)
                lastRatingCheck.set(revalidationKey, Date.now())

                const failed = isFailed(fresh)
                // 回源明确失败时保留旧缓存，别让错误对象覆盖可用数据
                if (failed) return {value: cached, layer}

                const changed = ratingSignature(fresh) !== ratingSignature(cached)
                // 评分没变就不重写缓存，避免无意义的持久层写入
                if (changed && keys && hasPersistentCache(store)) {
                    await writeCache(store, keys, fresh)
                    console.info(`[Cache Rating] updated ${keys.r2 || keys.d1}`)
                }
                return {value: fresh, layer}
            } catch (error) {
                // 回源失败不影响本次请求，继续用旧缓存；等下一个间隔再试
                lastRatingCheck.set(revalidationKey, Date.now())
                console.warn(
                    `[Cache Rating] refresh failed for ${keys?.r2 ?? memoryKey}:`,
                    describe(error),
                )
                return {value: cached, layer}
            } finally {
                ratingRevalidations.delete(revalidationKey)
            }
        })()

        ratingRevalidations.set(
            revalidationKey,
            task as Promise<{ value: unknown; layer?: CacheLayer }>,
        )
        return task
    }

    const memoryHit = memory?.get(memoryKey)
    if (memoryHit !== undefined) {
        const checkedAt = lastRatingCheck.get(revalidationKey)
        if (!isDue(checkedAt)) return {value: memoryHit, layer: 'memory'}
        return revalidate(memoryHit, 'memory', checkedAt)
    }

    if (keys) {
        const hit = await readCache<T>(store, keys, ttlSeconds)
        if (hit) {
            memory?.set(memoryKey, hit.value)
            const checkedAt = lastRatingCheck.get(revalidationKey) ?? hit.cachedAt ?? Date.now()
            lastRatingCheck.set(revalidationKey, checkedAt)
            if (!isDue(checkedAt)) return {value: hit.value, layer: hit.layer}
            return revalidate(hit.value, hit.layer, checkedAt)
        }
    }

    let value: T | undefined
    let layer: CacheLayer | undefined
    if (databaseFallback) {
        value = await databaseFallback()
        if (value !== undefined) layer = 'database'
    }
    if (value === undefined) value = await loader()

    memory?.set(memoryKey, value)
    lastRatingCheck.set(revalidationKey, Date.now())

    // 上游明确回报失败时不落盘：否则一条错误结果会在整个 TTL 内持续命中，
    // 数据恢复后仍然拿不到新内容（旧版 _withCache 也是这么做的）。
    if (keys && !isFailed(value)) await writeCache(store, keys, value)

    return {value, layer}
}
