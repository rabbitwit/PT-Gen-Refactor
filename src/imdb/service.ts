import type {AppConfig, SearchData, SearchItem, TitleData} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError, isApiError} from '../lib/errors'
import {isTimeoutError} from '../lib/timeout'
import {fetchTitleViaGraphql, searchViaGraphql, type SearchFilter} from './graphql'
import {fetchTitleViaBackend, searchViaBackend} from './backend'
import {fetchImdbHtml, extractNextData, mapNextData, extractReleaseInfo} from './html'
import {assertCookieStrategy} from './waf'
import {canUseHtmlFallback, hasImdbBackend} from '../config'

export type DataChannel = 'html' | 'graphql' | 'backend'

export interface FetchOutcome<T> {
    data: T
    /** 实际命中的数据通道，写入 X-Data-Source */
    source: DataChannel
}

function imdbTitleUrl(imdbId: string): string {
    return `https://www.imdb.com/title/${imdbId}/`
}

/** 记录降级原因，便于线上定位是哪条链路失效（降级成功属预期路径，故用 warn） */
function logFallback(reason: unknown, next: string): void {
    const message = reason instanceof Error ? reason.message : String(reason)
    console.warn(`[fetch] ${message} → 改用 ${next}`)
}

function isNotFound(error: unknown): boolean {
    return isApiError(error) && error.symbol === 'NOT_FOUND'
}

/**
 * HTML 抓取详情（Playwright 取 cookie + 页面解析）。
 *
 * 默认并发抓发行信息页；`full=false` 时跳过，发行页失败不影响主数据，主页面成功即视为可用。
 */
async function fetchTitleViaHtml(
    client: HttpClient,
    config: AppConfig,
    imdbId: string,
    options: { full: boolean },
): Promise<TitleData> {
    assertCookieStrategy(config)

    const titlePagePromise = fetchImdbHtml(client, config, imdbTitleUrl(imdbId))
    const releasePagePromise = options.full
        ? fetchImdbHtml(client, config, `${imdbTitleUrl(imdbId)}releaseinfo/`).catch((error) => {
            logFallback(error, '仅返回主页面数据')
            return null
        })
        : null

    const [titlePage, releasePage] = await Promise.all([titlePagePromise, releasePagePromise])

    const nextData = extractNextData(titlePage.html)
    if (!nextData) {
        throw ApiError.upstreamError('无法从 IMDb 页面解析 __NEXT_DATA__，可能被判定为 Bot', {imdbId})
    }

    const data = mapNextData(nextData, imdbId, {
        castLimits: {
            lead: config.castLeadLimit,
            supporting: config.castSupportingLimit,
            voice: config.castVoiceLimit,
        },
    })
    if (!data) {
        throw ApiError.upstreamError('IMDb 页面结构异常（pageProps 为空）', {imdbId})
    }

    if (releasePage) {
        const releaseNext = extractNextData(releasePage.html)
        if (releaseNext) {
            const {aka, release} = extractReleaseInfo(releaseNext)
            if (aka && aka.length > 0) data.aka = aka
            if (release && release.length > 0) data.release = release
        }
    }

    return data
}

/**
 * 按顺序尝试各通道，命中即返回；全部失败时抛出**最有信息量**的错误。
 *
 * 优先保留上游挑战/超时错误（提示用户换 IP 或稍后重试），
 * 而不是被一个笼统的 500 覆盖；显式配置了外部后端时，后端错误优先，避免被 socket 错误覆盖。
 */
async function tryChannels<T>(
    channels: Array<{ name: DataChannel; run: () => Promise<T> }>,
): Promise<FetchOutcome<T>> {
    const failures: Array<{ name: DataChannel; error: unknown }> = []

    for (let index = 0; index < channels.length; index++) {
        const channel = channels[index]

        try {
            const data = await channel.run()
            return {data, source: channel.name}
        } catch (error) {
            // 明确 404 说明条目不存在，换通道也不会有结果
            if (isNotFound(error)) throw error
            failures.push({name: channel.name, error})
            const next = channels[index + 1]?.name
            if (next) logFallback(error, next)
        }
    }

    const backendError = failures.find((item) => item.name === 'backend')?.error
    const chosen = backendError ?? failures[failures.length - 1]?.error
    throw chosen ? normalizeFetchError(chosen) : ApiError.internal('所有数据通道均失败')
}

/**
 * 抓取详情。
 *
 * 通道顺序（按可用性拼装）：
 * - 配置了 `IMDB_BACKEND_URL` 时：**backend（外部后端）优先**；
 * - 其余情况走 GraphQL 直连：边缘运行时先试 `connect()` 裸 TCP（IMDb 在 Cloudflare 前端后面通常 TCP Loop），
 *   失败后退回 `fetch`；Node/Bun 直接 `fetch`；
 * - Node/Bun 且有浏览器或 cookie 时，追加 HTML 兜底（边缘没有浏览器，不安排）。
 */
export async function fetchTitle(
    client: HttpClient,
    config: AppConfig,
    imdbId: string,
    options: { full: boolean },
): Promise<FetchOutcome<TitleData>> {
    const html = () => fetchTitleViaHtml(client, config, imdbId, options)
    const graphql = async (): Promise<TitleData> => {
        const data = await fetchTitleViaGraphql(client, config, imdbId, options)
        if (!data) throw ApiError.notFound(`IMDb 上未找到条目 ${imdbId}`)
        return data
    }

    const channels: Array<{ name: DataChannel; run: () => Promise<TitleData> }> = []

    if (hasImdbBackend(config)) {
        channels.push({
            name: 'backend',
            run: () => fetchTitleViaBackend(client, config, imdbId, options),
        })
    }

    channels.push({name: 'graphql', run: graphql})

    // 边缘运行时没有浏览器；只有 Node/Bun 才可能用 HTML + cookie 兜底
    if (config.runtime !== 'edge' && canUseHtmlFallback(config)) {
        channels.push({name: 'html', run: html})
        // 第二轮 HTML：前面的通道都失败时，强制刷新 cookie 再试一次
        channels.push({name: 'html', run: html})
    }

    return tryChannels(channels)
}

/**
 * 搜索。
 *
 * GraphQL 的 `mainSearch` 已经能覆盖标题/年份/评分/剧情/海报，
 * 因此搜索始终 GraphQL 优先；HTML 搜索页只在 GraphQL 失败时兜底（仅 Node/Bun）。
 * 配置了外部后端时则走后端。
 */
export async function searchTitles(
    client: HttpClient,
    config: AppConfig,
    query: string,
    limit: number,
    filter: SearchFilter = {},
): Promise<FetchOutcome<SearchData>> {
    const url = `https://www.imdb.com/search/title/?title=${encodeURIComponent(query)}&s=tt`

    const build = (items: SearchItem[]): SearchData => ({
        query,
        url,
        total: items.length,
        items,
    })

    const channels: Array<{ name: DataChannel; run: () => Promise<SearchData> }> = []

    if (hasImdbBackend(config)) {
        channels.push({
            name: 'backend',
            run: async () => build(await searchViaBackend(client, config, query, limit, filter)),
        })
    }

    channels.push({
        name: 'graphql',
        run: async () => build(await searchViaGraphql(client, config, query, limit, filter)),
    })

    // HTML 搜索页只在 GraphQL 失败时兜底；边缘运行时没有浏览器
    if (config.runtime !== 'edge' && canUseHtmlFallback(config)) {
        channels.push({name: 'html', run: () => searchViaHtml(client, config, query, limit, url)})
    }

    return tryChannels(channels)
}

/** HTML 搜索页兜底（仅在 Node/Bun 且有浏览器或 cookie 时启用） */
async function searchViaHtml(
    client: HttpClient,
    config: AppConfig,
    query: string,
    limit: number,
    url: string,
): Promise<SearchData> {
    assertCookieStrategy(config)
    const page = await fetchImdbHtml(client, config, url)
    const nextData = extractNextData(page.html)
    if (!nextData) throw ApiError.upstreamError('无法解析 IMDb 搜索页数据', {query})

    const titleListItems =
        (nextData as any)?.props?.pageProps?.searchResults?.titleResults?.titleListItems ?? []

    // 搜索页里标题/剧情这些字段既可能是字符串，也可能是 `{ text }` / `{ plotText }`，
    // 不归一化就会把对象直接塞进响应；缺字段时统一给空串 / 0，保持 SearchItem 形状
    const textOf = (value: unknown): string => {
        if (typeof value === 'string') return value
        if (value && typeof value === 'object') {
            const record = value as Record<string, unknown>
            if (typeof record.text === 'string') return record.text
            const plotText = record.plotText as Record<string, unknown> | undefined
            if (typeof plotText?.plainText === 'string') return plotText.plainText
        }
        return ''
    }
    const numberOf = (value: unknown): number => (typeof value === 'number' ? value : 0)

    const items: SearchItem[] = (titleListItems as any[]).slice(0, limit).map((item) => ({
        id: textOf(item?.titleId),
        title: textOf(item?.originalTitleText) || textOf(item?.titleText),
        year: numberOf(item?.releaseYear),
        subtype: textOf(item?.titleType?.id),
        subtitle: textOf(item?.plot),
        rating: numberOf(item?.ratingSummary?.aggregateRating),
        image: textOf(item?.primaryImage?.url),
    }))

    return {query, url, total: items.length, items}
}

/** 把意外错误归一化，避免 500 泄漏内部细节 */
export function normalizeFetchError(error: unknown): ApiError {
    if (isApiError(error)) return error
    if (isTimeoutError(error)) {
        return ApiError.upstreamTimeout(error instanceof Error ? error.message : undefined)
    }
    return ApiError.internal(error instanceof Error ? error.message : String(error), error)
}
