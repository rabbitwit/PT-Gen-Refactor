import {Hono} from 'hono'
import type {Context} from 'hono'
import type {AppEnv} from '../types'
import {ApiError} from '../lib/errors'
import {sendSuccess} from '../lib/response'
import {RateLimiter} from '../lib/rate-limit'
import {
    SESSION_COOKIE,
    createChallenge,
    createSession,
    isSecureRequest,
    readCookie,
    serializeClearedSessionCookie,
    serializeSessionCookie,
    verifyChallenge,
    verifySession,
} from '../lib/session'

const auth = new Hono<AppEnv>()

// 挑战与会话端点是公开的，必须单独限流，避免被用来刷 PoW / 探测
const challengeLimiter = new RateLimiter(30, 60_000)
const exchangeLimiter = new RateLimiter(20, 60_000)

function clientIp(c: Context<AppEnv>): string {
    return (
        c.req.header('cf-connecting-ip') ??
        c.req.header('x-real-ip') ??
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
        'unknown'
    )
}

function enforceRateLimit(c: Context<AppEnv>, limiter: RateLimiter, label: string) {
    const result = limiter.check(clientIp(c))
    c.set('rateLimit', result)
    if (result.allowed) return result

    const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
    throw new ApiError('RATE_LIMITED', `${label}过于频繁，请 ${retryAfter} 秒后重试`, {
        retryable: true,
        retryAfterSeconds: retryAfter,
        details: {limit: result.limit},
    })
}

function sessionSecret(c: Context<AppEnv>): string {
    const secret = c.get('config').authSecret?.trim()
    if (!secret) {
        throw new ApiError(
            'CONFIG_REQUIRED',
            '未配置 AUTH_SECRET，UI 会话认证不可用；请设置 AUTH_SECRET 或改用 API_TOKEN',
        )
    }
    return secret
}

function sendWithCookie(c: Context<AppEnv>, data: unknown, cookie: string, message: string) {
    const response = sendSuccess(
        data,
        {requestId: c.get('requestId'), startedAt: c.get('startedAt'), cached: false},
        {
            cache: 'bypass',
            rateLimit: c.get('rateLimit'),
            origin: c.req.header('origin') ?? null,
            varyAuthorization: true,
            message,
        },
    )
    // 会话响应既不能被共享缓存保存，也不应被浏览器复用
    response.headers.set('Cache-Control', 'no-store')
    response.headers.append('Set-Cookie', cookie)
    return response
}

function noStore(response: Response): Response {
    response.headers.set('Cache-Control', 'no-store')
    return response
}

/**
 * GET /api/auth/challenge — 获取一次 PoW 挑战。
 *
 * 挑战本身由服务端 HMAC 签名，无状态；客户端解出 solution 后调用
 * POST /api/auth/session 换取 HttpOnly 会话 Cookie。
 */
auth.get('/challenge', async (c) => {
    const config = c.get('config')
    const secret = sessionSecret(c)
    enforceRateLimit(c, challengeLimiter, '获取验证挑战')

    const issued = await createChallenge(secret, config.powDifficulty)

    const response = sendSuccess(
        {
            ...issued,
            algorithm: 'sha256-pow',
            sessionTtlSeconds: config.sessionTtlSeconds,
        },
        {requestId: c.get('requestId'), startedAt: c.get('startedAt'), cached: false},
        {
            cache: 'bypass',
            rateLimit: c.get('rateLimit'),
            origin: c.req.header('origin') ?? null,
            varyAuthorization: true,
            message: 'OK',
        },
    )
    response.headers.set('Cache-Control', 'no-store')
    return response
})

/**
 * POST /api/auth/session — 校验 PoW 并签发 HttpOnly 会话 Cookie。
 *
 * 响应体不返回 token，避免前端 JS 读取长期凭证。
 */
auth.post('/session', async (c) => {
    const config = c.get('config')
    const secret = sessionSecret(c)
    enforceRateLimit(c, exchangeLimiter, '创建会话')

    let body: { challenge?: unknown; solution?: unknown }
    try {
        body = (await c.req.json()) as typeof body
    } catch {
        throw ApiError.badRequest('请求体必须是 JSON：{"challenge":"...","solution":"..."}')
    }

    if (typeof body.challenge !== 'string' || typeof body.solution !== 'string') {
        throw ApiError.badRequest('缺少 challenge 或 solution')
    }

    const valid = await verifyChallenge(secret, body.challenge, body.solution)
    if (!valid) {
        throw ApiError.unauthorized('验证失败或挑战已过期，请重新获取挑战')
    }

    const session = await createSession(secret, config.sessionTtlSeconds)
    const secure = isSecureRequest(c.req.url, c.req.header('x-forwarded-proto'))
    const cookie = serializeSessionCookie(session.token, session.maxAge, secure)

    return sendWithCookie(
        c,
        {
            authenticated: true,
            method: 'pow',
            expiresAt: session.payload.exp,
            sessionTtlSeconds: config.sessionTtlSeconds,
        },
        cookie,
        '会话已创建',
    )
})

/** GET /api/auth/session — 查询当前 Cookie 是否仍然有效（不返回 token） */
auth.get('/session', async (c) => {
    const config = c.get('config')
    const secret = config.authSecret?.trim()

    if (!secret) {
        return noStore(
            sendSuccess(
                {authenticated: false, sessionAuth: false},
                {requestId: c.get('requestId'), startedAt: c.get('startedAt'), cached: false},
                {cache: 'bypass', origin: c.req.header('origin') ?? null, varyAuthorization: true},
            ),
        )
    }

    const token = readCookie(c.req.header('cookie'), SESSION_COOKIE)
    const payload = await verifySession(secret, token)

    return noStore(
        sendSuccess(
            payload
                ? {authenticated: true, sessionAuth: true, expiresAt: payload.exp}
                : {authenticated: false, sessionAuth: true},
            {requestId: c.get('requestId'), startedAt: c.get('startedAt'), cached: false},
            {cache: 'bypass', origin: c.req.header('origin') ?? null, varyAuthorization: true},
        ),
    )
})

/** DELETE /api/auth/session — 退出当前 UI 会话 */
auth.delete('/session', async (c) => {
    const secure = isSecureRequest(c.req.url, c.req.header('x-forwarded-proto'))
    return sendWithCookie(
        c,
        {authenticated: false},
        serializeClearedSessionCookie(secure),
        '会话已清除',
    )
})

export {auth}
