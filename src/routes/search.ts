import {Hono} from 'hono'
import type {AppEnv, UnifiedSearchData, UnifiedSearchItem} from '../types'
import {getHttpClient} from '../lib/http'
import {sendSuccess} from '../lib/response'
import {ApiError} from '../lib/errors'
import {searchDouban} from '../douban/search'
import {searchTitles} from '../imdb/service'
import {searchBangumi} from '../providers/bangumi'
import {searchSteam} from '../providers/steam'
import {searchTmdb} from '../providers/tmdb'
import {searchTrakt} from '../providers/trakt'

const search = new Hono<AppEnv>()

const AUTO_SOURCES = ['douban', 'imdb', 'bangumi', 'tmdb'] as const
const SEARCH_SOURCES = new Set<string>(['douban', 'imdb', 'bangumi', 'steam', 'tmdb', 'trakt'])

async function runSearch(
    source: string,
    client: Awaited<ReturnType<typeof getHttpClient>>,
    config: Parameters<typeof searchDouban>[1],
    query: string,
    limit: number,
): Promise<UnifiedSearchItem[]> {
    switch (source) {
        case 'douban': {
            const data = await searchDouban(client, config, query, limit)
            return data.items.map((item) => ({
                site: 'douban' as const,
                sid: item.sid,
                title: item.title,
                subtitle: item.subtitle,
                year: '',
                rating: item.rating || '',
                poster: item.poster,
                url: item.url,
            }))
        }
        case 'imdb': {
            const {data} = await searchTitles(client, config, query, limit, {})
            // HTML 兜底通道可能返回没有 id 的条目，直接下发会出现 sid: null
            return data.items
                .filter((item) => Boolean(item.id))
                .map((item) => ({
                    site: 'imdb' as const,
                    sid: item.id,
                    title: item.title,
                    subtitle: item.subtitle,
                    year: item.year ? String(item.year) : '',
                    rating: item.rating || '',
                    poster: item.image || '',
                    url: `https://www.imdb.com/title/${item.id}/`,
                }))
        }
        case 'bangumi':
            return searchBangumi(client, config, query, limit)
        case 'steam':
            return searchSteam(client, config, query, limit)
        case 'tmdb':
            return searchTmdb(client, config, query, limit)
        case 'trakt':
            return searchTrakt(client, config, query, limit)
        default:
            throw ApiError.badRequest(`不支持的搜索源: ${source}`)
    }
}

/** GET /api/v1/search?source=auto|douban|imdb|bangumi|tmdb|trakt|steam&q=...（`/api/search` 为兼容别名） */
search.get('/', async (c) => {
    const config = c.get('config')
    const requestId = c.get('requestId')
    const startedAt = c.get('startedAt')
    const origin = c.req.header('origin') ?? null

    const query = c.req.query('q')?.trim()
    if (!query) throw ApiError.badRequest('缺少查询参数 q', {example: '/api/v1/search?q=盗梦空间'})
    if (query.length > 200) throw ApiError.badRequest('查询词过长，最多 200 个字符')

    const requested = (c.req.query('source') ?? c.req.query('site') ?? 'auto').toLowerCase()
    if (requested !== 'auto' && !SEARCH_SOURCES.has(requested)) {
        throw ApiError.badRequest(`不支持的搜索源: ${requested}`)
    }

    const rawLimit = Number.parseInt(c.req.query('limit') ?? '10', 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 10

    const client = await getHttpClient(config)
    const sources = requested === 'auto' ? AUTO_SOURCES : [requested]

    const results = await Promise.allSettled(
        sources.map((source) =>
            runSearch(source, client, config, query, requested === 'auto' ? Math.min(limit, 8) : limit),
        ),
    )

    // 指定单一数据源时不要吞掉失败，否则空列表会被误报成“没有结果”
    if (requested !== 'auto') {
        const failed = results.find((result) => result.status === 'rejected')
        if (failed) throw failed.reason
    }

    // 按排名轮流合并各来源，避免靠后的来源（如 TMDb）被整体截断
    const groups = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
    const merged: UnifiedSearchItem[] = []
    const depth = Math.max(0, ...groups.map((group) => group.length))
    for (let index = 0; index < depth; index++) {
        for (const group of groups) {
            const item = group[index]
            if (item) merged.push(item)
        }
    }

    // 自动聚合会把多个来源轮流拼接，取前 `limit * 2` 条；total 必须跟着实际下发条数走，
    // 否则客户端看到的“总数”会大于 items 长度
    const items = merged.slice(0, limit * 2)
    const data: UnifiedSearchData = {
        query,
        source: (requested === 'auto' ? 'auto' : requested) as UnifiedSearchData['source'],
        total: items.length,
        items,
    }

    return sendSuccess(data, {requestId, startedAt, cached: false, source: 'api'}, {
        cache: 'bypass',
        rateLimit: c.get('rateLimit'),
        origin,
        varyAuthorization: Boolean(config.apiToken || config.authSecret),
    })
})

export {search}
