import type {Context} from 'hono'
import type {AppEnv, CacheKeys, ProviderBaseData, ProviderSite} from '../types'
import {getHttpClient} from '../lib/http'
import {sendSuccess} from '../lib/response'
import {ApiError} from '../lib/errors'
import {TtlCache} from '../lib/cache'
import {buildVariantKeys, createCacheStore, readThrough} from '../lib/persistent-cache'
import {loadStaticDatabase} from '../lib/static-database'
import {attachFormat, ensureFormat} from '../format'
import {detectSource, resolveSid} from '../lib/source'
import {normalizeDetailId} from '../lib/ids'
import {normalizeSite} from '../lib/sites'
import {fetchDoubanSubject} from '../douban/subject'
import {searchDouban} from '../douban/search'
import {fetchTitle, searchTitles} from '../imdb/service'
import {fetchBangumi, searchBangumi} from '../providers/bangumi'
import {fetchSteam, searchSteam} from '../providers/steam'
import {fetchTmdb, searchTmdb} from '../providers/tmdb'
import {fetchTrakt, searchTrakt} from '../providers/trakt'
import {fetchMelon} from '../providers/melon'
import {fetchHongguo, resolveHongguoTarget} from '../providers/hongguo'
import {fetchQQMusic} from '../providers/qq-music'
import {fetchDoubanBook} from '../providers/douban-book'

type ProviderData = ProviderBaseData & { format: string }

const caches = new Map<number, TtlCache<ProviderData>>()

/** 进程内缓存按 TTL 分桶，配置变更后不会继续复用旧条目 */
function detailCache(ttlSeconds: number): TtlCache<ProviderData> {
    let cache = caches.get(ttlSeconds)
    if (!cache) {
        cache = new TtlCache<ProviderData>(ttlSeconds * 1000)
        caches.set(ttlSeconds, cache)
    }
    return cache
}

async function searchFirst(
    site: ProviderSite,
    client: Awaited<ReturnType<typeof getHttpClient>>,
    config: Parameters<typeof fetchBangumi>[1],
    query: string,
): Promise<{ sid: string; type?: string }> {
    if (site === 'douban') {
        const items = await searchDouban(client, config, query, 1)
        if (!items.items[0]) throw ApiError.notFound(`未搜索到豆瓣条目: ${query}`)
        return {sid: items.items[0].sid}
    }
    if (site === 'imdb') {
        const {data} = await searchTitles(client, config, query, 1, {})
        const item = data.items[0]
        // HTML 兜底通道可能返回没有 id 的条目，不能直接当成 sid 传给详情接口
        if (!item?.id) throw ApiError.notFound(`未搜索到 IMDb 条目: ${query}`)
        return {sid: item.id}
    }
    if (site === 'bangumi') {
        const items = await searchBangumi(client, config, query, 1)
        if (!items[0]) throw ApiError.notFound(`未搜索到 Bangumi 条目: ${query}`)
        return {sid: items[0].sid}
    }
    if (site === 'steam') {
        const items = await searchSteam(client, config, query, 1)
        if (!items[0]) throw ApiError.notFound(`未搜索到 Steam 应用: ${query}`)
        return {sid: items[0].sid}
    }
    if (site === 'tmdb') {
        const items = await searchTmdb(client, config, query, 1)
        if (!items[0]) throw ApiError.notFound(`未搜索到 TMDB 条目: ${query}`)
        const [type, sid] = items[0].sid.split(':')
        return {sid, type}
    }
    if (site === 'trakt') {
        const items = await searchTrakt(client, config, query, 1)
        if (!items[0]) throw ApiError.notFound(`未搜索到 Trakt 条目: ${query}`)
        const [type, sid] = items[0].sid.split(':')
        return {sid, type}
    }
    throw ApiError.badRequest(`数据源 ${site} 不支持关键词搜索，请直接填写 ID 或 URL`)
}

async function loadData(
    site: ProviderSite,
    sid: string,
    type: string | undefined,
    client: Awaited<ReturnType<typeof getHttpClient>>,
    config: Parameters<typeof fetchBangumi>[1],
    full: boolean,
): Promise<ProviderBaseData> {
    switch (site) {
        case 'douban':
            return (await fetchDoubanSubject(client, config, sid, {full})) as unknown as ProviderBaseData
        case 'douban_book':
            return fetchDoubanBook(client, config, sid)
        case 'imdb': {
            const {data} = await fetchTitle(client, config, sid, {full})
            return data as unknown as ProviderBaseData
        }
        case 'bangumi':
            return fetchBangumi(client, config, sid)
        case 'steam':
            return fetchSteam(client, config, sid)
        case 'tmdb':
            return fetchTmdb(client, config, type ?? 'movie', sid)
        case 'trakt':
            return fetchTrakt(client, config, type ?? 'movie', sid)
        case 'melon':
            return fetchMelon(client, config, sid)
        case 'hongguo':
            return fetchHongguo(client, config, sid)
        case 'qq_music':
            return fetchQQMusic(client, config, sid)
        default:
            throw ApiError.badRequest(`不支持的数据源: ${site}`)
    }
}

/** 子资源名：出现这些段说明请求的是子资源，而不是某个条目 */
const RESERVED_IDS = new Set(['search', 'cookie-status'])

/** 持久化缓存的键：TMDb / Trakt 的 ID 在 movie 与 tv 下会重复，必须带 type */
function persistentKeysFor(
    site: ProviderSite,
    sid: string,
    type: string | undefined,
    full: boolean,
): CacheKeys {
    if (site === 'tmdb' || site === 'trakt') {
        // full/base 只影响详情接口返回的字段量，两者都参与键以免互相污染
        return buildVariantKeys(site, sid, type ?? 'movie', full)
    }
    return buildVariantKeys(site, sid, null, full)
}

/**
 * 详情数据的唯一读取路径。
 *
 * 规范入口 `/api/v1/{provider}/{id}` 与 `/api/v1/resolve` 都调用这里；各站点的
 * 历史路径（`/api/douban/:id` 等）只是先解析参数，最终也走同一条路径，
 * 因此缓存键、持久层与静态库回退对所有入口保持一致。
 */
export async function sendProviderDetail(
    c: Context<AppEnv>,
    site: ProviderSite,
    rawId: string,
    rawType: string | undefined | null,
    full: boolean,
): Promise<Response> {
    const config = c.get('config')
    const requestId = c.get('requestId')
    const startedAt = c.get('startedAt')
    const origin = c.req.header('origin') ?? null

    // `search` / `cookie-status` 是子资源名，不能当成条目 ID 去回源
    if (RESERVED_IDS.has(rawId.trim().toLowerCase())) {
        throw ApiError.notFound(`未知资源: ${site}/${rawId.trim()}`)
    }

    const {sid, type} = normalizeDetailId(site, rawId, rawType)
    // 红果支持直接贴分享链接：缓存键用规范化后的 slug / series_id，
    // 否则同一部剧的不同分享参数会各占一条缓存（还会带出 Windows 非法文件名）
    const cacheSid = site === 'hongguo' ? resolveHongguoTarget(sid).sid : sid
    const keys = persistentKeysFor(site, cacheSid, type, full)

    const result = await readThrough<ProviderData>({
        memory: detailCache(config.cacheTtlSeconds),
        memoryKey: `${site}:${cacheSid}:${type ?? ''}:${full ? 'full' : 'base'}`,
        store: createCacheStore(c.env),
        keys,
        ttlSeconds: config.cacheTtlSeconds,
        ratingRefreshSeconds: config.ratingRefreshSeconds,
        databaseFallback: () => loadStaticDatabase(c.env, site, keys),
        loader: async () => {
            const client = await getHttpClient(config)
            return attachFormat(site, await loadData(site, sid, type, client, config, full)) as ProviderData
        },
    })

    // 旧版 R2 / D1 写入前删掉了 format，命中历史条目时补算，避免详情缺少简介文本
    const value = ensureFormat(site, result.value as Record<string, unknown>) as ProviderData

    return sendSuccess(value, {requestId, startedAt, cached: result.layer !== undefined, source: 'api'}, {
        cache: result.layer ? 'hit' : 'miss',
        cacheTtlSeconds: config.cacheTtlSeconds,
        rateLimit: c.get('rateLimit'),
        origin,
        varyAuthorization: Boolean(config.apiToken || config.authSecret),
    })
}

/**
 * 从 `url` / `id` / `q`（可配合 `source` / `type`）解析出条目并返回详情。
 *
 * `GET /api/v1/resolve` 使用：解析出站点和 ID 后交给 `sendProviderDetail`，
 * 缓存与静态库行为与规范入口完全一致。
 */
export async function resolveProviderDetail(c: Context<AppEnv>): Promise<Response> {
    const config = c.get('config')

    const urlParam = c.req.query('url')?.trim()
    const sidParam = (c.req.query('sid') ?? c.req.query('id'))?.trim()
    const queryParam = (c.req.query('q') ?? c.req.query('query'))?.trim()
    const input = urlParam || sidParam || queryParam || ''
    if (!input) {
        throw ApiError.badRequest('缺少 url / id / q 参数', {
            example: '/api/v1/resolve?url=https://movie.douban.com/subject/1292052/',
        })
    }

    let site = normalizeSite(c.req.query('source') ?? c.req.query('site'))
    let sid = ''
    let type = c.req.query('type')?.trim() || undefined

    const detected = detectSource(input)
    if (!site && detected) {
        site = detected.site
        sid = detected.sid
        type = type ?? detected.type
    }

    if (!site) {
        // 纯数字默认豆瓣；tt 开头默认 IMDb；其余报错提示明确指定 source
        if (/^tt\d{7,9}$/i.test(input)) site = 'imdb'
        else if (/^\d{4,12}$/.test(input)) site = 'douban'
        else if (detected) site = detected.site
        else {
            throw ApiError.badRequest('无法识别数据源，请通过 source 参数指定', {
                example: '/api/v1/resolve?source=imdb&id=tt0111161',
            })
        }
    }

    if (!sid && (urlParam || sidParam)) {
        const resolved = resolveSid(site, input)
        sid = resolved.sid
        type = type ?? resolved.type
    }

    // 只给了 query：先搜索再取第一条
    if (!sid && queryParam) {
        const client = await getHttpClient(config)
        const found = await searchFirst(site, client, config, queryParam)
        sid = found.sid
        type = type ?? found.type
    }

    if (!sid) throw ApiError.badRequest('缺少有效的 ID 或链接')

    return sendProviderDetail(c, site, sid, type, c.req.query('full') !== 'false')
}
