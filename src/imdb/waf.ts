import type {AppConfig} from '../types'
import {WAF_TTL_MS} from '../config'
import {mergeCookieHeaders, normalizeCookieHeader} from '../lib/cookie'
import {ApiError} from '../lib/errors'

/** AWS WAF 挑战的响应特征 / Markers that identify an AWS WAF challenge response. */
const CHALLENGE_STATUS = 202
// noinspection SpellCheckingInspection
const CHALLENGE_MARKERS = ['window.gokuProps', 'aws-waf-token', 'awsWafCookieDomainList', 'AwsWafIntegration']

const WAF_COOKIE_NAME = 'aws-waf-token'

export interface CookieState {
    /** 可直接用于 `Cookie` 请求头的完整字符串 */
    cookieHeader: string
    expiresAt: number
    origin: 'browser' | 'env' | 'response'
}

let cookieState: CookieState | null = null
/** 进行中的取 token 任务：并发请求共享同一次挑战，避免同时开多个浏览器 */
let pendingToken: Promise<CookieState | null> | null = null
/**
 * 浏览器不可用的判定缓存。
 *
 * 缺少 Chromium 二进制时每次请求都重新启动会白等十几秒，
 * 这里记住失败结果，后续直接跳过浏览器路径。
 */
let browserUnavailable = false

/** 判断响应是否为 AWS WAF 挑战 / Detect whether a response is a WAF challenge. */
export function isChallengeResponse(status: number, body?: string): boolean {
    // 真实页面内嵌的脚本也会出现 aws-waf-token / AwsWafIntegration 等字样，
    // 只要拿到 __NEXT_DATA__ 就必须认定为内容页，否则会误判成挑战。
    if (hasNextData(body)) return false
    if (status === CHALLENGE_STATUS) return true
    if (!body) return false
    return CHALLENGE_MARKERS.some((marker) => body.includes(marker))
}

/** 判断 HTML 是否为 IMDb 真实页面（含 __NEXT_DATA__）/ Detect a real IMDb page. */
export function hasNextData(html: string | undefined): boolean {
    return Boolean(html && html.includes('id="__NEXT_DATA__"'))
}

export function resetChallengeState(): void {
    cookieState = null
    pendingToken = null
}

/** 从 Set-Cookie 响应头中提取可复用的 cookie 头 / Extract cookies from Set-Cookie headers. */
export function cookieHeaderFromResponse(response: Response): string {
    const setCookies =
        typeof response.headers.getSetCookie === 'function'
            ? response.headers.getSetCookie()
            : (response.headers.get('set-cookie') ?? '').split(/,(?=[^;]+=)/)

    const pairs: string[] = []
    for (const raw of setCookies) {
        const pair = raw.split(';', 1)[0]?.trim()
        if (pair && pair.includes('=')) pairs.push(pair)
    }
    return pairs.join('; ')
}

/** 把响应 Set-Cookie 合并进当前 cookie 缓存 */
export function rememberCookiesFromResponse(response: Response): void {
    const extra = cookieHeaderFromResponse(response)
    if (!extra) return
    cookieState = {
        cookieHeader: cookieState ? mergeCookieHeaders(cookieState.cookieHeader, extra) : extra,
        expiresAt: Date.now() + WAF_TTL_MS,
        origin: 'response',
    }
}

/**
 * 构造与真实浏览器一致的 UA。
 *
 * 无头模式的默认 UA 带 `HeadlessChrome`，IMDb 会直接返回 403，
 * 因此必须按实际内核版本覆盖成普通 Chrome。
 */
function browserUserAgent(version: string): string {
    const major = version.split('.')[0] || '131'
    const host = (globalThis as { process?: { platform?: string } }).process?.platform
    const platform =
        host === 'darwin'
            ? 'Macintosh; Intel Mac OS X 10_15_7'
            : host === 'win32'
                ? 'Windows NT 10.0; Win64; x64'
                : 'X11; Linux x86_64'

    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`
}

/**
 * 等调试端口可用。
 *
 * 注意不能把 `--remote-debugging-port` 设成 0（由 Chrome 随机分配）：
 * 实测那样启动时 `navigator.webdriver` 会变成 true，IMDb 立刻弹验证码；
 * 固定端口才是 false。因此这里先分配一个空闲端口再交给 Chrome。
 */
async function waitForCdp(port: number, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}/json/version`)
            if (response.ok) {
                await response.body?.cancel()
                return
            }
        } catch {
            /* 端口尚未就绪 */
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
    }

    throw new Error('浏览器启动超时：调试端口不可用')
}

/** 向系统要一个空闲端口（bind 后立刻释放，极小的竞态窗口可以接受） */
async function findFreePort(createServer: typeof import('node:net')['createServer']): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = createServer()
        server.unref()
        server.on('error', reject)
        server.listen(0, '127.0.0.1', () => {
            const address = server.address()
            const port = typeof address === 'object' && address ? address.port : 0
            server.close(() => (port > 0 ? resolve(port) : reject(new Error('无法分配调试端口'))))
        })
    })
}

type BrowserPage = {
    goto: (url: string, options?: Record<string, unknown>) => Promise<unknown>
    waitForFunction: (fn: () => boolean, arg?: unknown, options?: Record<string, unknown>) => Promise<unknown>
}

type BrowserContextLike = {
    newPage: () => Promise<BrowserPage>
    cookies: () => Promise<Array<{ name: string; value: string }>>
}

type BrowserLike = {
    version: () => string
    newContext: (options: Record<string, unknown>) => Promise<BrowserContextLike>
    close: () => Promise<void>
}

type PlaywrightLike = {
    chromium: {
        connectOverCDP: (endpoint: string) => Promise<BrowserLike>
        executablePath: () => string
    }
}

/**
 * 用无头浏览器访问 IMDb 首页，等 AWS WAF 自动求解后取出 aws-waf-token。
 *
 * 不能用 `playwright.chromium.launch()`：它会附加 `--enable-automation`，
 * 使 `navigator.webdriver === true`，IMDb 的 WAF 会因此判定为机器人并
 * 对详情页返回验证码（Human Verification）。这里自己拉起浏览器进程，
 * 再通过 CDP 连接，`navigator.webdriver` 保持 false，页面才能正常返回。
 *
 * 这是 Node 专属能力：Cloudflare Workers / 纯边缘运行时没有浏览器，
 * 只能依赖 `IMDB_COOKIE` / `IMDB_WAF_TOKEN` 或外部 IMDb 后端。
 */
async function acquireTokenWithBrowser(config: AppConfig): Promise<string | null> {
    if (!config.canUseBrowser || browserUnavailable) return null

    let browser: BrowserLike | null = null
    let child: { kill: () => void } | null = null
    let profileDir = ''

    try {
        // 动态 import：包名放在变量里，避免 Workers 构建时静态解析 Node 依赖
        const playwrightModule = 'playwright-core'
        const playwright = (await import(playwrightModule)) as PlaywrightLike

        const fsModule = 'node:fs/promises'
        const pathModule = 'node:path'
        const osModule = 'node:os'
        const cpModule = 'node:child_process'
        const netModule = 'node:net'
        const [fs, path, os, cp, net] = await Promise.all([
            import(fsModule) as Promise<typeof import('node:fs/promises')>,
            import(pathModule) as Promise<typeof import('node:path')>,
            import(osModule) as Promise<typeof import('node:os')>,
            import(cpModule) as Promise<typeof import('node:child_process')>,
            import(netModule) as Promise<typeof import('node:net')>,
        ])

        profileDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imdb-browser-'))

        let executablePath: string
        let baseArgs: string[]

        if (config.isLocal) {
            executablePath = config.playwrightExecutablePath || playwright.chromium.executablePath()
            baseArgs = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--headless=new',
            ]
        } else {
            // 无服务器环境使用 @sparticuz/chromium 提供的精简二进制
            const chromiumModule = '@sparticuz/chromium'
            const sparticuz = (await import(chromiumModule)) as {
                default: { args: string[]; executablePath: () => Promise<string> }
            }
            executablePath = await sparticuz.default.executablePath()
            baseArgs = sparticuz.default.args
        }

        const debugPort = await findFreePort(net.createServer)

        const args = [
            ...baseArgs,
            '--no-first-run',
            '--no-default-browser-check',
            `--remote-debugging-port=${debugPort}`,
            `--user-data-dir=${profileDir}`,
        ]

        const spawned = cp.spawn(executablePath, args, {stdio: 'ignore'})
        child = spawned

        // 启动失败 / 进程提前退出时立刻报错，不必等满超时
        const startupFailure = new Promise<never>((_, reject) => {
            spawned.once('error', reject)
            spawned.once('exit', (code) => reject(new Error(`浏览器进程提前退出（code=${code}）`)))
        })
        void startupFailure.catch(() => undefined)

        const readyPromise = waitForCdp(debugPort, Math.min(config.browserTokenTimeoutMs, 20_000))
        void readyPromise.catch(() => undefined)

        await Promise.race([readyPromise, startupFailure])

        browser = await playwright.chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`)
        const context = await browser.newContext({
            userAgent: browserUserAgent(browser.version()),
            viewport: {width: 1280, height: 720},
            locale: 'en-US',
        })
        const page = await context.newPage()

        await page.goto('https://www.imdb.com/', {
            waitUntil: 'domcontentloaded',
            timeout: config.browserTokenTimeoutMs,
        })

        // 修复原实现的参数位置错误：waitForFunction(fn, arg, options)。
        // 原代码把 { timeout } 当成了 arg，导致实际使用默认 30s 超时。
        await page
            .waitForFunction(
                () => document.cookie.includes('aws-waf-token='),
                undefined,
                {timeout: Math.min(config.browserTokenTimeoutMs, 15_000)},
            )
            .catch(() => undefined)

        const cookies = await context.cookies()
        const wafCookie = cookies.find((item) => item.name === WAF_COOKIE_NAME)
        return wafCookie?.value ?? null
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[waf] 浏览器获取 token 失败:', message)

        // 二进制缺失 / 平台不支持属于永久性失败，记下来避免每次请求都重试
        if (/Executable doesn't exist|Cannot find module|not supported|ENOENT/i.test(message)) {
            browserUnavailable = true
            console.error('[waf] 判定浏览器不可用，后续请求将跳过 HTML 通道（请运行 npx playwright install）')
        }
        return null
    } finally {
        if (browser) await browser.close().catch(() => undefined)
        if (child) child.kill()

        if (profileDir) {
            const fsModule = 'node:fs/promises'
            const fs = (await import(fsModule)) as typeof import('node:fs/promises')
            // 进程退出到文件句柄释放有延迟，忽略清理失败
            await fs.rm(profileDir, {recursive: true, force: true}).catch(() => undefined)
        }
    }
}

/** 由环境变量构造 cookie 状态（无浏览器场景的唯一来源） */
function cookieStateFromEnv(config: AppConfig): CookieState | null {
    if (config.imdbCookie) {
        const normalized = normalizeCookieHeader(config.imdbCookie)
        if (normalized) {
            return {cookieHeader: normalized, expiresAt: Date.now() + WAF_TTL_MS, origin: 'env'}
        }
    }

    if (config.imdbWafToken) {
        const token = config.imdbWafToken.trim().replace(/^aws-waf-token=/, '')
        if (token) {
            return {
                cookieHeader: `${WAF_COOKIE_NAME}=${token}`,
                expiresAt: Date.now() + WAF_TTL_MS,
                origin: 'env',
            }
        }
    }

    return null
}

/**
 * 获取可用的 WAF cookie。
 *
 * 逻辑参照`getChallengeCookies`：
 * 1. 命中未过期的缓存直接复用；
 * 2. 并发调用共享同一个 `pendingToken`，避免同时触发多次挑战；
 * 3. `forceRefresh` 用于在真正遇到挑战时强制重新获取。
 */
export async function getWafCookie(
    config: AppConfig,
    options: { forceRefresh?: boolean } = {},
): Promise<CookieState | null> {
    if (!options.forceRefresh && cookieState && cookieState.expiresAt > Date.now()) {
        return cookieState
    }

    if (!options.forceRefresh && pendingToken) return pendingToken

    const acquireCookie = async (): Promise<CookieState | null> => {
        // 手填 cookie 优先级最高：一次性配置，无需启动浏览器
        const fromEnv = cookieStateFromEnv(config)

        // 已验证浏览器不可用时，直接使用手填 cookie，避免无效等待
        if (browserUnavailable) return fromEnv

        const token = await acquireTokenWithBrowser(config)
        const fromBrowser: CookieState | null = token
            ? {
                cookieHeader: fromEnv
                    ? mergeCookieHeaders(fromEnv.cookieHeader, `${WAF_COOKIE_NAME}=${token}`)
                    : `${WAF_COOKIE_NAME}=${token}`,
                expiresAt: Date.now() + WAF_TTL_MS,
                origin: 'browser',
            }
            : null

        return fromBrowser ?? fromEnv
    }

    const task = acquireCookie().finally(() => {
        pendingToken = null
    })

    pendingToken = task
    const resolved = await task

    if (resolved) {
        cookieState = resolved
        if (resolved.origin === 'browser') {
            console.log('[waf] 已获取新的 aws-waf-token（浏览器）')
        }
    }

    return resolved
}

/** 让缓存的 cookie 立刻失效，下次调用会重新挑战 */
export function invalidateWafCookie(): void {
    resetChallengeState()
}

/** 没有可用 cookie/cookie 获取路径时抛出明确的错误，而不是继续发必失败的请求 */
export function assertCookieStrategy(config: AppConfig): void {
    if (!config.canUseBrowser && !config.imdbCookie && !config.imdbWafToken) {
        throw new ApiError(
            'UPSTREAM_CHALLENGE',
            '当前运行时不支持启动浏览器，且未配置 IMDB_COOKIE / IMDB_WAF_TOKEN',
            {
                retryable: false,
                details: {
                    hint:
                        '在 Cloudflare Workers 上请配置 IMDB_BACKEND_URL（及 IMDB_BACKEND_TOKEN），' +
                        '或手动提供 IMDB_COOKIE（浏览器访问 imdb.com 后复制 aws-waf-token 的值）',
                },
            },
        )
    }
}
