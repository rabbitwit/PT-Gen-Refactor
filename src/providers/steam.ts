import type {AppConfig, ProviderBaseData, UnifiedSearchItem} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {assertId, providerData, requestJson, text} from './shared'

const STEAM_APP_DETAILS_URL = 'https://store.steampowered.com/api/appdetails'
const STEAM_SEARCH_URL = 'https://store.steampowered.com/api/storesearch/'
const MAX_SCREENSHOTS = 3

type Json = Record<string, any>

function formatPrice(price: Json | null | undefined) {
    if (!price || typeof price !== 'object') return null
    return {
        currency: text(price.currency),
        initial: typeof price.initial === 'number' ? (price.initial / 100).toFixed(2) : null,
        final: typeof price.final === 'number' ? (price.final / 100).toFixed(2) : null,
        discount: price.discount_percent || 0,
    }
}

export async function fetchSteam(
    client: HttpClient,
    config: AppConfig,
    rawSid: string,
): Promise<ProviderBaseData> {
    const sid = assertId(rawSid, /^\d+$/, 'steam', '570')

    const payload = await requestJson<Json>(client, `${STEAM_APP_DETAILS_URL}?appids=${sid}&l=cn`, {
        config,
        headers: {'accept-language': 'zh-CN,zh;q=0.9'},
    })

    const entry = payload?.[sid]
    if (!entry?.success || !entry.data) {
        throw new ApiError('UPSTREAM_ERROR', 'Steam 未返回应用详情')
    }

    const app = entry.data as Json
    const data: Record<string, unknown> = {
        name: text(app.name, 'N/A'),
        title: text(app.name, 'N/A'),
        type: text(app.type, 'N/A'),
        about_the_game: text(app.about_the_game),
        header_image: text(app.header_image),
        website: text(app.website),
        developers: Array.isArray(app.developers) ? app.developers : [],
        publishers: Array.isArray(app.publishers) ? app.publishers : [],
        release_date: app.release_date ? text(app.release_date.date, 'N/A') : 'N/A',
        coming_soon: Boolean(app.release_date?.coming_soon),
        supported_languages: text(app.supported_languages),
        platforms: {
            windows: Boolean(app.platforms?.windows),
            mac: Boolean(app.platforms?.mac),
            linux: Boolean(app.platforms?.linux),
        },
        categories: Array.isArray(app.categories)
            ? app.categories.map((item: Json) => text(item.description)).filter(Boolean)
            : [],
        genres: Array.isArray(app.genres)
            ? app.genres.map((item: Json) => text(item.description)).filter(Boolean)
            : [],
        pc_requirements: {
            minimum: text(app.pc_requirements?.minimum),
            recommended: text(app.pc_requirements?.recommended),
        },
        screenshots: Array.isArray(app.screenshots)
            ? app.screenshots.slice(0, MAX_SCREENSHOTS).map((shot: Json) => ({
                id: shot.id,
                path_thumbnail: shot.path_thumbnail,
                path_full: shot.path_full,
            }))
            : [],
    }

    const price = formatPrice(app.price_overview)
    if (price) data.price = price

    return providerData('steam', sid, data)
}

export async function searchSteam(
    client: HttpClient,
    config: AppConfig,
    query: string,
    limit: number,
): Promise<UnifiedSearchItem[]> {
    const url = `${STEAM_SEARCH_URL}?term=${encodeURIComponent(query)}&l=schinese&cc=CN`
    const payload = await requestJson<Json>(client, url, {config})
    const items: Json[] = Array.isArray(payload.items) ? payload.items : []

    return items.slice(0, limit).map((item) => ({
        site: 'steam' as const,
        sid: String(item.id),
        title: text(item.name),
        subtitle: text(item.type),
        year: text(item.releasedate).slice(-4).trim(),
        rating: '',
        poster: item.tiny_image || item.image || '',
        url: `https://store.steampowered.com/app/${item.id}/`,
    }))
}
