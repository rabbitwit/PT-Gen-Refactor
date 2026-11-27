const encoder = new TextEncoder()

export class ApiClientError extends Error {
    constructor(message, options = {}) {
        super(message)
        this.name = 'ApiClientError'
        this.code = options.code ?? 0
        this.type = options.type ?? 'UNKNOWN'
        this.status = options.status ?? 0
        this.details = options.details
        this.retryable = Boolean(options.retryable)
    }
}

/** 统计 SHA-256 摘要的前导零 bit 数，与后端 session.ts 保持一致 */
function leadingZeroBits(bytes) {
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

/**
 * 解 PoW：找到 solution 使 SHA-256(`${challenge}:${solution}`) 的前导零 bit
 * 数达到 difficulty。默认 12 约 4096 次哈希，通常几百毫秒。
 */
async function solveChallenge(challenge, difficulty) {
    if (!globalThis.crypto?.subtle) {
        throw new ApiClientError('当前环境不支持 WebCrypto，请使用 HTTPS 访问', {
            type: 'AUTH_CHALLENGE',
        })
    }

    const target = Math.max(1, Math.min(Number(difficulty) || 12, 20))
    const prefix = `${challenge}:`
    const maxAttempts = target >= 20 ? 4_000_000 : 1_500_000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const digest = new Uint8Array(
            await crypto.subtle.digest('SHA-256', encoder.encode(prefix + attempt)),
        )
        if (leadingZeroBits(digest) >= target) return String(attempt)
    }

    throw new ApiClientError('工作量证明计算超时，请刷新重试', {type: 'AUTH_CHALLENGE'})
}

let sessionPromise = null

/** 单飞：并发请求同时遇到 401 时只换取一次会话 */
async function ensureSession() {
    if (sessionPromise) return sessionPromise

    sessionPromise = (async () => {
        const challenge = await request('/api/auth/challenge', {skipAuth: true, timeout: 15000})
        if (!challenge?.challenge) {
            throw new ApiClientError('服务端未返回验证挑战', {type: 'AUTH_CHALLENGE'})
        }

        const solution = await solveChallenge(challenge.challenge, challenge.difficulty)
        await request('/api/auth/session', {
            skipAuth: true,
            method: 'POST',
            body: {challenge: challenge.challenge, solution},
            timeout: 20000,
        })
    })().finally(() => {
        sessionPromise = null
    })

    return sessionPromise
}

function buildHeaders(hasBody) {
    const headers = {Accept: 'application/json'}
    if (hasBody) headers['Content-Type'] = 'application/json'
    return headers
}

async function send(path, options) {
    const {params = {}, timeout = 30000, method = 'GET', body, skipAuth = false} = options
    const url = new URL(path, window.location.origin)

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
        const response = await fetch(url.toString(), {
            method,
            // 会话保存在 HttpOnly Cookie 中，同源请求自动携带
            credentials: 'same-origin',
            headers: buildHeaders(body !== undefined),
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        })
        return {response, skipAuth}
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new ApiClientError('Request timed out', {type: 'TIMEOUT', retryable: true})
        }
        throw new ApiClientError(error?.message || 'Network request failed', {
            type: 'NETWORK_ERROR',
            retryable: true,
        })
    } finally {
        clearTimeout(timer)
    }
}

async function parse(response) {
    let payload = null
    try {
        payload = await response.json()
    } catch {
        throw new ApiClientError(`Unexpected response (HTTP ${response.status})`, {
            type: 'BAD_RESPONSE',
            status: response.status,
        })
    }

    if (!response.ok || payload?.code !== 20000) {
        throw new ApiClientError(payload?.message || `HTTP ${response.status}`, {
            code: payload?.code,
            type: payload?.error?.type || (response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR'),
            status: response.status,
            details: payload?.error?.details,
            retryable: payload?.error?.retryable,
        })
    }

    return payload.data
}

/**
 * 统一请求入口。
 *
 * UI 从不持有 API Token：首次 401 时自动完成 PoW 并换取 HttpOnly 会话，
 * 然后重试一次。`API_TOKEN` 仅用于服务端配置的外部客户端调用。
 */
export async function request(path, options = {}) {
    let {response, skipAuth} = await send(path, options)

    if (response.status === 401 && !skipAuth) {
        await ensureSession()
        ;({response} = await send(path, options))
    }

    return parse(response)
}

export function getConfig() {
    return request('/api/config', {timeout: 10000, skipAuth: true})
}

export function search(query, source = 'auto', limit = 12) {
    return request('/api/v1/search', {params: {q: query, source, limit}, timeout: 45000})
}

/**
 * 详情获取。
 *
 * 规范入口是 `/api/v1/{provider}/{id}`；只有在站点未知（`auto`）或用户直接贴了
 * 链接时才退回 `/api/v1/resolve`，由服务端推断数据源。
 */
export function getDetail({source, sid, url, type, full = true}) {
    const site = source && source !== 'auto' ? source : undefined
    const query = {type, full: full ? 'true' : 'false'}

    if (site && sid && !url) {
        return request(`/api/v1/${encodeURIComponent(site)}/${encodeURIComponent(sid)}`, {
            params: query,
            timeout: 60000,
        })
    }

    return request('/api/v1/resolve', {
        params: {...query, source: site, id: sid, url},
        timeout: 60000,
    })
}
