import type {AppConfig} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError, ErrorCode} from '../lib/errors'
import {isTimeoutError} from '../lib/timeout'
import {throwDoubanCookieExpired} from './cookie-error'
import {remainingSeconds, timestampFields, toIso} from '../lib/time'
import {notifyDoubanCookieExpiry} from './cookie-notify'
import {buildDoubanHeaders, getDoubanCookieJar, isDoubanAntiBot, isDoubanChallengeStatus} from './request'

const HEALTH_TTL_MS = 10 * 60 * 1000

export interface DoubanCookieHealth {
    configured: boolean
    valid: boolean | null
    checkedAt: string | null
    expiresAt: string | null
    remainingSeconds: number | null
    reason?: string
}

interface CacheEntry {
    cookie: string
    health: DoubanCookieHealth
    until: number
}

let cache: CacheEntry | null = null
let inflight: Promise<DoubanCookieHealth> | null = null
let loggedTransientHealthFailure = false

/** 超时 / DNS / 连接失败在海外出口上很常见，不当成故障刷屏 */
function isTransientUpstreamError(error: unknown): boolean {
    if (error instanceof ApiError) {
        return error.symbol === ErrorCode.UPSTREAM_TIMEOUT || error.symbol === ErrorCode.UPSTREAM_ERROR
    }
    if (isTimeoutError(error)) return true
    return error instanceof Error
        && /上游请求超时|timed out|ETIMEDOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN|fetch failed/i.test(
            error.message,
        )
}

function snapshot(config: AppConfig, now = Date.now()) {
    const cookie = config.doubanCookie?.trim() ?? ''
    const expiry = timestampFields(config.doubanCookieExpiresAt, now)
    return {
        cookie,
        expiresAtMs: expiry.ms,
        health: {
            configured: Boolean(cookie),
            valid: null,
            checkedAt: null,
            expiresAt: expiry.iso,
            remainingSeconds: expiry.remainingSeconds,
        },
    }
}

function remember(cookie: string, health: DoubanCookieHealth, now = Date.now()): DoubanCookieHealth {
    cache = {cookie, health, until: now + HEALTH_TTL_MS}
    return health
}

function cachedHealth(cookie: string, expiresAtMs: number | null, now: number): DoubanCookieHealth | null {
    if (!cache || cache.cookie !== cookie || cache.until <= now) return null
    return {...cache.health, remainingSeconds: remainingSeconds(expiresAtMs, now)}
}

function expiredHealth(base: DoubanCookieHealth, now: number): DoubanCookieHealth {
    return {...base, valid: false, checkedAt: toIso(now), reason: 'expired'}
}

/** 读取当前缓存状态，不触发任何上游请求 */
export function getCachedDoubanCookieHealth(config: AppConfig): DoubanCookieHealth {
    const now = Date.now()
    const {cookie, expiresAtMs, health} = snapshot(config, now)
    if (!cookie) return health
    if (expiresAtMs !== null && now >= expiresAtMs) return expiredHealth(health, now)
    return cachedHealth(cookie, expiresAtMs, now) ?? health
}

function classifyMineResponse(
    status: number,
    location: string,
    html: string | undefined,
): Pick<DoubanCookieHealth, 'valid' | 'reason'> {
    if (status >= 300 && status < 400) {
        if (location.includes('accounts.douban.com')) return {valid: false, reason: 'login'}
        if (location.includes('sec.douban.com')) return {valid: null, reason: 'blocked'}
        return {valid: null, reason: `redirect:${status}`}
    }
    if (status === 200) {
        return html && isDoubanAntiBot(html) ? {valid: null, reason: 'anti-bot'} : {valid: true}
    }
    if (isDoubanChallengeStatus(status)) return {valid: null, reason: 'blocked'}
    return {valid: null, reason: `http:${status}`}
}

/**
 * 检查豆瓣 Cookie 是否仍然有效。
 *
 * 请求 `www.douban.com/mine/`：
 * - 200：有效
 * - 302 到 accounts.douban.com：登录态失效
 * - 302 到 sec.douban.com / 反爬页：无法确认，返回 unknown
 *
 * 不把 `sec.douban.com` 判定为 Cookie 过期，避免把出口 IP 风控误报成 Cookie 失效。
 */
export async function checkDoubanCookie(
    client: HttpClient,
    config: AppConfig,
    options: { force?: boolean } = {},
): Promise<DoubanCookieHealth> {
    const now = Date.now()
    const {cookie, expiresAtMs, health: base} = snapshot(config, now)
    if (!cookie) return base

    // 即使命中缓存也检查一次到期告警；内部有去重与重试节流。
    await notifyDoubanCookieExpiry(config)

    if (expiresAtMs !== null && now >= expiresAtMs) {
        return remember(cookie, expiredHealth(base, now), now)
    }

    if (!options.force) {
        const cached = cachedHealth(cookie, expiresAtMs, now)
        if (cached) return cached
    }

    if (inflight) return inflight

    const check = async (): Promise<DoubanCookieHealth> => {
        const stamped: DoubanCookieHealth = {...base, checkedAt: toIso(Date.now())}
        let health: DoubanCookieHealth

        try {
            const response = await client.request('https://www.douban.com/mine/', {
                timeoutMs: Math.min(config.requestTimeoutMs, 8_000),
                headers: buildDoubanHeaders(getDoubanCookieJar(config)),
                redirect: 'manual',
            })
            const html = response.status === 200 ? await response.text() : undefined
            health = {
                ...stamped,
                ...classifyMineResponse(response.status, response.headers.get('location') ?? '', html),
            }
        } catch (error) {
            health = {...stamped, valid: null, reason: 'network'}
            if (isTransientUpstreamError(error)) {
                if (!loggedTransientHealthFailure) {
                    loggedTransientHealthFailure = true
                    console.info(
                        '[douban] Cookie 健康检查暂时无法连上豆瓣（超时或网络），按未确认处理，不影响启动',
                    )
                }
            } else {
                console.warn('[douban] Cookie 健康检查失败:', error instanceof Error ? error.message : error)
            }
        }

        return remember(cookie, health)
    }

    inflight = check().finally(() => {
        inflight = null
    })

    return inflight
}

/** 被动检测到登录失效时，更新缓存，避免后续请求继续使用失效 Cookie */
export function markDoubanCookieInvalid(config: AppConfig, reason = 'login'): DoubanCookieHealth {
    const now = Date.now()
    const {cookie, health} = snapshot(config, now)
    const invalid = {...health, valid: false as const, checkedAt: toIso(now), reason}
    if (cookie) remember(cookie, invalid, now)
    return invalid
}

function expiredMessage(health: DoubanCookieHealth): string {
    const expires = health.expiresAt ? `（过期时间 ${health.expiresAt}）` : ''
    if (health.reason === 'expired') return `DOUBAN_COOKIE 已过期${expires}，请更新 DOUBAN_COOKIE`
    if (health.reason === 'blocked') {
        return `DOUBAN_COOKIE 无法确认（豆瓣要求验证，可能已失效或出口 IP 被风控）${expires}，请重新导出或检查出口`
    }
    return `DOUBAN_COOKIE 已失效，请重新从浏览器导出${expires}`
}

/** 在真正抓取网页前确认 Cookie 可用；无法确认时继续请求，不误伤网络抖动 */
export async function assertDoubanCookieUsable(
    client: HttpClient,
    config: AppConfig,
): Promise<void> {
    if (!config.doubanCookie?.trim()) return

    const health = await checkDoubanCookie(client, config)
    // 出口连不上豆瓣时不要再抓详情：面板反代约 12s 就会 HTML 502
    if (health.reason === 'network') {
        throw ApiError.upstreamTimeout(
            '当前出口无法连上豆瓣（超时或网络中断），详情请求已中止以免被面板反代掐成 502',
            {
                reason: 'network',
                hint: 'bot-hosting 等机房出口常访问不了豆瓣；请配置 DOUBAN_BACKEND_URL 由能访问豆瓣的机器代取',
            },
        )
    }
    // blocked 无法确认，继续抓详情，由真正的页面响应决定成败
    if (health.valid !== false) return

    throwDoubanCookieExpired(health.reason ?? 'login', expiredMessage(health), {
        expiresAt: health.expiresAt,
        checkedAt: health.checkedAt,
    })
}
