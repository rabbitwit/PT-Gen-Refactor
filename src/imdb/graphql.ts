import type {AppConfig, PersonEntry, SearchItem, TitleData} from '../types'
import type {HttpClient} from '../lib/http'
import {uniqueBy} from '../lib/coerce'
import {selectCastByLimits} from '../lib/cast-select'
import {graphqlQuery} from './graphql-client'

/**
 * 详情查询：一次拿齐详情页与发行信息页所需字段 / One query covering both pages.
 *
 * `principalCredits` 是 IMDb 官方的"主要演职员"分组（Director / Writer / Stars），
 * 用它确定主演，避免用 `credits` 的顺序猜主配。导演与编剧取全量（250 条/页，
 * 目前所有条目都远小于该上限，`pageInfo` 也确认无下一页）。
 */
const TITLE_QUERY = `query TitleDetails($id: ID!, $castCount: Int!, $withAka: Boolean!) {
  title(id: $id) {
    id
    titleText { text }
    originalTitleText { text }
    releaseYear { year }
    titleType { id text }
    primaryImage { url }
    ratingsSummary { aggregateRating voteCount }
    plot { plotText { plainText } }
    runtime { seconds displayableProperty { value { plainText } } }
    genres { genres { id text } }
    spokenLanguages { spokenLanguages { id text } }
    countriesOfOrigin { countries { id text } }
    releaseDate { year month day country { id text } }
    keywords(first: 10) { edges { node { text } } }
    episodes { episodes(first: 1) { total } seasons { number } }
    principalCredits {
      category { id }
      credits {
        category { id }
        name { id nameText { text } primaryImage { url } }
        ... on Cast { characters { name } attributes { text } }
      }
    }
    credits(first: $castCount, filter: { categories: ["actor", "actress"] }) {
      edges {
        node {
          category { id }
          name { id nameText { text } primaryImage { url } }
          ... on Cast { characters { name } attributes { text } }
        }
      }
    }
    directors: credits(first: 250, filter: { categories: ["director"] }) {
      edges { node { name { nameText { text } } } }
    }
    writers: credits(first: 250, filter: { categories: ["writer"] }) {
      edges { node { name { nameText { text } } } }
    }
    akas(first: 20) @include(if: $withAka) {
      edges { node { text country { id text } language { id text } } }
    }
    releaseDates(first: 20) @include(if: $withAka) {
      edges { node { country { id text } day month year } }
    }
    certificates(first: 20) @include(if: $withAka) {
      edges { node { country { id text } rating } }
    }
  }
}`

/**
 * 搜索查询。`exact` / `startDate` / `endDate` 走 GraphQL 变量；
 * 类型过滤必须**内联**进查询文本——上游对 `titleSearchOptions.type` 的枚举变量
 * 一律返回 400（实测 [TitleSearchType!] / [String!] 等均不接受），只认字面量
 * `[MOVIE, TV]`。内联值全部来自 `SEARCH_TYPE_VALUES` 白名单，无注入风险。
 * 不带任何过滤时（变量为 null），行为与普通搜索完全一致。
 */
const SEARCH_QUERY = `query SearchTitles(
  $query: String!
  $first: Int!
  $exact: Boolean
  $startDate: Date
  $endDate: Date
) {
  mainSearch(
    first: $first
    options: {
      searchTerm: $query
      type: TITLE
      includeAdult: false
      isExactMatch: $exact
      titleSearchOptions: {
        type: SEARCH_TYPES_PLACEHOLDER
        releaseDateRange: { start: $startDate, end: $endDate }
      }
    }
  ) {
    edges {
      node {
        entity {
          ... on Title {
            id
            titleText { text }
            originalTitleText { text }
            releaseYear { year }
            titleType { id text }
            ratingsSummary { aggregateRating voteCount }
            plot { plotText { plainText } }
            primaryImage { url }
          }
        }
      }
    }
  }
}`

interface GqlEdge<T> {
    node: T
}

interface GqlTextNode {
    id?: string
    text?: string | null
}

interface GqlCreditNode {
    category?: { id?: string | null } | null
    name?: {
        id?: string | null
        nameText?: { text?: string | null } | null
        primaryImage?: { url?: string | null } | null
    } | null
    characters?: Array<{ name?: string | null } | null> | null
    attributes?: Array<{ text?: string | null } | null> | null
}

interface GqlPrincipalGroup {
    category?: { id?: string | null } | null
    credits?: GqlCreditNode[] | null
}

interface GqlTitleNode {
    id: string
    titleText?: { text?: string | null } | null
    originalTitleText?: { text?: string | null } | null
    releaseYear?: { year?: number | null } | null
    titleType?: { id?: string | null; text?: string | null } | null
    primaryImage?: { url?: string | null } | null
    ratingsSummary?: { aggregateRating?: number | null; voteCount?: number | null } | null
    plot?: { plotText?: { plainText?: string | null } | null } | null
    runtime?: {
        seconds?: number | null
        displayableProperty?: { value?: { plainText?: string | null } | null } | null
    } | null
    genres?: { genres?: Array<{ text?: string | null } | null> | null } | null
    spokenLanguages?: { spokenLanguages?: Array<{ text?: string | null } | null> | null } | null
    countriesOfOrigin?: { countries?: Array<{ text?: string | null } | null> | null } | null
    releaseDate?: {
        year?: number | null
        month?: number | null
        day?: number | null
        country?: { text?: string | null } | null
    } | null
    keywords?: { edges?: Array<GqlEdge<{ text?: string | null }>> | null } | null
    episodes?: {
        episodes?: { total?: number | null } | null
        seasons?: Array<{ number?: number | null } | null> | null
    } | null
    credits?: { edges?: Array<GqlEdge<GqlCreditNode>> | null } | null
    principalCredits?: GqlPrincipalGroup[] | null
    directors?: { edges?: Array<GqlEdge<GqlCreditNode>> | null } | null
    writers?: { edges?: Array<GqlEdge<GqlCreditNode>> | null } | null
    akas?: {
        edges?: Array<
            GqlEdge<{ text?: string | null; country?: GqlTextNode | null; language?: GqlTextNode | null }>
        > | null
    } | null
    releaseDates?: {
        edges?: Array<
            GqlEdge<{
                country?: GqlTextNode | null
                day?: number | null
                month?: number | null
                year?: number | null
            }>
        > | null
    } | null
    certificates?: {
        edges?: Array<GqlEdge<{ country?: GqlTextNode | null; rating?: string | null }>> | null
    } | null
}

interface GqlSearchEdge {
    node?: {
        entity?: {
            id?: string | null
            titleText?: { text?: string | null } | null
            originalTitleText?: { text?: string | null } | null
            releaseYear?: { year?: number | null } | null
            titleType?: { id?: string | null; text?: string | null } | null
            ratingsSummary?: { aggregateRating?: number | null } | null
            plot?: { plotText?: { plainText?: string | null } | null } | null
            primaryImage?: { url?: string | null } | null
        } | null
    } | null
}

function unique(values: Array<string | null | undefined>): string[] {
    return uniqueBy(
        values.map((value) => value?.trim() ?? ''),
        (text) => text,
    )
}

function namesFrom(credits: GqlTitleNode['directors']): string[] {
    const edges = credits?.edges ?? []
    return unique(edges.map((edge) => edge.node?.name?.nameText?.text))
}

/** IMDb 用 credit attribute 标注配音演员（如 `voice`），没有独立的 voice 分类。 */
function creditAttributes(node: GqlCreditNode): string[] {
    return unique((node.attributes ?? []).map((item) => item?.text))
}

function isVoiceCredit(attributes: string[]): boolean {
    return attributes.some((text) => /voice/i.test(text))
}

function toPersonEntry(node: GqlCreditNode): PersonEntry | null {
    const name = node.name?.nameText?.text?.trim()
    if (!name) return null
    const nameId = node.name?.id
    return {
        name,
        link: nameId ? `https://www.imdb.com/name/${nameId}/` : '',
        role: node.category?.id?.trim().toLowerCase() || 'actor',
        image: node.name?.primaryImage?.url ?? '',
        character: node.characters?.[0]?.name?.trim() || '',
    }
}

/**
 * 演员选取顺序：官方 Stars 分组优先，其余按页面顺序补齐，配音演员排最后。
 *
 * 分组只用于挑选，不对外输出 `group` 字段。
 */
function buildCast(
    node: GqlTitleNode,
    limits: { lead: number; supporting: number; voice: number },
): PersonEntry[] {
    const principal = (node.principalCredits ?? []).find(
        (group) => group?.category?.id === 'cast',
    )
    const leadIds = new Set(
        (principal?.credits ?? [])
            .map((credit) => credit?.name?.id)
            .filter((id): id is string => Boolean(id)),
    )
    const leadNames = new Set(
        (principal?.credits ?? [])
            .map((credit) => credit?.name?.nameText?.text?.trim())
            .filter((name): name is string => Boolean(name)),
    )

    const seen = new Set<string>()
    const push = (member: PersonEntry | null, bucket: PersonEntry[]) => {
        if (!member) return
        if (seen.has(member.name)) return
        seen.add(member.name)
        bucket.push(member)
    }

    const voice: PersonEntry[] = []
    const lead: PersonEntry[] = []
    const supporting: PersonEntry[] = []

    for (const credit of principal?.credits ?? []) {
        push(toPersonEntry(credit), lead)
    }

    for (const edge of node.credits?.edges ?? []) {
        const isLead =
            leadIds.has(edge.node?.name?.id ?? '') ||
            leadNames.has(edge.node?.name?.nameText?.text?.trim() ?? '')
        if (isLead) continue
        const member = toPersonEntry(edge.node ?? {})
        if (!member) continue
        if (isVoiceCredit(creditAttributes(edge.node ?? {}))) push(member, voice)
        else push(member, supporting)
    }

    return selectCastByLimits(lead, supporting, voice, limits)
}

/** 把 GraphQL 详情节点映射为统一对外结构 / Map GraphQL node to the public shape. */
export function mapTitleNode(
    node: GqlTitleNode,
    imdbId: string,
    options: { withAka: boolean; castLimits: { lead: number; supporting: number; voice: number } },
): TitleData {
    const cast = buildCast(node, options.castLimits)

    const releaseDateNode = node.releaseDate
    const data: TitleData = {
        success: true,
        site: 'imdb',
        sid: node.id || imdbId,
        link: `https://www.imdb.com/title/${node.id || imdbId}/`,
        title: node.titleText?.text?.trim() ?? '',
        original_title: node.originalTitleText?.text?.trim() ?? '',
        image: node.primaryImage?.url ?? '',
        year: node.releaseYear?.year ?? 0,
        type: (node.titleType?.id ?? '').toLowerCase(),
        genres: unique((node.genres?.genres ?? []).map((item) => item?.text)),
        plot: node.plot?.plotText?.plainText?.trim() ?? '',
        runtime: node.runtime?.displayableProperty?.value?.plainText ?? '',
        runtime_seconds: node.runtime?.seconds ?? 0,
        rating: node.ratingsSummary?.aggregateRating ?? 0,
        vote_count: node.ratingsSummary?.voteCount ?? 0,
        languages: unique((node.spokenLanguages?.spokenLanguages ?? []).map((item) => item?.text)),
        origin_country: unique((node.countriesOfOrigin?.countries ?? []).map((item) => item?.text)),
        release_date: {
            year: releaseDateNode?.year ?? 0,
            month: releaseDateNode?.month ?? 0,
            day: releaseDateNode?.day ?? 0,
            country: releaseDateNode?.country?.text ?? '',
        },
        episodes: node.episodes?.episodes?.total ?? 0,
        seasons: (node.episodes?.seasons ?? [])
            .map((season) => season?.number)
            .filter((value): value is number => typeof value === 'number'),
        keywords: unique((node.keywords?.edges ?? []).map((edge) => edge.node?.text)),
        cast,
        directors: namesFrom(node.directors),
        writers: namesFrom(node.writers),
        aka: [],
        release: [],
        certificates: [],
    }

    if (options.withAka) {
        const akas = (node.akas?.edges ?? [])
            .map((edge) => ({
                country: edge.node?.country?.text ?? '',
                title: edge.node?.text ?? '',
                note: edge.node?.language?.text ?? '',
            }))
            .filter((item) => item.title)

        const release = (node.releaseDates?.edges ?? [])
            .map((edge) => {
                const {year, month, day} = edge.node ?? {}
                const date =
                    year != null
                        ? [year, month, day]
                            .filter((part) => part != null)
                            .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, '0')))
                            .join('-')
                        : ''
                return {
                    country: edge.node?.country?.text ?? '',
                    date,
                    event: '',
                }
            })
            .filter((item) => item.country || item.date)

        const certificates = (node.certificates?.edges ?? [])
            .map((edge) => ({
                country: edge.node?.country?.text ?? '',
                rating: edge.node?.rating ?? '',
            }))
            .filter((item) => Boolean(item.country && item.rating))

        data.aka = akas
        data.release = release
        data.certificates = certificates
    }

    return data
}

/**
 * 判断节点是否为"空壳"。
 *
 * IMDb GraphQL 对不存在的 ID 不报错，而是返回一个所有字段为 null 的节点，
 * 必须显式识别，否则会把 404 伪装成 200 空对象。
 */
function isGhostNode(node: GqlTitleNode): boolean {
    return !node.titleText?.text && !node.originalTitleText?.text && !node.titleType?.id
}

/** 通过 GraphQL 取详情 / Fetch details through the WAF-free GraphQL endpoint. */
export async function fetchTitleViaGraphql(
    client: HttpClient,
    config: AppConfig,
    imdbId: string,
    options: { full: boolean },
): Promise<TitleData | null> {
    const castLimits = {
        lead: config.castLeadLimit,
        supporting: config.castSupportingLimit,
        voice: config.castVoiceLimit,
    }

    const data = await graphqlQuery<{ title: GqlTitleNode | null }>(client, config, TITLE_QUERY, {
        id: imdbId,
        castCount: castLimits.lead + castLimits.supporting + castLimits.voice,
        withAka: options.full,
    })

    const node = data?.title
    if (!node || isGhostNode(node)) return null

    return mapTitleNode(node, imdbId, {withAka: options.full, castLimits})
}

/** 搜索的可选过滤条件（对应路由层 ?type= / ?year_from= / ?year_to= / ?exact=） */
export interface SearchFilter {
    /** IMDb 上游类型白名单，如 ['MOVIE']、['TV','TV_EPISODE']（内联进查询文本） */
    types?: string[]
    /** 精确匹配标题 */
    exact?: boolean
    /** 发行日期范围（ISO 格式 yyyy-mm-dd），只给年份时由路由层补全 */
    startDate?: string
    endDate?: string
}

function buildSearchQuery(types: string[] | undefined): string {
    if (!types || types.length === 0) {
        // 不带类型过滤时也要给 titleSearchOptions.type 一个合法字面量：null 表示不过滤
        return SEARCH_QUERY.replace('SEARCH_TYPES_PLACEHOLDER', 'null')
    }
    return SEARCH_QUERY.replace('SEARCH_TYPES_PLACEHOLDER', `[${types.join(', ')}]`)
}

/** 通过 GraphQL 搜索 / Search through GraphQL. */
export async function searchViaGraphql(
    client: HttpClient,
    config: AppConfig,
    query: string,
    limit: number,
    filter: SearchFilter = {},
): Promise<SearchItem[]> {
    const data = await graphqlQuery<{
        mainSearch?: { edges?: GqlSearchEdge[] | null } | null
    }>(client, config, buildSearchQuery(filter.types), {
        query,
        first: limit,
        exact: filter.exact ?? null,
        startDate: filter.startDate ?? null,
        endDate: filter.endDate ?? null,
    })

    const edges = data?.mainSearch?.edges ?? []
    const items: SearchItem[] = []

    for (const edge of edges) {
        const entity = edge?.node?.entity
        if (!entity?.id) continue
        items.push({
            id: entity.id,
            title: entity.titleText?.text?.trim() || entity.originalTitleText?.text?.trim() || '',
            year: entity.releaseYear?.year ?? 0,
            subtype: entity.titleType?.id ?? '',
            subtitle: entity.plot?.plotText?.plainText?.trim() || '',
            rating: entity.ratingsSummary?.aggregateRating ?? 0,
            image: entity.primaryImage?.url ?? '',
        })
    }

    return items
}
