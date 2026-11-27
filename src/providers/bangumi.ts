import type {AppConfig, ProviderBaseData, UnifiedSearchItem} from '../types'
import type {HttpClient} from '../lib/http'
import {
    assertId,
    providerData,
    requestJson,
    text,
} from './shared'

const BGM_API_BASE = 'https://api.bgm.tv/v0'
const BGM_HEADERS = {
    accept: 'application/json',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    referer: 'https://bgm.tv/',
}

const TYPE_MAP: Record<string, string> = {
    anime: '动画',
    book: '书籍',
    game: '游戏',
    music: '音乐',
    real: '三次元',
    tv: '电视',
    movie: '电影',
    '1': '书籍',
    '2': '动画',
    '3': '音乐',
    '4': '游戏',
    '6': '三次元',
}

type Json = Record<string, any>

function normalizeType(subject: Json): string {
    for (const field of ['type_name', 'type_cn']) {
        const value = subject?.[field]
        if (typeof value === 'string' && value.trim()) return value.trim()
    }
    const key = subject?.type
    if (key === null || key === undefined) return ''
    return TYPE_MAP[String(key).trim().toLowerCase()] ?? String(key)
}

function getInfoboxValue(infobox: Json[] | undefined, key: string): unknown {
    return infobox?.find((item) => item?.key === key)?.value
}

function infoboxArray(infobox: Json[] | undefined, key: string): string[] | string {
    const value = getInfoboxValue(infobox, key)
    if (Array.isArray(value)) {
        return value.map((item) => text(item?.v)).filter(Boolean)
    }
    return text(value)
}

function staffInfo(infobox: Json[] | undefined): { director: string[]; writer: string[] } {
    const director = infoboxArray(infobox, '导演')
    const writer = infoboxArray(infobox, '脚本')
    return {
        director: Array.isArray(director) ? director : director ? [director] : [],
        writer: Array.isArray(writer) ? writer : writer ? [writer] : [],
    }
}

async function fetchCharacters(
    client: HttpClient,
    config: AppConfig,
    sid: string,
): Promise<Json[]> {
    try {
        return await requestJson<Json[]>(
            client,
            `${BGM_API_BASE}/subjects/${encodeURIComponent(sid)}/characters`,
            {config, headers: BGM_HEADERS},
        )
    } catch (error) {
        console.warn(
            `[bangumi] characters fetch failed for ${sid}:`,
            error instanceof Error ? error.message : error,
        )
        return []
    }
}

export async function fetchBangumi(
    client: HttpClient,
    config: AppConfig,
    rawSid: string,
): Promise<ProviderBaseData> {
    const sid = assertId(rawSid, /^\d+$/, 'bangumi', '12345')
    const headers: Record<string, string> = {...BGM_HEADERS}
    if (config.bangumiAccessToken) headers.authorization = `Bearer ${config.bangumiAccessToken}`

    const subject = await requestJson<Json>(
        client,
        `${BGM_API_BASE}/subjects/${encodeURIComponent(sid)}`,
        {config, headers},
    )
    const characters = await fetchCharacters(client, config, sid)
    const infobox = Array.isArray(subject.infobox) ? subject.infobox : undefined

    const score = subject.rating?.score ?? 0
    const total = subject.rating?.total ?? 0
    const date = text(subject.date)
    const year = date && !Number.isNaN(new Date(date).getTime()) ? date.slice(0, 4) : ''

    return providerData('bangumi', sid, {
        bgm_id: subject.id ?? sid,
        name: text(subject.name),
        name_cn: text(getInfoboxValue(infobox, '中文名'), text(subject.name_cn)),
        link: `https://bangumi.tv/subject/${subject.id ?? sid}`,
        summary: text(subject.summary),
        poster: subject.images?.medium || subject.images?.common || '',
        platform: text(subject.platform),
        type: normalizeType(subject),
        eps: subject.eps || subject.total_episodes || '',
        tags: Array.isArray(subject.meta_tags) ? subject.meta_tags : [],
        characters,
        aka: infobox ? infoboxArray(infobox, '别名') : [],
        ...(infobox ? staffInfo(infobox) : {director: [], writer: []}),
        bgm_rating_average: score,
        bgm_votes: total,
        bgm_rating: score ? `${score} / 10 from ${total} users` : '',
        date,
        year,
    })
}

const SEARCH_TYPE: Record<string, number> = {
    all: 0,
    book: 1,
    anime: 2,
    music: 3,
    game: 4,
    real: 6,
}

/** Bangumi v0 搜索（先尝试新版 POST，接口不可用时退回旧版 search） */
export async function searchBangumi(
    client: HttpClient,
    config: AppConfig,
    query: string,
    limit: number,
    type = 'all',
): Promise<UnifiedSearchItem[]> {
    const headers: Record<string, string> = {...BGM_HEADERS, 'content-type': 'application/json'}
    if (config.bangumiAccessToken) headers.authorization = `Bearer ${config.bangumiAccessToken}`

    try {
        const body: Json = {keyword: query}
        const filterType = SEARCH_TYPE[type] ?? 0
        if (filterType > 0) body.filter = {type: [filterType]}

        const payload = await requestJson<Json>(client, `${BGM_API_BASE}/search/subjects?limit=${limit}`, {
            config,
            headers,
            method: 'POST',
            body: JSON.stringify(body),
        })

        const items: Json[] = Array.isArray(payload.data) ? payload.data : []
        return items.slice(0, limit).map((item) => ({
            site: 'bangumi' as const,
            sid: String(item.id),
            title: text(item.name_cn, text(item.name)),
            subtitle: text(item.name),
            year: text(item.date).slice(0, 4),
            rating: item.rating?.score ?? '',
            poster: item.images?.medium || item.images?.common || '',
            url: `https://bangumi.tv/subject/${item.id}`,
        }))
    } catch (error) {
        console.warn('[bangumi] v0 search failed, trying legacy search:', error instanceof Error ? error.message : error)
    }

    const legacy = await requestJson<Json>(
        client,
        `https://api.bgm.tv/search/subject/${encodeURIComponent(query)}?type=${SEARCH_TYPE[type] ?? 0}&responseGroup=small&max_results=${limit}`,
        {config, headers: BGM_HEADERS},
    )
    const list = Array.isArray(legacy.list) ? legacy.list : []

    return list.slice(0, limit).map((item: Json) => ({
        site: 'bangumi' as const,
        sid: String(item.id),
        title: text(item.name_cn, text(item.name)),
        subtitle: text(item.name),
        year: text(item.air_date).slice(0, 4),
        rating: item.rating?.score ?? '',
        poster: item.images?.medium || item.images?.common || '',
        url: `https://bangumi.tv/subject/${item.id}`,
    }))
}
