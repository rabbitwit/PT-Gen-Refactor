import type {AppConfig} from '../types'
import {ApiError, ErrorCode, isApiError} from './errors'
import {createDirectSocketClient} from './edge-socket'
import {abortableTimeout, isTimeoutError} from './timeout'

export interface HttpRequestOptions {
    timeoutMs: number
    headers?: Record<string, string>
    method?: string
    body?: string
    redirect?: 'follow' | 'manual'
}

export interface HttpClient {
    /** 人类可读的通道描述，写入日志与 X-Data-Source 辅助排查 */
    readonly label: string

    request(url: string, options: HttpRequestOptions): Promise<Response>
}

function normalizeHeaders(base: Record<string, string> | undefined): Record<string, string> {
    return {...(base ?? {})}
}

function wrapTimeoutError(error: unknown, url: string, timeoutMs: number): Error {
    if (isTimeoutError(error)) {
        const timeoutError = new Error(`Request timed out after ${timeoutMs}ms: ${url}`)
        timeoutError.name = 'TimeoutError'
        return timeoutError
    }
    return error instanceof Error ? error : new Error(String(error))
}

/** 直连 / Direct connection */
const directClient: HttpClient = {
    label: 'direct',
    async request(url, options) {
        const {signal, clear} = abortableTimeout(options.timeoutMs)
        try {
            return await fetch(url, {
                method: options.method ?? 'GET',
                headers: normalizeHeaders(options.headers),
                body: options.body,
                redirect: options.redirect ?? 'follow',
                signal,
            })
        } catch (error) {
            throw wrapTimeoutError(error, url, options.timeoutMs)
        } finally {
            clear()
        }
    },
}

/**
 * 边缘运行时的「直连」客户端：IMDb 域名先走 `connect()` 裸 TCP，其它域名仍用 `fetch`。
 *
 * `connect()` 是另一条出站链路，但它**连不了 Cloudflare 自家网段**：IMDb 的
 * `api.graphql.imdb.com` 就在 Cloudflare 前面，按域名建连会报 `TCP Loop detected`，
 * DoH 换成 IP 也一样。因此 socket 传输失败时再退回 `fetch`——fetch 可能被 IMDb 429，
 * 但至少是另一条链路，也便于直接定位「当前出口被限流」而不是只看到平台限制。
 * 豆瓣等站点继续用 `fetch`：更快，也不会因为裸 TCP 的限制而退化。
 */
let edgeDirectClient: HttpClient | null = null

function isImdbHost(url: string): boolean {
    try {
        const host = new URL(url).hostname.toLowerCase()
        return host === 'imdb.com' || host.endsWith('.imdb.com')
    } catch {
        // 非法 URL 交给 fetch 自己报错
        return false
    }
}

function getEdgeDirectClient(): HttpClient {
    if (!edgeDirectClient) {
        // 两个子通道各自包一层错误映射，失败时才能报出真实走的是哪条链路
        const socketClient = normalizeUpstreamErrors(createDirectSocketClient())
        const fetchClient = normalizeUpstreamErrors(directClient)
        edgeDirectClient = {
            label: 'edge:direct',
            async request(url, options) {
                if (!isImdbHost(url)) return fetchClient.request(url, options)

                try {
                    return await socketClient.request(url, options)
                } catch (error) {
                    // 超时不重试：两条链路各等一次会把总耗时翻倍
                    if (isApiError(error) && error.symbol === ErrorCode.UPSTREAM_TIMEOUT) throw error
                    const reason = error instanceof Error ? error.message : String(error)
                    console.warn(`[fetch] socket 直连 ${url} 失败（${reason}），改用 fetch`)
                    return fetchClient.request(url, options)
                }
            },
        }
    }
    return edgeDirectClient
}

/**
 * 给出站客户端包一层错误归一化。
 *
 * 传输层异常（TLS 握手失败、DNS 不通、连接被重置、本地网络封锁等）不是服务端内部错误，
 * 但 workerd 会把它包成 `internal error; reference = ...` 这种不透明的 500。
 * 这里统一转成 `UPSTREAM_TIMEOUT` / `UPSTREAM_ERROR`，并在 details 里带上域名、
 * 通道和原始原因，调用方能直接看出是哪个上游不可达。
 */
function normalizeUpstreamErrors(client: HttpClient): HttpClient {
    return {
        label: client.label,
        async request(url, options) {
            try {
                return await client.request(url, options)
            } catch (error) {
                if (error instanceof ApiError) throw error
                if (error instanceof Error && error.name === 'TimeoutError') {
                    throw ApiError.upstreamTimeout(`上游请求超时: ${url}`)
                }
                throw ApiError.upstreamError(`上游请求失败: ${url}`, {
                    url,
                    channel: client.label,
                    cause: error instanceof Error ? error.message : String(error),
                })
            }
        },
    }
}

const clientCache = new Map<AppConfig['runtime'], HttpClient>()

/**
 * 根据运行时选择出站通道。
 *
 * - Node / Bun / Vercel：`fetch` 直连
 * - 边缘（Workers）：IMDb 走 `connect()` 裸 TCP，其余走 `fetch`
 *
 * IMDb / 豆瓣风控请走 `IMDB_BACKEND_URL` / `DOUBAN_BACKEND_URL`。
 */
export function getHttpClient(config: AppConfig): Promise<HttpClient> {
    let client = clientCache.get(config.runtime)
    if (!client) {
        client = normalizeUpstreamErrors(config.runtime === 'edge' ? getEdgeDirectClient() : directClient)
        clientCache.set(config.runtime, client)
    }
    return Promise.resolve(client)
}
