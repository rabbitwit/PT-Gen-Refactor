import type {PersonEntry} from '../types'
import {asRecord, asTrimmed, asUnknownList, uniqueBy} from '../lib/coerce'
import {selectCastByLimits, type CastLimits} from '../lib/cast-select'

/** 按职责补回豆瓣原始的「饰 / 配」前缀；已带前缀或非演员/配音则原样返回 */
export function withCharacterMarker(character: string, role: string): string {
    if (/^[饰配]\s+/.test(character)) return character
    const marker = role === '配音' ? '配' : role === '演员' ? '饰' : ''
    return marker ? `${marker} ${character}` : character
}

/**
 * 从豆瓣角色文本解析「职责」与「饰演角色」。
 *
 * 原始文本形如：
 * - `演员 Actor (饰 安迪·杜佛兰 Andy Dufresne)` → role=演员, character=饰 安迪·杜佛兰
 * - `配音 Voice (配 安迪·杜佛兰)` → role=配音, character=配 安迪·杜佛兰
 * - `导演 Director` → role=导演, character=''
 */
export function parseDoubanRole(raw: string, fallbackRole: string): { role: string; character: string } {
    const text = (raw ?? '').trim()
    const bracketMatch = text.match(/[（(]\s*([饰配])\s*([^）)]+)[）)]/)
    const simpleMatch = text.match(/^([饰配])\s+(.+)$/)
    const character = bracketMatch
        ? `${bracketMatch[1]} ${bracketMatch[2].trim()}`
        : simpleMatch
            ? `${simpleMatch[1]} ${simpleMatch[2].trim()}`
            : ''

    if (/^配音/.test(text)) return {role: '配音', character}
    if (/^演员/.test(text)) return {role: '演员', character}
    if (/^导演/.test(text)) return {role: '导演', character}
    if (/^编剧/.test(text)) return {role: '编剧', character}
    if (/^[配饰]/.test(text)) return {role: text.startsWith('配') ? '配音' : '演员', character}
    return {role: fallbackRole, character}
}

/**
 * 把后端的人员条目统一成 `PersonEntry`。
 *
 * 两种历史形态都要兼容：
 * - 新契约：`{ name, link, role: '演员', image, character }`
 * - 网页解析结果：`{ name, link, role: '饰 安迪', avatar }`
 */
export function peopleFromBackend(
    value: unknown,
    fallbackRole: string,
    requirePrefix?: string,
): PersonEntry[] {
    const result: PersonEntry[] = []
    for (const item of asUnknownList(value)) {
        const raw = asRecord(item)
        if (!raw) continue
        const name = asTrimmed(raw.name)
        if (!name) continue

        const roleText = asTrimmed(raw.role)
        if (requirePrefix && roleText && !roleText.startsWith(requirePrefix)) continue

        const parsed = parseDoubanRole(roleText, fallbackRole)
        let character = asTrimmed(raw.character)
        character = character ? withCharacterMarker(character, parsed.role) : parsed.character

        result.push({
            name,
            link: asTrimmed(raw.link),
            role: parsed.role,
            image: asTrimmed(raw.image ?? raw.avatar),
            character,
        })
    }
    return result
}

/** 按 link 去重（同一人可能在不同代表作下重复出现） */
export function dedupeCelebrities(list: PersonEntry[]): PersonEntry[] {
    return uniqueBy(list, (item) => item.link || item.name)
}

/**
 * 豆瓣没有 IMDb 的官方 Stars 分组，按页面顺序截取。
 * 动画片全员配音时，靠前的配音演员仍算主演。
 */
export function selectDoubanCast(entries: PersonEntry[], limits: CastLimits): PersonEntry[] {
    const voice = entries.filter((entry) => entry.role === '配音')
    const regular = entries.filter((entry) => entry.role !== '配音')
    if (regular.length === 0) {
        return selectCastByLimits(voice, [], voice.slice(limits.lead), limits)
    }
    return selectCastByLimits(regular, regular.slice(limits.lead), voice, limits)
}
