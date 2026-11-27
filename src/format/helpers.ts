/** 把单个值包装成数组；数组原样返回，空值返回 [] */
export function ensureArray<T = unknown>(value: T | T[] | null | undefined): T[] {
    if (value === null || value === undefined) return []
    return Array.isArray(value) ? value : [value]
}

/** 安全读取字符串 */
export function safe(value: unknown, fallback = ''): string {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'string') return value.trim() || fallback
    return String(value)
}

/** 角色对象的演员列表 */
function formatActorList(actors: unknown): string {
    if (Array.isArray(actors)) {
        return actors
            .map((actor) => {
                if (typeof actor === 'string') return actor.trim()
                if (actor && typeof actor === 'object') {
                    const item = actor as Record<string, unknown>
                    return safe(item.name ?? item.name_cn ?? item.actor)
                }
                return ''
            })
            .filter(Boolean)
            .join(' / ')
    }
    return safe(actors)
}

/**
 * 把 Bangumi 角色对象格式化为 `角色名 (中文名): 演员`。
 * Bangumi 的游戏条目经常没有配音演员，此时只输出角色名，避免留下悬空的冒号。
 */
export function formatCharacters(chars: unknown[] = []): string[] {
    return chars
        .filter(Boolean)
        .map((item) => {
            const character = item as Record<string, unknown>
            const name = safe(character.name)
            const nameCn = safe(character.name_cn)
            const actors = formatActorList(character.actors)
            const title = nameCn ? `${name} (${nameCn})` : name || nameCn
            if (!title) return null
            return actors ? `${title}: ${actors}` : title
        })
        .filter((value): value is string => Boolean(value))
}
