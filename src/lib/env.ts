import type {Bindings} from '../types'

export function processEnv(): Record<string, string | undefined> | undefined {
    return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
}

/** 去掉 dotenv / 面板里多包的一层引号，避免 Cookie 名变成 `'ll` */
export function unquoteEnvValue(value: string): string {
    const trimmed = value.trim()
    if (trimmed.length < 2) return trimmed
    const start = trimmed[0]
    const end = trimmed[trimmed.length - 1]
    if (start === "'" && end === "'") return trimmed.slice(1, -1)
    if (start === '"' && end === '"') {
        return trimmed
            .slice(1, -1)
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
    }
    return trimmed
}

/**
 * 读取一个配置项，优先使用平台注入的绑定（Workers `c.env`），
 * 其次回退到 `process.env`（Node / Bun / Vercel）。
 *
 * 边缘运行时里 `process` 可能不存在，所以必须做防御式访问。
 */
export function readEnv(env: Bindings | undefined, key: string): string | undefined {
    const fromBindings = env?.[key]
    if (typeof fromBindings === 'string' && fromBindings.trim().length > 0) {
        return unquoteEnvValue(fromBindings)
    }

    const fromProcess = processEnv()?.[key]
    if (typeof fromProcess === 'string' && fromProcess.trim().length > 0) {
        return unquoteEnvValue(fromProcess)
    }

    return undefined
}

export function readBoolean(env: Bindings | undefined, key: string, fallback = false): boolean {
    const raw = readEnv(env, key)?.toLowerCase()
    if (raw === undefined) return fallback
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

export function readNumber(env: Bindings | undefined, key: string, fallback: number): number {
    const raw = readEnv(env, key)
    if (!raw) return fallback
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * 同 `readNumber`，但允许 0。
 *
 * 「0 = 关闭」的开关（`RATING_REFRESH_SECONDS`、`RATE_LIMIT_MAX`）不能用
 * `readNumber`：它把 0 当成无效值回退到默认值，开关永远关不掉。
 */
export function readNonNegativeNumber(env: Bindings | undefined, key: string, fallback: number): number {
    const raw = readEnv(env, key)
    if (!raw) return fallback
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

/**
 * 把环境变量拆成 URL 列表。逗号、分号、空白都能分隔，方便填多个后端。
 * 去重并丢掉空段；单个地址时行为与原来完全一致。
 */
export function splitBackendUrls(raw?: string): string[] {
    if (!raw) return []
    const seen = new Set<string>()
    const urls: string[] = []
    for (const part of raw.split(/[\s,;]+/)) {
        const url = part.trim().replace(/\/+$/, '')
        if (!url || seen.has(url)) continue
        seen.add(url)
        urls.push(url)
    }
    return urls
}
