import {readFileSync} from 'node:fs'
import {processEnv, unquoteEnvValue} from './env'

/**
 * 读取 `.env`，只填补尚未设置或为空的变量。
 *
 * Pterodactyl / Bot-Hosting 常把所有键都预置成空字符串；Bun/Node 默认
 * 「已存在就不覆盖」，导致文件里填了 `DOUBAN_COOKIE` 也读不到。
 * 本加载器对空值放行，非空的进程/面板环境变量仍优先。
 *
 * 仅由 Node / Bun 入口调用，不要从 Workers 入口引用。
 */
export function applyEnvFile(filePath = '.env'): void {
    const env = processEnv()
    if (!env) return

    let text: string
    try {
        text = readFileSync(filePath, 'utf8')
    } catch {
        return
    }

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const stripped = line.startsWith('export ') ? line.slice(7).trim() : line
        const eq = stripped.indexOf('=')
        if (eq <= 0) continue

        const key = stripped.slice(0, eq).trim()
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue

        const current = env[key]
        if (typeof current === 'string' && current.trim().length > 0) continue

        let value = stripped.slice(eq + 1).trim()
        const comment = value.search(/\s+#/)
        if (comment >= 0 && !value.startsWith("'") && !value.startsWith('"')) {
            value = value.slice(0, comment).trim()
        }
        env[key] = unquoteEnvValue(value)
    }
}
