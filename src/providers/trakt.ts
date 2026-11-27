import type {AppConfig, ProviderBaseData, UnifiedSearchItem} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {parseTimestampMs, toIso} from '../lib/time'
import {providerData, requestJson, text, unique} from './shared'

const TRAKT_BASE = 'https://api.trakt.tv'

type Json = Record<string, any>

const DIRECTOR_JOBS = new Set(['director'])
const WRITER_JOBS = new Set(['writer', 'screenplay', 'story', 'teleplay', 'creator'])

function headers(config: AppConfig, extra: Record<string, string> = {}): Record<string, string> {
    const clientId = config.traktClientId?.trim()
    if (!clientId) {
        throw new ApiError(
            'CONFIG_REQUIRED',
            '未配置 TRAKT_API_CLIENT_ID：Trakt 官方 API 必须带 Client ID，请到 https://trakt.tv/oauth/applications 创建应用后填入',
        )
    }
    const result: Record<string, string> = {
        'content-type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': clientId,
        ...extra,
    }
    if (config.traktAccessToken) result.authorization = `Bearer ${config.traktAccessToken}`
    return result
}

function mediaType(raw: string): 'movie' | 'show' {
    const value = raw.trim().toLowerCase()
    if (value === 'movie' || value === 'movies' || value === 'film') return 'movie'
    if (value === 'show' || value === 'shows' || value === 'tv' || value === 'series') return 'show'
    throw new ApiError('INVALID_SOURCE_ID', `不支持的 Trakt 类型: ${raw}，可选 movie / show`)
}

function normalizeId(raw: string): string {
    const id = raw.trim()
    if (!id) throw new ApiError('INVALID_SOURCE_ID', 'Trakt ID 不能为空')
    return id
}

/** Trakt 的图片字段可能是字符串、字符串数组或 `{ full, thumb }`；统一补全协议 */
function imageUrl(value: unknown): string {
    const raw = text(value)
    if (!raw) return ''
    if (raw.startsWith('//')) return `https:${raw}`
    if (/^https?:\/\//i.test(raw)) return raw
    return `https://${raw.replace(/^\/+/, '')}`
}

function posterOf(item: Json): string {
    const poster = item?.images?.poster
    if (typeof poster === 'string') return imageUrl(poster)
    if (Array.isArray(poster)) return imageUrl(poster[0])
    return imageUrl(poster?.full ?? poster?.thumb)
}

/** 把 Trakt 的 ISO 国家 / 语言代码转成可读名称；环境不支持 Intl.DisplayNames 时退回大写代码 */
function displayName(value: string, type: 'region' | 'language'): string {
    const code = value.trim()
    if (!code) return ''
    // Intl.DisplayNames 对地区代码区分大小写，'us' 会原样返回；先规范成 'US'
    const normalized = type === 'region' ? code.toUpperCase() : code.toLowerCase()
    try {
        const DisplayNames = (Intl as unknown as {
            DisplayNames?: new (
                locales: string[],
                options: { type: 'region' | 'language' },
            ) => { of: (code: string) => string | undefined }
        }).DisplayNames
        const name = DisplayNames ? new DisplayNames(['en'], {type}).of(normalized) : undefined
        if (name) return name
    } catch {
        // 未知代码或运行时不支持 Intl.DisplayNames
    }
    return normalized
}

/** Trakt 时间是 ISO 字符串，格式化结果只需要日期部分 */
function dateOnly(value: unknown): string {
    const raw = text(value)
    if (!raw) return ''
    const ms = parseTimestampMs(raw)
    return ms === null ? raw : toIso(ms).slice(0, 10)
}

function personName(entry: Json): string {
    return text(entry?.person?.name, text(entry?.name))
}

/** 人员接口按部门分组，只取真正的主创职位，避免把副导演 / 场记当成导演 */
function pickCrew(entries: unknown, jobs: Set<string>): Json[] {
    if (!Array.isArray(entries)) return []
    return entries.filter((entry) => jobs.has(text(entry?.job).toLowerCase()))
}

function links(item: Json, type: 'movie' | 'show') {
    const ids = item?.ids ?? {}
    const slug = text(ids.slug)
    return {
        imdb_link: ids.imdb ? `https://www.imdb.com/title/${ids.imdb}/` : '',
        trakt_link: slug ? `https://trakt.tv/${type === 'movie' ? 'movies' : 'shows'}/${slug}` : '',
        tmdb_link: ids.tmdb ? `https://www.themoviedb.org/${type === 'movie' ? 'movie' : 'tv'}/${ids.tmdb}` : '',
        tvdb_link: ids.tvdb ? `https://thetvdb.com/dereferrer/${type === 'movie' ? 'movie' : 'series'}/${ids.tvdb}` : '',
    }
}

export async function fetchTrakt(
    client: HttpClient,
    config: AppConfig,
    typeRaw: string,
    rawId: string,
): Promise<ProviderBaseData> {
    const type = mediaType(typeRaw)
    const id = normalizeId(rawId)
    const path = type === 'movie' ? 'movies' : 'shows'

    // 人员接口默认就含名称与角色；seasons 是独立接口，详情接口不会返回季列表
    const [detail, people, seasonList] = await Promise.all([
        requestJson<Json>(client, `${TRAKT_BASE}/${path}/${encodeURIComponent(id)}?extended=full,images`, {
            config,
            headers: headers(config),
        }),
        requestJson<Json>(
            client,
            `${TRAKT_BASE}/${path}/${encodeURIComponent(id)}/people`,
            {config, headers: headers(config)},
        ).catch(() => ({}) as Json),
        type === 'show'
            ? requestJson<Json[]>(
                client,
                `${TRAKT_BASE}/${path}/${encodeURIComponent(id)}/seasons?extended=full`,
                {config, headers: headers(config)},
            ).catch(() => [] as Json[])
            : Promise.resolve([] as Json[]),
    ])

    if (!detail?.title) {
        throw ApiError.notFound(`Trakt 上未找到条目 ${id}`)
    }

    const year = detail.year ?? 0
    const rating = typeof detail.rating === 'number' && detail.rating > 0
        ? `${detail.rating.toFixed(1)} / 10 from ${detail.votes ?? 0} users`
        : ''
    const seasons = Array.isArray(seasonList)
        ? seasonList
            .map((season: Json) => ({
                number: season.number,
                episodeCount: season.episode_count ?? season.aired_episodes ?? 0,
            }))
            .filter((season) => typeof season.number === 'number' && season.number > 0)
            .sort((a, b) => a.number - b.number)
        : []

    const crew = people?.crew ?? {}
    const directors = pickCrew(crew.directing, DIRECTOR_JOBS)
    // “created by” 是剧集主创；没有标为 Writer 的条目时用它兜底
    const writing = [
        ...(Array.isArray(crew.writing) ? crew.writing : []),
        ...(Array.isArray(crew['created by']) ? crew['created by'] : []),
    ]
    const writers = writing.filter((entry) =>
        WRITER_JOBS.has(text(entry?.job).toLowerCase()),
    )
    const cast = Array.isArray(people?.cast)
        ? people.cast
            .slice(0, 10)
            .map((entry: Json) => ({
                name: personName(entry),
                character: text(
                    entry?.character,
                    Array.isArray(entry?.characters) ? entry.characters[0] : '',
                ),
            }))
            .filter((person: { name: string }) => Boolean(person.name))
        : []

    const peopleMap = {
        directors: unique(directors.map(personName).filter(Boolean)),
        writers: unique(writers.map(personName).filter(Boolean)),
        cast,
    }

    const languages = unique(
        (Array.isArray(detail.languages)
                ? detail.languages
                : detail.language
                    ? [detail.language]
                    : []
        )
            .map((code: unknown) => displayName(text(code), 'language'))
            .filter(Boolean),
    )

    return providerData('trakt', id, {
        type: type === 'movie' ? 'movie' : 'tv',
        title: text(detail.title),
        year,
        country: displayName(text(detail.country), 'region'),
        language: languages,
        certification: text(detail.certification),
        runtime: detail.runtime ?? '',
        seasons,
        aired_episodes: detail.aired_episodes ?? 0,
        released: dateOnly(detail.released),
        first_aired: dateOnly(detail.first_aired),
        rating: detail.rating ?? 0,
        votes: detail.votes ?? 0,
        rating_format: rating,
        genres: Array.isArray(detail.genres) ? detail.genres : [],
        overview: text(detail.overview),
        poster: posterOf(detail),
        trakt_id: detail.ids?.trakt,
        slug: detail.ids?.slug,
        ...links(detail, type),
        people: peopleMap,
    })
}

export async function searchTrakt(
    client: HttpClient,
    config: AppConfig,
    query: string,
    limit: number,
): Promise<UnifiedSearchItem[]> {
    const payload = await requestJson<Json[]>(
        client,
        `${TRAKT_BASE}/search/movie,show?query=${encodeURIComponent(query)}&extended=full,images&limit=${limit}`,
        {config, headers: headers(config)},
    )

    const items: UnifiedSearchItem[] = []
    for (const entry of payload) {
        const media = entry.movie ?? entry.show
        if (!media) continue
        const type = entry.type === 'show' ? 'show' : 'movie'
        const link = links(media, type)
        items.push({
            site: 'trakt',
            sid: `${type}:${media.ids?.trakt ?? media.ids?.slug ?? media.title}`,
            title: text(media.title),
            subtitle: text(media.overview).slice(0, 120),
            year: text(media.year),
            rating: typeof media.rating === 'number' ? media.rating : '',
            poster: posterOf(media),
            url: link.trakt_link,
        })
    }
    return items.slice(0, limit)
}
