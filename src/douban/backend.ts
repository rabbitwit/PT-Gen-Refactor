import type {AppConfig, DoubanAward, DoubanData, DoubanSearchData, DoubanSearchItem} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {asRecord, asStringList, asTrimmed, asUnknownList} from '../lib/coerce'
import {fetchJsonBackend, tryBackendEndpoints, v1BackendUrl} from '../lib/json-backend'
import {formatUserRating} from '../lib/rating-format'
import {dedupeCelebrities, peopleFromBackend, selectDoubanCast} from './cast'

/**
 * 外部豆瓣后端，用来绕过边缘平台出口拿不到挑战页的问题。
 *
 * 只支持新版 `/api/v1` REST 树：
 *
 * ```http
 * GET {DOUBAN_BACKEND_URL}/{sid}?full=false   # DOUBAN_BACKEND_URL 可为 https://host、.../api/v1 或 .../api/v1/douban
 * GET {DOUBAN_BACKEND_URL}/search?q=...&limit=10
 * Authorization: Bearer {DOUBAN_BACKEND_TOKEN}
 *
 * 200 { "code": 20000, "message": "OK", "data": { ...DoubanData }, "error": null, "meta": {...} }
 * ```
 *
 * 地址本身带的查询串会保留。
 */

function requireDoubanBackendUrls(config: AppConfig, extra?: string): string[] {
    if (config.doubanBackendUrls.length === 0) {
        throw ApiError.notImplemented(
            extra ?? '未配置 DOUBAN_BACKEND_URL，无法通过外部后端获取豆瓣数据',
            extra
                ? undefined
                : {hint: '部署 PT-Gen 外部 API 后，把地址填为 https://<host>/api/v1/douban（或 /api/v1）'},
        )
    }
    return config.doubanBackendUrls
}

function callDoubanBackend(client: HttpClient, config: AppConfig, url: string, notFound?: string) {
    return fetchJsonBackend(client, url, {
        timeoutMs: config.requestTimeoutMs,
        token: config.doubanBackendToken,
        upstream: 'douban-backend',
        authFailed: '豆瓣后端鉴权失败，请检查 DOUBAN_BACKEND_TOKEN',
        notFound,
    })
}

/** 把配置里的地址与 sid 组合成最终请求 URL（默认全量，full=false 才精简） */
export function buildDoubanBackendUrl(base: string, sid: string, full = true): string {
    return v1BackendUrl(
        base,
        'douban',
        [sid],
        full ? {} : {full: 'false'},
        'DOUBAN_BACKEND_URL',
    )
}

function asAwards(value: unknown): DoubanAward[] {
    const groups: DoubanAward[] = []
    for (const item of asUnknownList(value)) {
        const raw = asRecord(item)
        if (!raw) continue
        const festival = asTrimmed(raw.festival)
        const awards = asStringList(raw.awards)
        if (festival && awards.length > 0) groups.push({festival, awards})
    }
    return groups
}

function ratingOrFallback(raw: unknown, average: string, votes: string): string {
    return asTrimmed(raw) || formatUserRating(average, votes)
}

function people(raw: unknown, role: string, requirePrefix?: string) {
    return dedupeCelebrities(peopleFromBackend(raw, role, requirePrefix))
}

/** 把后端返回的 data 归一化成对外契约里的 `DoubanData` */
export function normalizeDoubanBackendData(
    raw: Record<string, unknown>,
    sid: string,
    config: AppConfig,
    options: { full: boolean },
): DoubanData {
    const imdbId = asTrimmed(raw.imdb_id)
    const doubanAverage = asTrimmed(raw.douban_rating_average) || '0.0'
    const doubanVotes = asTrimmed(raw.douban_votes) || '0'
    const imdbAverage = asTrimmed(raw.imdb_rating_average) || '0.0'
    const imdbVotes = asTrimmed(raw.imdb_votes) || '0'
    const full = options.full

    return {
        success: true,
        site: 'douban',
        sid: asTrimmed(raw.sid) || sid,
        link:
            asTrimmed(raw.link) ||
            asTrimmed(raw.douban_link) ||
            `https://movie.douban.com/subject/${encodeURIComponent(sid)}/`,
        chinese_title: asTrimmed(raw.chinese_title),
        foreign_title: asTrimmed(raw.foreign_title),
        year: asTrimmed(raw.year),
        aka: asStringList(raw.aka).sort(),
        region: asStringList(raw.region),
        genre: asStringList(raw.genre),
        language: asStringList(raw.language),
        playdate: asStringList(raw.playdate),
        episodes: asTrimmed(raw.episodes),
        duration: asTrimmed(raw.duration),
        introduction: asTrimmed(raw.introduction),
        poster: asTrimmed(raw.poster),
        tags: asStringList(raw.tags),
        douban_rating_average: doubanAverage,
        douban_votes: doubanVotes,
        douban_rating: ratingOrFallback(raw.douban_rating, doubanAverage, doubanVotes),
        imdb_id: imdbId,
        imdb_link: asTrimmed(raw.imdb_link) || (imdbId ? `https://www.imdb.com/title/${imdbId}/` : ''),
        imdb_rating_average: imdbAverage,
        imdb_votes: imdbVotes,
        imdb_rating: ratingOrFallback(raw.imdb_rating, imdbAverage, imdbVotes),
        director: full ? people(raw.director, '导演', '导演') : [],
        writer: full ? people(raw.writer, '编剧') : [],
        cast: full
            ? selectDoubanCast(people(raw.cast, '演员'), {
                lead: config.castLeadLimit,
                supporting: config.castSupportingLimit,
                voice: config.castVoiceLimit,
            })
            : [],
        awards: full ? asAwards(raw.awards) : [],
    }
}

function pickSearchField(raw: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
        const value = asTrimmed(raw[key])
        if (value) return value
    }
    return ''
}

function searchItemFromRaw(item: unknown): DoubanSearchItem | null {
    const raw = asRecord(item)
    if (!raw) return null
    const sid = pickSearchField(raw, ['sid', 'id'])
    const title = pickSearchField(raw, ['title', 'name'])
    if (!sid || !title) return null
    return {
        sid,
        title,
        url: pickSearchField(raw, ['url', 'link']) || `https://movie.douban.com/subject/${sid}/`,
        subtitle: pickSearchField(raw, ['subtitle', 'description', 'episodes']),
        rating: Number.parseFloat(pickSearchField(raw, ['rating', 'douban_rating_average'])) || 0,
        poster: pickSearchField(raw, ['poster', 'cover', 'image']),
    }
}

function toSearchItems(list: unknown[]): DoubanSearchItem[] {
    return list.flatMap((item) => {
        const parsed = searchItemFromRaw(item)
        return parsed ? [parsed] : []
    })
}

function unwrapSearchItems(payload: unknown): DoubanSearchItem[] {
    const raw = asRecord(payload)
    if (!raw) return []
    return toSearchItems(asUnknownList(raw.items))
}

/** 通过外部后端取豆瓣详情 */
export async function fetchDoubanSubjectViaBackend(
    client: HttpClient,
    config: AppConfig,
    sid: string,
    options: { full: boolean },
): Promise<DoubanData> {
    return tryBackendEndpoints(
        requireDoubanBackendUrls(config),
        async (base) => {
            const payload = await callDoubanBackend(
                client,
                config,
                buildDoubanBackendUrl(base, sid, options.full),
                `豆瓣上未找到条目 ${sid}`,
            )
            const raw = asRecord(payload)
            if (!raw) {
                throw ApiError.upstreamError('豆瓣后端未返回数据', {upstream: 'douban-backend'})
            }
            return normalizeDoubanBackendData(raw, sid, config, options)
        },
        'douban-backend',
    )
}

/** 通过外部后端搜索豆瓣（后端未实现 /search 时抛出，由调用方回退网页搜索） */
export async function searchDoubanViaBackend(
    client: HttpClient,
    config: AppConfig,
    query: string,
    limit: number,
): Promise<DoubanSearchData> {
    const endpoints = requireDoubanBackendUrls(config, '未配置 DOUBAN_BACKEND_URL')

    return tryBackendEndpoints(
        endpoints,
        async (base) => {
            const url = v1BackendUrl(
                base,
                'douban',
                ['search'],
                {q: query, limit},
                'DOUBAN_BACKEND_URL',
            )
            const items = unwrapSearchItems(await callDoubanBackend(client, config, url)).slice(0, limit)
            return {query, url, total: items.length, items}
        },
        'douban-backend',
    )
}
