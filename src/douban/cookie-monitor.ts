import {resolveConfig} from '../config'
import {processEnv} from '../lib/env'
import {getHttpClient} from '../lib/http'
import {scheduleUnrefRepeat} from '../lib/timeout'
import {checkDoubanCookie} from './cookie-health'
import {notifyDoubanCookieExpiry} from './cookie-notify'

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

let started = false

/**
 * Node / Bun 的主动 Cookie 监控。
 *
 * Workers/Vercel 没有常驻定时器，改为在豆瓣请求前和 `/api/douban/cookie-status`
 * 中按需检查，结果缓存 10 分钟。
 */
export function startDoubanCookieMonitor(): void {
    if (started) return
    started = true

    const config = resolveConfig(processEnv())
    if (!config.doubanCookie && !config.doubanCookieExpiresAt) return

    scheduleUnrefRepeat(async () => {
        try {
            await notifyDoubanCookieExpiry(config)
            if (!config.doubanCookie) return
            const client = await getHttpClient(config)
            await checkDoubanCookie(client, config, {force: true})
        } catch (error) {
            console.warn('[douban] Cookie 监控失败:', error instanceof Error ? error.message : error)
        }
    }, CHECK_INTERVAL_MS, 5_000)
}
