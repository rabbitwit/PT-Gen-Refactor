import type {Context, Next} from 'hono'
import type {AppEnv} from '../types'
import {ApiError} from '../lib/errors'
import {RateLimiter, type RateLimitResult} from '../lib/rate-limit'
import {SESSION_COOKIE, readCookie, verifySession} from '../lib/session'

/** 常量时间比较，避免通过响应时间差推断 token / Constant-time compare. */
function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let index = 0; index < a.length; index++) {
        diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
    }
    return diff === 0
}

function extractBearer(header: string | undefined): string | undefined {
    if (!header) return undefined
    const match = header.match(/^Bearer\s+(.+)$/i)
    return match?.[1]?.trim() || undefined
}

/**
 * API 鉴权。
 *
 * 支持两种身份：
 * 1. 外部 API 客户端：`Authorization: Bearer <API_TOKEN>` / `X-API-Key` / `?key=`
 * 2. 浏览器 UI：由 `/api/auth/session` 换取的 HttpOnly 会话 Cookie
 *
 * 不再接受前端内置 `VITE_AUTH_SECRET` 的 HMAC 签名：任何下发到浏览器的长期密钥
 * 都可以被提取，无法作为防滥用边界。
 */
export async function authMiddleware(c: Context<AppEnv>, next: Next) {
    const config = c.get('config')
    const token = config.apiToken?.trim()
    const secret = config.authSecret?.trim()

    // 未配置任何鉴权 → 保持公开（仅建议本地开发使用）
    if (!token && !secret) {
        await next()
        return
    }

    // 会话端点自身必须公开，否则无法换取 Cookie
    if (c.req.path.startsWith('/api/auth/')) {
        await next()
        return
    }

    const provided =
        extractBearer(c.req.header('authorization')) ??
        c.req.header('x-api-key')?.trim() ??
        c.req.query('key')?.trim()

    if (token && provided && safeEqual(provided, token)) {
        await next()
        return
    }

    if (secret) {
        const sessionToken = readCookie(c.req.header('cookie'), SESSION_COOKIE)
        const session = await verifySession(secret, sessionToken)
        if (session) {
            c.set('session', session)
            await next()
            return
        }
    }

    throw ApiError.unauthorized('需要 API Token 或有效 UI 会话')
}

const limiters = new Map<string, RateLimiter>()

function limiter(kind: string, limit: number): RateLimiter {
    const key = `${kind}:${limit}`
    let instance = limiters.get(key)
    if (!instance) {
        instance = new RateLimiter(limit, 60_000)
        limiters.set(key, instance)
    }
    return instance
}

/** 取更严格的限流结果，保证 IP 与会话两层配额同时生效 */
function stricter(a: RateLimitResult, b: RateLimitResult): RateLimitResult {
    return b.remaining < a.remaining ? b : a
}

/**
 * 基于 client IP + UI 会话的固定窗口限流。
 *
 * Workers 下 `CF-Connecting-IP` 最可靠；Vercel 使用 `X-Forwarded-For` 首段。
 * 多实例部署仍需叠加平台侧的分布式限流。
 */
export async function rateLimitMiddleware(c: Context<AppEnv>, next: Next) {
    const config = c.get('config')
    const limit = config.rateLimitMax

    if (limit <= 0) {
        await next()
        return
    }

    const ip =
        c.req.header('cf-connecting-ip') ??
        c.req.header('x-real-ip') ??
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
        'unknown'

    let result = limiter('ip', limit).check(ip)
    const session = c.get('session')
    if (session) {
        result = stricter(result, limiter('session', limit).check(session.sid))
    }

    c.set('rateLimit', result)

    if (!result.allowed) {
        const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
        throw new ApiError('RATE_LIMITED', `请求过于频繁，请 ${retryAfter} 秒后重试`, {
            retryable: true,
            retryAfterSeconds: retryAfter,
            details: {limit: result.limit},
        })
    }

    await next()
}
