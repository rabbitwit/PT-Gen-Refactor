// The legacy formatter is intentionally typed loosely; the dispatcher validates the site.
// @ts-nocheck
import {
    generateDoubanFormat,
    generateImdbFormat,
    generateTmdbFormat,
    generateMelonFormat,
    generateBangumiFormat,
    generateSteamFormat,
    generateHongguoFormat,
    generateQQMusicFormat,
    generateDoubanBookFormat,
    generateTraktFormat,
} from './generators'
import type {ProviderSite} from '../types'

type Formatter = (data: Record<string, unknown>, padStyle?: 'ascii' | 'fullwidth') => string

// 英文数据源的字段名长短不一，只有它们需要额外生成全角补齐的复制版；
// 中文源（含 TMDb）本身就是全角标签，直接复用 format。
const FULLWIDTH_COPY_SITES = new Set<ProviderSite>(['imdb', 'trakt'])

const FORMATTERS: Record<ProviderSite, Formatter> = {
    douban: generateDoubanFormat,
    douban_book: generateDoubanBookFormat,
    imdb: generateImdbFormat,
    bangumi: generateBangumiFormat,
    tmdb: generateTmdbFormat,
    trakt: generateTraktFormat,
    steam: generateSteamFormat,
    melon: generateMelonFormat,
    hongguo: generateHongguoFormat,
    qq_music: generateQQMusicFormat,
}

/** 摊平外部接口 / 缓存里的 `{ data: {...} }` 包装 */
export function unwrapMediaData<T extends Record<string, unknown>>(raw: T): T {
    if (!raw || typeof raw !== 'object') return raw
    const inner = (raw as { data?: unknown }).data
    if (
        inner &&
        typeof inner === 'object' &&
        !Array.isArray(inner) &&
        [
            'introduction',
            'plot',
            'description',
            'chinese_title',
            'poster',
            'name',
            'imdb_rating',
            'douban_rating',
        ].some((key) => key in (inner as Record<string, unknown>))
    ) {
        return {...raw, ...(inner as Record<string, unknown>)} as T
    }
    return raw
}

/** 生成 PT 站点使用的简介文本；失败时返回空串而不是让整个请求失败 */
export function generateFormat(
    site: ProviderSite,
    data: Record<string, unknown>,
    padStyle: 'ascii' | 'fullwidth' = 'ascii',
): string {
    const formatter = FORMATTERS[site]
    if (!formatter) return ''
    try {
        return formatter(unwrapMediaData(data), padStyle) || ''
    } catch (error) {
        console.warn(`[format] ${site} 格式化失败:`, error instanceof Error ? error.message : error)
        return ''
    }
}

/**
 * 返回带 format 字段的数据副本。
 * 英文数据源额外带一份 format_copy：页面展示用 format（半角空格补齐的写法），
 * 复制用 format_copy（最初的 `◉ Name:　value`，不做列对齐）。
 */
export function attachFormat<T extends Record<string, unknown>>(
    site: ProviderSite,
    data: T,
): T & { format: string; format_copy?: string } {
    const format = generateFormat(site, data)
    if (!FULLWIDTH_COPY_SITES.has(site)) return {...data, format}

    return {...data, format, format_copy: generateFormat(site, data, 'fullwidth')}
}

/**
 * 保证详情数据带 `format`（英文源还要带 `format_copy`）。
 *
 * 旧版 Worker 写 R2 / D1 之前会 `delete cacheData.format`，命中这些历史条目时
 * 拿到的就是裸数据；直接下发会让前端拿不到简介文本。这里只在缺失时补算，
 * 命中新版本写入的条目不会多付一次格式化开销。
 */
export function ensureFormat<T extends Record<string, unknown>>(
    site: ProviderSite,
    data: T,
): T & { format: string; format_copy?: string } {
    const record = data as Record<string, unknown>
    const hasFormat = typeof record.format === 'string' && record.format.length > 0
    const needsCopy = FULLWIDTH_COPY_SITES.has(site)
    const hasCopy = !needsCopy || (typeof record.format_copy === 'string' && record.format_copy.length > 0)

    if (hasFormat && hasCopy) return data as T & { format: string; format_copy?: string }
    return attachFormat(site, data)
}
