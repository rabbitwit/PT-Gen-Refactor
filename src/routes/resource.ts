import {Hono} from 'hono'
import type {Context} from 'hono'
import type {AppEnv, ProviderSite} from '../types'
import {ApiError} from '../lib/errors'
import {RESOURCE_SITES, isResourceSite, normalizeSite} from '../lib/sites'
import {sendMethodNotAllowed} from '../lib/methods'
import {sendProviderDetail} from './get-data'

/**
 * 统一详情入口。
 *
 * `GET /api/v1/{provider}/{id}` 是所有数据源共用的规范路径，返回统一信封与 `format`。
 * `GET /api/v1/{provider}/{type}/{id}` 是同一资源的另一种写法：TMDb / Trakt 需要媒体类型，
 * 既能放在 query（`?type=tv`），也能放在路径里（`/api/v1/tmdb/tv/1399`）。
 *
 * 这里同时以 `/api` 前缀挂载，因此旧路径 `/api/{provider}/{id}` 继续可用。
 *
 * 各站点的历史路径（`/api/douban/:id`、`/api/tmdb/:type/:id` 等）挂载在本路由
 * 之前，仍然可用，但文档只描述这里的规范形式。
 */
const resource = new Hono<AppEnv>()

function siteFrom(raw: string): ProviderSite {
    const site = normalizeSite(raw)
    if (!isResourceSite(site)) {
        // 路径整体存在，只是站点不在白名单里 → 404 并给出可选值
        throw ApiError.notFound(`未知数据源 "${raw}"`, {sites: RESOURCE_SITES})
    }
    return site
}

const isFull = (c: Context<AppEnv>): boolean => c.req.query('full') !== 'false'

function handleDetail(c: Context<AppEnv>, rawSite: string, id: string, type?: string): Promise<Response> {
    const site = siteFrom(rawSite)
    return sendProviderDetail(c, site, id, type, isFull(c))
}

resource.get('/:site/:id', (c) => handleDetail(c, c.req.param('site'), c.req.param('id'), c.req.query('type')))

resource.get('/:site/:type/:id', (c) =>
    handleDetail(c, c.req.param('site'), c.req.param('id'), c.req.param('type')),
)

// 已知路径 + 不支持的方法 → 405（带 Allow），而不是落进 404
for (const path of ['/:site/:id', '/:site/:type/:id']) {
    resource.on(['POST', 'PUT', 'PATCH', 'DELETE'], path, (c) => sendMethodNotAllowed(c))
}

export {resource}
