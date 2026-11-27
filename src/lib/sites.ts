import type {ProviderSite} from '../types'

/**
 * 统一入口 `/api/v1/{provider}/{id}` 支持的规范化站点名。
 *
 * 顺序即文档顺序；新增站点时同步更新 `src/openapi.ts`。
 */
export const RESOURCE_SITES = [
    'douban',
    'douban_book',
    'imdb',
    'bangumi',
    'tmdb',
    'trakt',
    'steam',
    'melon',
    'hongguo',
    'qq_music',
] as const satisfies readonly ProviderSite[]

const SITE_ALIASES: Record<string, ProviderSite> = {
    douban: 'douban',
    douban_movie: 'douban',
    movie: 'douban',
    douban_book: 'douban_book',
    book: 'douban_book',
    imdb: 'imdb',
    bangumi: 'bangumi',
    bgm: 'bangumi',
    tmdb: 'tmdb',
    trakt: 'trakt',
    steam: 'steam',
    melon: 'melon',
    hongguo: 'hongguo',
    qq_music: 'qq_music',
    qqmusic: 'qq_music',
    qq: 'qq_music',
}

/**
 * 站点名归一化：忽略大小写与连字符，并接受常见别名。
 *
 * `Douban-Movie`、`qqmusic`、`movie` 都会落到规范名上；
 * 无法识别时返回 `null`，由调用方决定是 400 还是 404。
 */
export function normalizeSite(raw: string | undefined): ProviderSite | null {
    const value = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
    return SITE_ALIASES[value] ?? null
}

/** 是否是统一入口支持的站点（别名已归一化） */
export function isResourceSite(site: ProviderSite | null): site is ProviderSite {
    return site !== null && (RESOURCE_SITES as readonly ProviderSite[]).includes(site)
}

/** 有独立搜索端点的数据源 */
const SEARCHABLE_SITES = new Set<ProviderSite>(['douban', 'imdb', 'bangumi', 'steam', 'tmdb', 'trakt'])

/** 媒体类型可以作为路径段的数据源 */
const TYPED_SITES = new Set<ProviderSite>(['tmdb', 'trakt'])

const EXAMPLES: Partial<Record<ProviderSite, string>> = {
    douban: '1292052',
    douban_book: '1084336',
    imdb: 'tt0111161',
    bangumi: '414801',
    tmdb: '13',
    trakt: 'the-matrix-1999',
    steam: '1245620',
}

/** `GET /api/v1/providers` 返回的数据源目录条目 */
export interface SiteDescriptor {
    id: ProviderSite
    /** 归一化时接受的别名（不含规范名本身） */
    aliases: string[]
    /** 是否有 `/api/v1/{id}/search` */
    search: boolean
    /** 媒体类型是否可作为路径段：`/api/v1/{id}/{type}/{id}` */
    typed: boolean
    /** 文档示例 ID；空字符串表示没有稳定示例 */
    example: string
}

export const SITE_DESCRIPTORS: SiteDescriptor[] = RESOURCE_SITES.map((id) => ({
    id,
    aliases: Object.entries(SITE_ALIASES)
        .filter(([alias, site]) => site === id && alias !== id)
        .map(([alias]) => alias),
    search: SEARCHABLE_SITES.has(id),
    typed: TYPED_SITES.has(id),
    example: EXAMPLES[id] ?? '',
}))
