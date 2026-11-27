import type {AppConfig, ProviderBaseData} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {extractJsAssignmentJson, providerData, requestText, text} from './shared'

const BASE_URL = 'https://hongguoduanju.com'

/** 允许回源的域名；用户传入的链接只能落在这些域名下 */
const ALLOWED_HOSTS = ['hongguoduanju.com', 'novelquickapp.com']
const SHARE_PATH = /\/s\/([^/]+)\/?$/

type Json = Record<string, any>

/**
 * 把用户输入归一化成实际抓取的地址与缓存用的 sid。
 *
 * `sid` 允许是完整链接，因此必须先校验域名：否则 `https://<internal>/...`
 * 会被服务端直接抓取，形成 SSRF。命中官方域名时再抽出 series_id / 分享 slug，
 * 让持久化缓存键保持稳定（链接里的临时参数不会制造重复条目）。
 */
export function resolveHongguoTarget(raw: string): { url: string; sid: string } {
    const value = raw.trim()
    if (!/^https?:\/\//i.test(value)) {
        return value.length > 15
            ? {url: `${BASE_URL}/detail?series_id=${encodeURIComponent(value)}`, sid: value}
            : {url: `${BASE_URL}/s/${encodeURIComponent(value)}/`, sid: value}
    }

    let parsed: URL
    try {
        parsed = new URL(value)
    } catch {
        throw ApiError.badRequest(`无效的红果链接: ${value}`)
    }

    const host = parsed.hostname.toLowerCase()
    const allowed = ALLOWED_HOSTS.some((item) => host === item || host.endsWith(`.${item}`))
    if (!allowed) {
        throw ApiError.badRequest(`红果链接域名不受支持: ${host}`, {hosts: ALLOWED_HOSTS})
    }

    const seriesId = parsed.searchParams.get('series_id')?.trim()
    if (seriesId) {
        return {url: `${BASE_URL}/detail?series_id=${encodeURIComponent(seriesId)}`, sid: seriesId}
    }

    const slug = parsed.pathname.match(SHARE_PATH)?.[1]
    if (slug) {
        return {url: `${BASE_URL}/s/${encodeURIComponent(slug)}/`, sid: slug}
    }

    // 其它路径保持原样，但 host 已在白名单内
    return {url: parsed.toString(), sid: value}
}

export async function fetchHongguo(
    client: HttpClient,
    config: AppConfig,
    sid: string,
): Promise<ProviderBaseData> {
    const raw = sid.trim()
    if (!raw) throw ApiError.badRequest('红果剧集 ID 不能为空')

    const target = resolveHongguoTarget(raw)

    const html = await requestText(client, target.url, {
        config,
        headers: {accept: 'text/html,application/xhtml+xml'},
    })
    const routerData =
        extractJsAssignmentJson(html, 'window._ROUTER_DATA') ||
        extractJsAssignmentJson(html, '_ROUTER_DATA')
    if (!routerData) {
        throw ApiError.upstreamError('无法从红果页面提取 _ROUTER_DATA')
    }

    const loader = routerData.loaderData as Json | undefined
    const videoDetail = loader?.['video-detail-share_page']?.pageData?.video_detail_data as Json | undefined
    const seriesDetail = loader?.detail_page?.seriesDetail as Json | undefined

    let title = ''
    let episodes: unknown = ''
    let actors: unknown = []
    let genres: unknown = []
    let synopsis = ''
    let posterUrl = ''
    let rating: unknown = ''
    let likeCount: unknown = ''
    let favoriteCount: unknown = ''
    let ratingCount: unknown = ''

    if (videoDetail) {
        title = text(videoDetail.title)
        episodes = videoDetail.series_episode_info?.episode_cnt ?? videoDetail.episodes ?? ''
        actors = videoDetail.actors ?? []
        genres = videoDetail.genres ?? []
        synopsis = text(videoDetail.synopsis)
        posterUrl = text(videoDetail.poster_url)
    } else if (seriesDetail) {
        title = text(seriesDetail.series_name)
        episodes = seriesDetail.episode_cnt ?? ''
        actors = seriesDetail.celebrities ?? []
        genres = seriesDetail.tags ?? []
        synopsis = text(seriesDetail.series_intro)
        posterUrl = text(seriesDetail.series_cover)
    } else {
        throw ApiError.upstreamError('红果页面中没有找到剧集数据')
    }

    const social = (loader?.detail_page?.seriesSocialInfo ||
        loader?.['video-detail-share_page']?.pageData?.seriesSocialInfo ||
        {}) as Json
    rating = social.rating ?? videoDetail?.rating ?? ''
    likeCount = social.series_like_count ?? videoDetail?.series_like_count ?? videoDetail?.like_count ?? ''
    favoriteCount = social.series_favorite_count ?? videoDetail?.series_favorite_count ?? videoDetail?.favorite_count ?? ''
    ratingCount = social.rating_count ?? videoDetail?.rating_count ?? ''

    return providerData('hongguo', target.sid, {
        title,
        chinese_title: title,
        episodes,
        actors,
        genres,
        synopsis,
        poster_url: posterUrl,
        rating,
        like_count: likeCount,
        favorite_count: favoriteCount,
        rating_count: ratingCount,
    })
}
