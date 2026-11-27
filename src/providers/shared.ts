import type {AppConfig, ProviderBaseData, ProviderSite} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'

export const DEFAULT_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'

export async function requestJson<T>(
    client: HttpClient,
    url: string,
    options: {
        config: AppConfig
        headers?: Record<string, string>
        method?: string
        body?: string
    },
): Promise<T> {
    const response = await client.request(url, {
        timeoutMs: options.config.requestTimeoutMs,
        method: options.method,
        body: options.body,
        headers: {accept: 'application/json', 'user-agent': DEFAULT_UA, ...(options.headers ?? {})},
    })

    if (response.status === 404) {
        throw ApiError.notFound(`上游未找到资源: ${url}`)
    }
    if (!response.ok) {
        throw ApiError.upstreamError(`上游返回 HTTP ${response.status}`, {
            url,
            status: response.status,
        })
    }

    const text = await response.text()
    try {
        return JSON.parse(text) as T
    } catch {
        throw ApiError.upstreamError('上游返回的不是合法 JSON', {url})
    }
}

export async function requestText(
    client: HttpClient,
    url: string,
    options: {
        config: AppConfig
        headers?: Record<string, string>
        method?: string
        body?: string
        redirect?: 'follow' | 'manual'
    },
): Promise<string> {
    const response = await client.request(url, {
        timeoutMs: options.config.requestTimeoutMs,
        method: options.method,
        body: options.body,
        redirect: options.redirect,
        headers: {'user-agent': DEFAULT_UA, ...(options.headers ?? {})},
    })

    if (response.status === 404) {
        throw ApiError.notFound(`上游未找到资源: ${url}`)
    }
    if (!response.ok) {
        throw ApiError.upstreamError(`上游返回 HTTP ${response.status}`, {
            url,
            status: response.status,
        })
    }
    return response.text()
}

export function text(value: unknown, fallback = ''): string {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'string') return value.trim() || fallback
    return String(value)
}

export function unique(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))]
}

/** 统一 provider 返回结构 */
export function providerData(
    site: ProviderSite,
    sid: string,
    data: Record<string, unknown>,
): ProviderBaseData {
    return {success: true, site, sid, ...data}
}

export function assertId(
    value: string,
    pattern: RegExp,
    site: ProviderSite,
    example: string,
): string {
    const trimmed = value.trim()
    if (!pattern.test(trimmed)) {
        throw new ApiError(
            'INVALID_SOURCE_ID',
            `${site} ID 格式不正确: "${value}"，示例: ${example}`,
        )
    }
    return trimmed
}

/** 从 HTML 中提取 `window.NAME = {...};` 的 JSON 对象 */
export function extractJsAssignmentJson(html: string, name: string): Record<string, unknown> | null {
    const marker = html.indexOf(name)
    if (marker < 0) return null
    const start = html.indexOf('{', marker)
    if (start < 0) return null

    let depth = 0
    let inString = false
    let quote = ''
    let escaped = false

    for (let i = start; i < html.length; i++) {
        const char = html[i]
        if (inString) {
            if (escaped) escaped = false
            else if (char === '\\') escaped = true
            else if (char === quote) inString = false
            continue
        }
        if (char === '"' || char === "'") {
            inString = true
            quote = char
            continue
        }
        if (char === '{') depth++
        else if (char === '}') {
            depth--
            if (depth === 0) {
                const raw = html.slice(start, i + 1)
                try {
                    return JSON.parse(raw) as Record<string, unknown>
                } catch {
                    return null
                }
            }
        }
    }
    return null
}
