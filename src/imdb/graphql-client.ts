import type {AppConfig} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'

const GRAPHQL_ENDPOINT = 'https://api.graphql.imdb.com/'

const GRAPHQL_HEADERS: Record<string, string> = {
    'content-type': 'application/json',
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    origin: 'https://www.imdb.com',
    referer: 'https://www.imdb.com/',
    'x-imdb-client-name': 'imdb-web-next-localized',
    'x-imdb-client-query-version': '1',
    'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-site': 'same-site',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
}

interface GraphQLResponse<T> {
    data?: T
    errors?: Array<{ message: string; extensions?: { code?: string } }>
}

/**
 * 调用 IMDb 官方 Web 端 GraphQL。
 *
 * 该端点不经过 AWS WAF 的 JS 挑战，但经 Cloudflare 前端：Workers 用 connect() 会 TCP Loop，只能退回 fetch（可能被 429）。
 * 请求头带完整浏览器指纹（sec-ch-ua / sec-fetch-* / referer 等）：实测缺这些头时
 * 会被指纹校验拦成 403（与 IP 无关），补齐后正常 200。注意这只能救「指纹」拦截，
 * 救不了 IP 级 429——Workers 出口仍是被限流的（见 README「为什么 Workers 不支持 IMDb」）。
 * 返回 `data: null` 且带 `errors` 时，按上游错误处理而不是静默返回空。
 */
export async function graphqlQuery<T>(
    client: HttpClient,
    config: AppConfig,
    query: string,
    variables: Record<string, unknown>,
): Promise<T | null> {
    const response = await client.request(GRAPHQL_ENDPOINT, {
        method: 'POST',
        timeoutMs: config.requestTimeoutMs,
        headers: GRAPHQL_HEADERS,
        body: JSON.stringify({query, variables}),
    })

    if (response.status === 403) {
        throw new ApiError(
            'UPSTREAM_BLOCKED',
            'IMDb GraphQL 拒绝了当前出口 IP（403），请配置外部后端或换一个出口重试',
            {retryable: false, details: {hint: '参考 IMDB_BACKEND_URL 配置项'}},
        )
    }

    if (response.status === 429) {
        // IMDb 对数据中心 / 共享 IP 限流很重，实测等待 60 秒仍为 429，自动重试没有意义。
        // 这里只陈述"出口被限流"，不臆测部署平台：代理自身的出口同样可能被限。
        throw new ApiError(
            'UPSTREAM_ERROR',
            'IMDb GraphQL 返回 HTTP 429（当前出口 IP 被限流）',
            {
                retryable: true,
                retryAfterSeconds: 10,
                details: {
                    status: 429,
                    egress: client.label,
                    hint: 'IMDb 对数据中心 IP 限流严重，与部署在哪家平台无关。可调用 GET /api/egress 查看实际出口 IP 与探测结果；或配置 IMDB_BACKEND_URL 改由外部后端代取',
                },
            },
        )
    }

    if (!response.ok) {
        throw ApiError.upstreamError(`IMDb GraphQL 返回 HTTP ${response.status}`, {
            status: response.status,
        })
    }

    // 上游偶尔会返回 HTML 错误页（如 Cloudflare 502），此时 json() 会抛 SyntaxError，
    // 直接冒到 app.onError 会变成「服务端内部错误」，掩盖真正的原因
    let payload: GraphQLResponse<T>
    try {
        payload = (await response.json()) as GraphQLResponse<T>
    } catch {
        throw ApiError.upstreamError('IMDb GraphQL 返回的不是合法 JSON', {
            status: response.status,
        })
    }

    if (payload.errors?.length) {
        const message = payload.errors.map((item) => item.message).join('; ')
        throw ApiError.upstreamError(`IMDb GraphQL 查询失败: ${message}`, {
            code: payload.errors[0]?.extensions?.code,
        })
    }

    return payload.data ?? null
}
