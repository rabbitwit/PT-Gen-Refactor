import type {AppConfig, SearchItem, TitleData} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {asRecord} from '../lib/coerce'
import {fetchJsonBackend, tryBackendEndpoints, v1BackendUrl} from '../lib/json-backend'
import type {SearchFilter} from './graphql'

/**
 * 按动作构造 `/api/v1` 请求地址。
 *
 * `IMDB_BACKEND_URL` 可以填到 `/api/v1`（自动补资源名），也可以直接填资源根
 * （`/api/v1/imdb`）；只填域名时自动补 `/api/v1/imdb`。
 */
function buildBackendUrl(base: string, params: Record<string, string>): string {
    if (params.action === 'search') {
        return v1BackendUrl(
            base,
            'imdb',
            ['search'],
            {
                q: params.q,
                limit: params.limit,
                type: params.type,
                exact: params.exact,
                year_from: params.year_from,
                year_to: params.year_to,
            },
            'IMDB_BACKEND_URL',
        )
    }

    // 没有单独的评分端点：用精简详情代替（只少取 overrides / 演职员）
    if (params.action === 'rating') {
        return v1BackendUrl(base, 'imdb', [params.id], {full: 'false'}, 'IMDB_BACKEND_URL')
    }

    return v1BackendUrl(
        base,
        'imdb',
        [params.id],
        params.full === '0' ? {full: 'false'} : {},
        'IMDB_BACKEND_URL',
    )
}

/**
 * 调用外部 IMDb 后端。
 *
 * 这是 Cloudflare Workers 上获取 IMDb 数据最稳的通道：Worker 自身出口被 IMDb 限流 429，
 * 靠代理改出口又取决于代理本身的出口，只有「由另一台机器代取」是确定的。
 *
 * `fetchJsonBackend` 已经把统一信封剥到 `data`，这里拿到的就是数据体。
 */
async function callBackend<T>(
    client: HttpClient,
    config: AppConfig,
    params: Record<string, string>,
): Promise<T> {
    if (config.imdbBackendUrls.length === 0) {
        throw ApiError.notImplemented('未配置 IMDB_BACKEND_URL，无法在边缘运行时访问 IMDb', {
            hint: '部署外部后端后把地址填入 IMDB_BACKEND_URL（填 https://<host>/api/v1/imdb 或 /api/v1）',
        })
    }

    return tryBackendEndpoints(
        config.imdbBackendUrls,
        async (base) => {
            const payload = await fetchJsonBackend(client, buildBackendUrl(base, params), {
                timeoutMs: config.requestTimeoutMs,
                token: config.imdbBackendToken,
                upstream: 'imdb-backend',
                authFailed: 'IMDb 后端鉴权失败，请检查 IMDB_BACKEND_TOKEN',
                notFound:
                    params.action === 'title' ? `IMDb 上未找到条目 ${params.id}` : `IMDb 上未找到匹配 ${params.q}`,
            })

            const record = asRecord(payload)
            if (!record) {
                throw ApiError.upstreamError('IMDb 后端未返回数据', {upstream: 'imdb-backend'})
            }
            return record as T
        },
        'imdb-backend',
    )
}

/** 通过外部后端取详情 */
export async function fetchTitleViaBackend(
    client: HttpClient,
    config: AppConfig,
    imdbId: string,
    options: { full: boolean },
): Promise<TitleData> {
    return await callBackend<TitleData>(client, config, {
        action: 'title',
        id: imdbId,
        full: options.full ? '1' : '0',
    })
}

/** 通过外部后端取评分（豆瓣补全用；用精简详情代替独立评分端点） */
export async function fetchRatingViaBackend(
    client: HttpClient,
    config: AppConfig,
    imdbId: string,
): Promise<{ rating: number; votes: number } | null> {
    const data = await callBackend<{ rating?: number; vote_count?: number }>(client, config, {
        action: 'rating',
        id: imdbId,
    })
    const rating = Number(data.rating) || 0
    const votes = Number(data.vote_count) || 0
    return rating > 0 ? {rating, votes} : null
}

/** 通过外部后端搜索 */
export async function searchViaBackend(
    client: HttpClient,
    config: AppConfig,
    query: string,
    limit: number,
    filter: SearchFilter = {},
): Promise<SearchItem[]> {
    const params: Record<string, string> = {
        action: 'search',
        q: query,
        limit: String(limit),
    }
    if (filter.types?.length) params.type = filter.types.join(',')
    if (filter.exact) params.exact = 'true'
    if (filter.startDate) params.year_from = filter.startDate.slice(0, 4)
    if (filter.endDate) params.year_to = filter.endDate.slice(0, 4)

    const data = await callBackend<{ items?: SearchItem[] }>(client, config, params)
    return data.items ?? []
}
