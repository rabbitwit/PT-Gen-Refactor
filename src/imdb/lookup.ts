import type {AppConfig, DoubanData} from '../types'
import type {HttpClient} from '../lib/http'
import {fetchRatingViaBackend} from './backend'
import {canUseImdb, hasImdbBackend} from '../config'
import {emptyUserRating, formatUserRating} from '../lib/rating-format'

export function imdbTitleLink(imdbId: string): string {
    return imdbId ? `https://www.imdb.com/title/${imdbId}/` : ''
}

/**
 * 豆瓣条目 → IMDb 的补全。
 *
 * IMDb ID 直接读豆瓣自己的「影片信息」页，
 * 页面的表格里就有 `IMDb` 一行，不需要按标题去猜，也就不会错链。
 * 评分再拿这个 ID 去 `p.media-imdb.com` 的静态 ratings 文件取。
 */
const BROWSER_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

/**
 *
 * 响应是 3KB 左右的纯 HTML 表格，没有 PoW 挑战、不需要 Cookie；条目不存在时 404。
 * 书籍条目没有 IMDb 行，这里按"取不到"处理即可。
 */
const INFO_PAGE = 'https://www.douban.com/doubanapp/h5/movie/'

const INFO_PAGE_HEADERS: Record<string, string> = {
    'user-agent': BROWSER_UA,
    accept: 'text/html,application/xhtml+xml',
    'accept-language': 'zh-CN,zh;q=0.9',
}

/** 从「影片信息」表格里取 `IMDb` 那一行的 tt id */
function parseImdbRow(html: string): string {
    const row = /<td>\s*IMDb\s*<\/td>\s*<td>([\s\S]{0,200}?)<\/td>/i.exec(html)
    if (!row) return ''

    const match = /tt\d{5,9}/.exec(row[1])
    return match ? match[0] : ''
}

/** 读豆瓣条目的 IMDb ID；取不到（条目不存在 / 书籍 / 页面改版）时返回空串 */
export async function fetchDoubanImdbId(
    client: HttpClient,
    config: AppConfig,
    sid: string,
): Promise<string> {
    if (!/^\d+$/.test(sid)) return ''

    const response = await client.request(`${INFO_PAGE}${sid}/desc`, {
        // 反查是加分项，超时要比主流程短，避免拖慢详情接口
        timeoutMs: Math.min(config.requestTimeoutMs, 8000),
        headers: INFO_PAGE_HEADERS,
        redirect: 'follow',
    })

    if (!response.ok) return ''

    return parseImdbRow(await response.text())
}

/**
 * 静态评分接口（CloudFront/S3 直出）。
 *
 * 相比 `api.graphql.imdb.com`：没有 IP 级 429，也不需要 GraphQL 那套浏览器指纹头，
 * 边缘运行时上稳定得多。路径里的 `?jsonp=...` 必须写成 `%3F`——S3 把整段当对象 key，
 * 未编码的 `?` 会被当成查询串直接 403；响应体是 JSONP 包装 `imdb.rating.run({...})`。
 */
const RATING_ENDPOINT = 'https://p.media-imdb.com/static-content/documents/v1/title'

const RATING_HEADERS: Record<string, string> = {
    'user-agent': BROWSER_UA,
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
}

interface StaticRatingPayload {
    resource?: { rating?: number; ratingCount?: number }
}

/** 剥掉 JSONP 外壳再解析；拿不到对象就当没有评分 */
function parseJsonpPayload(text: string): StaticRatingPayload | null {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) return null

    try {
        return JSON.parse(text.slice(start, end + 1)) as StaticRatingPayload
    } catch {
        return null
    }
}

/** 取 IMDb 评分；条目未收录或暂无评分时返回 null */
export async function fetchImdbRating(
    client: HttpClient,
    config: AppConfig,
    imdbId: string,
): Promise<{ rating: number; votes: number } | null> {
    // 配置了外部后端时优先走后端，与其它 IMDb 取数保持一致
    if (hasImdbBackend(config)) {
        return fetchRatingViaBackend(client, config, imdbId)
    }

    const response = await client.request(
        `${RATING_ENDPOINT}/${encodeURIComponent(imdbId)}/ratings%3Fjsonp=imdb.rating.run:imdb.api.title.ratings/data.json`,
        {
            // 评分是加分项，超时要比主流程短
            timeoutMs: Math.min(config.requestTimeoutMs, 8000),
            headers: RATING_HEADERS,
        },
    )

    // 未收录的条目 S3 返回 403/404，按"没有评分"处理，不当成故障
    if (!response.ok) return null

    const payload = parseJsonpPayload(await response.text())
    const rating = Number(payload?.resource?.rating) || 0
    const votes = Number(payload?.resource?.ratingCount) || 0

    return rating > 0 ? {rating, votes} : null
}

/** 与豆瓣评分保持同一种展示格式 */
export function formatImdbRating(rating: { rating: number; votes: number } | null): {
    average: string
    votes: string
    formatted: string
} {
    if (!rating) {
        return {average: '0.0', votes: '0', formatted: emptyUserRating()}
    }

    const average = rating.rating.toFixed(1)
    return {
        average,
        votes: String(rating.votes),
        formatted: formatUserRating(average, rating.votes),
    }
}

export async function resolveImdbRating(
    client: HttpClient,
    config: AppConfig,
    imdbId: string,
    logLabel: string,
) {
    if (!imdbId || !canUseImdb(config)) return formatImdbRating(null)
    const rating = await fetchImdbRating(client, config, imdbId).catch((error) => {
        console.warn(`[${logLabel}] IMDb 评分获取失败:`, error instanceof Error ? error.message : error)
        return null
    })
    return formatImdbRating(rating)
}

/** 给豆瓣响应补上 IMDb 链接和评分；任一步失败都保持空值 */
export async function enrichDoubanImdb(
    client: HttpClient,
    config: AppConfig,
    data: DoubanData,
): Promise<void> {
    if (!data.imdb_id) {
        data.imdb_id = await fetchDoubanImdbId(client, config, data.sid).catch((error) => {
            console.warn('[douban] IMDb ID 获取失败:', error instanceof Error ? error.message : error)
            return ''
        })
    }
    if (!data.imdb_id) return

    data.imdb_link = imdbTitleLink(data.imdb_id)
    if (!canUseImdb(config)) return

    const formatted = await resolveImdbRating(client, config, data.imdb_id, 'douban')
    data.imdb_rating_average = formatted.average
    data.imdb_votes = formatted.votes
    data.imdb_rating = formatted.formatted
}
