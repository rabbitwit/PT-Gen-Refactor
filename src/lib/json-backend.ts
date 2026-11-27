import type {HttpClient} from './http'
import {ApiError} from './errors'

/**
 * 按顺序尝试多个后端端点。拿不到数据就换下一个；
 * 全部失败时抛出最后一个错误，由调用方按原逻辑回退或对外报错。
 */
export async function tryBackendEndpoints<T>(
    endpoints: string[],
    run: (base: string) => Promise<T>,
    label: string,
): Promise<T> {
    if (endpoints.length === 0) {
        throw ApiError.notImplemented(`未配置 ${label} 后端地址`)
    }

    let lastError: unknown
    for (let index = 0; index < endpoints.length; index++) {
        const base = endpoints[index]
        try {
            return await run(base)
        } catch (error) {
            lastError = error
            const next = endpoints[index + 1]
            if (next) {
                const message = error instanceof Error ? error.message : String(error)
                console.warn(`[${label}] ${base} 失败（${message}），改用下一个端点`)
            }
        }
    }

    throw lastError
}

const V1_ROOT_PATH = /\/api\/v1$/i
const V1_PATH = /\/api\/v1(\/.*)?$/i

/**
 * 拼出外部后端的资源地址（`/api/v1` REST 树）。
 *
 * `base` 支持三种写法：
 * - `https://host` → `https://host/api/v1/{resource}/...`
 * - `https://host/api/v1` → 自动补上资源名
 * - `https://host/api/v1/{resource}` → 直接拼路径段
 *
 * 地址里原有的查询串会保留，新参数按同名覆盖。
 */
export function v1BackendUrl(
    base: string,
    resource: 'douban' | 'imdb',
    segments: Array<string | number>,
    params: Record<string, string | number | undefined> = {},
    label = '后端地址',
): string {
    let url: URL
    try {
        url = new URL(base)
    } catch {
        throw ApiError.upstreamError(`${label} 不是合法的 URL`, {url: base})
    }

    let path = url.pathname.replace(/\/+$/, '')
    if (path === '' || path === '/') path = '/api/v1'
    if (!V1_PATH.test(path)) {
        throw ApiError.upstreamError(`${label} 必须指向 /api/v1 或 /api/v1/${resource}`, {url: base})
    }
    if (V1_ROOT_PATH.test(path)) path = `${path}/${resource}`

    for (const segment of segments) {
        path += `/${encodeURIComponent(String(segment))}`
    }
    url.pathname = path || '/'

    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === '') {
            url.searchParams.delete(key)
            continue
        }
        url.searchParams.set(key, String(value))
    }
    return url.toString()
}

export interface JsonBackendOptions {
    timeoutMs: number
    token?: string
    upstream: string
    authFailed: string
    notFound?: string
}

/**
 * 调用外部后端（`/api/v1` REST 树）。
 *
 * 鉴权只使用 `Authorization: Bearer`；响应必须是统一信封
 * `{ code, message, data, error, meta }`，`20000` 表示成功。
 */
export async function fetchJsonBackend(
    client: HttpClient,
    url: string,
    options: JsonBackendOptions,
): Promise<unknown> {
    const headers: Record<string, string> = {accept: 'application/json'}
    if (options.token) headers.authorization = `Bearer ${options.token}`

    const response = await client.request(url, {
        method: 'GET',
        timeoutMs: options.timeoutMs,
        headers,
    })
    const {status} = response
    const body = await response.text()

    if (status === 401 || status === 403) {
        throw ApiError.upstreamError(options.authFailed, {
            status,
            upstream: options.upstream,
        })
    }

    if (status === 404) {
        throw ApiError.notFound(options.notFound || `${options.upstream} 未找到资源`)
    }

    if (status >= 400) {
        throw ApiError.upstreamError(`${options.upstream} 返回 HTTP ${status}`, {
            status,
            upstream: options.upstream,
        })
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(body) as unknown
    } catch {
        throw ApiError.upstreamError(`${options.upstream} 返回的不是合法 JSON`, {
            upstream: options.upstream,
        })
    }

    const record =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null
    if (!record || typeof record.code !== 'number') {
        throw ApiError.upstreamError(`${options.upstream} 返回了未知格式`, {
            upstream: options.upstream,
        })
    }

    if (record.code !== 20000) {
        const message =
            typeof record.message === 'string' && record.message
                ? record.message
                : `${options.upstream} 返回业务错误 ${record.code}`
        throw ApiError.upstreamError(message, {
            upstream: options.upstream,
            code: record.code,
            details: record.error,
        })
    }

    return record.data ?? null
}
