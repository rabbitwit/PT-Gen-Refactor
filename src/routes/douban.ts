import {Hono} from 'hono'
import type {AppEnv, DoubanSearchData} from '../types'
import {getHttpClient} from '../lib/http'
import {sendSuccess} from '../lib/response'
import {ApiError} from '../lib/errors'
import {TtlCache} from '../lib/cache'
import {searchDouban} from '../douban/search'
import {checkDoubanCookie} from '../douban/cookie-health'
import {sendProviderDetail} from './get-data'

const searchCaches = new Map<number, TtlCache<DoubanSearchData>>()

function getOrCreateCache<T>(caches: Map<number, TtlCache<T>>, ttl: number): TtlCache<T> {
    let cache = caches.get(ttl)
    if (!cache) {
        cache = new TtlCache<T>(ttl * 1000)
        caches.set(ttl, cache)
    }
    return cache
}

const douban = new Hono<AppEnv>()

// /search 必须注册在 /:id 之前
/** GET /api/douban/search?q=xxx — 搜索豆瓣影片 */
douban.get('/search', async (c) => {
    const config = c.get('config')
    const requestId = c.get('requestId')
    const startedAt = c.get('startedAt')
    const origin = c.req.header('origin') ?? null

    const query = c.req.query('q')?.trim()
    if (!query) {
        throw ApiError.badRequest('缺少查询参数 q', {example: '/api/douban/search?q=盗梦空间'})
    }
    if (query.length > 200) {
        throw ApiError.badRequest('查询词过长，最多 200 个字符')
    }

    const rawLimit = Number.parseInt(c.req.query('limit') ?? '10', 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 10

    // 搜索词大小写不敏感；`limit` 参与键，避免 10 条的结果被 25 条覆盖
    const memory = getOrCreateCache(searchCaches, config.cacheTtlSeconds)
    const memoryKey = `${query.toLowerCase()}::${limit}`
    const cached = memory.get(memoryKey)

    if (cached) {
        return sendSuccess(cached, {requestId, startedAt, cached: true}, {
            cache: 'hit',
            cacheTtlSeconds: config.cacheTtlSeconds,
            rateLimit: c.get('rateLimit'),
            origin,
            varyAuthorization: Boolean(config.apiToken || config.authSecret),
        })
    }

    // 搜索结果是高频变动的列表，只进进程内缓存，不落 R2 / D1
    const client = await getHttpClient(config)
    const data = await searchDouban(client, config, query, limit)
    memory.set(memoryKey, data)

    return sendSuccess(data, {requestId, startedAt, cached: false}, {
        cache: 'miss',
        cacheTtlSeconds: config.cacheTtlSeconds,
        rateLimit: c.get('rateLimit'),
        origin,
        varyAuthorization: Boolean(config.apiToken || config.authSecret),
    })
})

/** GET /api/douban/cookie-status?refresh=1 — 检查 DOUBAN_COOKIE 是否有效（结果缓存 10 分钟） */
douban.get('/cookie-status', async (c) => {
    const config = c.get('config')
    const requestId = c.get('requestId')
    const startedAt = c.get('startedAt')
    const origin = c.req.header('origin') ?? null

    const client = await getHttpClient(config)
    const health = await checkDoubanCookie(client, config, {
        force: c.req.query('refresh') === '1',
    })

    return sendSuccess(health, {requestId, startedAt}, {
        cache: 'bypass',
        rateLimit: c.get('rateLimit'),
        origin,
        varyAuthorization: Boolean(config.apiToken || config.authSecret),
    })
})

/** GET /api/douban/:id — 豆瓣影片详情（历史路径，委托给统一入口） */
douban.get('/:id', (c) =>
    sendProviderDetail(c, 'douban', c.req.param('id'), null, c.req.query('full') !== 'false'),
)

export {douban}
