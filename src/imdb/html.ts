import type {AppConfig, PersonEntry, TitleData} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {getWafCookie, hasNextData, invalidateWafCookie, isChallengeResponse, rememberCookiesFromResponse,} from './waf'

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const DOCUMENT_HEADERS: Record<string, string> = {
    'user-agent': USER_AGENT,
    accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
}

export interface HtmlFetchResult {
    html: string
    /** 是否为真实内容页（否则是挑战页） */
    ok: boolean
}

/**
 * 携带 WAF cookie 抓取 IMDb HTML。
 *
 * 关键修复：
 * - **最多两轮**：第一轮用缓存 cookie；仅在确实收到挑战时才强制刷新 cookie 重试；
 * - 拿到的 404 / 超时 / 正常页面都属于"结果已确定"，绝不因为一次失败就反复重试，
 *   原实现用一个无限 `for` 循环 + 递归刷新 token，容易在挑战持续时打爆浏览器；
 * - 命中挑战会立刻作废旧 cookie，避免后续请求继续用废 token。
 */
export async function fetchImdbHtml(
    client: HttpClient,
    config: AppConfig,
    url: string,
): Promise<HtmlFetchResult> {
    let lastChallengeBody: string | undefined

    for (let round = 0; round < 2; round++) {
        const cookie = await getWafCookie(config, {forceRefresh: round > 0})

        const headers: Record<string, string> = {...DOCUMENT_HEADERS}
        if (cookie?.cookieHeader) headers.cookie = cookie.cookieHeader

        const response = await client.request(url, {
            method: 'GET',
            timeoutMs: config.htmlTimeoutMs,
            headers,
            redirect: 'follow',
        })

        const body = await response.text()

        if (isChallengeResponse(response.status, body)) {
            lastChallengeBody = body
            invalidateWafCookie()
            console.warn(`[html] 第 ${round + 1} 轮命中 WAF 挑战 (status=${response.status})`)
            continue
        }

        if (response.status === 404) {
            throw ApiError.notFound(`IMDb 页面不存在: ${url}`)
        }

        if (!response.ok) {
            throw ApiError.upstreamError(`IMDb 返回 HTTP ${response.status}`, {url, status: response.status})
        }

        // 非挑战响应即最终结果，不再重试
        rememberCookiesFromResponse(response)
        return {html: body, ok: hasNextData(body)}
    }

    // 两轮都命中挑战：明确告知上游被拦，而不是返回空数据
    throw new ApiError('UPSTREAM_CHALLENGE', 'IMDb 持续返回 WAF 挑战，无法获取页面', {
        retryable: true,
        retryAfterSeconds: 60,
        details: {
            hint: '稍后重试，或手动设置 IMDB_COOKIE / IMDB_BACKEND_URL',
            challengeDetected: Boolean(lastChallengeBody),
        },
    })
}

type Json = Record<string, any>

/** 从 HTML 中提取并解析 `__NEXT_DATA__` / Parse `__NEXT_DATA__` from HTML. */
export function extractNextData(html: string): Json | null {
    const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
    const raw = match?.[1]?.trim()
    if (!raw) return null
    try {
        return JSON.parse(raw) as Json
    } catch {
        return null
    }
}

function pick<T>(value: T | undefined | null, fallback: T): T {
    return value === undefined || value === null ? fallback : value
}

function extractCast(castV2: Json[] | undefined): PersonEntry[] {
    if (!Array.isArray(castV2) || castV2.length === 0) return []
    const topGroup = castV2[0]
    const credits = topGroup?.credits
    if (!Array.isArray(credits)) return []
    return credits
        .map((credit: Json) => {
            const nameId = credit?.name?.id
            const category = String(credit?.category?.id ?? '').toLowerCase()
            return {
                name: credit?.name?.nameText?.text ?? '',
                link: nameId ? `https://www.imdb.com/name/${nameId}/` : '',
                role: category || 'actor',
                image: credit?.name?.primaryImage?.url ?? '',
                character:
                    credit?.creditedRoles?.edges?.[0]?.node?.characters?.edges?.[0]?.node?.name ?? '',
            }
        })
        .filter((item: PersonEntry) => Boolean(item.name))
}

/** HTML 页面没有 principalCredits，只能按 castV2 顺序取前段，配音演员排最后。 */
function groupHtmlCast(
    cast: PersonEntry[],
    limits: { lead: number; supporting: number; voice: number },
): PersonEntry[] {
    return [
        ...cast.slice(0, limits.lead),
        ...cast.slice(limits.lead, limits.lead + limits.supporting),
        ...cast.slice(limits.lead + limits.supporting, limits.lead + limits.supporting + limits.voice),
    ]
}

function extractCrew(crewV2: Json[] | undefined): { directors: string[]; writers: string[] } {
    const directors: string[] = []
    const writers: string[] = []
    if (!Array.isArray(crewV2)) return {directors, writers}

    for (const group of crewV2) {
        const type = String(group?.grouping?.text ?? '').toLowerCase()
        const names = (group?.credits ?? [])
            .map((credit: Json) => credit?.name?.nameText?.text)
            .filter(Boolean)
        if (type.startsWith('director')) directors.push(...names)
        else if (type.startsWith('writer')) writers.push(...names)
    }

    return {directors, writers}
}

/** 把 `__NEXT_DATA__` 映射成统一结构 / Map `__NEXT_DATA__` into the public shape. */
export function mapNextData(
    nextData: Json,
    imdbId: string,
    options: { castLimits: { lead: number; supporting: number; voice: number } },
): TitleData | null {
    const props = nextData?.props?.pageProps
    if (!props) return null

    const above = props.aboveTheFoldData ?? {}
    const main = props.mainColumnData ?? {}
    const releaseDateData = above.releaseDate
    const countries = main?.countriesDetails?.countries ?? []

    return {
        success: true,
        site: 'imdb',
        sid: imdbId,
        link: `https://www.imdb.com/title/${imdbId}/`,
        title: above?.titleText?.text ?? '',
        original_title: above?.originalTitleText?.text ?? '',
        image: above?.primaryImage?.url ?? '',
        year: above?.releaseYear?.year ?? 0,
        type: String(
            above?.titleType?.categories?.[0]?.value ?? above?.titleType?.id ?? '',
        ).toLowerCase(),
        genres: (above?.genres?.genres ?? []).map((item: Json) => item.text).filter(Boolean),
        plot: above?.plot?.plotText?.plainText ?? '',
        runtime: above?.runtime?.displayableProperty?.value?.plainText ?? '',
        runtime_seconds: above?.runtime?.seconds ?? 0,
        rating: pick(above?.ratingsSummary?.aggregateRating, 0),
        vote_count: pick(above?.ratingsSummary?.voteCount, 0),
        languages: (main?.spokenLanguages?.spokenLanguages ?? [])
            .map((item: Json) => item.text)
            .filter(Boolean),
        origin_country: countries.map((item: Json) => item.text).filter(Boolean),
        release_date: {
            year: releaseDateData?.year ?? 0,
            month: releaseDateData?.month ?? 0,
            day: releaseDateData?.day ?? 0,
            country: releaseDateData?.country?.text ?? '',
        },
        episodes: main?.episodes?.episodes?.total ?? 0,
        seasons: (main?.episodes?.seasons ?? [])
            .map((season: Json) => season?.number)
            .filter((value: unknown): value is number => typeof value === 'number'),
        keywords: (above?.keywords?.edges ?? [])
            .map((edge: Json) => edge?.node?.text)
            .filter(Boolean),
        cast: groupHtmlCast(extractCast(main?.castV2), options.castLimits),
        directors: extractCrew(main?.crewV2).directors,
        writers: extractCrew(main?.crewV2).writers,
        aka: [],
        release: [],
        certificates: [],
    }
}

/** 从发行信息页提取 AKA / 上映 / 分级 / Extract release info, AKAs and certificates. */
export function extractReleaseInfo(nextData: Json): {
    aka?: TitleData['aka']
    release?: TitleData['release']
} {
    const categories = nextData?.props?.pageProps?.contentData?.categories ?? []
    const result: { aka?: TitleData['aka']; release?: TitleData['release'] } = {}

    for (const category of categories) {
        const items = category?.section?.items ?? []
        if (category?.id === 'releases') {
            result.release = items.map((item: Json) => ({
                country: item?.rowTitle ?? '',
                date: item?.listContent?.[0]?.text ?? '',
                event: item?.listContent?.[0]?.subText ?? '',
            }))
        } else if (category?.id === 'akas') {
            result.aka = items.map((item: Json) => ({
                country: item?.rowTitle ?? '',
                title: item?.listContent?.[0]?.text ?? '',
                note: item?.listContent?.[0]?.subText ?? '',
            }))
        }
    }

    return result
}
