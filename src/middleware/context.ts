import type {Context, Next} from 'hono'
import type {AppEnv} from '../types'
import {resolveConfig} from '../config'
import {corsPreflightHeaders} from '../lib/response'

/** 生成请求 ID：优先复用上游透传的，便于跨服务追踪 */
function newRequestId(): string {
    const cryptoRef = globalThis.crypto
    if (cryptoRef?.randomUUID) return cryptoRef.randomUUID()
    return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/**
 * 注入请求上下文：配置、请求 ID、起始时间、CORS 放行。
 *
 * CORS 允许任意 Origin：这是公开只读 API，数据对所有人一致。鉴权走
 * Authorization 头或 SameSite=Lax 的 HttpOnly 会话 cookie，跨站请求带不上
 * cookie，因此不需要 Origin 白名单。
 */
export async function contextMiddleware(c: Context<AppEnv>, next: Next) {
    c.set('config', resolveConfig(c.env))
    c.set('requestId', c.req.header('x-request-id')?.trim() || newRequestId())
    c.set('startedAt', Date.now())

    const origin = c.req.header('origin') ?? null

    if (c.req.method === 'OPTIONS') {
        return new Response(null, {status: 204, headers: corsPreflightHeaders(origin)})
    }

    await next()
}
