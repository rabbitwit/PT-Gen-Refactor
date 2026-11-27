import {Hono} from 'hono'
import type {AppEnv, SearchData, TitleData} from '../types'
import {getHttpClient} from '../lib/http'
import {sendSuccess} from '../lib/response'
import {ApiError} from '../lib/errors'
import {normalizeImdbId} from '../lib/ids'
import {TtlCache} from '../lib/cache'
import {buildVariantKeys, createCacheStore, readThrough} from '../lib/persistent-cache'
import {loadStaticDatabase} from '../lib/static-database'
import {fetchTitle, searchTitles, type DataChannel} from '../imdb/service'
import type {SearchFilter} from '../imdb/graphql'
import {attachFormat, ensureFormat} from '../format'

/**
 * 详情缓存的条目就是裸数据（不含来源通道）。
 *
 * `/api/imdb/:id` 与统一入口 `/api/v1/imdb/:id` 把同样的数据写进同一组键，
 * 两条路径必须保持完全一致的形状才能互相复用；旧版 R2 / D1 里存的也是裸数据。
 */
type TitleCacheValue = TitleData & { format: string }

interface SearchCacheEntry {
    data: SearchData
    source: DataChannel
}

/** 缓存实例按 TTL 区分，避免配置变更后继续用旧 TTL */
const titleCaches = new Map<number, TtlCache<TitleCacheValue>>()
const searchCaches = new Map<number, TtlCache<SearchCacheEntry>>()

function titleCache(ttl: number): TtlCache<TitleCacheValue> {
    let cache = titleCaches.get(ttl)
    if (!cache) {
        cache = new TtlCache<TitleCacheValue>(ttl * 1000)
        titleCaches.set(ttl, cache)
    }
    return cache
}

function searchCache(ttl: number): TtlCache<SearchCacheEntry> {
    let cache = searchCaches.get(ttl)
    if (!cache) {
        cache = new TtlCache<SearchCacheEntry>(ttl * 1000)
        searchCaches.set(ttl, cache)
    }
    return cache
}

/**
 * 搜索支持的类型白名单（与 IMDb 上游 mainSearch 一致）。
 * 接受常见别名（movie/tv/series/episode/game...），统一映射为大写上游值。
 * 上游对该参数只接受内联枚举字面量，因此这里必须收紧为固定集合。
 */
const SEARCH_TYPES: Record<string, string> = {
    movie: 'MOVIE',
    movies: 'MOVIE',
    film: 'MOVIE',
    tv: 'TV',
    series: 'TV',
    tvseries: 'TV',
    episode: 'TV_EPISODE',
    tvepisode: 'TV_EPISODE',
    game: 'VIDEO_GAME',
    videogame: 'VIDEO_GAME',
    musicvideo: 'MUSIC_VIDEO',
    podcast: 'PODCAST_SERIES',
    podcastseries: 'PODCAST_SERIES',
    podcastepisode: 'PODCAST_EPISODE',
}

const SEARCH_TYPE_VALUES = [...new Set(Object.values(SEARCH_TYPES))]

/** 解析 ?type=（逗号分隔，可多值）；非法值直接 400，避免静默吞掉过滤条件 */
function parseSearchTypes(raw: string | undefined): string[] | undefined {
    const value = raw?.trim()
    if (!value) return undefined

    const types: string[] = []
    for (const part of value.split(',')) {
        const key = part.trim().toLowerCase()
        if (!key) continue
        const mapped = SEARCH_TYPES[key]
        if (!mapped) {
            throw ApiError.badRequest(
                `未知的类型 "${part.trim()}"，可选值：${SEARCH_TYPE_VALUES.join(' / ')}`,
                {example: 'type=movie 或 type=tv,tv_episode'},
            )
        }
        if (!types.includes(mapped)) types.push(mapped)
    }

    return types.length > 0 ? types : undefined
}

/** 年份范围 → ISO 日期（yyyy-01-01 / yyyy-12-31）；非法年份 400 */
function parseSearchYear(raw: string | undefined, mode: 'start' | 'end'): string | undefined {
    const value = raw?.trim()
    if (!value) return undefined

    const year = Number.parseInt(value, 10)
    if (!Number.isFinite(year) || year < 1874 || year > 2100) {
        throw ApiError.badRequest(`年份 "${value}" 非法，应在 1874-2100 之间`)
    }
    return mode === 'start' ? `${year}-01-01` : `${year}-12-31`
}

const imdb = new Hono<AppEnv>()

// 注意：/search 必须注册在 /:id 之前，否则会被 :id 参数路由吞掉
/** GET /api/imdb/search — 搜索 */
imdb.get('/search', async (c) => {
    const config = c.get('config')
    const requestId = c.get('requestId')
    const startedAt = c.get('startedAt')
    const origin = c.req.header('origin') ?? null

    const query = c.req.query('q')?.trim()
    if (!query) {
        throw ApiError.badRequest('缺少查询参数 q', {example: '/api/imdb/search?q=shawshank'})
    }
    if (query.length > 200) {
        throw ApiError.badRequest('查询词过长，最多 200 个字符')
    }

    const rawLimit = Number.parseInt(c.req.query('limit') ?? '10', 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 10

    // 可选过滤：类型 / 年份范围 / 精确匹配（对应 IMDb mainSearch 的原生参数）
    const filter: SearchFilter = {
        types: parseSearchTypes(c.req.query('type')),
        exact: c.req.query('exact') === 'true' ? true : undefined,
        startDate: parseSearchYear(c.req.query('year_from'), 'start'),
        endDate: parseSearchYear(c.req.query('year_to'), 'end'),
    }

    // 搜索结果随上游排序变动、体积也大，只进进程内缓存，不落 R2 / D1
    const cacheKey = [
        query.toLowerCase(),
        limit,
        filter.types?.join(',') ?? '',
        filter.exact ? '1' : '',
        filter.startDate ?? '',
        filter.endDate ?? '',
    ].join('::')
    const cache = searchCache(config.cacheTtlSeconds)
    const cached = cache.get(cacheKey)

    if (cached) {
        return sendSuccess(cached.data, {requestId, startedAt, cached: true, source: cached.source}, {
            cache: 'hit',
            cacheTtlSeconds: config.cacheTtlSeconds,
            rateLimit: c.get('rateLimit'),
            origin,
            varyAuthorization: Boolean(config.apiToken || config.authSecret),
        })
    }

    const client = await getHttpClient(config)
    const {data, source} = await searchTitles(client, config, query, limit, filter)

    cache.set(cacheKey, {data, source})

    return sendSuccess(data, {requestId, startedAt, cached: false, source}, {
        cache: 'miss',
        cacheTtlSeconds: config.cacheTtlSeconds,
        rateLimit: c.get('rateLimit'),
        origin,
        varyAuthorization: Boolean(config.apiToken),
    })
})

/** GET /api/imdb/:id — 影片详情 */
imdb.get('/:id', async (c) => {
    const config = c.get('config')
    const requestId = c.get('requestId')
    const startedAt = c.get('startedAt')
    const origin = c.req.header('origin') ?? null

    const imdbId = normalizeImdbId(c.req.param('id'))
    // 默认返回全量数据；显式传 full=false 才降级为精简版
    const full = c.req.query('full') !== 'false'

    // 进程内缓存键区分 full/base；持久层键由 buildVariantKeys 负责
    const memory = titleCache(config.cacheTtlSeconds)
    const memoryKey = `${imdbId}::${full ? 'full' : 'base'}`
    const keys = buildVariantKeys('imdb', imdbId, null, full)
    // 只有真正回源时才拿得到通道信息；命中缓存时如实留空
    let channel: DataChannel | undefined

    const result = await readThrough<TitleCacheValue>({
        memory,
        memoryKey,
        store: createCacheStore(c.env),
        keys,
        ttlSeconds: config.cacheTtlSeconds,
        ratingRefreshSeconds: config.ratingRefreshSeconds,
        databaseFallback: () => loadStaticDatabase<TitleCacheValue>(c.env, 'imdb', keys),
        loader: async () => {
            const client = await getHttpClient(config)
            const {data: raw, source} = await fetchTitle(client, config, imdbId, {full})
            channel = source

            return attachFormat(
                'imdb',
                raw as unknown as Record<string, unknown>,
            ) as unknown as TitleCacheValue
        },
    })

    // 旧版缓存条目没有 format，命中时补算，保证两种入口形状一致
    const value = ensureFormat('imdb', result.value as unknown as Record<string, unknown>) as unknown as TitleCacheValue

    return sendSuccess(value, {requestId, startedAt, cached: result.layer !== undefined, source: channel}, {
        cache: result.layer ? 'hit' : 'miss',
        cacheTtlSeconds: config.cacheTtlSeconds,
        rateLimit: c.get('rateLimit'),
        origin,
        varyAuthorization: Boolean(config.apiToken),
    })
})

export {imdb}
