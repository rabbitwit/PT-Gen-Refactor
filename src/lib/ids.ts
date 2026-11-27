import type {ProviderSite} from '../types'
import {ApiError} from './errors'

/** 豆瓣 subject id 是纯数字 */
export function normalizeDoubanId(raw: string): string {
    const trimmed = raw.trim()
    if (!/^\d{4,12}$/.test(trimmed)) {
        throw new ApiError('INVALID_DOUBAN_ID', `无效的豆瓣 ID: "${raw}"，应为纯数字（如 1292052）`)
    }
    return trimmed
}

/**
 * 归一化 IMDb ID。
 *
 * 支持 `tt0111161`、`0111161`、`111161`；纯数字不足 7 位时左补 0，
 * 超长或不含数字的输入直接拒绝，避免把垃圾请求转发给 IMDb。
 */
export function normalizeImdbId(raw: string): string {
    const trimmed = raw.trim().toLowerCase()

    const withPrefix = trimmed.match(/^tt(\d{7,9})$/)
    if (withPrefix) return `tt${withPrefix[1]}`

    const digitsOnly = trimmed.match(/^(\d{1,9})$/)
    if (digitsOnly) {
        const padded = digitsOnly[1].padStart(7, '0')
        if (padded.length > 9) throw ApiError.invalidImdbId(raw)
        return `tt${padded}`
    }

    throw ApiError.invalidImdbId(raw)
}

export interface DetailId {
    sid: string
    /** TMDB / Trakt 的媒体类型；其它站点为 undefined */
    type?: string
}

/**
 * 带媒体类型后缀的站点允许的类型。
 *
 * 必须白名单化：TMDb 的 `type` 只影响回源路径，不校验的话
 * `/api/v1/tmdb/<任意值>/550` 会给同一个条目刷出无限多个缓存键。
 */
const TYPE_ALIASES: Record<'tmdb' | 'trakt', Record<string, string>> = {
    tmdb: {movie: 'movie', tv: 'tv'},
    trakt: {
        movie: 'movie',
        movies: 'movie',
        film: 'movie',
        show: 'show',
        shows: 'show',
        series: 'show',
        tv: 'show',
    },
}

const PREFIXED_ID = /^(movie|tv|show|movies|shows|film|series):(.+)$/i

/**
 * 规范化详情请求的 ID 与媒体类型。
 *
 * - `movie:550` / `tv:1399` 前缀拆成 type + sid（兼容旧版调用方的写法）
 * - 豆瓣 / IMDb 顺带校验格式，避免把垃圾请求转发给上游
 * - TMDb / Trakt 的媒体类型必须是白名单内的值
 */
export function normalizeDetailId(
    site: ProviderSite,
    rawId: string,
    rawType?: string | null,
): DetailId {
    let id = rawId.trim()
    if (!id) throw ApiError.badRequest('缺少条目 ID')

    let type = rawType?.trim().toLowerCase() || undefined

    if (site === 'tmdb' || site === 'trakt') {
        const prefixed = id.match(PREFIXED_ID)
        if (prefixed) {
            type = type ?? prefixed[1].toLowerCase()
            id = prefixed[2].trim()
        }

        const normalized = type ? TYPE_ALIASES[site][type] : undefined
        if (type && !normalized) {
            throw ApiError.badRequest(`不支持的 ${site} 媒体类型: ${type}`, {
                types: Object.keys(TYPE_ALIASES[site]),
            })
        }
        type = normalized
    } else {
        type = undefined
    }

    if (site === 'douban') id = normalizeDoubanId(id)
    else if (site === 'imdb') id = normalizeImdbId(id)

    return {sid: id, type}
}
