/** ISO 8601 或 Unix 秒/毫秒 → 毫秒；无法解析时返回 null */
export function parseTimestampMs(value: string | undefined): number | null {
    const raw = value?.trim()
    if (!raw) return null
    const digits = /^\d+$/.test(raw)
    const n = digits ? Number(raw) : Date.parse(raw)
    if (!Number.isFinite(n)) return null
    return digits && n < 1e12 ? n * 1000 : n
}

export function toIso(timestamp: number): string {
    return new Date(timestamp).toISOString()
}

export function remainingSeconds(expiresAtMs: number | null, now = Date.now()): number | null {
    if (expiresAtMs === null) return null
    return Math.max(0, Math.floor((expiresAtMs - now) / 1000))
}

export function timestampFields(value: string | undefined, now = Date.now()) {
    const ms = parseTimestampMs(value)
    return {
        ms,
        iso: ms === null ? null : toIso(ms),
        remainingSeconds: remainingSeconds(ms, now),
    }
}
