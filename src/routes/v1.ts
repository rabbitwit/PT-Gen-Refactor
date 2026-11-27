import {Hono} from 'hono'
import type {AppEnv} from '../types'
import {SITE_DESCRIPTORS} from '../lib/sites'
import {sendSuccess} from '../lib/response'
import {sendMethodNotAllowed} from '../lib/methods'
import {douban} from './douban'
import {egress} from './egress'
import {resolveProviderDetail} from './get-data'
import {imdb} from './imdb'
import {providers} from './providers'
import {resource} from './resource'
import {search} from './search'

/**
 * 版本化 REST 面：`/api/v1/**`。
 *
 * 资源划分：
 * - `/providers`                  数据源目录（能力探测，便于后端实现方对齐）
 * - `/{provider}/{id}`            条目
 * - `/{provider}/{type}/{id}`     条目（TMDb / Trakt 的媒体类型在路径里）
 * - `/{provider}/search?q=`       按数据源搜索
 * - `/search?q=&source=`          聚合搜索
 * - `/resolve?url=|id=|q=`        链接 / 关键词解析后再取详情
 * - `/douban/cookie-status`       豆瓣 Cookie 健康检查
 * - `/egress`                     出口自检
 *
 * 历史路径（`/api/{provider}/{id}`、`/api/douban/:id` 等）保持可用，但只有这里出现在
 * 文档与 OpenAPI 里；旧的 `/api/getData` 已移除，统一用 `/resolve`。
 */
const v1 = new Hono<AppEnv>()

const READ_ONLY = ['POST', 'PUT', 'PATCH', 'DELETE']

/** 尾斜杠不改变资源身份：308 到规范地址，保留方法与查询串 */
v1.use('*', async (c, next) => {
    const path = c.req.path
    if (path.length > 1 && path.endsWith('/')) {
        const url = new URL(c.req.url)
        url.pathname = path.replace(/\/+$/, '')
        return c.redirect(url.toString(), 308)
    }
    await next()
})

/** GET /api/v1/providers — 数据源目录 */
v1.get('/providers', (c) => {
    const config = c.get('config')

    return sendSuccess(
        {total: SITE_DESCRIPTORS.length, items: SITE_DESCRIPTORS},
        {requestId: c.get('requestId'), startedAt: c.get('startedAt'), cached: false},
        {
            cache: 'bypass',
            rateLimit: c.get('rateLimit'),
            origin: c.req.header('origin') ?? null,
            varyAuthorization: Boolean(config.apiToken || config.authSecret),
        },
    )
})

/** GET /api/v1/resolve?url=…|id=…|q=… — 贴链接或关键词时先解析再取详情 */
v1.get('/resolve', (c) => resolveProviderDetail(c))

// 具体路径必须挂在 `/` 的通配之前
v1.route('/search', search)
v1.route('/egress', egress)
v1.route('/imdb', imdb)
v1.route('/douban', douban)
v1.route('/', providers)
v1.route('/', resource)

// 已知资源 + 不支持的方法 → 405（带 Allow）；未知路径仍是 404
const GET_ONLY_PATHS = [
    '/providers',
    '/resolve',
    '/search',
    '/egress',
    '/imdb/search',
    '/douban/search',
    '/douban/cookie-status',
    '/bangumi/search',
    '/steam/search',
    '/tmdb/search',
    '/trakt/search',
]
for (const path of GET_ONLY_PATHS) {
    v1.on(READ_ONLY, path, (c) => sendMethodNotAllowed(c))
}

export {v1}
