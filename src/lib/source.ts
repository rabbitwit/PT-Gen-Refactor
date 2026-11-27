import type {ProviderSite} from '../types'

export interface DetectedSource {
    site: ProviderSite
    sid: string
    /** TMDB / Trakt 的媒体类型 */
    type?: string
}

const PATTERNS: Array<{ site: ProviderSite; regex: RegExp; type?: string; group?: number }> = [
    {site: 'douban_book', regex: /book\.douban\.com\/subject\/(\d+)/i},
    {site: 'douban', regex: /movie\.douban\.com\/subject\/(\d+)/i},
    {site: 'douban', regex: /douban\.com\/movie\/subject\/(\d+)/i},
    {site: 'douban', regex: /douban\.com\/(?:movie|subject)\/(\d+)/i},
    {site: 'imdb', regex: /imdb\.com\/title\/(tt\d+)/i},
    {site: 'imdb', regex: /^(tt\d{7,9})$/i},
    {site: 'bangumi', regex: /(?:bgm\.tv|bangumi\.tv)\/subject\/(\d+)/i},
    {site: 'tmdb', regex: /themoviedb\.org\/(movie|tv)\/(\d+)/i, group: 2},
    {site: 'trakt', regex: /trakt\.tv\/(movies|shows)\/([^/?#]+)/i, group: 2},
    {site: 'steam', regex: /store\.steampowered\.com\/app\/(\d+)/i},
    {site: 'melon', regex: /melon\.com\/album\/(?:detail\.htm\?albumId=)?(\d+)/i},
    {site: 'qq_music', regex: /y\.qq\.com\/n\/ryqq(?:_v\d+)?\/albumDetail\/(\w+)/i},
    {site: 'hongguo', regex: /(?:novelquickapp\.com|hongguo)\S*/i},
]

/** 从 URL / 纯 ID 推断数据源 */
export function detectSource(input: string): DetectedSource | null {
    const value = input.trim()
    if (!value) return null

    for (const pattern of PATTERNS) {
        const match = value.match(pattern.regex)
        if (!match) continue

        if (pattern.site === 'tmdb') {
            return {
                site: 'tmdb',
                sid: match[2],
                type: match[1].toLowerCase() === 'tv' ? 'tv' : 'movie',
            }
        }
        if (pattern.site === 'trakt') {
            return {
                site: 'trakt',
                sid: match[2],
                type: match[1].toLowerCase() === 'shows' ? 'show' : 'movie',
            }
        }
        if (pattern.site === 'hongguo') {
            return {site: 'hongguo', sid: value}
        }
        return {site: pattern.site, sid: match[pattern.group ?? 1]}
    }

    return null
}

/** 把用户输入规范化成指定数据源的 ID */
export function resolveSid(site: ProviderSite, input: string): { sid: string; type?: string } {
    const value = input.trim()

    // 明确带类型前缀：movie:550 / tv:1399
    if (site === 'tmdb' || site === 'trakt') {
        const prefixed = value.match(/^(movie|tv|show|movies|shows)[:/](.+)$/i)
        if (prefixed) {
            const rawType = prefixed[1].toLowerCase()
            const type =
                site === 'tmdb'
                    ? rawType === 'tv' || rawType === 'show'
                        ? 'tv'
                        : 'movie'
                    : rawType === 'show' || rawType === 'shows' || rawType === 'tv'
                        ? 'show'
                        : 'movie'
            return {sid: prefixed[2].trim(), type}
        }
    }

    const detected = detectSource(value)
    if (detected && detected.site === site) {
        return {sid: detected.sid, type: detected.type}
    }

    return {sid: value}
}
