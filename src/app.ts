import {Hono} from 'hono'
import type {Handler} from 'hono'
import type {AppEnv} from './types'
import {API_VERSION, hasDoubanBackend, hasImdbBackend} from './config'
import {contextMiddleware} from './middleware/context'
import {etagMiddleware} from './middleware/etag'
import {authMiddleware, rateLimitMiddleware} from './middleware'
import {imdb} from './routes/imdb'
import {douban} from './routes/douban'
import {auth} from './routes/auth'
import {providers} from './routes/providers'
import {resource} from './routes/resource'
import {v1} from './routes/v1'
import {search} from './routes/search'
import {egress} from './routes/egress'
import {handleHealth} from './routes/health'
import {ApiError, toApiError} from './lib/errors'
import {sendError, sendSuccess} from './lib/response'
import {sendMethodNotAllowed} from './lib/methods'
import {buildOpenApiDocument} from './openapi'
import {renderDocsPage} from './views/docs'

const app = new Hono<AppEnv>()

app.use('*', contextMiddleware)
// ETag / 304 / HEAD：JSON 响应的缓存校验，必须在所有路由之前注册
app.use('*', etagMiddleware)

// 前端由各平台的静态资源托管；若请求落到 Worker 根路径（例如 EdgeOne 兜底函数），
// 重定向到静态入口，避免吞掉 SPA。
app.get('/', (c) => c.redirect('/index.html', 302))

// 文档页与健康检查不需要鉴权
app.get('/docs', (c) => {
    const config = c.get('config')
    const html = renderDocsPage(config, c.req.header('accept-language'), c.env)

    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Request-Id': c.get('requestId'),
            'X-API-Version': API_VERSION,
            'Cache-Control': 'public, max-age=300, s-maxage=600',
            'X-Content-Type-Options': 'nosniff',
            Vary: 'Accept-Language, Accept-Encoding',
        },
    })
})

// 机器可读的接口描述（公开，不带鉴权）
const handleOpenApi: Handler<AppEnv> = (c) => {
    return new Response(JSON.stringify(buildOpenApiDocument(), null, 2), {
        status: 200,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Request-Id': c.get('requestId'),
            'X-API-Version': API_VERSION,
            'Cache-Control': 'public, max-age=300, s-maxage=600',
            'X-Content-Type-Options': 'nosniff',
        },
    })
}
app.get('/openapi.json', handleOpenApi)
// EdgeOne 的静态资源优先：`/openapi.json` 不会进函数，用 `/api/*` 别名经 rewrite 兜底
app.get('/api/openapi.json', handleOpenApi)

app.get('/health', handleHealth)
app.get('/health/', handleHealth)
// EdgeOne 的 SPA 会把根路径 /health 回成 index.html；/api/* 已证明能进 Node 函数
app.get('/api/health', handleHealth)
app.get('/api/health/', handleHealth)

// 前端启动时读取的能力探测（不返回任何机密值）
app.get('/api/config', (c) => {
    const config = c.get('config')
    const requestId = c.get('requestId') ?? 'unknown'
    const startedAt = c.get('startedAt') ?? Date.now()
    return sendSuccess(
        {
            version: API_VERSION,
            authRequired: Boolean(config.apiToken || config.authSecret),
            sessionAuth: Boolean(config.authSecret),
            powDifficulty: config.powDifficulty,
            sessionTtlSeconds: config.sessionTtlSeconds,
            rateLimitMax: config.rateLimitMax,
            cacheTtlSeconds: config.cacheTtlSeconds,
            sources: {
                douban: {
                    backend: hasDoubanBackend(config),
                    cookie: Boolean(config.doubanCookie),
                    // 无后端/无 Cookie 时仍会尝试网页抓取（边缘平台可能被风控）
                    web: true,
                },
                imdb: {
                    backend: hasImdbBackend(config),
                    cookie: Boolean(config.imdbCookie || config.imdbWafToken),
                    // Node 直连 / Workers 裸 TCP / HTML 兜底
                    web: true,
                },
                bangumi: true,
                tmdb: Boolean(config.tmdbApiKey),
                trakt: Boolean(config.traktClientId),
                steam: true,
                melon: true,
                hongguo: true,
                qq_music: true,
                douban_book: true,
            },
        },
        {requestId, startedAt},
        {cache: 'bypass', origin: c.req.header('origin') ?? null},
    )
})

// UI 会话端点必须在 /api 鉴权中间件之前挂载
app.route('/api/auth', auth)

// 已知只支持读取的路径：用其它方法访问返回 405（带 Allow），而不是落进 404。
// 必须注册在 `app.route('/api', api)` 之前，否则子应用会先用 404 兜住请求。
const GET_ONLY_PATHS = [
    '/health',
    '/health/',
    '/docs',
    '/openapi.json',
    '/api/openapi.json',
    '/api/health',
    '/api/health/',
    '/api/config',
    '/api/egress',
    '/api/search',
    '/api/imdb/search',
    '/api/douban/search',
    '/api/douban/cookie-status',
    '/api/bangumi/search',
    '/api/steam/search',
    '/api/tmdb/search',
    '/api/trakt/search',
]
for (const path of GET_ONLY_PATHS) {
    app.on(['POST', 'PUT', 'PATCH', 'DELETE'], path, (c) => sendMethodNotAllowed(c))
}

// /api 下统一鉴权 + 限流
const api = new Hono<AppEnv>()
api.use('*', authMiddleware)
api.use('*', rateLimitMiddleware)
// 版本化 REST 面：`/api/v1/**`
api.route('/v1', v1)
api.route('/imdb', imdb)
api.route('/douban', douban)
api.route('/search', search)
api.route('/', providers)
api.route('/egress', egress)
// 旧版统一入口 `/api/{provider}/{id}` 最后挂载：具体路径（v1、search、cookie-status 等）优先
api.route('/', resource)
app.route('/api', api)

app.notFound((c) => {
    const origin = c.req.header('origin') ?? null
    return sendError(ApiError.notFound(`未知路径: ${new URL(c.req.url).pathname}`), {
        requestId: c.get('requestId') ?? 'unknown',
        startedAt: c.get('startedAt') ?? Date.now(),
    }, {origin})
})

app.onError((error, c) => {
    const apiError = toApiError(error)

    // 只有真正未预期的错误才打堆栈，4xx 与 501 都属于预期分支
    if (apiError.status < 500) {
        console.warn(`[${c.get('requestId')}] ${apiError.symbol}(${apiError.code}): ${apiError.message}`)
    } else {
        console.error(`[${c.get('requestId')}] ${apiError.symbol}(${apiError.code}):`, error)
    }

    return sendError(apiError, {
        requestId: c.get('requestId') ?? 'unknown',
        startedAt: c.get('startedAt') ?? Date.now(),
    }, {
        origin: c.req.header('origin') ?? null,
        rateLimit: c.get('rateLimit'),
    })
})

export {app}
