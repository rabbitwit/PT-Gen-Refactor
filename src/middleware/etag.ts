import type {Context, Next} from 'hono'
import type {AppEnv} from '../types'

/** 超过这个体积就不算 ETag，避免为大响应白白多做一次哈希 */
const MAX_HASH_BYTES = 512 * 1024

/** 比较两个 ETag 时忽略弱校验前缀 `W/` */
function normalizeTag(tag: string): string {
    return tag.trim().replace(/^W\//i, '')
}

/** `If-None-Match` 允许 `*` 与逗号分隔的列表 */
function matchesIfNoneMatch(header: string | undefined, etag: string): boolean {
    if (!header) return false
    if (header.trim() === '*') return true
    const target = normalizeTag(etag)
    return header.split(',').some((part) => normalizeTag(part) === target)
}

async function hashBody(text: string): Promise<string> {
    const bytes = new TextEncoder().encode(text)
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    let hex = ''
    for (let index = 0; index < 8; index++) hex += digest[index].toString(16).padStart(2, '0')
    return hex
}

/**
 * 计算 ETag 用的规范化内容。
 *
 * 统一信封里的 `meta.requestId` / `meta.timestamp` / `meta.durationMs` 每次都变，
 * 直接对整段 body 做哈希会让 ETag 永远不重复、304 完全失效。因此只取
 * 表示层（code / data / error）与版本号参与哈希；非信封 JSON 按原文哈希。
 */
function canonicalBody(text: string): string {
    try {
        const parsed = JSON.parse(text) as {
            code?: unknown
            data?: unknown
            error?: unknown
            meta?: { version?: unknown }
        }
        if (parsed && typeof parsed === 'object' && 'code' in parsed && 'meta' in parsed) {
            return JSON.stringify({
                code: parsed.code,
                data: parsed.data,
                error: parsed.error,
                version: parsed.meta?.version,
            })
        }
    } catch {
        // 非 JSON 或解析失败：整体参与哈希
    }
    return text
}

/**
 * 为 JSON 响应补上 ETag，并支持条件请求（`If-None-Match` → 304）。
 *
 * 同时统一处理 HEAD：返回与 GET 相同的响应头但不带 body。
 * 只处理 200 的 JSON 响应，其它状态（错误、重定向）保持原样。
 */
export async function etagMiddleware(c: Context<AppEnv>, next: Next): Promise<void> {
    await next()

    const method = c.req.method
    if (method !== 'GET' && method !== 'HEAD') return

    const response = c.res
    if (response.status !== 200) return
    if (!(response.headers.get('content-type') ?? '').includes('application/json')) return

    const body = await response.clone().text()
    const headers = new Headers(response.headers)

    if (body.length <= MAX_HASH_BYTES) {
        const etag = `W/"${await hashBody(canonicalBody(body))}"`
        headers.set('ETag', etag)

        if (matchesIfNoneMatch(c.req.header('if-none-match'), etag)) {
            // 304 不带 body，也不需要 Content-Length
            headers.delete('content-length')
            c.res = new Response(null, {status: 304, headers})
            return
        }
    }

    c.res = new Response(method === 'HEAD' ? null : body, {status: response.status, headers})
}
