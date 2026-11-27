import type {AppConfig, Bindings} from '../types'
import {canUseImdb, hasImdbBackend} from '../config'
import {VERSION} from '../version'
import {createCacheStore, describeCacheStore} from '../lib/persistent-cache'
import {RESOURCE_SITES} from '../lib/sites'

interface DocCopy {
    lang: string
    title: string
    subtitle: string
    endpoints: string
    detail: string
    search: string
    auth: string
    authNote: string
    response: string
    responseNote: string
    headers: string
    headersNote: string
    errors: string
    examples: string
    params: string
    /** 兼容别名说明（新代码只应使用规范入口） */
    aliasNote: string
    /** OpenAPI 机器可读描述的说明 */
    openapiNote: string
    fullDefault: string
    runtime: string
    /** IMDb 在当前部署上是否可用（Workers 不可用） */
    imdbUnavailable: string
    imdbUnavailableNote: string
    doubanNote: string
    /** 持久化缓存层说明；参数是当前实际绑定的层（可能为空） */
    cacheNote: (layers: string[]) => string
    footnote: string
}

const COPY: Record<'zh' | 'en', DocCopy> = {
    zh: {
        lang: 'zh-CN',
        title: 'PT-Gen',
        subtitle: '多源 PT 简介生成 API · 基于 Hono + TypeScript，可部署到 Cloudflare Workers / Vercel / Node.js / Bun / EdgeOne',
        endpoints: '接口',
        detail: '影片 / 剧集详情',
        search: '搜索影片',
        auth: '鉴权',
        authNote: '外部客户端使用 API_TOKEN（Authorization: Bearer &lt;token&gt;），该令牌只在服务端配置，前端不提供输入框。配置 AUTH_SECRET 后，浏览器 UI 会自动完成 PoW 并换取 HttpOnly 会话；两者都未配置时 API 公开。',
        response: '统一响应体',
        responseNote: '所有响应都遵循同一个 JSON Envelope，错误也使用相同结构。',
        headers: '标准响应头',
        headersNote: '每个响应都附带追踪、缓存与限流信息。',
        errors: '错误码',
        examples: '示例',
        params: '参数',
        aliasNote:
            '<code>/api/v1</code> 是唯一的规范面。以下旧路径保持可用，但在 OpenAPI 里标记为 <code>deprecated</code>，' +
            '语义与 v1 完全一致：<code>/api/{provider}/{id}</code>、<code>/api/search</code>、' +
            '<code>/api/imdb/:id</code>、<code>/api/douban/:id</code>、<code>/api/douban/book/:id</code>、' +
            '<code>/api/bangumi/:id</code>、<code>/api/steam/:id</code>、<code>/api/melon/:id</code>、' +
            '<code>/api/hongguo/:id</code>、<code>/api/qqmusic/:id</code>、<code>/api/tmdb/:type/:id</code>、' +
            '<code>/api/trakt/:type/:id</code>。<code>/api/getData</code> 已移除，请改用 <code>/api/v1/resolve</code>。',
        openapiNote:
            '机器可读描述：<a href="/openapi.json"><code>/openapi.json</code></a>（OpenAPI 3.1），' +
            '可直接导入 Postman、生成 SDK 或做契约测试。',
        fullDefault: '默认全量，<code>full=false</code> 精简',
        runtime: '当前运行时',
        imdbUnavailable:
            '当前部署的 IMDb 通道不可用',
        imdbUnavailableNote:
            'IMDb 域名默认走 <code>connect()</code>（<code>cloudflare:sockets</code>）裸 TCP，因为 Workers 的 ' +
            '<code>fetch</code> 出口被 IMDb 一律回 <code>429</code>。失败时把 <code>IMDB_BACKEND_URL</code> ' +
            '指向 <code>php-backend/</code> 或 <code>edgeone/</code> 外部后端。' +
            '<code>/api/v1/douban/*</code> 不受影响，仍可用。',
        doubanNote:
            '豆瓣详情只走网页抓取：仅使用手动配置的 <code>DOUBAN_COOKIE</code>。' +
            '命中反爬后 10 分钟内不再重试网页通道；配置 <code>DOUBAN_BACKEND_URL</code>后改由后端代取。' +
            '配置 <code>DOUBAN_COOKIE_EXPIRES_AT</code> 可启用主动检查，并配合 Telegram 在到期前 24 小时提醒。',
        cacheNote: (layers) =>
            layers.length > 0
                ? '持久化缓存已启用：读取顺序为进程内 TTL → 持久层 → 静态数据库 → 回源上游，回源成功后并行写回已配置的存储' +
                `（当前：<code>${layers.join(' + ')}</code>）。任一层故障只记日志，不影响响应；` +
                '条目仍按 <code>CACHE_TTL_SECONDS</code> 过期。'
                : '当前只有进程内缓存：冷启动与多实例之间不共享。Cloudflare 绑定 R2 / D1，Vercel 关联 Blob Store，' +
                'EdgeOne 绑定 Blob 对象存储，Node / Bun 使用本地 <code>data/cache</code> 目录后即启用持久层。',
        footnote: '数据来源于 IMDb 公开页面、官方 Web GraphQL 接口与豆瓣公开页面，仅供学习与研究使用。',
    },
    en: {
        lang: 'en',
        title: 'PT-Gen',
        subtitle: 'Multi-source PT description API · Built with Hono + TypeScript · Deployable to Cloudflare Workers / Vercel / Node.js / Bun / EdgeOne',
        endpoints: 'Endpoints',
        detail: 'Title details',
        search: 'Search titles',
        auth: 'Authentication',
        authNote: 'API clients use API_TOKEN (Authorization: Bearer &lt;token&gt;); it is configured server-side only and the web UI has no token field. With AUTH_SECRET set, the browser UI solves a PoW and exchanges it for an HttpOnly session automatically. If neither is set, the API is public.',
        response: 'Unified response body',
        responseNote: 'Every response follows the same JSON envelope, including errors.',
        headers: 'Standard response headers',
        headersNote: 'Each response carries tracing, cache and rate-limit metadata.',
        errors: 'Error codes',
        examples: 'Examples',
        params: 'Parameters',
        aliasNote:
            '<code>/api/v1</code> is the only canonical surface. These legacy paths keep working and are marked ' +
            '<code>deprecated</code> in the OpenAPI document; their semantics match v1 exactly: ' +
            '<code>/api/{provider}/{id}</code>, <code>/api/search</code>, <code>/api/imdb/:id</code>, ' +
            '<code>/api/douban/:id</code>, <code>/api/douban/book/:id</code>, <code>/api/bangumi/:id</code>, ' +
            '<code>/api/steam/:id</code>, <code>/api/melon/:id</code>, <code>/api/hongguo/:id</code>, ' +
            '<code>/api/qqmusic/:id</code>, <code>/api/tmdb/:type/:id</code>, <code>/api/trakt/:type/:id</code>. ' +
            '<code>/api/getData</code> has been removed; use <code>/api/v1/resolve</code> instead.',
        openapiNote:
            'Machine-readable spec: <a href="/openapi.json"><code>/openapi.json</code></a> (OpenAPI 3.1) — ' +
            'import it into Postman, generate an SDK, or run contract tests.',
        fullDefault: 'Full data by default; <code>full=false</code> to slim down',
        runtime: 'Runtime',
        imdbUnavailable:
            'The IMDb channel is unavailable on this deployment',
        imdbUnavailableNote:
            'IMDb hosts go through <code>connect()</code> (<code>cloudflare:sockets</code>) raw TCP by default, because ' +
            'Workers <code>fetch</code> egress is answered with <code>429</code> by IMDb. If that fails, point ' +
            '<code>IMDB_BACKEND_URL</code> at the bundled <code>php-backend/</code> or <code>edgeone/</code> backend.' +
            '<code>/api/v1/douban/*</code> is unaffected and still works.',
        doubanNote:
            'Douban details use HTML requests only: a manually configured <code>DOUBAN_COOKIE</code> is used when present, ' +
            'After an anti-bot block the HTML ' +
            'channel is skipped for 10 minutes; set <code>DOUBAN_BACKEND_URL</code> to have a backend fetch it instead.' +
            ' Set <code>DOUBAN_COOKIE_EXPIRES_AT</code> to enable proactive checks and a Telegram reminder 24 hours before expiry.',
        cacheNote: (layers) =>
            layers.length > 0
                ? 'Persistent cache is on. Reads go in-process TTL → persistent layers → static database → upstream, and a successful upstream fetch is ' +
                `written back in parallel (currently: <code>${layers.join(' + ')}</code>). ` +
                'A failing layer only logs and never breaks the response; entries still expire after <code>CACHE_TTL_SECONDS</code>.'
                : 'Only the in-process cache is active, so it is not shared across cold starts or instances. Bind R2 / D1 on Cloudflare, ' +
                'link a Blob Store on Vercel, bind Blob object storage on EdgeOne, or use the local <code>data/cache</code> directory on Node / Bun.',
        footnote: 'Data comes from public IMDb pages, the official web GraphQL endpoint and public Douban pages, for study and research only.',
    },
}

/** 根据 Accept-Language 选择中/英文档 / Pick copy from Accept-Language. */
export function pickLocale(acceptLanguage: string | undefined): 'zh' | 'en' {
    if (!acceptLanguage) return 'en'
    const first = acceptLanguage.split(',')[0]?.trim().toLowerCase() ?? ''
    return first.startsWith('zh') ? 'zh' : 'en'
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

const STYLES = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans SC",sans-serif;background:#0b0d12;color:#e6e8ee;line-height:1.65}
.wrap{max-width:960px;margin:0 auto;padding:48px 24px 72px}
h1{font-size:2.1rem;margin:0 0 8px;letter-spacing:-.02em}
.sub{color:#98a2b3;margin:0 0 40px}
h2{font-size:1.15rem;margin:40px 0 14px;padding-bottom:8px;border-bottom:1px solid #1e2330}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.875em}
p code,li code{background:#161b26;border:1px solid #232a38;border-radius:4px;padding:1px 6px;color:#8ec7ff}
pre{background:#11151f;border:1px solid #1e2330;border-radius:10px;padding:16px;overflow-x:auto;margin:14px 0}
pre code{color:#c8d3e6;background:none;border:none;padding:0;font-size:.84rem;line-height:1.6}
ul{padding-left:20px;margin:10px 0}
li{margin:6px 0;color:#c3cad8}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.9rem}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #1e2330;vertical-align:top}
th{color:#98a2b3;font-weight:600;font-size:.82rem;text-transform:uppercase;letter-spacing:.04em}
td code{color:#8ec7ff}
.note{background:#121722;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;padding:12px 16px;color:#a9b4c7;margin:14px 0;font-size:.9rem}
.note.warn{background:#1f1611;border-left-color:#f59e0b;color:#e8c9a8}
.badge.off{background:#2a1414;border-color:#5b2626;color:#f08b8b}
.footer{margin-top:56px;padding-top:20px;border-top:1px solid #1e2330;color:#6b7488;font-size:.85rem}
.badge{display:inline-block;background:#16202f;border:1px solid #2b3a52;color:#7cb3f0;border-radius:999px;padding:2px 10px;font-size:.78rem;margin-right:6px}
`

function renderEndpointTable(copy: DocCopy, imdbUsable: boolean): string {
    const imdbDetail = imdbUsable
        ? `<code>GET /api/v1/imdb/{id}</code>`
        : `<code>GET /api/v1/imdb/{id}</code> <span class="badge off">501</span>`
    const imdbSearch = imdbUsable
        ? `<code>GET /api/v1/imdb/search</code>`
        : `<code>GET /api/v1/imdb/search</code> <span class="badge off">501</span>`

    return `
    <table>
      <thead><tr><th>${copy.endpoints}</th><th>${copy.params}</th></tr></thead>
      <tbody>
        <tr><td><code>GET /api/v1/{provider}/{id}</code></td><td><code>provider</code> = ${RESOURCE_SITES.join(' / ')}；<code>id</code>；<code>type</code>（<code>tmdb</code>：movie/tv，<code>trakt</code>：movie/show，可放路径或 query）；<code>full</code> — 所有数据源的统一详情入口</td></tr>
        <tr><td><code>GET /api/v1/{provider}/{type}/{id}</code></td><td>同上，媒体类型放在路径里（仅 TMDb / Trakt 使用）</td></tr>
        <tr><td>${imdbDetail}</td><td>${copy.fullDefault} — IMDb ${copy.detail}</td></tr>
        <tr><td>${imdbSearch}</td><td><code>q</code>, <code>limit</code>, <code>type</code>（MOVIE/TV/…，可逗号分隔）, <code>year_from</code>, <code>year_to</code>, <code>exact</code> — IMDb ${copy.search}</td></tr>
        <tr><td><code>GET /api/v1/douban/{id}</code></td><td>${copy.fullDefault} — 豆瓣${copy.detail}（纯数字 ID）</td></tr>
        <tr><td><code>GET /api/v1/douban/search</code></td><td><code>q</code>, <code>limit</code> — 豆瓣${copy.search}</td></tr>
        <tr><td><code>GET /api/v1/bangumi/search</code></td><td><code>q</code>, <code>limit</code>, <code>type</code>（all/book/anime/music/game/real）</td></tr>
        <tr><td><code>GET /api/v1/steam/search</code></td><td><code>q</code>, <code>limit</code> — Steam 应用搜索</td></tr>
        <tr><td><code>GET /api/v1/tmdb/search</code></td><td><code>q</code>, <code>limit</code> — 需要 <code>TMDB_API_KEY</code></td></tr>
        <tr><td><code>GET /api/v1/trakt/search</code></td><td><code>q</code>, <code>limit</code> — 需要 <code>TRAKT_CLIENT_ID</code></td></tr>
        <tr><td><code>GET /api/v1/search</code></td><td><code>q</code>, <code>source</code>, <code>limit</code> — 聚合搜索（auto/douban/imdb/tmdb/bangumi/trakt/steam）</td></tr>
        <tr><td><code>GET /api/v1/resolve</code></td><td><code>url</code> 或 <code>id</code> 或 <code>q</code>（可配 <code>source</code> / <code>type</code>）— 链接 / 关键词解析后再取详情</td></tr>
        <tr><td><code>GET /api/v1/providers</code></td><td>— 数据源目录：可用 <code>provider</code>、别名与能力</td></tr>
        <tr><td><code>GET /api/v1/douban/cookie-status</code></td><td>检查 Cookie 登录态（缓存 10 分钟，<code>refresh=1</code> 强制刷新）</td></tr>
        <tr><td><code>GET /api/v1/egress</code></td><td>出口自检：实际出口 IP + IMDb GraphQL 可达性</td></tr>
        <tr><td><code>GET /api/auth/challenge</code></td><td>— 获取 PoW 挑战（公开）</td></tr>
        <tr><td><code>POST /api/auth/session</code></td><td><code>challenge</code>, <code>solution</code> — 换取 HttpOnly 会话 Cookie</td></tr>
        <tr><td><code>GET /api/auth/session</code></td><td>— 查询当前会话状态</td></tr>
        <tr><td><code>DELETE /api/auth/session</code></td><td>— 退出并清除会话</td></tr>
        <tr><td><code>GET /api/config</code></td><td>— 前端能力探测（不返回机密）</td></tr>
        <tr><td><code>GET /health</code> / <code>GET /api/health</code></td><td>—</td></tr>
        <tr><td><code>GET /openapi.json</code></td><td>— OpenAPI 3.1 描述（公开）</td></tr>
      </tbody>
    </table>`
}

function renderEnvelopeExample(imdbUsable: boolean, dataSource: string): string {
    const data = imdbUsable
        ? `{ "success": true, "site": "imdb", "sid": "tt0111161", "title": "The Shawshank Redemption", "year": 1994, "rating": 9.3 }`
        : `{ "success": true, "site": "douban", "sid": "1292052", "chinese_title": "肖申克的救赎", "year": "1994" }`
    // 豆瓣接口不写 X-Data-Source / meta.source，所以只有 IMDb 示例才带这一行
    const source = imdbUsable ? `,\n    "source": "${dataSource}"` : ''

    return `{
  "code": 20000,
  "message": "OK",
  "data": ${data},
  "error": null,
  "meta": {
    "requestId": "3f1c…",
    "timestamp": "2026-01-01T00:00:00.000Z",
    "durationMs": 812,
    "version": "${VERSION}",
    "cached": false${source}
  }
}`
}

const ERROR_EXAMPLE = `{
  "code": 50300,
  "message": "IMDb 触发了 WAF 挑战，暂时无法获取数据",
  "data": null,
  "error": {
    "type": "UPSTREAM_CHALLENGE",
    "retryable": true,
    "details": { "hint": "等待 1-5 分钟后重试…" }
  },
  "meta": { "requestId": "3f1c…", "durationMs": 25031, "version": "${VERSION}", "cached": false }
}`

function renderHeaderTable(): string {
    const rows: Array<[string, string]> = [
        ['X-Request-Id', '全链路请求 ID，可透传上游值'],
        ['X-API-Version', 'API 版本号，用于感知破坏性变更'],
        ['X-Business-Code', '数字业务码，与响应体 code 一致'],
        ['X-Data-Source', '数据通道：graphql / html（豆瓣接口不返回该头）'],
        ['X-Cache', 'HIT / MISS / BYPASS'],
        ['X-RateLimit-Limit', '每分钟允许的请求数'],
        ['X-RateLimit-Remaining', '当前窗口剩余配额'],
        ['X-RateLimit-Reset', '配额重置时间（Unix 秒）'],
        ['Cache-Control', '成功响应 public + s-maxage，便于 CDN 缓存'],
        ['ETag', '内容的弱校验值；配合 If-None-Match 可得到 304（不含请求耗时等易变元信息）'],
        ['Retry-After', '限流或上游挑战时建议的重试秒数'],
    ]
    return `
    <table>
      <thead><tr><th>Header</th><th>说明</th></tr></thead>
      <tbody>${rows.map(([k, v]) => `<tr><td><code>${k}</code></td><td>${v}</td></tr>`).join('')}</tbody>
    </table>`
}

function renderErrorTable(): string {
    const rows: Array<[string, string, string]> = [
        ['20000', 'OK', '200 · 成功'],
        ['40000', 'BAD_REQUEST', '400 · 参数缺失或非法'],
        ['40001', 'INVALID_IMDB_ID', '400 · IMDb ID 格式错误'],
        ['40002', 'INVALID_DOUBAN_ID', '400 · 豆瓣 ID 格式错误（需纯数字）'],
        ['40003', 'INVALID_SOURCE_ID', '400 · 其它数据源 ID 格式错误'],
        ['40100', 'UNAUTHORIZED', '401 · 缺少或无效 Bearer Token'],
        ['40300', 'FORBIDDEN', '403 · 当前 Token 无权访问'],
        ['40301', 'UPSTREAM_BLOCKED', '403 · 上游拒绝当前出口 IP'],
        ['40302', 'DOUBAN_COOKIE_EXPIRED', '403 · 豆瓣 Cookie 已失效或已过期'],
        ['40400', 'NOT_FOUND', '404 · 上游没有该条目'],
        ['40500', 'METHOD_NOT_ALLOWED', '405 · 不支持的 HTTP 方法'],
        ['42900', 'RATE_LIMITED', '429 · 触发限流'],
        ['50000', 'INTERNAL_ERROR', '500 · 未预期的内部错误'],
        ['50100', 'NOT_IMPLEMENTED', '501 · 该能力在当前运行时不可用'],
        ['50101', 'CONFIG_REQUIRED', '501 · 缺少必需的配置（如 TMDB_API_KEY、QQ_COOKIE）'],
        ['50200', 'UPSTREAM_ERROR', '502 · 上游异常状态'],
        ['50300', 'UPSTREAM_CHALLENGE', '503 · 持续命中 WAF 挑战'],
        ['50400', 'UPSTREAM_TIMEOUT', '504 · 上游超时'],
    ]
    return `
    <table>
      <thead><tr><th>code</th><th>type</th><th>说明</th></tr></thead>
      <tbody>${rows
        .map(([code, type, desc]) => `<tr><td><code>${code}</code></td><td><code>${type}</code></td><td>${desc}</td></tr>`)
        .join('')}</tbody>
    </table>`
}

export function renderDocsPage(
    config: AppConfig,
    acceptLanguage: string | undefined,
    env?: Bindings,
): string {
    const copy = COPY[pickLocale(acceptLanguage)]
    const imdbUsable = canUseImdb(config)
    const cacheLayers = describeCacheStore(createCacheStore(env))

    return `<!DOCTYPE html>
<html lang="${copy.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${copy.title}</title>
<meta name="description" content="${escapeHtml(copy.subtitle)}">
<style>${STYLES}</style>
</head>
<body>
<main class="wrap">
  <h1>${copy.title}</h1>
  <p class="sub">${escapeHtml(copy.subtitle)}</p>

  <p>
    <span class="badge">${copy.runtime}: ${config.runtime}</span>
    <span class="badge">cache: ${config.cacheTtlSeconds}s</span>
    <span class="badge ${cacheLayers.length > 0 ? '' : 'off'}">persistent: ${cacheLayers.length > 0 ? cacheLayers.join('+') : 'off'}</span>
    <span class="badge">auth: ${config.apiToken ? 'Bearer' : config.authSecret ? 'session' : 'off'}</span>
    <span class="badge ${imdbUsable ? '' : 'off'}">imdb: ${imdbUsable ? (hasImdbBackend(config) ? 'backend' : 'on') : 'off'}</span>
    <span class="badge">douban cookie: ${config.doubanCookie ? 'on' : 'off'}</span>
  </p>

  <h2>${copy.endpoints}</h2>
  ${
        imdbUsable
            ? ''
            : `<p class="note warn"><strong>${copy.imdbUnavailable}</strong><br>${copy.imdbUnavailableNote}</p>`
    }
  ${renderEndpointTable(copy, imdbUsable)}
  <p class="note">${copy.aliasNote}</p>
  <p class="note">${copy.openapiNote}</p>

  <p class="note">${copy.doubanNote}</p>

  <p class="note">${copy.cacheNote(cacheLayers)}</p>

  <h2>${copy.auth}</h2>
  <p>${copy.authNote}</p>
  <pre><code>curl -H "Authorization: Bearer $API_TOKEN" \\
  "https://your-domain/api/v1/douban/1292052"

# 浏览器 UI 自动完成以下流程，无需手动填写密钥：
curl "https://your-domain/api/auth/challenge"
curl -X POST "https://your-domain/api/auth/session" \\
  -H "Content-Type: application/json" \\
  -d '{"challenge":"ptg1...","solution":"12345"}'</code></pre>

  <h2>${copy.response}</h2>
  <p>${copy.responseNote}</p>
  <pre><code>${renderEnvelopeExample(imdbUsable, hasImdbBackend(config) ? 'backend' : 'graphql')}</code></pre>
  <p class="note"><strong>code 为数字业务码</strong>，规则是 <code>HTTP 状态码 × 100 + 序号</code>：
  <code>40001</code> 表示 400 家族的第 1 种情况。因此同一个 HTTP 状态下的不同原因可区分
  （<code>40001</code> 是 IMDb ID 格式错、<code>40002</code> 是豆瓣 ID 格式错），
  客户端可以针对具体原因处理而不必解析文案。<code>error.type</code> 是对应的字符串符号，
  便于日志检索与代码里 switch。同一个码也会写入 <code>X-Business-Code</code> 响应头。</p>
  <pre><code>${ERROR_EXAMPLE}</code></pre>
  ${renderErrorTable()}

  <h2>${copy.headers}</h2>
  <p>${copy.headersNote}</p>
  ${renderHeaderTable()}

  <h2>${copy.examples}</h2>
  <pre><code># 统一详情入口：/api/v1/{provider}/{id}
curl "https://your-domain/api/v1/douban/1292052"
curl "https://your-domain/api/v1/tmdb/13?type=movie"
curl "https://your-domain/api/v1/qq_music/f0M4Z4a2"

# IMDb ${copy.detail}
curl "https://your-domain/api/v1/imdb/tt0111161"${
        imdbUsable
            ? ''
            : `
# → {"code": 50100, "error": {"type": "NOT_IMPLEMENTED", ...}}：Workers 上不可用`
    }

# 数据源目录
curl "https://your-domain/api/v1/providers"

# IMDb ${copy.search}
curl "https://your-domain/api/v1/search?q=shawshank&source=imdb&limit=10"

# 贴链接（自动识别数据源）
curl "https://your-domain/api/v1/resolve?url=https%3A%2F%2Fmovie.douban.com%2Fsubject%2F1292052%2F"

# 条件请求：内容未变更时返回 304（无响应体）
curl -H 'If-None-Match: W/"358d3d65536d2088"' \\
  "https://your-domain/api/v1/douban/1292052"

# 豆瓣${copy.search}
curl "https://your-domain/api/v1/douban/search?q=盗梦空间&limit=5"</code></pre>

  <p class="footer">${copy.footnote}</p>
</main>
</body>
</html>`
}
