import {Hono} from 'hono'
import type {Context} from 'hono'
import type {AppConfig, AppEnv, ProviderSite, UnifiedSearchData, UnifiedSearchItem} from '../types'
import {ApiError} from '../lib/errors'
import {getHttpClient} from '../lib/http'
import {sendSuccess} from '../lib/response'
import {TtlCache} from '../lib/cache'
import {searchBangumi} from '../providers/bangumi'
import {searchSteam} from '../providers/steam'
import {searchTmdb} from '../providers/tmdb'
import {searchTrakt} from '../providers/trakt'
import {sendProviderDetail} from './get-data'

const caches = new Map<string, TtlCache<unknown>>()

function cacheFor<T>(kind: string, ttl: number): TtlCache<T> {
    const key = `${kind}:${ttl}`
    let cache = caches.get(key) as TtlCache<T> | undefined
    if (!cache) {
        cache = new TtlCache<T>(ttl * 1000)
        caches.set(key, cache)
    }
    return cache
}

async function handleSearch(
    c: Context<AppEnv>,
    site: ProviderSite,
    search: (client: Awaited<ReturnType<typeof getHttpClient>>, config: AppConfig, query: string, limit: number) => Promise<UnifiedSearchItem[]>,
    variant: string | null = null,
): Promise<Response> {
    const config = c.get('config')
    const requestId = c.get('requestId')
    const startedAt = c.get('startedAt')
    const origin = c.req.header('origin') ?? null
    const query = c.req.query('q')?.trim()
    if (!query) throw new ApiError('BAD_REQUEST', '缺少查询参数 q')
    const rawLimit = Number.parseInt(c.req.query('limit') ?? '10', 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 10

    // limit / variant 都参与键，避免不同查询参数互相覆盖。
    // 关键词搜索只进进程内缓存：结果随上游排序变动，任意查询词都会在
    // R2 / D1 里堆出大量一次性键，命中率却很低。
    const memory = cacheFor<UnifiedSearchData>('search', config.cacheTtlSeconds)
    const memoryKey = `${site}:${query.toLowerCase()}:${limit}:${variant ?? ''}`
    const cached = memory.get(memoryKey)

    if (cached) {
        return sendSuccess(cached, {requestId, startedAt, cached: true, source: 'api'}, {
            cache: 'hit',
            cacheTtlSeconds: config.cacheTtlSeconds,
            rateLimit: c.get('rateLimit'),
            origin,
            varyAuthorization: Boolean(config.apiToken || config.authSecret),
        })
    }

    const client = await getHttpClient(config)
    const items = await search(client, config, query, limit)
    const data: UnifiedSearchData = {query, source: site, total: items.length, items}
    memory.set(memoryKey, data)

    return sendSuccess(data, {requestId, startedAt, cached: false, source: 'api'}, {
        cache: 'miss',
        cacheTtlSeconds: config.cacheTtlSeconds,
        rateLimit: c.get('rateLimit'),
        origin,
        varyAuthorization: Boolean(config.apiToken || config.authSecret),
    })
}

const providers = new Hono<AppEnv>()

/** 详情接口统一接受 `full=false`；不传或其它值按全量处理 */
const isFull = (c: Context<AppEnv>): boolean => c.req.query('full') !== 'false'

// ---- 搜索 ----
// ?type= 会改变搜索结果集合，必须进缓存键，否则 all 的结果会污染 book/anime 查询
providers.get('/bangumi/search', (c) =>
    handleSearch(
        c,
        'bangumi',
        (client, config, q, limit) => searchBangumi(client, config, q, limit, c.req.query('type') ?? 'all'),
        c.req.query('type') ?? 'all',
    ),
)
providers.get('/steam/search', (c) => handleSearch(c, 'steam', searchSteam))
providers.get('/tmdb/search', (c) => handleSearch(c, 'tmdb', searchTmdb))
providers.get('/trakt/search', (c) => handleSearch(c, 'trakt', searchTrakt))

// ---- 详情（历史路径，全部委托给统一入口，缓存与静态库行为完全一致）----
providers.get('/bangumi/:id', (c) => sendProviderDetail(c, 'bangumi', c.req.param('id'), null, isFull(c)))
providers.get('/steam/:id', (c) => sendProviderDetail(c, 'steam', c.req.param('id'), null, isFull(c)))
providers.get('/tmdb/:type/:id', (c) =>
    sendProviderDetail(c, 'tmdb', c.req.param('id'), c.req.param('type'), isFull(c)),
)
providers.get('/tmdb/:id', (c) => sendProviderDetail(c, 'tmdb', c.req.param('id'), 'movie', isFull(c)))
providers.get('/trakt/:type/:id', (c) =>
    sendProviderDetail(c, 'trakt', c.req.param('id'), c.req.param('type'), isFull(c)),
)
providers.get('/melon/:id', (c) => sendProviderDetail(c, 'melon', c.req.param('id'), null, isFull(c)))
providers.get('/hongguo/:id', (c) => sendProviderDetail(c, 'hongguo', c.req.param('id'), null, isFull(c)))
providers.get('/qqmusic/:id', (c) => sendProviderDetail(c, 'qq_music', c.req.param('id'), null, isFull(c)))
providers.get('/qq_music/:id', (c) => sendProviderDetail(c, 'qq_music', c.req.param('id'), null, isFull(c)))
providers.get('/qq-music/:id', (c) => sendProviderDetail(c, 'qq_music', c.req.param('id'), null, isFull(c)))
providers.get('/douban-book/:id', (c) =>
    sendProviderDetail(c, 'douban_book', c.req.param('id'), null, isFull(c)),
)
providers.get('/douban/book/:id', (c) =>
    sendProviderDetail(c, 'douban_book', c.req.param('id'), null, isFull(c)),
)

export {providers, handleSearch, cacheFor}
