import type {AppConfig, DoubanSearchData, DoubanSearchItem} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {DomQuery} from '../lib/dom'
import {
    buildDoubanHeaders,
    getDoubanCookieJar,
    isDoubanChallengePage,
    isDoubanChallengeStatus,
} from './request'
import {searchDoubanViaBackend} from './backend'
import {hasDoubanBackend} from '../config'

/** 搜索结果里的 sid / 真实链接藏在 link2 跳转里 */
function extractSubjectId(href: string): string | null {
    if (!href) return null

    // 直接就是 subject 链接
    const direct = href.match(/movie\.douban\.com\/subject\/(\d+)/)
    if (direct) return direct[1]

    // link2 跳转：url 参数里包含目标地址
    const urlParam = href.match(/[?&]url=([^&]+)/)
    if (urlParam) {
        try {
            const decoded = decodeURIComponent(urlParam[1])
            const nested = decoded.match(/movie\.douban\.com\/subject\/(\d+)/)
            if (nested) return nested[1]
        } catch {
            return null
        }
    }

    return null
}

/** 统一图片地址：豆瓣搜索页偶尔给出协议相对地址或懒加载属性 */
function normalizePoster(raw: string | undefined): string {
    const value = (raw ?? '').trim()
    if (!value || value.startsWith('data:')) return ''
    return value.startsWith('//') ? `https:${value}` : value
}

/** 解析豆瓣搜索页结果 */
export function parseDoubanSearch(html: string): DoubanSearchItem[] {
    const $ = DomQuery.load(html)
    const items: DoubanSearchItem[] = []

    $.select('div').class('result').map((result) => {
        const heading = result.select('h3')
        const link = heading.select('a').first()
        const title = link.trimmedText()
        if (!title) return null

        const href = link.getAttr('href') ?? ''
        const sid = extractSubjectId(href)
        // 没有 sid 的条目（人物、条目推荐等）不在影片搜索范围内
        if (!sid) return null

        const ratingText = result.select('span').class('rating_nums').trimmedText()
        const rating = ratingText ? Number.parseFloat(ratingText) : Number.NaN

        const subtitle = result.select('span').class('subject-cast').trimmedText()

        const pic = result.select('div.pic img').first()
        const image = pic.length ? pic : result.select('img').first()
        const poster = normalizePoster(image.getAttr('src') ?? image.getAttr('data-src'))

        items.push({
            sid,
            title,
            url: `https://movie.douban.com/subject/${sid}/`,
            subtitle,
            rating: Number.isFinite(rating) ? rating : 0,
            poster,
        })

        return null
    })

    return items
}

/** 上游风控统一错误：宁可明确报错，也不要把挑战页当成“搜到 0 条” */
function blockedError(reason: string): ApiError {
    return new ApiError('UPSTREAM_BLOCKED', `豆瓣搜索触发了反爬验证（${reason}）`, {
        retryable: true,
        retryAfterSeconds: 60,
        details: {hint: '配置 DOUBAN_COOKIE 或更换出口 IP'},
    })
}

/**
 * 搜索豆瓣影片。
 *
 * 搜索页通常不需要登录；带上手动配置的 DOUBAN_COOKIE，
 * 遇到反爬页时明确报错而不是返回空数组。
 */
export async function searchDouban(
    client: HttpClient,
    config: AppConfig,
    query: string,
    limit: number,
): Promise<DoubanSearchData> {
    // 外部后端优先（与详情接口保持同一策略）；后端没有搜索能力时回退网页搜索。
    if (hasDoubanBackend(config)) {
        try {
            return await searchDoubanViaBackend(client, config, query, limit)
        } catch (error) {
            console.warn(
                '[douban] 后端搜索失败，改用网页搜索:',
                error instanceof Error ? error.message : error,
            )
        }
    }

    const url = `https://www.douban.com/search/?cat=1002&q=${encodeURIComponent(query)}`

    // 搜索页通常不需要登录；只使用手动 DOUBAN_COOKIE，不再自动求解挑战。
    const jar = getDoubanCookieJar(config)

    const response = await client.request(url, {
        timeoutMs: config.requestTimeoutMs,
        headers: {...buildDoubanHeaders(jar), referer: 'https://movie.douban.com/'},
        redirect: 'follow',
    })

    // 202 / 403 / 429 都是上游风控，不能当成“搜到 0 条”
    if (isDoubanChallengeStatus(response.status)) {
        throw blockedError(`HTTP ${response.status}`)
    }

    if (!response.ok) {
        throw ApiError.upstreamError(`豆瓣搜索返回 HTTP ${response.status}`, {status: response.status})
    }

    const html = await response.text()

    if (/检测到有异常请求|请输入验证码/.test(html) || isDoubanChallengePage(html)) {
        throw blockedError('验证页')
    }

    const items = parseDoubanSearch(html).slice(0, limit)

    return {
        query,
        url,
        total: items.length,
        items,
    }
}
