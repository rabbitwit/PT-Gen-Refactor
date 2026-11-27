import type {AppConfig} from '../types'
import {fetchWithTimeout} from '../lib/timeout'
import {timestampFields} from '../lib/time'

const EXPIRY_WARNING_MS = 24 * 60 * 60 * 1000
const TELEGRAM_TIMEOUT_MS = 10_000
const ALERT_RETRY_MS = 5 * 60 * 1000

let alertedExpiry: number | null = null
let alertAttemptAt = 0

/**
 * 到期前 24 小时发送 Telegram 告警。
 *
 * 去重状态保存在当前进程内；多实例或 Workers 多 isolate 可能重复发送一次。
 */
export async function notifyDoubanCookieExpiry(config: AppConfig): Promise<void> {
    const expiry = timestampFields(config.doubanCookieExpiresAt)
    if (expiry.ms === null || !expiry.iso) return
    if (!config.telegramBotToken?.trim() || !config.telegramChatId?.trim()) return

    const now = Date.now()
    if (now < expiry.ms - EXPIRY_WARNING_MS) return
    if (alertedExpiry === expiry.ms) return
    if (now - alertAttemptAt < ALERT_RETRY_MS) return

    alertAttemptAt = now
    const hours = Math.max(0, Math.round((expiry.ms - now) / 3_600_000))
    const text =
        now >= expiry.ms
            ? `PT-Gen: 豆瓣 Cookie 已过期（${expiry.iso}），请更新 DOUBAN_COOKIE。`
            : `PT-Gen: 豆瓣 Cookie 将在约 ${hours} 小时后过期（${expiry.iso}），请及时更新 DOUBAN_COOKIE。`

    if (await sendTelegram(config, text)) alertedExpiry = expiry.ms
}

async function sendTelegram(config: AppConfig, text: string): Promise<boolean> {
    const token = config.telegramBotToken?.trim()
    const chatId = config.telegramChatId?.trim()
    if (!token || !chatId) return false

    try {
        const response = await fetchWithTimeout(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    disable_web_page_preview: true,
                }),
            },
            TELEGRAM_TIMEOUT_MS,
        )
        if (!response.ok) {
            console.warn(`[douban] Telegram 告警失败: HTTP ${response.status}`)
            return false
        }
        return true
    } catch (error) {
        // 不要把包含 Bot Token 的请求 URL 写进日志
        console.warn('[douban] Telegram 告警失败:', error instanceof Error ? error.name : 'unknown')
        return false
    }
}
