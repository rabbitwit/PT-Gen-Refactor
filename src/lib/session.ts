/**
 * UI 会话与 PoW 挑战。
 *
 * 设计目标：
 * - 浏览器永远拿不到长期密钥；首次使用通过一次 SHA-256 工作量证明换取短期会话。
 * - 会话放在 HttpOnly Cookie 里，前端 JS 读不到，XSS 也无法直接窃取。
 * - 挑战与会话都用服务端 `AUTH_SECRET` 做 HMAC-SHA256 签名，边缘 / Node 均可验证。
 *
 * 这不是“绝对防抓取”：用户仍可以复制自己的 Cookie。真正的防滥用依赖
 * 短期 TTL + 每 IP/会话限流 + 边缘 WAF，会话机制负责消除“前端内置长期密钥”。
 */

const CHALLENGE_PREFIX = 'ptg1'
const SESSION_PREFIX = 's1'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** 挑战有效期：只够完成一次 PoW，避免长期可重放 */
const CHALLENGE_TTL_SECONDS = 120
const MAX_SOLUTION_LENGTH = 64

export const SESSION_COOKIE = 'ptg_session'

export interface ChallengePayload {
    v: 1
    /** 随机 nonce */
    n: string
    /** 过期时间（毫秒） */
    e: number
    /** 需要的前导零 bit 数 */
    d: number
}

export interface SessionPayload {
    v: 1
    /** 会话 ID，便于日志与限流 */
    sid: string
    /** 签发时间（毫秒） */
    iat: number
    /** 过期时间（毫秒） */
    exp: number
}

export interface IssuedChallenge {
    challenge: string
    difficulty: number
    expiresAt: number
}

const keyCache = new Map<string, Promise<CryptoKey>>()

function hmacKey(secret: string): Promise<CryptoKey> {
    let key = keyCache.get(secret)
    if (!key) {
        key = crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            {name: 'HMAC', hash: 'SHA-256'},
            false,
            ['sign'],
        )
        keyCache.set(secret, key)
    }
    return key
}

function bytesToBase64Url(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
    return bytes
}

function randomToken(): string {
    const bytes = new Uint8Array(18)
    crypto.getRandomValues(bytes)
    return bytesToBase64Url(bytes)
}

function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let index = 0; index < a.length; index++) {
        diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
    }
    return diff === 0
}

async function sign(secret: string, data: string): Promise<string> {
    const digest = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(data))
    return bytesToBase64Url(new Uint8Array(digest))
}

function splitToken(token: string, prefix: string): { part: string; signature: string } | null {
    const pieces = token.split('.')
    if (pieces.length !== 3 || pieces[0] !== prefix) return null
    if (!pieces[1] || !pieces[2]) return null
    return {part: pieces[1], signature: pieces[2]}
}

function decodePayload(part: string): unknown {
    try {
        return JSON.parse(decoder.decode(base64UrlToBytes(part))) as unknown
    } catch {
        return null
    }
}

function asObject(value: unknown): Record<string, unknown> | null {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
}

function leadingZeroBits(bytes: Uint8Array): number {
    let bits = 0
    for (const byte of bytes) {
        if (byte === 0) {
            bits += 8
            continue
        }
        bits += Math.clz32(byte) - 24
        break
    }
    return bits
}

/** 生成一次 PoW 挑战；挑战本身是签名过的，服务端无需存储状态 */
export async function createChallenge(
    secret: string,
    difficulty: number,
    ttlSeconds = CHALLENGE_TTL_SECONDS,
): Promise<IssuedChallenge> {
    const payload: ChallengePayload = {
        v: 1,
        n: randomToken(),
        e: Date.now() + ttlSeconds * 1000,
        d: difficulty,
    }
    const part = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
    const signature = await sign(secret, `${CHALLENGE_PREFIX}.${part}`)
    return {
        challenge: `${CHALLENGE_PREFIX}.${part}.${signature}`,
        difficulty,
        expiresAt: payload.e,
    }
}

/**
 * 校验 PoW：`SHA-256(challenge + ":" + solution)` 的前导零 bit 数必须达到要求。
 *
 * 服务端只做一次哈希，客户端需要平均 `2^difficulty` 次哈希。
 */
export async function verifyChallenge(
    secret: string,
    challenge: string,
    solution: unknown,
): Promise<boolean> {
    const parsed = splitToken(challenge, CHALLENGE_PREFIX)
    if (!parsed) return false
    if (typeof solution !== 'string' || solution.length < 1 || solution.length > MAX_SOLUTION_LENGTH) {
        return false
    }

    const expected = await sign(secret, `${CHALLENGE_PREFIX}.${parsed.part}`)
    if (!safeEqual(parsed.signature, expected)) return false

    const payload = asObject(decodePayload(parsed.part))
    if (!payload || payload.v !== 1) return false
    if (typeof payload.e !== 'number' || payload.e < Date.now()) return false
    if (typeof payload.d !== 'number' || payload.d < 1 || payload.d > 24) return false

    const digest = await crypto.subtle.digest(
        'SHA-256',
        encoder.encode(`${challenge}:${solution}`),
    )
    return leadingZeroBits(new Uint8Array(digest)) >= payload.d
}

/** 签发短期会话 token（放在 HttpOnly Cookie 中，不返回给前端 JS） */
export async function createSession(secret: string, ttlSeconds: number): Promise<{
    token: string
    payload: SessionPayload
    maxAge: number
}> {
    const now = Date.now()
    const payload: SessionPayload = {
        v: 1,
        sid: randomToken(),
        iat: now,
        exp: now + ttlSeconds * 1000,
    }
    const part = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
    const signature = await sign(secret, `${SESSION_PREFIX}.${part}`)
    return {
        token: `${SESSION_PREFIX}.${part}.${signature}`,
        payload,
        maxAge: ttlSeconds,
    }
}

/** 校验会话 token；返回 payload 便于日志/限流，失败返回 null */
export async function verifySession(
    secret: string,
    token: string | undefined,
): Promise<SessionPayload | null> {
    if (!token) return null
    const parsed = splitToken(token, SESSION_PREFIX)
    if (!parsed) return null

    const expected = await sign(secret, `${SESSION_PREFIX}.${parsed.part}`)
    if (!safeEqual(parsed.signature, expected)) return null

    const payload = asObject(decodePayload(parsed.part))
    if (!payload || payload.v !== 1) return null
    if (typeof payload.sid !== 'string' || !payload.sid) return null
    if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return null
    if (payload.exp <= Date.now()) return null
    // 容忍 60 秒时钟偏差，拒绝明显来自未来的 token
    if (payload.iat > Date.now() + 60_000) return null

    return {
        v: 1,
        sid: payload.sid,
        iat: payload.iat,
        exp: payload.exp,
    }
}

/** 解析 Cookie 头中的某个值 */
export function readCookie(header: string | undefined, name: string): string | undefined {
    if (!header) return undefined
    for (const piece of header.split(';')) {
        const trimmed = piece.trim()
        if (!trimmed.startsWith(`${name}=`)) continue
        try {
            return decodeURIComponent(trimmed.slice(name.length + 1))
        } catch {
            return undefined
        }
    }
    return undefined
}

function cookieSuffix(secure: boolean): string {
    return `; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
}

export function serializeSessionCookie(token: string, maxAgeSeconds: number, secure: boolean): string {
    return `${SESSION_COOKIE}=${token}; Max-Age=${maxAgeSeconds}${cookieSuffix(secure)}`
}

export function serializeClearedSessionCookie(secure: boolean): string {
    return `${SESSION_COOKIE}=; Max-Age=0${cookieSuffix(secure)}`
}

/** 根据请求协议判断是否加 Secure；本地 http 调试不能加，否则 Cookie 不会发送 */
export function isSecureRequest(url: string, forwardedProto?: string): boolean {
    try {
        if (new URL(url).protocol === 'https:') return true
    } catch {
        /* ignore */
    }
    return forwardedProto?.split(',')[0]?.trim().toLowerCase() === 'https'
}
