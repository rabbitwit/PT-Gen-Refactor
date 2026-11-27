import type {AppConfig} from '../types'
import {cookieHeader, parseCookieString} from '../lib/cookie'

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'

export const DOUBAN_HEADERS_BASE: Record<string, string> = {
    'user-agent': USER_AGENT,
    accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8',
    'cache-control': 'max-age=0',
    // 不设 connection：逐跳头应由传输层管理，Bun / Workers 的 fetch 对它的处理不一致
    'upgrade-insecure-requests': '1',
    'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
}

/** 反爬页面特征：命中后不能当正常页面解析 */
const ANTI_BOT_PATTERN = /验证码|检测到有异常请求|机器人程序|访问受限|请先登录|没有访问权限/i
/** 豆瓣的“页面不存在”提示 */
const NOT_FOUND_PATTERN = /你想访问的页面不存在/

export const DOUBAN_NOT_FOUND = 'The corresponding resource does not exist.'
export const DOUBAN_ANTI_BOT =
    'Douban blocked the request (captcha/anti-bot). Provide a valid cookie or try again later.'

export function isDoubanAntiBot(html: string | undefined): boolean {
    return Boolean(html && ANTI_BOT_PATTERN.test(html))
}

/**
 * 豆瓣风控/未登录时不一定回 5xx，而是：
 * - `403`（数据中心 IP 常见）或 `418` / `429`
 * - `202` 的 JS 挑战页（跟随重定向后正文只有「载入中」，极短）
 *
 * 这些是上游拒绝，不是「上游异常」，不能映射成 502。
 */
export function isDoubanChallengeStatus(status: number): boolean {
    return status === 202 || status === 403 || status === 418 || status === 429
}

/** 跟随重定向后命中的 JS 挑战页：正文极短且只有「载入中」 */
export function isDoubanChallengePage(html: string | undefined): boolean {
    return Boolean(html && html.length < 5000 && /载入中/.test(html))
}

export function isDoubanNotFound(html: string | undefined): boolean {
    return Boolean(html && NOT_FOUND_PATTERN.test(html))
}

export function buildDoubanHeaders(jar?: Record<string, string>): Record<string, string> {
    const headers = {...DOUBAN_HEADERS_BASE}
    if (jar && Object.keys(jar).length > 0) headers.cookie = cookieHeader(jar)
    return headers
}

/** 只使用手动配置的 DOUBAN_COOKIE； */
export function getDoubanCookieJar(config: AppConfig): Record<string, string> {
    const manualCookie = config.doubanCookie?.trim()
    return manualCookie ? parseCookieString(manualCookie) : {}
}

/** 是否为豆瓣的登录/验证重定向（用于给出明确错误） */
export function isDoubanBlockedRedirect(status: number, location: string | undefined): boolean {
    if (![301, 302, 303, 307, 308].includes(status)) return false
    const target = location ?? ''
    return target.includes('sec.douban.com') || target.includes('accounts.douban.com')
}
