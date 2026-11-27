import {API_VERSION} from './config'
import {RESOURCE_SITES} from './lib/sites'
import {SESSION_COOKIE} from './lib/session'

/**
 * OpenAPI 3.1 描述。
 *
 * 只描述对外契约（规范端点、信封、错误与鉴权方式）；数据负载字段由上游
 * 决定且在持续扩展，因此 `Detail` 使用 `additionalProperties: true` 并列出
 * 常用字段，既保持描述可用，又不会因为新增字段而失效。
 *
 * `/docs` 是给人看的说明页，这里提供的是给工具链（SDK 生成、契约测试、
 * IDE 补全）用的机器可读版本。
 */

type Dict = Record<string, unknown>

const ENVELOPE_REF = '#/components/schemas/Envelope'

/** 统一信封；`data` 换成具体 schema 后用于成功响应 */
function envelope(data: Dict): Dict {
    return {
        type: 'object',
        required: ['code', 'message', 'data', 'error', 'meta'],
        properties: {
            code: {
                type: 'integer',
                description: '数字业务码：HTTP 状态码 × 100 + 序号；成功固定为 20000',
                examples: [20000],
            },
            message: {type: 'string', examples: ['OK']},
            data: {anyOf: [data, {type: 'null'}]},
            error: {anyOf: [{$ref: '#/components/schemas/Error'}, {type: 'null'}]},
            meta: {$ref: '#/components/schemas/Meta'},
        },
    }
}

function jsonResponse(description: string, schema: Dict): Dict {
    return {description, content: {'application/json': {schema}}}
}

function ok(data: Dict, description = '成功'): Dict {
    return jsonResponse(description, envelope(data))
}

function errorResponse(description: string): Dict {
    return jsonResponse(description, {$ref: ENVELOPE_REF})
}

/** 详情接口通用的错误响应集合 */
function detailErrors(): Dict {
    return {
        304: {
            description: '内容未修改（配合 If-None-Match 使用，无响应体）',
            headers: {ETag: {schema: {type: 'string'}}},
        },
        400: errorResponse('参数缺失或 ID 格式非法'),
        401: errorResponse('缺少或无效的凭据'),
        404: errorResponse('数据源不支持，或上游没有该条目'),
        405: errorResponse('该路径不支持当前 HTTP 方法'),
        429: errorResponse('触发限流'),
        502: errorResponse('上游异常或拒绝了当前出口'),
        503: errorResponse('上游持续挑战，或缺少必需的配置'),
        504: errorResponse('上游超时'),
    }
}

const SITE_SCHEMA: Dict = {
    type: 'string',
    enum: [...RESOURCE_SITES],
    description: '数据源标识（provider）；别名（douban-movie、qqmusic、movie 等）会被归一化',
}

const ID_SCHEMA: Dict = {
    type: 'string',
    description:
        '条目 ID。豆瓣 / 豆瓣读书为纯数字；IMDb 为 tt 开头的编号；TMDb 为数字（媒体类型由 type 决定）；Trakt 为 slug 或数字 ID；红果短剧可传完整链接',
}

const TYPE_SCHEMA: Dict = {
    type: 'string',
    enum: ['movie', 'tv', 'show'],
    description: '媒体类型，仅 TMDb（movie / tv）与 Trakt（movie / show）使用；缺省为 movie',
}

const FULL_SCHEMA: Dict = {
    type: 'boolean',
    default: true,
    description: '是否返回全量数据；false 时返回精简字段集',
}

const COMMON_HEADER_PARAMS: Dict[] = [
    {
        name: 'X-Request-Id',
        in: 'header',
        required: false,
        schema: {type: 'string'},
        description: '自定义请求 ID；不传则自动生成，并在响应头回传',
    },
]

const RATE_LIMITED_HEADERS: Dict = {
    'X-RateLimit-Limit': {schema: {type: 'integer'}},
    'X-RateLimit-Remaining': {schema: {type: 'integer'}},
    'X-RateLimit-Reset': {schema: {type: 'integer'}, description: 'Unix 秒'},
}

// ---- 路径构造 ----

/** 搜索端点共用的响应集合 */
function searchResponses(): Dict {
    return {
        200: ok({$ref: '#/components/schemas/SearchResult'}),
        400: errorResponse('缺少 q 或参数非法'),
        401: errorResponse('缺少或无效的凭据'),
        429: errorResponse('触发限流'),
        502: errorResponse('上游异常'),
        504: errorResponse('上游超时'),
    }
}

/**
 * 搜索端点。`legacyFor` 给出时生成兼容路径的副本：标记 deprecated，
 * 并在描述里指回 v1 的等价地址。
 */
function searchPath(
    operationId: string,
    summary: string,
    description: string,
    options: {extraParams?: Dict[]; legacyFor?: string} = {},
): Dict {
    const {extraParams = [], legacyFor} = options

    return {
        get: {
            tags: ['search'],
            operationId,
            summary,
            description: legacyFor ? `兼容保留，等价于 \`${legacyFor}\`。新代码请使用 v1。` : description,
            ...(legacyFor ? {deprecated: true} : {}),
            parameters: [
                {name: 'q', in: 'query', required: true, schema: {type: 'string', maxLength: 200}},
                {
                    name: 'limit',
                    in: 'query',
                    required: false,
                    schema: {type: 'integer', minimum: 1, maximum: 25, default: 10},
                },
                ...extraParams,
            ],
            responses: searchResponses(),
        },
    }
}

const PROVIDERS_SCHEMA: Dict = {
    type: 'object',
    required: ['total', 'items'],
    properties: {
        total: {type: 'integer'},
        items: {
            type: 'array',
            items: {
                type: 'object',
                required: ['id', 'aliases', 'search', 'typed', 'example'],
                properties: {
                    id: {type: 'string', enum: [...RESOURCE_SITES]},
                    aliases: {type: 'array', items: {type: 'string'}, description: '归一化时接受的别名'},
                    search: {type: 'boolean', description: '是否有 `/api/v1/{id}/search`'},
                    typed: {type: 'boolean', description: '媒体类型是否可作为路径段（TMDb / Trakt）'},
                    example: {type: 'string', description: '示例 ID；空字符串表示没有稳定示例'},
                },
            },
        },
    },
}

/** v1 里除详情 / 搜索之外的端点，以及各数据源的搜索端点 */
const EXTRA_V1_PATHS: Dict = {
    '/api/v1/{provider}/{type}/{id}': {
        get: {
            tags: ['detail'],
            operationId: 'getDetailTyped',
            summary: '获取条目详情（媒体类型在路径里）',
            description:
                '与 `/api/v1/{provider}/{id}?type=` 等价；只有 TMDb（movie / tv）与 Trakt（movie / show）使用该段，' +
                '其它数据源会忽略。',
            parameters: [
                {name: 'provider', in: 'path', required: true, schema: SITE_SCHEMA},
                {
                    name: 'type',
                    in: 'path',
                    required: true,
                    schema: {
                        type: 'string',
                        enum: ['movie', 'tv', 'show'],
                        description: 'TMDb：movie / tv；Trakt：movie / show',
                    },
                },
                {name: 'id', in: 'path', required: true, schema: ID_SCHEMA},
                {name: 'full', in: 'query', required: false, schema: FULL_SCHEMA},
                ...COMMON_HEADER_PARAMS,
            ],
            responses: {
                200: ok({$ref: '#/components/schemas/Detail'}, '条目详情'),
                ...detailErrors(),
            },
        },
    },
    '/api/v1/providers': {
        get: {
            tags: ['meta'],
            operationId: 'listProviders',
            summary: '数据源目录',
            description: '枚举可用的 `provider`、别名与能力，便于后端实现方对齐路径与参数。',
            responses: {
                200: ok({$ref: '#/components/schemas/Providers'}, '数据源目录'),
                401: errorResponse('缺少或无效的凭据'),
                429: errorResponse('触发限流'),
            },
        },
    },
    '/api/v1/resolve': {
        get: {
            tags: ['detail'],
            operationId: 'resolveDetail',
            summary: '解析链接 / 关键词后取详情',
            description:
                '给出 `url`（豆瓣、IMDb、TMDb、Bangumi、Steam、Trakt 等链接）、`id` 或 `q`，由服务端推断数据源；' +
                '只给 `q` 时等价于“先搜索，再取第一条”。',
            parameters: [
                {name: 'url', in: 'query', required: false, schema: {type: 'string', format: 'uri'}},
                {name: 'id', in: 'query', required: false, schema: {type: 'string'}},
                {name: 'q', in: 'query', required: false, schema: {type: 'string', maxLength: 200}},
                {
                    name: 'source',
                    in: 'query',
                    required: false,
                    schema: SITE_SCHEMA,
                    description: '数据源；不传时按 url / ID 形态推断',
                },
                {name: 'type', in: 'query', required: false, schema: TYPE_SCHEMA},
                {name: 'full', in: 'query', required: false, schema: FULL_SCHEMA},
                ...COMMON_HEADER_PARAMS,
            ],
            responses: {
                200: ok({$ref: '#/components/schemas/Detail'}, '条目详情'),
                ...detailErrors(),
            },
        },
    },
    '/api/v1/imdb/search': searchPath('searchImdb', '搜索 IMDb', '支持类型过滤与年份范围，对应 IMDb mainSearch 的原生参数。', {
        extraParams: [
            {
                name: 'type',
                in: 'query',
                required: false,
                schema: {type: 'string'},
                description: 'MOVIE / TV / TV_EPISODE / VIDEO_GAME 等，可逗号分隔',
            },
            {name: 'year_from', in: 'query', required: false, schema: {type: 'integer'}},
            {name: 'year_to', in: 'query', required: false, schema: {type: 'integer'}},
            {name: 'exact', in: 'query', required: false, schema: {type: 'boolean'}},
        ],
    }),
    '/api/v1/douban/search': searchPath('searchDouban', '搜索豆瓣', '只搜索豆瓣电影与剧集。'),
    '/api/v1/bangumi/search': searchPath('searchBangumi', '搜索 Bangumi', '按条目类型过滤。', {
        extraParams: [
            {
                name: 'type',
                in: 'query',
                required: false,
                schema: {type: 'string', enum: ['all', 'book', 'anime', 'music', 'game', 'real'], default: 'all'},
            },
        ],
    }),
    '/api/v1/steam/search': searchPath('searchSteam', '搜索 Steam', '按应用名搜索。'),
    '/api/v1/tmdb/search': searchPath('searchTmdb', '搜索 TMDb', '需要 `TMDB_API_KEY`，缺省时返回 501。'),
    '/api/v1/trakt/search': searchPath('searchTrakt', '搜索 Trakt', '需要 `TRAKT_CLIENT_ID`，缺省时返回 501。'),
}

/** 兼容路径：全部标记 deprecated，文档只推荐 v1 */
const LEGACY_PATHS: Dict = {
    '/api/{provider}/{id}': {
        get: {
            tags: ['legacy'],
            operationId: 'getDetailLegacy',
            deprecated: true,
            summary: '获取条目详情（兼容路径）',
            description: '兼容保留，等价于 `/api/v1/{provider}/{id}`。新代码请使用 v1。',
            parameters: [
                {name: 'provider', in: 'path', required: true, schema: SITE_SCHEMA},
                {name: 'id', in: 'path', required: true, schema: ID_SCHEMA},
                {name: 'type', in: 'query', required: false, schema: TYPE_SCHEMA},
                {name: 'full', in: 'query', required: false, schema: FULL_SCHEMA},
            ],
            responses: {
                200: ok({$ref: '#/components/schemas/Detail'}, '条目详情'),
                ...detailErrors(),
            },
        },
    },
    '/api/search': searchPath('searchLegacy', '聚合搜索（兼容路径）', '', {
        legacyFor: '/api/v1/search',
        extraParams: [
            {
                name: 'source',
                in: 'query',
                required: false,
                schema: {type: 'string', enum: ['auto', 'douban', 'imdb', 'bangumi', 'steam', 'tmdb', 'trakt'], default: 'auto'},
            },
        ],
    }),
    '/api/imdb/search': searchPath('searchImdbLegacy', '搜索 IMDb（兼容路径）', '', {legacyFor: '/api/v1/imdb/search'}),
    '/api/douban/search': searchPath('searchDoubanLegacy', '搜索豆瓣（兼容路径）', '', {
        legacyFor: '/api/v1/douban/search',
    }),
    '/api/douban/cookie-status': {
        get: {
            tags: ['legacy'],
            operationId: 'doubanCookieStatusLegacy',
            deprecated: true,
            summary: '检查 DOUBAN_COOKIE 登录态（兼容路径）',
            description: '兼容保留，等价于 `/api/v1/douban/cookie-status`。新代码请使用 v1。',
            parameters: [
                {
                    name: 'refresh',
                    in: 'query',
                    required: false,
                    schema: {type: 'string', enum: ['1']},
                    description: '强制刷新（跳过 10 分钟结果缓存）',
                },
            ],
            responses: {200: ok({type: 'object', additionalProperties: true, description: 'Cookie 健康状态'})},
        },
    },
    '/api/egress': {
        get: {
            tags: ['legacy'],
            operationId: 'egressLegacy',
            deprecated: true,
            summary: '出口自检（兼容路径）',
            description: '兼容保留，等价于 `/api/v1/egress`。新代码请使用 v1。',
            responses: {200: ok({type: 'object', additionalProperties: true})},
        },
    },
}

export function buildOpenApiDocument(): Dict {
    return {
        openapi: '3.1.0',
        info: {
            title: 'PT-Gen API',
            version: API_VERSION,
            summary: '多源影视 / 音乐元数据与 PT 简介生成 API',
            description:
                '版本化 REST 面为 `/api/v1`：条目 `GET /api/v1/{provider}/{id}`，搜索 `GET /api/v1/{provider}/search`，' +
                '聚合搜索 `GET /api/v1/search`，数据源目录 `GET /api/v1/providers`，链接解析 `GET /api/v1/resolve`。\n\n' +
                '所有成功与失败响应都是统一 JSON 信封，`data.format` 为生成的 PT 简介；HTTP 状态码与信封 `code` 一一对应。\n\n' +
                '缓存读取顺序：进程内 TTL → 持久层（R2 / D1 / Blob / EdgeOne / 本地目录）→ 静态数据库 → 回源上游。\n\n' +
                '所有 JSON 响应带 `ETag`；携带 `If-None-Match` 时未变更内容返回 `304`。旧路径（`/api/{provider}/{id}`、' +
                '`/api/search` 等）保留可用并标记 `deprecated`；`/api/getData` 已移除，请改用 `/api/v1/resolve`。',
            license: {name: 'MIT', identifier: 'MIT'},
        },
        servers: [{url: '/', description: '当前部署'}],
        security: [{bearerAuth: []}, {sessionCookie: []}],
        tags: [
            {name: 'detail', description: '条目详情'},
            {name: 'search', description: '搜索'},
            {name: 'meta', description: '配置、目录、健康与运行时信息'},
            {name: 'auth', description: '浏览器 UI 的 PoW 会话'},
            {name: 'legacy', description: '兼容旧路径（已弃用，仅保留可用）'},
        ],
        paths: {
            // 其余 v1 端点（目录、解析、各数据源搜索、带媒体类型的详情）与兼容路径；
            // 以下显式定义的键优先
            ...EXTRA_V1_PATHS,
            ...LEGACY_PATHS,
            '/api/v1/{provider}/{id}': {
                get: {
                    tags: ['detail'],
                    operationId: 'getDetail',
                    summary: '获取条目详情',
                    description:
                        '所有数据源统一入口。返回原始元数据 + `format`（PT 简介）。\n\n' +
                        '`/api/v1/{provider}/{type}/{id}` 是等价写法：TMDb / Trakt 的媒体类型既可放 query 也可放路径。\n\n' +
                        '支持 `HEAD` 与条件请求（`If-None-Match` 未变更时返回 304）；其它方法返回 405 并带 `Allow` 头。',
                    parameters: [
                        {name: 'provider', in: 'path', required: true, schema: SITE_SCHEMA},
                        {name: 'id', in: 'path', required: true, schema: ID_SCHEMA},
                        {name: 'type', in: 'query', required: false, schema: TYPE_SCHEMA},
                        {name: 'full', in: 'query', required: false, schema: FULL_SCHEMA},
                        ...COMMON_HEADER_PARAMS,
                    ],
                    responses: {
                        200: ok({$ref: '#/components/schemas/Detail'}, '条目详情'),
                        ...detailErrors(),
                    },
                },
            },
            '/api/v1/search': {
                get: {
                    tags: ['search'],
                    operationId: 'search',
                    summary: '聚合搜索',
                    description: '`source=auto` 时并行搜索豆瓣 / IMDb / Bangumi / TMDb 并交错合并结果。',
                    parameters: [
                        {name: 'q', in: 'query', required: true, schema: {type: 'string', maxLength: 200}},
                        {
                            name: 'source',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'string',
                                enum: ['auto', 'douban', 'imdb', 'bangumi', 'steam', 'tmdb', 'trakt'],
                                default: 'auto',
                            },
                        },
                        {
                            name: 'limit',
                            in: 'query',
                            required: false,
                            schema: {type: 'integer', minimum: 1, maximum: 25, default: 10},
                        },
                    ],
                    responses: {
                        200: ok({$ref: '#/components/schemas/SearchResult'}),
                        400: errorResponse('缺少 q 或参数非法'),
                        401: errorResponse('缺少或无效的凭据'),
                        429: errorResponse('触发限流'),
                        502: errorResponse('上游异常'),
                        504: errorResponse('上游超时'),
                    },
                },
            },
            '/api/v1/imdb/search': {
                get: {
                    tags: ['search'],
                    operationId: 'searchImdb',
                    summary: '搜索 IMDb',
                    description: '支持类型过滤与年份范围，对应 IMDb mainSearch 的原生参数。',
                    parameters: [
                        {name: 'q', in: 'query', required: true, schema: {type: 'string', maxLength: 200}},
                        {
                            name: 'limit',
                            in: 'query',
                            required: false,
                            schema: {type: 'integer', minimum: 1, maximum: 25, default: 10},
                        },
                        {
                            name: 'type',
                            in: 'query',
                            required: false,
                            schema: {type: 'string'},
                            description: 'MOVIE / TV / TV_EPISODE / VIDEO_GAME 等，可逗号分隔',
                        },
                        {name: 'year_from', in: 'query', required: false, schema: {type: 'integer'}},
                        {name: 'year_to', in: 'query', required: false, schema: {type: 'integer'}},
                        {name: 'exact', in: 'query', required: false, schema: {type: 'boolean'}},
                    ],
                    responses: {
                        200: ok({$ref: '#/components/schemas/SearchResult'}),
                        400: errorResponse('参数非法'),
                        502: errorResponse('上游异常'),
                    },
                },
            },
            '/api/v1/douban/search': {
                get: {
                    tags: ['search'],
                    operationId: 'searchDouban',
                    summary: '搜索豆瓣',
                    parameters: [
                        {name: 'q', in: 'query', required: true, schema: {type: 'string', maxLength: 200}},
                        {
                            name: 'limit',
                            in: 'query',
                            required: false,
                            schema: {type: 'integer', minimum: 1, maximum: 25, default: 10},
                        },
                    ],
                    responses: {
                        200: ok({$ref: '#/components/schemas/SearchResult'}),
                        400: errorResponse('缺少 q 或参数非法'),
                        502: errorResponse('上游风控或异常'),
                    },
                },
            },
            '/api/v1/douban/cookie-status': {
                get: {
                    tags: ['meta'],
                    operationId: 'doubanCookieStatus',
                    summary: '检查 DOUBAN_COOKIE 登录态',
                    parameters: [
                        {
                            name: 'refresh',
                            in: 'query',
                            required: false,
                            schema: {type: 'string', enum: ['1']},
                            description: '强制刷新（跳过 10 分钟结果缓存）',
                        },
                    ],
                    responses: {
                        200: ok({type: 'object', additionalProperties: true, description: 'Cookie 健康状态'}),
                    },
                },
            },
            '/api/config': {
                get: {
                    tags: ['meta'],
                    operationId: 'getConfig',
                    summary: '前端能力探测',
                    security: [],
                    responses: {
                        200: ok({$ref: '#/components/schemas/Config'}),
                    },
                },
            },
            '/health': {
                get: {
                    tags: ['meta'],
                    operationId: 'health',
                    summary: '存活探针',
                    security: [],
                    responses: {
                        200: ok({$ref: '#/components/schemas/Health'}),
                        429: {description: '触发限流', headers: RATE_LIMITED_HEADERS},
                    },
                },
            },
            '/api/v1/egress': {
                get: {
                    tags: ['meta'],
                    operationId: 'egress',
                    summary: '出口自检',
                    description: '返回实际出口 IP 与 IMDb GraphQL 可达性。',
                    responses: {200: ok({type: 'object', additionalProperties: true})},
                },
            },
            '/api/auth/challenge': {
                get: {
                    tags: ['auth'],
                    operationId: 'authChallenge',
                    summary: '获取 PoW 挑战',
                    security: [],
                    responses: {
                        200: ok({
                            type: 'object',
                            required: ['challenge', 'difficulty'],
                            properties: {
                                challenge: {type: 'string'},
                                difficulty: {type: 'integer'},
                            },
                        }),
                        503: errorResponse('未配置 AUTH_SECRET'),
                    },
                },
            },
            '/api/auth/session': {
                get: {
                    tags: ['auth'],
                    operationId: 'getSession',
                    summary: '查询当前会话',
                    security: [],
                    responses: {200: ok({type: ['object', 'null'], additionalProperties: true})},
                },
                post: {
                    tags: ['auth'],
                    operationId: 'createSession',
                    summary: '用 PoW 解换取 HttpOnly 会话',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['challenge', 'solution'],
                                    properties: {
                                        challenge: {type: 'string'},
                                        solution: {type: 'string'},
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: ok({type: ['object', 'null'], additionalProperties: true}),
                        400: errorResponse('挑战无效或解不正确'),
                        429: errorResponse('触发限流'),
                    },
                },
                delete: {
                    tags: ['auth'],
                    operationId: 'deleteSession',
                    summary: '退出并清除会话',
                    security: [],
                    responses: {200: ok({type: 'object', additionalProperties: true})},
                },
            },
            '/openapi.json': {
                get: {
                    tags: ['meta'],
                    operationId: 'openapi',
                    summary: '本 OpenAPI 描述',
                    security: [],
                    responses: {
                        200: jsonResponse('OpenAPI 3.1 文档', {type: 'object', additionalProperties: true}),
                    },
                },
            },
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    description: '服务端配置的 API_TOKEN；外部客户端使用',
                },
                sessionCookie: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: SESSION_COOKIE,
                    description: '浏览器 UI 通过 PoW 换取的 HttpOnly 会话',
                },
            },
            schemas: {
                Envelope: envelope({type: 'object', additionalProperties: true}),
                Meta: {
                    type: 'object',
                    required: ['requestId', 'timestamp', 'durationMs', 'version', 'cached'],
                    properties: {
                        requestId: {type: 'string'},
                        timestamp: {type: 'string', format: 'date-time'},
                        durationMs: {type: 'integer', minimum: 0},
                        version: {type: 'string'},
                        cached: {type: 'boolean', description: '是否命中进程内或持久层缓存'},
                        source: {
                            type: 'string',
                            enum: ['api', 'graphql', 'html', 'backend', 'probe'],
                            description: '本次数据的来源通道',
                        },
                    },
                },
                Error: {
                    type: 'object',
                    required: ['type', 'retryable'],
                    properties: {
                        type: {
                            type: 'string',
                            description: '错误符号，如 BAD_REQUEST / UPSTREAM_TIMEOUT',
                        },
                        details: {type: ['object', 'array', 'string', 'null']},
                        retryable: {type: 'boolean'},
                    },
                },
                Detail: {
                    type: 'object',
                    additionalProperties: true,
                    required: ['site', 'sid'],
                    description: '上游元数据 + `format`；字段随数据源不同而不同',
                    properties: {
                        success: {type: 'boolean'},
                        site: {type: 'string'},
                        sid: {type: 'string'},
                        link: {type: 'string', format: 'uri'},
                        title: {type: 'string'},
                        original_title: {type: 'string'},
                        chinese_title: {type: 'string'},
                        foreign_title: {type: 'string'},
                        year: {type: ['string', 'number']},
                        rating: {type: ['string', 'number']},
                        image: {type: 'string', format: 'uri'},
                        intro: {type: 'string'},
                        format: {type: 'string', description: '渲染好的 PT 简介'},
                    },
                },
                SearchItem: {
                    type: 'object',
                    required: ['site', 'sid', 'title'],
                    properties: {
                        site: {type: 'string', enum: [...RESOURCE_SITES]},
                        sid: {type: 'string'},
                        title: {type: 'string'},
                        subtitle: {type: 'string'},
                        year: {type: 'string'},
                        rating: {type: ['string', 'number']},
                        poster: {type: 'string'},
                        url: {type: 'string'},
                    },
                },
                SearchResult: {
                    type: 'object',
                    required: ['query', 'source', 'total', 'items'],
                    properties: {
                        query: {type: 'string'},
                        source: {type: 'string'},
                        total: {type: 'integer'},
                        items: {type: 'array', items: {$ref: '#/components/schemas/SearchItem'}},
                    },
                },
                Providers: PROVIDERS_SCHEMA,
                Config: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        version: {type: 'string'},
                        authRequired: {type: 'boolean'},
                        sessionAuth: {type: 'boolean'},
                        powDifficulty: {type: 'integer'},
                        sessionTtlSeconds: {type: 'integer'},
                        rateLimitMax: {type: 'integer'},
                        cacheTtlSeconds: {type: 'integer'},
                        sources: {type: 'object', additionalProperties: true},
                    },
                },
                Health: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        status: {type: 'string'},
                        runtime: {type: 'string', enum: ['node', 'bun', 'edge']},
                        version: {type: 'string'},
                        capabilities: {type: 'object', additionalProperties: true},
                        cacheTtlSeconds: {type: 'integer'},
                        cacheLayers: {type: 'array', items: {type: 'string'}},
                    },
                },
            },
        },
    }
}
