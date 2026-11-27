/** 未知 JSON 字段转成字符串，空值记为 `''` */
export function asText(value: unknown): string {
    if (value === null || value === undefined) return ''
    return typeof value === 'string' ? value : String(value)
}

export function asTrimmed(value: unknown): string {
    return asText(value).trim()
}

export function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null
}

export function asUnknownList(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
}

export function asStringList(value: unknown): string[] {
    return asUnknownList(value)
        .map((item) => asTrimmed(item))
        .filter(Boolean)
}

/** 按 key 保序去重；空 key 的项直接丢掉 */
export function uniqueBy<T>(items: T[], keyOf: (item: T) => string): T[] {
    const seen = new Set<string>()
    const out: T[] = []
    for (const item of items) {
        const key = keyOf(item)
        if (!key || seen.has(key)) continue
        seen.add(key)
        out.push(item)
    }
    return out
}
