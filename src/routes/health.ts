import type {Context} from 'hono'
import type {AppEnv} from '../types'
import {API_VERSION, canUseHtmlFallback, canUseImdb, hasDoubanBackend, hasImdbBackend} from '../config'
import {sendSuccess} from '../lib/response'
import {createCacheStore, describeCacheStore} from '../lib/persistent-cache'
import {getCachedDoubanCookieHealth} from '../douban/cookie-health'

/** GET /health 与 GET /api/health — 轻量存活探针，不触发任何上游请求 */
export function handleHealth(c: Context<AppEnv>) {
    const config = c.get('config')
    const cookieHealth = getCachedDoubanCookieHealth(config)
    const cookieStatus = !cookieHealth.configured
        ? 'unconfigured'
        : cookieHealth.valid === true
            ? 'valid'
            : cookieHealth.valid === false
                ? 'invalid'
                : 'unknown'

    return sendSuccess(
        {
            status: 'ok',
            runtime: config.runtime,
            version: API_VERSION,
            capabilities: {
                graphql: canUseImdb(config) && !hasImdbBackend(config),
                imdb: canUseImdb(config),
                /** IMDb 数据走外部后端，Workers 上的唯一方式 */
                imdbBackend: hasImdbBackend(config),
                htmlFallback: canUseHtmlFallback(config),
                browser: config.canUseBrowser,
                douban: true,
                /** 豆瓣网页抓取的外部后端；出口被风控时由它代取网页 */
                doubanBackend: hasDoubanBackend(config),
                doubanCookie: Boolean(config.doubanCookie),
                doubanCookieStatus: cookieStatus,
                doubanCookieExpiresAt: cookieHealth.expiresAt,
                doubanCookieRemainingSeconds: cookieHealth.remainingSeconds,
                authRequired: Boolean(config.apiToken || config.authSecret),
            },
            cacheTtlSeconds: config.cacheTtlSeconds,
            /** 持久化缓存层：R2 / D1 / Blob / EdgeOne / 本地目录 */
            cacheLayers: describeCacheStore(createCacheStore(c.env)),
        },
        {
            requestId: c.get('requestId'),
            startedAt: c.get('startedAt'),
        },
        {
            cache: 'bypass',
            origin: c.req.header('origin') ?? null,
            message: '服务运行正常',
        },
    )
}
