import type {AppConfig, Bindings, RuntimeKind} from './types'
import {readBoolean, readEnv, readNonNegativeNumber, readNumber, splitBackendUrls} from './lib/env'

export {API_VERSION, VERSION} from './version'

/** 一次 WAF cookie 的主动失效时间，避免长期复用已被吊销的 token */
export const WAF_TTL_MS = 240_000

const EXPLICIT_RUNTIMES: ReadonlySet<string> = new Set(['node', 'bun', 'edge'])

/** 默认 15 天。评分变化慢，不必频繁回源。 */
export const DEFAULT_RATING_REFRESH_SECONDS = 15 * 24 * 60 * 60

/** 评分回源间隔：0 关闭；其余限制在 30 秒–30 天，避免误配成 1 秒打爆上游 */
function normalizeRatingRefresh(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0
    return Math.min(30 * 24 * 60 * 60, Math.max(30, Math.floor(value)))
}

/**
 * 探测当前运行时。
 *
 * - Cloudflare Workers 里 `navigator.userAgent` 为 `Cloudflare-Workers`
 * - Bun 暴露 `globalThis.Bun`
 * - 其余情况（含 Vercel / 自建服务器）按 Node 处理
 */
export function detectRuntime(override?: string): RuntimeKind {
    const forced = override?.toLowerCase()
    if (forced && EXPLICIT_RUNTIMES.has(forced)) return forced as RuntimeKind

    const scope = globalThis as {
        navigator?: { userAgent?: string }
        EdgeRuntime?: string
        Bun?: unknown
    }

    if (scope.navigator?.userAgent === 'Cloudflare-Workers') return 'edge'
    if (typeof scope.EdgeRuntime !== 'undefined') return 'edge'
    if (typeof scope.Bun !== 'undefined') return 'bun'
    return 'node'
}

export function resolveConfig(env: Bindings | undefined): AppConfig {
    const runtime = detectRuntime(readEnv(env, 'RUNTIME'))

    // 浏览器二进制的来源按平台区分：
    // - Linux（Vercel / Docker / 面板服）：用 @sparticuz/chromium，无需 playwright install
    // - Windows / macOS（本地开发）：用 Playwright 自带的 Chromium
    // `IS_LOCAL` 可显式覆盖；Linux 上强制本地时需先 npx playwright-core install chromium。
    const host = (globalThis as { process?: { platform?: string } }).process?.platform
    const isLocal =
        readBoolean(env, 'IS_LOCAL') ||
        readEnv(env, 'NODE_ENV') === 'development' ||
        host !== 'linux'

    // 只有 Node 运行时可以启动无头浏览器；Bun 的 Playwright 支持有限，默认关闭
    const canUseBrowser = runtime === 'node'

    return {
        runtime,
        apiToken: readEnv(env, 'API_TOKEN'),
        authSecret: readEnv(env, 'AUTH_SECRET'),
        sessionTtlSeconds: Math.min(86_400, Math.max(60, readNumber(env, 'SESSION_TTL_SECONDS', 1800))),
        // 前导零 bit 数：12 约 4096 次哈希，浏览器通常几百毫秒内完成
        powDifficulty: Math.min(20, Math.max(8, readNumber(env, 'POW_DIFFICULTY', 12))),

        imdbCookie: readEnv(env, 'IMDB_COOKIE'),
        imdbWafToken: readEnv(env, 'IMDB_WAF_TOKEN'),
        cacheTtlSeconds: readNumber(env, 'CACHE_TTL_SECONDS', 600),
        // 命中缓存后每隔多少秒回源比对一次评分；<=0 关闭，正数限制在 30 秒–30 天
        ratingRefreshSeconds: normalizeRatingRefresh(readNonNegativeNumber(env, 'RATING_REFRESH_SECONDS', DEFAULT_RATING_REFRESH_SECONDS)),
        requestTimeoutMs: readNumber(env, 'REQUEST_TIMEOUT_MS', 30_000),
        htmlTimeoutMs: readNumber(env, 'HTML_TIMEOUT_MS', 20_000),
        browserTokenTimeoutMs: readNumber(env, 'BROWSER_TOKEN_TIMEOUT_MS', 25_000),
        castLeadLimit: Math.min(readNumber(env, 'CAST_LEAD_LIMIT', 10), 50),
        castSupportingLimit: Math.min(readNumber(env, 'CAST_SUPPORTING_LIMIT', 20), 100),
        castVoiceLimit: Math.min(readNumber(env, 'CAST_VOICE_LIMIT', 5), 50),
        // 0 关闭限流（只建议本地调试时使用）
        rateLimitMax: readNonNegativeNumber(env, 'RATE_LIMIT_MAX', 60),
        isLocal,
        playwrightExecutablePath: readEnv(env, 'PLAYWRIGHT_EXECUTABLE_PATH'),
        canUseBrowser,
        doubanCookie: readEnv(env, 'DOUBAN_COOKIE'),
        doubanCookieExpiresAt: readEnv(env, 'DOUBAN_COOKIE_EXPIRES_AT'),
        telegramBotToken: readEnv(env, 'TELEGRAM_BOT_TOKEN'),
        telegramChatId: readEnv(env, 'TELEGRAM_CHAT_ID'),
        imdbBackendUrl: readEnv(env, 'IMDB_BACKEND_URL'),
        imdbBackendUrls: splitBackendUrls(readEnv(env, 'IMDB_BACKEND_URL')),
        imdbBackendToken: readEnv(env, 'IMDB_BACKEND_TOKEN'),
        doubanBackendUrl: readEnv(env, 'DOUBAN_BACKEND_URL'),
        doubanBackendUrls: splitBackendUrls(readEnv(env, 'DOUBAN_BACKEND_URL')),
        doubanBackendToken: readEnv(env, 'DOUBAN_BACKEND_TOKEN'),
        tmdbApiKey: readEnv(env, 'TMDB_API_KEY'),
        traktClientId: readEnv(env, 'TRAKT_API_CLIENT_ID'),
        traktAccessToken: readEnv(env, 'TRAKT_ACCESS_TOKEN'),
        qqCookie: readEnv(env, 'QQ_COOKIE'),
        bangumiAccessToken: readEnv(env, 'BANGUMI_ACCESS_TOKEN'),
    }
}

/** HTML 兜底是否可用：要么能开浏览器，要么手动提供了 cookie/token */
export function canUseHtmlFallback(config: AppConfig): boolean {
    return config.canUseBrowser || Boolean(config.imdbCookie) || Boolean(config.imdbWafToken)
}

/**
 * IMDb 接口在当前部署上是否可用。
 *
 * - Node / Vercel / Bun：`fetch` 直连 IMDb
 * - Cloudflare Workers：先试 `connect()`（`cloudflare:sockets`）裸 TCP；IMDb 域名在
 *   Cloudflare 前端后面，多数情况会被判 `TCP Loop detected`，此时退回 `fetch`（可能 429）。
 *   外部后端（`IMDB_BACKEND_URL`）是 Workers 上唯一稳定的通道。
 *
 * 因此所有运行时都尝试提供 IMDb 接口：边缘上失败会返回上游错误，而不是预先 501。
 */
export function canUseImdb(_config: AppConfig): boolean {
    return true
}

/** 是否配置了外部 IMDb 后端。Workers 上通常用作唯一数据通道 */
export function hasImdbBackend(config: AppConfig): boolean {
    return config.imdbBackendUrls.length > 0
}

/**
 * 是否配置了外部豆瓣后端。
 *
 * 边缘平台的出口 IP 被豆瓣风控，直接抓网页常返回 403 或验证页；
 * 由一台能访问豆瓣的机器代取网页是可靠方式。
 */
export function hasDoubanBackend(config: AppConfig): boolean {
    return config.doubanBackendUrls.length > 0
}
