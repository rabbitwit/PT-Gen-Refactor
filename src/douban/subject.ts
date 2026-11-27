import type {AppConfig, DoubanData, PersonEntry} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError, isApiError} from '../lib/errors'
import {throwDoubanCookieExpired} from './cookie-error'
import {DomQuery, cleanDoubanText} from '../lib/dom'
import {dedupeCelebrities, parseDoubanRole, selectDoubanCast} from './cast'
import {enrichDoubanImdb} from '../imdb/lookup'
import {assertDoubanCookieUsable, markDoubanCookieInvalid} from './cookie-health'
import {fetchDoubanSubjectViaBackend} from './backend'
import {hasDoubanBackend} from '../config'
import {emptyUserRating, formatUserRating} from '../lib/rating-format'
import {
    buildDoubanHeaders, getDoubanCookieJar, isDoubanBlockedRedirect, isDoubanAntiBot, isDoubanNotFound,
    isDoubanChallengeStatus, isDoubanChallengePage,
    DOUBAN_NOT_FOUND, DOUBAN_ANTI_BOT
} from './request'

/**
 * 抓取豆瓣页面。
 *
 * 只使用手动配置的 DOUBAN_COOKIE 和普通 HTTP 请求；
 * 不再访问挑战页。
 *
 * 豆瓣在风控/未登录时会用 3xx 跳转或 403 直接拒绝，这些都属于「上游拒绝」，
 * 必须映射成 40301 / 40302，而不是 502。数据中心出口（面板服、云主机）最常见 403。
 */
async function fetchDoubanPage(
    client: HttpClient,
    config: AppConfig,
    url: string,
): Promise<string> {
    const jar = getDoubanCookieJar(config)

    const response = await client.request(url, {
        timeoutMs: config.requestTimeoutMs,
        headers: buildDoubanHeaders(jar),
        redirect: 'manual',
    })

    const location = response.headers.get('location') ?? undefined
    const html = await response.text()

    if (
        isDoubanBlockedRedirect(response.status, location) &&
        (location ?? '').includes('accounts.douban.com')
    ) {
        if (config.doubanCookie?.trim()) {
            markDoubanCookieInvalid(config, 'login')
            throwDoubanCookieExpired('login', 'DOUBAN_COOKIE 已失效（豆瓣重定向到登录页），请重新导出')
        }

        throw new ApiError('UPSTREAM_BLOCKED', '豆瓣要求登录，已禁用自动挑战；请配置 DOUBAN_COOKIE 或 DOUBAN_BACKEND_URL', {
            retryable: true,
            retryAfterSeconds: 60,
            details: {hint: 'DOUBAN_COOKIE=bid=...; dbsawcv1=...'},
        })
    }

    if (isDoubanBlockedRedirect(response.status, location)) {
        if (config.doubanCookie?.trim()) {
            markDoubanCookieInvalid(config, 'blocked')
            throwDoubanCookieExpired(
                'blocked',
                'DOUBAN_COOKIE 可能已失效，或当前出口 IP 被豆瓣风控；请重新导出 Cookie 或更换出口',
                {hint: '重新登录豆瓣后复制 Cookie；如果 Cookie 仍有效，请检查出口 IP 或配置 DOUBAN_BACKEND_URL'},
            )
        }

        throw new ApiError('UPSTREAM_BLOCKED', '豆瓣要求验证，已禁用自动挑战；请配置 DOUBAN_COOKIE 或 DOUBAN_BACKEND_URL', {
            retryable: true,
            retryAfterSeconds: 60,
            details: {hint: 'DOUBAN_COOKIE=bid=...; dbsawcv1=...'},
        })
    }

    if (response.status === 404) {
        throw ApiError.notFound(DOUBAN_NOT_FOUND)
    }

    if (
        isDoubanChallengeStatus(response.status) ||
        isDoubanChallengePage(html) ||
        isDoubanAntiBot(html)
    ) {
        if (config.doubanCookie?.trim()) {
            markDoubanCookieInvalid(config, 'blocked')
            throwDoubanCookieExpired(
                'blocked',
                `DOUBAN_COOKIE 可能已失效，或当前出口 IP 被豆瓣风控（HTTP ${response.status}）；请重新导出 Cookie 或更换出口`,
                {
                    status: response.status,
                    hint: '云主机 / 面板服的出口常见被豆瓣直接 403；如有必要配置 DOUBAN_BACKEND_URL 或代理',
                },
            )
        }

        throw new ApiError(
            'UPSTREAM_BLOCKED',
            `豆瓣拒绝了请求（HTTP ${response.status}），当前出口未通过风控；请配置 DOUBAN_COOKIE 或 DOUBAN_BACKEND_URL`,
            {
                retryable: true,
                retryAfterSeconds: 60,
                details: {status: response.status, hint: 'DOUBAN_COOKIE=bid=...; dbsawcv1=...'},
            },
        )
    }

    if (!response.ok) {
        throw ApiError.upstreamError(`豆瓣返回 HTTP ${response.status}`, {url, status: response.status})
    }

    return html
}

/** 把 `A / B / C` 形式拆成数组 */
function splitSlash(value: string): string[] {
    return value
        .split(' / ')
        .map((item) => item.trim())
        .filter(Boolean)
}

/**
 * 读取 `#info` 中某个中文字段的值。
 *
 * 通过 label 的文本定位，再用 nextSiblingText 向后取值，
 * 这样标签文案变化（例如 `制片国家/地区`）也不需要改选择器。
 */
function readInfoField(labels: DomQuery, labelTexts: string[], key: string): string {
    const index = labelTexts.findIndex((text) => text.startsWith(key))
    if (index < 0) return ''
    return labels.map((label) => label.nextSiblingText())[index] ?? ''
}

/** 解析 JSON-LD（豆瓣的 ld+json 偶尔含控制字符，需要先清洗） */
function parseJsonLd($: DomQuery): Record<string, any> {
    const script = $.select('script').attr('type="application/ld+json"').first()
    const raw = script.text()
    if (!raw?.trim()) return {}

    try {
        // 控制字符会让 JSON.parse 直接失败
        const cleaned = raw.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim()
        const data = JSON.parse(cleaned)
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
    } catch {
        return {}
    }
}

/** 解析评分：优先 JSON-LD，其次页面 DOM */
function parseRating($: DomQuery, ldJson: Record<string, any>): {
    average: string
    votes: string
    formatted: string
} {
    const rating = ldJson?.aggregateRating
    const rawAverage = rating?.ratingValue ?? $.select('div').attr('id="interest_sectl"').select('strong').class('rating_num').trimmedText()
    const rawVotes = rating?.ratingCount ?? $.select('span').attr('property="v:votes"').trimmedText()

    const average = Number.parseFloat(String(rawAverage).replace(/[^\d.]/g, '')) || 0
    const votes = Number.parseInt(String(rawVotes).replace(/\D/g, ''), 10) || 0

    if (average < 0 || average > 10 || votes < 0) {
        return {average: '0.0', votes: '0', formatted: emptyUserRating()}
    }

    const formattedAverage = average.toFixed(1)
    return {
        average: formattedAverage,
        votes: String(votes),
        formatted: formatUserRating(formattedAverage, votes),
    }
}

/** 从影片页解析主体信息 */
export function parseDoubanSubject(
    html: string,
    sid: string,
): Omit<DoubanData, 'success' | 'site' | 'sid' | 'director' | 'writer' | 'cast' | 'awards'> {
    if (isDoubanAntiBot(html)) {
        throw new ApiError('UPSTREAM_BLOCKED', DOUBAN_ANTI_BOT, {retryable: true, retryAfterSeconds: 60})
    }
    if (isDoubanNotFound(html)) {
        throw ApiError.notFound(DOUBAN_NOT_FOUND)
    }

    const $ = DomQuery.load(html)
    const ldJson = parseJsonLd($)

    // 页面标题形如「肖申克的救赎 (豆瓣)」，去掉后缀即为中文名
    const pageTitle = $.select('title').text().trim()
    const chineseTitle = pageTitle.replace(/\(豆瓣\)\s*$/, '').trim()

    // v:itemreviewed 形如「肖申克的救赎 The Shawshank Redemption」，去掉中文名后是原名
    const itemReviewed = $.select('span').attr('property="v:itemreviewed"').trimmedText()
    const foreignTitle = cleanDoubanText(itemReviewed.replace(chineseTitle, ''))

    const displayTitle = chineseTitle || itemReviewed

    const yearText = $.select('h1').select('span').class('year').trimmedText()
    const year = yearText.match(/\d{4}/)?.[0] ?? ''

    const info = $.select('div').attr('id="info"')
    const labels = info.select('span').class('pl')
    const labelTexts = labels.map((label) => label.trimmedText())

    const genre = $.select('span').attr('property="v:genre"').texts()
    const playdate = $.select('span').attr('property="v:initialReleaseDate"').texts()

    /**
     * 简介：优先取完整版。
     *
     * 豆瓣把简介放两份：
     * - `span.short > span[property="v:summary"]`：折叠版，末尾带「...」
     * - `span.all.hidden`：完整版（注意它**没有** property 属性，不能用 v:summary 选中）
     *
     * 早期只取 `v:summary`，结果拿到的是截断到 530 字的折叠版。
     */
    const introduction = (() => {
        const full = $.select('span').class('all.hidden').texts()[0]
        const short = $.select('span').attr('property="v:summary"').texts()[0]
        const raw = full || short || ''

        return raw
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            // 折叠版末尾的省略号是页面的"展开"提示，不属于正文
            .map((line) => line.replace(/\.\.\.$/, '').trim())
            .filter(Boolean)
            .join('\n')
    })()

    const tags = $.select('div')
        .class('tags-body')
        .select('a')
        .texts()

    const poster = ldJson.image
        ? String(ldJson.image)
            .replace(/s(_ratio_poster|pic)/g, 'l$1')
            .replace('img3', 'img1')
            .replace(/\.webp$/, '.jpg')
        : ''

    const rating = parseRating($, ldJson)
    const imdbText = readInfoField(labels, labelTexts, 'IMDb')
    const imdbId = /^tt\d+$/.test(imdbText) ? imdbText : ''

    return {
        link: `https://movie.douban.com/subject/${sid}/`,
        chinese_title: displayTitle,
        foreign_title: foreignTitle,
        year,
        aka: splitSlash(readInfoField(labels, labelTexts, '又名')).sort(),
        region: splitSlash(readInfoField(labels, labelTexts, '制片国家/地区')),
        genre,
        language: splitSlash(readInfoField(labels, labelTexts, '语言')),
        playdate,
        episodes: readInfoField(labels, labelTexts, '集数'),
        duration:
            readInfoField(labels, labelTexts, '单集片长') ||
            readInfoField(labels, labelTexts, '片长') ||
            $.select('span').attr('property="v:runtime"').trimmedText(),
        introduction,
        poster,
        tags,
        douban_rating_average: rating.average,
        douban_votes: rating.votes,
        douban_rating: rating.formatted,
        imdb_id: imdbId,
        imdb_link: imdbId ? `https://www.imdb.com/title/${imdbId}/` : '',
        // 没有 IMDb ID 时保持空值，避免格式化时输出「0.0 / 10 from 0 users」
        imdb_rating_average: imdbId ? '0.0' : '',
        imdb_votes: imdbId ? '0' : '',
        imdb_rating: imdbId ? emptyUserRating() : '',
    }
}

/**
 * 解析 `/celebrities` 页面中的某个分组（导演 / 编剧 / 演员）。
 *
 * 三个实测坑：
 * 1. 每个演职员条目是 `li.celebrity`（老页面是 `div.celebrity`），
 *    只按标签 `div` 去筛会一个都取不到，必须只按 class 匹配；
 * 2. 每个条目里的第一个 `<a>` 是空文本的头像链接，
 *    直接取 `a` 的文本会得到空字符串，必须取**文本非空**的锚点；
 * 3. 页面里同一个分组会重复出现多次（每部代表作一个副本），
 *    按标题去重只保留第一次出现的完整列表。
 */
function extractCelebrities($: DomQuery, section: string): PersonEntry[] {
    const wrappers = $.select('div').class('list-wrapper')

    for (const wrapper of wrappers.map((item) => item)) {
        const heading = wrapper.select('h2').first().trimmedText()
        if (!heading.includes(section)) continue

        const result: PersonEntry[] = []

        wrapper.class('celebrity').map((celebrity) => {
            // 取文本非空的锚点：头像链接的文本是空的
            const anchors = celebrity.select('a').map((anchor) => ({
                text: anchor.trimmedText(),
                href: anchor.getAttr('href') ?? '',
            }))
            const person = anchors.find((anchor) => anchor.text && anchor.href.includes('/personage/'))
                ?? anchors.find((anchor) => anchor.text)
            if (!person) return null

            // 头像通过内联 style 的 background-image 给出，值可能带引号
            const styleText = celebrity.select('div').class('avatar').getAttr('style') ?? ''
            const image = styleText.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/)?.[1] ?? ''
            const {role, character} = parseDoubanRole(
                celebrity.select('span').class('role').trimmedText(),
                section,
            )

            result.push({
                name: person.text,
                link: person.href,
                role,
                image,
                character,
            })
            return null
        })

        // 找到第一个非空分组即返回，避免重复副本
        if (result.length > 0) return dedupeCelebrities(result)
    }

    return []
}

/**
 * `01004 Please login` 是出口 IP 级的固定判定（Cloudflare 常见），
 * 冷却期内不再尝试网页通道，省掉两次必然失败的请求。
 */
const LOGIN_BLOCKED_COOLDOWN_MS = 10 * 60 * 1000
let loginBlockedUntil = 0

function isLoginBlocked(error: unknown): boolean {
    return isApiError(error) && (error.symbol === 'UPSTREAM_BLOCKED' || error.symbol === 'DOUBAN_COOKIE_EXPIRED' || error.message.includes('01004'))
}

function isNotFound(error: unknown): boolean {
    return isApiError(error) && error.symbol === 'NOT_FOUND'
}

/**
 * 抓取并解析豆瓣影片详情。
 *
 * 通道顺序：
 * 1. 外部后端（配置 `DOUBAN_BACKEND_URL` 时）：由能访问豆瓣的机器代取网页；
 * 2. 网页：使用 `DOUBAN_COOKIE` 的普通请求。
 *
 * 网页通道被风控（Cloudflare 出口常见的 `01004 Please login`）后会冷却一段时间，
 * 冷却期内不再尝试网页通道。
 */
export async function fetchDoubanSubject(
    client: HttpClient,
    config: AppConfig,
    sid: string,
    options: { full: boolean },
): Promise<DoubanData> {
    const baseLink = `https://movie.douban.com/subject/${encodeURIComponent(sid)}/`

    // 1) 外部后端优先：配置了 DOUBAN_BACKEND_URL 就直接走它，避免边缘出口被豆瓣风控。
    if (hasDoubanBackend(config)) {
        try {
            const data = await fetchDoubanSubjectViaBackend(client, config, sid, options)

            // 后端没取到 IMDb 评分时，用本部署的 IMDb 通道再补一次
            if (data.imdb_id && data.imdb_rating_average === '0.0') {
                await enrichDoubanImdb(client, config, data).catch(() => undefined)
            }
            return data
        } catch (error) {
            // 条目不存在时换通道也不会有结果
            if (isNotFound(error)) throw error
            // 已配置外部后端时不要回退到 movie.douban.com：网页通道会被 302 包装成 502
            console.warn(
                '[douban] 外部后端失败，不再回退豆瓣网页通道:',
                error instanceof Error ? error.message : error,
            )
            throw error
        }
    }

    // 2) 网页端：只使用 DOUBAN_COOKIE 或普通请求。
    await assertDoubanCookieUsable(client, config)

    if (Date.now() < loginBlockedUntil) {
        throw new ApiError(
            'UPSTREAM_BLOCKED',
            '豆瓣网页通道暂时被风控，请配置 DOUBAN_COOKIE 或 DOUBAN_BACKEND_URL 后重试',
            {
                retryable: true,
                retryAfterSeconds: 60,
                details: {hint: 'DOUBAN_COOKIE=bid=...; dbsawcv1=...'},
            },
        )
    }

    let html: string
    try {
        html = await fetchDoubanPage(client, config, baseLink)
    } catch (error) {
        if (isLoginBlocked(error)) loginBlockedUntil = Date.now() + LOGIN_BLOCKED_COOLDOWN_MS
        console.warn('[douban] 网页通道失败:', error instanceof Error ? error.message : error)
        throw error
    }

    let parsed: ReturnType<typeof parseDoubanSubject>
    try {
        parsed = parseDoubanSubject(html, sid)
    } catch (error) {
        if (isLoginBlocked(error)) loginBlockedUntil = Date.now() + LOGIN_BLOCKED_COOLDOWN_MS
        if (
            config.doubanCookie?.trim() &&
            isApiError(error) &&
            error.symbol === 'UPSTREAM_BLOCKED' &&
            error.message === DOUBAN_ANTI_BOT
        ) {
            markDoubanCookieInvalid(config, 'anti-bot')
            throwDoubanCookieExpired('anti-bot', 'DOUBAN_COOKIE 可能已失效（豆瓣返回反爬页），请重新导出或检查出口 IP')
        }

        console.warn('[douban] 页面为反爬页:', error instanceof Error ? error.message : error)
        throw error
    }

    const data: DoubanData = {
        success: true,
        site: 'douban',
        sid,
        ...parsed,
        director: [],
        writer: [],
        cast: [],
        awards: [],
    }

    if (!options.full) {
        await enrichDoubanImdb(client, config, data)
        return data
    }

    // 演职员 / 奖项 / IMDb 补全并发获取，失败只降级为空数组
    const detailsHeaders = baseLink

    const imdbPromise = enrichDoubanImdb(client, config, data)

    const [celebrities, awards] = await Promise.all([
        fetchCelebrities(client, config, baseLink, detailsHeaders).catch((error) => {
            console.warn('[douban] 演职员获取失败:', error instanceof Error ? error.message : error)
            return {director: [], writer: [], cast: []}
        }),
        fetchAwards(client, config, baseLink).catch((error) => {
            console.warn('[douban] 奖项获取失败:', error instanceof Error ? error.message : error)
            return []
        }),
    ])

    data.director = celebrities.director
    data.writer = celebrities.writer
    data.cast = selectDoubanCast(celebrities.cast, {
        lead: config.castLeadLimit,
        supporting: config.castSupportingLimit,
        voice: config.castVoiceLimit,
    })
    data.awards = awards

    await imdbPromise

    return data
}

/** 抓取演职员页 */
async function fetchCelebrities(
    client: HttpClient,
    config: AppConfig,
    baseLink: string,
    referer: string,
): Promise<{ director: PersonEntry[]; writer: PersonEntry[]; cast: PersonEntry[] }> {
    const jar = getDoubanCookieJar(config)
    // 豆瓣的子路径必须带尾斜杠，否则 301 到 `celebrities/` 时 body 为空
    const response = await client.request(`${baseLink}celebrities/`, {
        timeoutMs: config.requestTimeoutMs,
        headers: {...buildDoubanHeaders(jar), referer},
        redirect: 'follow',
    })

    // 风控 / 未登录时页面不是演职员页，降级为空而不是让整条详情请求失败
    if (isDoubanChallengeStatus(response.status)) {
        return {director: [], writer: [], cast: []}
    }

    const html = await response.text()
    if (isDoubanChallengePage(html) || isDoubanAntiBot(html)) {
        return {director: [], writer: [], cast: []}
    }

    // 4xx 说明页面不存在或需要登录，直接返回空而不是重试
    if (response.status >= 400 && response.status < 500) {
        return {director: [], writer: [], cast: []}
    }
    if (!response.ok) {
        throw ApiError.upstreamError(`豆瓣演职员页返回 HTTP ${response.status}`)
    }

    const $ = DomQuery.load(html)
    return {
        director: extractCelebrities($, '导演'),
        writer: extractCelebrities($, '编剧'),
        cast: extractCelebrities($, '演员'),
    }
}

/** 解析奖项页：电影节 + 奖项列表 */
export function parseAwards(html: string): Array<{ festival: string; awards: string[] }> {
    const $ = DomQuery.load(html)
    const sections: Array<{ festival: string; awards: string[] }> = []

    $.select('div').class('awards').map((section) => {
        const heading = section.select('div').class('hd').select('h2')
        const festival = heading.select('a').trimmedText()
        const year = heading.select('span').class('year').trimmedText()
        const name = cleanDoubanText(`${festival} ${year}`)
        if (!name) return null

        const awards: string[] = []

        section.select('ul').class('award').map((award) => {
            const items = award.select('li').texts()
            if (items.length >= 2) {
                const category = items[0]
                const winners = items[1]
                awards.push(winners ? `${category} ${winners}` : category)
            }
            return null
        })

        if (awards.length > 0) sections.push({festival: name, awards})
        return null
    })

    return sections
}

/** 抓取奖项页 */
async function fetchAwards(
    client: HttpClient,
    config: AppConfig,
    baseLink: string,
): Promise<Array<{ festival: string; awards: string[] }>> {
    const jar = getDoubanCookieJar(config)

    // baseLink 已自带尾斜杠，这里不能再拼 `/awards` 之外的分隔符，
    // 否则豆瓣会 301 到 `awards/` 并返回空 body（实测踩过的坑）
    const response = await client.request(`${baseLink}awards`, {
        timeoutMs: config.requestTimeoutMs,
        headers: {...buildDoubanHeaders(jar), referer: baseLink},
        redirect: 'follow',
    })

    if (response.status === 404) return []
    if (isDoubanChallengeStatus(response.status)) return []
    if (!response.ok) {
        throw ApiError.upstreamError(`豆瓣奖项页返回 HTTP ${response.status}`)
    }

    const html = await response.text()
    if (isDoubanChallengePage(html) || isDoubanAntiBot(html)) return []
    // 内容过短或缺奖项容器时视为无奖项
    if (html.length < 1000 || !html.includes('awards')) return []

    return parseAwards(html)
}
