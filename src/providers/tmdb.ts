import type {AppConfig, ProviderBaseData, UnifiedSearchItem} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {imdbTitleLink, resolveImdbRating} from '../imdb/lookup'
import {assertId, providerData, requestJson, text} from './shared'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const TMDB_LANGUAGE = 'zh-CN'

type Json = Record<string, any>

function auth(config: AppConfig, url: string): { url: string; headers: Record<string, string> } {
    const key = config.tmdbApiKey?.trim()
    if (!key) {
        throw new ApiError(
            'CONFIG_REQUIRED',
            '未配置 TMDB_API_KEY，请在环境变量中填入 TMDB v3 API Key 或 v4 Read Access Token',
        )
    }

    // v4 Read Access Token 是 JWT，走 Bearer；v3 key 走查询参数
    if (key.startsWith('eyJ')) {
        return {url, headers: {authorization: `Bearer ${key}`}}
    }
    const parsed = new URL(url)
    parsed.searchParams.set('api_key', key)
    return {url: parsed.toString(), headers: {}}
}

function positiveNumbers(values: unknown[]): number[] {
    return values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
}

/**
 * TMDb 的剧集详情经常返回空的 `episode_run_time`。
 * 此时取第一季各集 runtime 的平均值；再退回首集 / 最近一集 / 下一集。
 */
async function resolveEpisodeRuntime(
    client: HttpClient,
    config: AppConfig,
    sid: string,
    detail: Json,
): Promise<string> {
    const direct = positiveNumbers(Array.isArray(detail.episode_run_time) ? detail.episode_run_time : [])
    if (direct.length) return direct.join(' / ')

    const seasons = Array.isArray(detail.seasons) ? detail.seasons : []
    const seasonNumber = seasons
        .filter((season: Json) => Number(season?.season_number) > 0 && Number(season?.episode_count) > 0)
        .sort((a: Json, b: Json) => Number(a.season_number) - Number(b.season_number))[0]?.season_number

    if (seasonNumber != null) {
        const target = auth(
            config,
            `${TMDB_BASE}/tv/${sid}/season/${seasonNumber}?language=${TMDB_LANGUAGE}`,
        )
        const season = await requestJson<Json>(client, target.url, {
            config,
            headers: target.headers,
        }).catch(() => null)
        const runtimes = positiveNumbers(
            Array.isArray(season?.episodes) ? season.episodes.map((episode: Json) => episode?.runtime) : [],
        )
        if (runtimes.length) {
            const average = runtimes.reduce((sum, value) => sum + value, 0) / runtimes.length
            return String(Math.round(average))
        }
    }

    const last = Number(detail.last_episode_to_air?.runtime)
    if (Number.isFinite(last) && last > 0) return String(last)
    const next = Number(detail.next_episode_to_air?.runtime)
    return Number.isFinite(next) && next > 0 ? String(next) : ''
}

export async function fetchTmdb(
    client: HttpClient,
    config: AppConfig,
    mediaTypeRaw: string,
    rawId: string,
): Promise<ProviderBaseData> {
    const mediaType = mediaTypeRaw === 'tv' || mediaTypeRaw === 'show' ? 'tv' : 'movie'
    const sid = assertId(rawId, /^\d+$/, 'tmdb', '550')

    const target = auth(
        config,
        `${TMDB_BASE}/${mediaType}/${sid}?language=${TMDB_LANGUAGE}&append_to_response=credits,external_ids,translations,release_dates,content_ratings`,
    )

    const detail = await requestJson<Json>(client, target.url, {
        config,
        headers: target.headers,
    })

    const images = (path: unknown) => (typeof path === 'string' && path ? `${IMAGE_BASE}${path}` : '')
    const isMovie = mediaType === 'movie'
    const title = text(detail.title, text(detail.name))
    const originalTitle = text(detail.original_title, text(detail.original_name))
    const releaseDate = text(detail.release_date, text(detail.first_air_date))
    const countries = Array.isArray(detail.production_countries)
        ? detail.production_countries.map((item: Json) => text(item.name)).filter(Boolean)
        : []
    const languages = Array.isArray(detail.spoken_languages)
        ? detail.spoken_languages
            .map((item: Json) => text(item.name, text(item.english_name)))
            .filter(Boolean)
        : []
    const genres = Array.isArray(detail.genres)
        ? detail.genres.map((item: Json) => text(item.name)).filter(Boolean)
        : []
    const crew: Json[] = Array.isArray(detail.credits?.crew) ? detail.credits.crew : []
    const cast: Json[] = Array.isArray(detail.credits?.cast) ? detail.credits.cast : []
    const imdbId = text(detail.external_ids?.imdb_id, text(detail.imdb_id))

    const rating =
        typeof detail.vote_average === 'number' && detail.vote_average > 0
            ? `${detail.vote_average.toFixed(1)} / 10 from ${detail.vote_count ?? 0} users`
            : ''

    const episodeRuntime = isMovie
        ? ''
        : await resolveEpisodeRuntime(client, config, sid, detail)

    let imdbRating = ''
    let imdbAverage: string | number = 0
    let imdbVotes: string | number = 0
    if (imdbId) {
        const formatted = await resolveImdbRating(client, config, imdbId, 'tmdb')
        imdbRating = formatted.formatted
        imdbAverage = formatted.average
        imdbVotes = formatted.votes
    }

    return providerData('tmdb', sid, {
        tmdb_id: `${mediaType}/${sid}`,
        media_type: mediaType,
        title,
        original_title: originalTitle,
        poster: images(detail.poster_path),
        backdrop: images(detail.backdrop_path),
        overview: text(detail.overview),
        release_date: releaseDate,
        first_air_date: text(detail.first_air_date),
        year: releaseDate.slice(0, 4),
        runtime: isMovie ? text(detail.runtime) : '',
        episode_run_time: episodeRuntime,
        number_of_episodes: !isMovie ? detail.number_of_episodes : undefined,
        number_of_seasons: !isMovie ? detail.number_of_seasons : undefined,
        genres,
        languages,
        countries,
        tmdb_rating: rating,
        tmdb_rating_average: detail.vote_average ?? 0,
        tmdb_votes: detail.vote_count ?? 0,
        imdb_id: imdbId,
        imdb_link: imdbTitleLink(imdbId),
        imdb_rating: imdbRating,
        imdb_rating_average: imdbAverage,
        imdb_votes: imdbVotes,
        directors: crew.filter((item) => item.job === 'Director'),
        producers: crew.filter((item) => item.job === 'Producer'),
        writers: crew.filter((item) => ['Screenplay', 'Writer', 'Story'].includes(item.job)),
        cast: cast.slice(0, 15),
    })
}

export async function searchTmdb(
    client: HttpClient,
    config: AppConfig,
    query: string,
    limit: number,
): Promise<UnifiedSearchItem[]> {
    const target = auth(
        config,
        `${TMDB_BASE}/search/multi?language=${TMDB_LANGUAGE}&query=${encodeURIComponent(query)}&include_adult=false`,
    )
    const payload = await requestJson<Json>(client, target.url, {
        config,
        headers: target.headers,
    })
    const results: Json[] = Array.isArray(payload.results) ? payload.results : []
    const images = (path: unknown) => (typeof path === 'string' && path ? `${IMAGE_BASE}${path}` : '')

    return results
        .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, limit)
        .map((item) => ({
            site: 'tmdb' as const,
            sid: `${item.media_type === 'tv' ? 'tv' : 'movie'}:${item.id}`,
            title: text(item.title, text(item.name)),
            subtitle: text(item.original_title, text(item.original_name)),
            year: text(item.release_date, text(item.first_air_date)).slice(0, 4),
            rating: typeof item.vote_average === 'number' ? item.vote_average : '',
            poster: images(item.poster_path),
            url: `https://www.themoviedb.org/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`,
        }))
}
