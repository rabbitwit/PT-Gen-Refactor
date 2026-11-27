import type {Context} from 'hono'
import type {AppEnv} from '../types'
import {ApiError} from './errors'
import {sendError} from './response'

/** 只读 API 实际支持的方法；同时用于 `Allow` 与 CORS 预检 */
export const ALLOWED_METHODS = 'GET, HEAD, OPTIONS'

/**
 * 405：路径存在但 HTTP 方法不被支持。
 *
 * 按 RFC 9110，这种情况应返回 `Allow` 头而不是笼统的 404，
 * 否则客户端无法区分「路径不存在」与「方法不对」。
 */
export function sendMethodNotAllowed(c: Context<AppEnv>, allow = ALLOWED_METHODS): Response {
    const response = sendError(
        new ApiError('METHOD_NOT_ALLOWED', `不支持 ${c.req.method} 方法，该资源只支持 ${allow}`),
        {requestId: c.get('requestId') ?? 'unknown', startedAt: c.get('startedAt') ?? Date.now()},
        {origin: c.req.header('origin') ?? null},
    )
    response.headers.set('Allow', allow)
    return response
}
