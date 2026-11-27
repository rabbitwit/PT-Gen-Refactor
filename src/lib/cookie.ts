/** 解析 `name=value; name2=value2`；按第一个 `=` 切分，因为 token 值里可能含 `=` */
export function parseCookieString(raw: string): Record<string, string> {
    const jar: Record<string, string> = {}
    for (const part of raw.split(';')) {
        const pair = part.trim()
        if (!pair) continue
        const eq = pair.indexOf('=')
        if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim()
    }
    return jar
}

export function cookieHeader(jar: Record<string, string>): string {
    return Object.entries(jar)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ')
}

export function normalizeCookieHeader(raw: string): string {
    return cookieHeader(parseCookieString(raw))
}

/** 合并两个 cookie 头，同名以后者为准 */
export function mergeCookieHeaders(base: string, extra: string): string {
    return cookieHeader({...parseCookieString(base), ...parseCookieString(extra)})
}
