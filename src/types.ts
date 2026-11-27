/** 运行时可用的环境变量与绑定 / Runtime bindings and environment variables. */
export interface Bindings {
    API_TOKEN?: string
    /** 服务端会话签名密钥；启用 UI 自动会话认证时必填 */
    AUTH_SECRET?: string
    /** UI 会话有效期（秒） */
    SESSION_TTL_SECONDS?: string
    /** PoW 难度（前导零 bit 数） */
    POW_DIFFICULTY?: string
    IMDB_COOKIE?: string
    IMDB_WAF_TOKEN?: string
    DOUBAN_COOKIE?: string
    /** 手动填写的豆瓣 Cookie 过期时间（ISO 8601 或 Unix 时间戳），仅用于告警 */
    DOUBAN_COOKIE_EXPIRES_AT?: string
    /** Telegram Bot Token；配置后用于 Cookie 到期告警 */
    TELEGRAM_BOT_TOKEN?: string
    /** Telegram Chat ID；Cookie 到期告警的接收方 */
    TELEGRAM_CHAT_ID?: string
    TMDB_API_KEY?: string
    TRAKT_API_CLIENT_ID?: string
    TRAKT_ACCESS_TOKEN?: string
    QQ_COOKIE?: string
    BANGUMI_ACCESS_TOKEN?: string
    /** 外部 IMDb 后端地址（可填多个，逗号 / 换行分隔） */
    IMDB_BACKEND_URL?: string
    /** 外部 IMDb 后端的访问令牌，与后端 BACKEND_TOKEN 一致 */
    IMDB_BACKEND_TOKEN?: string
    /** 外部豆瓣后端地址（可填多个，逗号 / 换行分隔） */
    DOUBAN_BACKEND_URL?: string
    /** 外部豆瓣后端的访问令牌，与后端 BACKEND_TOKEN 一致 */
    DOUBAN_BACKEND_TOKEN?: string
    CACHE_TTL_SECONDS?: string
    REQUEST_TIMEOUT_MS?: string
    HTML_TIMEOUT_MS?: string
    BROWSER_TOKEN_TIMEOUT_MS?: string
    CAST_LEAD_LIMIT?: string
    CAST_SUPPORTING_LIMIT?: string
    CAST_VOICE_LIMIT?: string
    RATE_LIMIT_MAX?: string
    RUNTIME?: string
    IS_LOCAL?: string
    PLAYWRIGHT_EXECUTABLE_PATH?: string
    /** 是否启用持久化缓存；设为 `false` 时只有进程内缓存 */
    ENABLED_CACHE?: string
    /** 持久层未命中时是否查询 PT-Gen-Database 静态库；`false` 关闭 */
    ENABLED_DATABASE?: string
    /** 静态库镜像地址（逗号分隔），默认 jsDelivr + GitHub Raw */
    DATABASE_BASE_URL?: string
    /** Vercel Blob 读写令牌；项目关联 Blob Store 后可能自动注入 */
    BLOB_READ_WRITE_TOKEN?: string
    /** 新版 Vercel 连接 Blob 后注入的 store id，配合 `VERCEL_OIDC_TOKEN` 使用 */
    BLOB_STORE_ID?: string
    VERCEL_OIDC_TOKEN?: string
    /** Vercel Blob 访问级别：`private`（默认，私有 Store 必须用这个）或 `public` */
    BLOB_ACCESS?: string
    /** Node / Bun 本地缓存目录，默认 `data/cache` */
    CACHE_DIR?: string
    /** Cloudflare R2 缓存桶（可选绑定，仅 Workers 提供） */
    R2_BUCKET?: R2BucketLike
    /** Cloudflare D1 缓存数据库（可选绑定，仅 Workers 提供） */
    DB?: D1DatabaseLike
    /** EdgeOne Blob 仓库名，默认 `pt-gen-cache`；首次写入自动创建 */
    EO_BLOB_STORE?: string

    [key: string]: string | R2BucketLike | D1DatabaseLike | ObjectStoreLike | undefined
}

/**
 * R2 / D1 的最小结构声明。
 *
 * 这两个绑定只存在于 Cloudflare Workers。本项目不引入
 * `@cloudflare/workers-types`（它会把 Workers 的全局类型灌进 Node / Bun / EdgeOne
 * 构建），因此只声明实际用到的那几个成员。
 */
export interface R2ObjectLike {
    text(): Promise<string>
}

export interface R2BucketLike {
    get(key: string): Promise<R2ObjectLike | null>

    put(
        key: string,
        value: string,
        options?: {
            httpMetadata?: { contentType?: string }
            customMetadata?: Record<string, string>
        },
    ): Promise<unknown>
}

export interface D1PreparedStatementLike {
    bind(...values: unknown[]): D1PreparedStatementLike

    first<T = unknown>(): Promise<T | null>

    run(): Promise<unknown>
}

export interface D1DatabaseLike {
    prepare(query: string): D1PreparedStatementLike
}

/**
 * EdgeOne Blob / 对象存储的最小结构。
 *
 * 类似 R2：`get` 可能返回字符串，或带 `text()` 的对象 / Response。
 */
export interface ObjectStoreLike {
    get(key: string): Promise<unknown>

    put(key: string, value: string, options?: unknown): Promise<unknown>
}

/** Vercel Blob：读写令牌或 OIDC + store id，走 REST，不引入 SDK */
export interface VercelBlobStore {
    token: string
    storeId?: string
    access: 'public' | 'private'
}

/** Node / Bun 本地目录缓存；由入口注册，避免 Workers 打包 `node:fs` */
export interface FsCacheBackend {
    read(key: string): Promise<string | undefined>

    write(key: string, json: string): Promise<void>
}

/** 持久化缓存句柄；未配置的层保持 undefined */
export interface CacheStore {
    enabled: boolean
    r2?: R2BucketLike
    d1?: D1DatabaseLike
    blob?: VercelBlobStore
    eo?: ObjectStoreLike
    fs?: FsCacheBackend
}

/** 同一份数据在 R2（路径式对象键）与 D1（主键）中的两种写法 */
export interface CacheKeys {
    r2: string
    d1: string
}

export type RuntimeKind = 'node' | 'bun' | 'edge'

export interface AppConfig {
    runtime: RuntimeKind
    apiToken?: string
    /** 服务端会话签名密钥（只存在服务端，绝不下发前端） */
    authSecret?: string
    /** UI 会话有效期（秒） */
    sessionTtlSeconds: number
    /** PoW 难度（前导零 bit 数） */
    powDifficulty: number
    imdbCookie?: string
    imdbWafToken?: string
    cacheTtlSeconds: number
    /** 缓存命中后，间隔多少秒回源比对一次评分；0 表示关闭 */
    ratingRefreshSeconds: number
    requestTimeoutMs: number
    htmlTimeoutMs: number
    browserTokenTimeoutMs: number
    /** 主演上限（IMDb 官方 Stars 分组）；导演与编剧始终取全量 */
    castLeadLimit: number
    /** 配角上限，按 IMDb 页面顺序截取 */
    castSupportingLimit: number
    /** 配音上限，仅在演员被标注 `voice` 时计入 */
    castVoiceLimit: number
    rateLimitMax: number
    isLocal: boolean
    playwrightExecutablePath?: string
    /** 当前运行时能否启动无头浏览器（用于 HTML 兜底） */
    canUseBrowser: boolean
    /** 手动提供的豆瓣 cookie（形如 bid=xxx; dbsawcv1=yyy） */
    doubanCookie?: string
    /** 手动填写的豆瓣 Cookie 过期时间（ISO 8601 或 Unix 时间戳），仅用于告警 */
    doubanCookieExpiresAt?: string
    /** Telegram Bot Token；用于 Cookie 到期告警 */
    telegramBotToken?: string
    /** Telegram Chat ID；用于 Cookie 到期告警 */
    telegramChatId?: string
    /** 外部 IMDb 后端原始配置（可能含多个地址） */
    imdbBackendUrl?: string
    /** 解析后的 IMDb 后端端点列表 */
    imdbBackendUrls: string[]
    /** 外部 IMDb 后端令牌（Authorization: Bearer） */
    imdbBackendToken?: string
    /** 外部豆瓣后端原始配置（可能含多个地址） */
    doubanBackendUrl?: string
    /** 解析后的豆瓣后端端点列表 */
    doubanBackendUrls: string[]
    /** 外部豆瓣后端令牌（Authorization: Bearer） */
    doubanBackendToken?: string
    tmdbApiKey?: string
    traktClientId?: string
    traktAccessToken?: string
    qqCookie?: string
    bangumiAccessToken?: string
}

export type DataSource = 'graphql' | 'html' | 'probe' | 'backend' | 'api'

export interface AppVariables {
    requestId: string
    startedAt: number
    config: AppConfig
    rateLimit?: { allowed: boolean; limit: number; remaining: number; resetAt: number }
    /** 通过 HttpOnly 会话 Cookie 认证时的会话信息 */
    session?: { sid: string; iat: number; exp: number }
}

export interface AppEnv {
    Bindings: Bindings
    Variables: AppVariables
}

/**
 * 演职员条目，IMDb 与豆瓣共用同一形状 / Person entry shared by both sources.
 *
 * - `role`：职责。IMDb 为 `actor` / `actress`；豆瓣为 `演员` / `配音` / `导演` / `编剧`
 * - `character`：饰演的角色；豆瓣保留「饰 / 配」前缀（如 `饰 安迪` / `配 安迪`），没有则为空串
 */
export interface PersonEntry {
    name: string
    link: string
    role: string
    image: string
    character: string
}

export interface ReleaseDate {
    year: number
    month: number
    day: number
    country: string
}

export interface AkaTitle {
    country: string
    title: string
    note: string
}

export interface ReleaseInfo {
    country: string
    date: string
    event: string
}

/** 详情接口共用的身份字段 */
export interface MediaIdentity {
    success: boolean
    sid: string
    link: string
}

export interface TitleData extends MediaIdentity {
    site: 'imdb'
    title: string
    original_title: string
    image: string
    year: number
    type: string
    genres: string[]
    plot: string
    runtime: string
    runtime_seconds: number
    rating: number
    vote_count: number
    languages: string[]
    origin_country: string[]
    release_date: ReleaseDate
    episodes: number
    seasons: number[]
    keywords: string[]
    cast: PersonEntry[]
    directors: string[]
    writers: string[]
    aka: AkaTitle[]
    release: ReleaseInfo[]
    certificates: Array<{ country: string; rating: string }>
}

export interface SearchItem {
    id: string
    title: string
    year: number
    subtype: string
    subtitle: string
    rating: number
    image: string
}

export interface SearchData {
    query: string
    url: string
    total: number
    items: SearchItem[]
}

/** 豆瓣奖项分组 / Douban award group. */
export interface DoubanAward {
    festival: string
    awards: string[]
}

export interface DoubanSubjectInfo {
    chinese_title: string
    foreign_title: string
    year: string
    aka: string[]
    region: string[]
    genre: string[]
    language: string[]
    playdate: string[]
    episodes: string
    duration: string
    introduction: string
    poster: string
    tags: string[]
}

export interface DoubanRatings {
    douban_rating_average: string
    douban_votes: string
    douban_rating: string
    /** 关联的 IMDb 条目；移动端接口不提供，靠标题+年份反查 */
    imdb_id: string
    imdb_link: string
    /** IMDb 评分（拿不到时为 `0.0` / `0`） */
    imdb_rating_average: string
    imdb_votes: string
    imdb_rating: string
}

export interface DoubanCredits {
    director: PersonEntry[]
    writer: PersonEntry[]
    cast: PersonEntry[]
    awards: DoubanAward[]
}

/** 豆瓣影片数据 / Douban subject payload. */
export interface DoubanData extends MediaIdentity, DoubanSubjectInfo, DoubanRatings, DoubanCredits {
    site: 'douban'
}

/** 豆瓣搜索结果条目 / Douban search result item. */
export interface DoubanSearchItem {
    sid: string
    title: string
    url: string
    subtitle: string
    rating: number
    poster: string
}

/** 豆瓣搜索数据 / Douban search payload. */
export interface DoubanSearchData {
    query: string
    url: string
    total: number
    items: DoubanSearchItem[]
}

/** 受支持的站点标识 */
export type ProviderSite =
    | 'douban'
    | 'douban_book'
    | 'imdb'
    | 'bangumi'
    | 'tmdb'
    | 'trakt'
    | 'steam'
    | 'melon'
    | 'hongguo'
    | 'qq_music'

/** 所有 provider 返回的数据都至少包含这些字段 */
export interface ProviderBaseData {
    success: boolean
    site: ProviderSite
    sid: string
    /** 由 format 生成器填充的 PT 简介文本 */
    format?: string

    [key: string]: unknown
}

/** 统一搜索结果条目 */
export interface UnifiedSearchItem {
    site: ProviderSite
    sid: string
    title: string
    subtitle: string
    year: string
    rating: string | number
    poster: string
    url: string
}

export interface UnifiedSearchData {
    query: string
    source: ProviderSite | 'auto'
    total: number
    items: UnifiedSearchItem[]
}
