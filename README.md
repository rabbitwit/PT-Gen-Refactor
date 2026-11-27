<div style="align-content: center">
  <img src="logo.webp" alt="PT-Gen Logo" width="400">
</div>

<div style="align-content: center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/TypeScript-Hono-3178c6" alt="Hono + TypeScript">
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React 19">
  <img src="https://img.shields.io/badge/Deploy-Workers%20%7C%20Vercel%20%7C%20Node%20%7C%20Bun%20%7C%20EdgeOne-6e56cf" alt="Deploy targets">
</div>

## 关于 PT-Gen

PT-Gen 用来把影视、书籍、音乐与游戏站点的资源链接，整理成可直接粘贴到 PT 站点发布页的简介。

本仓库已重构为 **Hono + TypeScript** 后端 + **React 19** 前端：

- 同一套后端代码可部署到 **Cloudflare Workers / Vercel / Node.js / Bun / EdgeOne Makers**
- 统一 JSON 响应信封（`ETag` / `304` 条件请求 + OpenAPI 3.1 描述），方便脚本和第三方客户端接入
- 前端支持自动识别链接、关键词搜索、多语言（简体中文 / 繁體中文 / English / 日本語 / 한국어）、深色模式与本地历史记录

## 注意事項

<div style="color: red; font-weight: bold; font-size: medium;">
  <p>豆瓣仍需配置 <code>DOUBAN_COOKIE</code> 才能使用</p>
  <p>IMDb 现在默认是 GraphQL，但 Workers 上 `connect()` 常被 Cloudflare 网段拦住，建议配置Cookie</p>
  <p>Vercel 部署的话豆瓣仍有被风控的情况发生,如果发现被风控了,那就更换Function地区</p>
</div>

## 支持的数据源

| 平台         | 类型           | 需要的配置                                                 | 数据通道                                                     |
|------------|--------------|-------------------------------------------------------|----------------------------------------------------------|
| 豆瓣（Douban） | 电影 / 剧集 / 读书 | 可选 `DOUBAN_COOKIE`、`DOUBAN_BACKEND_URL`               | 外部后端优先，其次网页 / Cookie                                     |
| IMDb       | 电影 / 剧集      | 可选 `IMDB_COOKIE`、`IMDB_BACKEND_URL`                   | 外部后端优先；Workers 上 `connect()` 常被 Cloudflare 网段拦住，建议配置外部后端 |
| TMDb       | 电影 / 剧集      | `TMDB_API_KEY`                                        | 官方 v3 / v4 API                                           |
| Trakt      | 电影 / 剧集      | **必须** `TRAKT_API_CLIENT_ID`（可选 `TRAKT_ACCESS_TOKEN`） | 官方 API                                                   |
| Bangumi    | 动画           | 无                                                     | 官方 API + 页面解析                                            |
| Steam      | 游戏           | 无                                                     | 商店页面                                                     |
| Melon      | 音乐专辑         | 无                                                     | 页面解析                                                     |
| 红果短剧       | 短剧           | 无                                                     | 页面解析                                                     |
| QQ 音乐      | 音乐专辑         | 无                                                     | 公开接口                                                     |

### 数据通道优先级

1. **豆瓣**：配置了 `DOUBAN_BACKEND_URL` 时优先走外部后端；否则使用 Cookie / 网页抓取。网页通道命中风控时会返回 `UPSTREAM_BLOCKED`；配置了 `DOUBAN_COOKIE` 但登录态失效时返回 `DOUBAN_COOKIE_EXPIRED`。
2. **IMDb**：配置了 `IMDB_BACKEND_URL` 时优先走外部后端；否则尝试 GraphQL：Workers 上先试 `connect()`（`cloudflare:sockets`）裸 TCP，但 IMDb 域名在 Cloudflare 前端后面，通常会被判 `TCP Loop detected`，此时退回 `fetch`（出口仍可能被 429）；Node / Bun 直接 `fetch`；最后才回退 HTML。**Workers 上最稳的做法是配置 `IMDB_BACKEND_URL`。**
3. **TMDb / Trakt / QQ 音乐**：只有配置了对应密钥 / Cookie 才可用，否则返回 `CONFIG_REQUIRED`（HTTP 501）。

## 快速开始

要求：Node.js >= 20（Vercel 固定 `26.x`）。

```bash
# 1. 安装后端依赖
npm install

# 2. 安装前端依赖（vite 在 frontend/，根目录 install 不会装到）
npm run install:frontend

# 3. 本地开发（前端 Vite + Worker 后端，两个终端）
npm run dev:workers     # 后端 http://127.0.0.1:8787
npm run dev:frontend    # 前端 http://127.0.0.1:5173
```

也可以不用 Workers，直接跑 Node：

```bash
npm run dev             # tsx watch src/node.ts
# 或
npm run build && npm start
```

Bun：

```bash
npm run dev:bun         # bun run src/bun.ts
# 或
bun run index.ts
```

前端构建产物输出到仓库根目录的 `public/`，这样 Workers 的 `[assets]`、Vercel 的静态输出和 EdgeOne 都能直接复用。

## 构建

```bash
npm run build:all       # 前端 → public/，后端 → dist/node.js + dist/vercel.js
npm run typecheck       # tsc --noEmit
```

单独构建：

```bash
npm run build:frontend
npm run build
```

## 部署

逐平台的完整操作步骤见 [DEPLOY.md](./DEPLOY.md)：环境变量、Cloudflare Workers（R2 / D1）、Vercel（Blob）、EdgeOne Makers（Blob、豆瓣 Cookie 写法）、Node.js / Bun / 面板，以及验证清单与排错。

| 平台                 | 入口                                | 持久化缓存            |
|--------------------|-----------------------------------|------------------|
| Cloudflare Workers | `src/index.ts`                    | R2 / D1（可选）      |
| Vercel             | `api/index.js` → `dist/vercel.js` | Vercel Blob（可选）  |
| EdgeOne Makers     | `node-functions/`                 | EdgeOne Blob（自动） |
| Node.js / Bun / 面板 | `dist/node.js` / `index.ts`       | 本地 `data/cache/` |
## 环境变量

| 变量                         | 必需 |                                                                                说明                                                                                 |
|----------------------------|:--:|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------:|
| `API_TOKEN`                | 否  |                                                外部 API 客户端令牌：`Authorization: Bearer <token>`、`X-API-Key` 或 `?key=`                                                 |
| `AUTH_SECRET`              | 否  |                                                     **服务端**会话签名密钥；配置后启用 UI 自动 PoW 认证（不要写成 `VITE_AUTH_SECRET`）                                                     |
| `SESSION_TTL_SECONDS`      | 否  |                                                                   UI 会话有效期，默认 `1800`（60–86400）                                                                    |
| `POW_DIFFICULTY`           | 否  |                                                                   PoW 前导零难度，默认 `12`（8–20），越大越慢                                                                    |
| `DOUBAN_BACKEND_URL`       | 否  |       外部豆瓣后端地址，只支持 `/api/v1` 接口：填 `https://<host>/api/v1/douban`，也可只填 `https://<host>` 或 `https://<host>/api/v1`（自动补资源名）。可填多个（逗号 / 换行分隔），按顺序尝试，全部失败再回退网页通道        |
| `DOUBAN_BACKEND_TOKEN`     | 否  |                                                               外部豆瓣后端令牌，以 `Authorization: Bearer` 发送                                                               |
| `DOUBAN_COOKIE`            | 否  |        豆瓣登录 Cookie。含 `ll="..."` / `dbcl2="..."` 时：`.env` 用单引号包整行；EdgeOne **不要用双引号包整段**（会在 `ll="` 处截断），写法见 [DEPLOY.md](./DEPLOY.md) 的「4.3 豆瓣 Cookie 的特殊写法」         |
| `DOUBAN_COOKIE_EXPIRES_AT` | 否  |                                                      Cookie 过期时间（ISO 8601 或 Unix 秒/毫秒时间戳），用于主动检查与到期前 24 小时告警                                                      |
| `TELEGRAM_BOT_TOKEN`       | 否  |                                                    Telegram Bot Token；与 `TELEGRAM_CHAT_ID` 同时配置后发送 Cookie 到期告警                                                    |
| `TELEGRAM_CHAT_ID`         | 否  |                                                                      Telegram 告警接收方的 Chat ID                                                                      |
| `IMDB_BACKEND_URL`         | 否  | 外部 IMDb 后端地址，只支持 `/api/v1` 接口：填 `https://<host>/api/v1/imdb`，也可只填 `https://<host>` 或 `https://<host>/api/v1`（自动补资源名）。可填多个（逗号 / 换行分隔），按顺序尝试，全部失败再回退 GraphQL / HTML |
| `IMDB_BACKEND_TOKEN`       | 否  |                                                             外部 IMDb 后端令牌，以 `Authorization: Bearer` 发送                                                             |
| `IMDB_COOKIE`              | 否  |                                                                    IMDb Cookie / WAF token（可选）                                                                    |
| `TMDB_API_KEY`             | 必填 |                                                                  TMDb v3 Key 或 v4 JWT (不填无法获取数据)                                                                  |
| `TRAKT_API_CLIENT_ID`      | 必填 |                                             Trakt API Client ID（[创建应用](https://trakt.tv/oauth/applications)）；不填无法获取数据                                             |
| `TRAKT_ACCESS_TOKEN`       | 否  |                                                                       Trakt 访问令牌（可选，用于私有数据）                                                                       |
| `QQ_COOKIE`                | 否  |                                                                          QQ 音乐登录 Cookie                                                                           |
| `CACHE_TTL_SECONDS`        | 否  |                                                                    缓存 TTL，默认 `600`（进程内与持久层共用）                                                                     |
| `RATING_REFRESH_SECONDS`   | 否  |                                                     命中缓存后回源比对评分的间隔，默认 `1296000`（15 天）；`0` 关闭；正数限制在 30 秒–30 天                                                      |
| `ENABLED_CACHE`            | 否  |                                                                  `false` 关闭持久化缓存层；进程内缓存不受影响，默认开启                                                                  |
| `ENABLED_DATABASE`         | 否  |                                                           `false` 关闭持久层未命中时查询 PT-Gen-Database 静态库；默认开启                                                            |
| `DATABASE_BASE_URL`        | 否  |                                                              静态库镜像地址（逗号分隔），默认 jsDelivr + GitHub Raw                                                               |
| `BLOB_READ_WRITE_TOKEN`    | 否  |                                                              Vercel Blob 读写令牌；关联 Blob Store 后可能自动注入                                                               |
| `BLOB_STORE_ID`            | 否  |                                                         新版 Vercel 连接 Blob 后注入，配合部署时的 `VERCEL_OIDC_TOKEN`                                                          |
| `BLOB_ACCESS`              | 否  |                                                        Vercel Blob 访问级别，默认 `private`；私有 Store 必须用 private                                                         |
| `CACHE_DIR`                | 否  |                                                                 Node / Bun 本地缓存目录，默认 `data/cache`                                                                 |
| `RATE_LIMIT_MAX`           | 否  |                                                                   每分钟每 IP 请求上限，默认 `60`；`0` 关闭限流                                                                   |
| `PORT` / `SERVER_PORT`     | 否  |                                                                          Node / Bun 监听端口                                                                          |

完整示例见 `.env.example`。

### 豆瓣通道

- 只使用以下两种方式：
  1. 配置 `DOUBAN_BACKEND_URL`：由外部后端代取。新版后端填 `https://<host>/api/v1/douban`（或 `https://<host>/api/v1`），令牌填 `DOUBAN_BACKEND_TOKEN`，请求头为 `Authorization: Bearer <token>`；
  2. 配置 `DOUBAN_COOKIE`：带 Cookie 直接抓取网页。EdgeOne 上若只能填到 `ll="`、后面全没了，是引号截断，写法见 [DEPLOY.md](./DEPLOY.md) 的「4.3 豆瓣 Cookie 的特殊写法」。
- 未配置 Cookie 且出口被豆瓣风控时，返回明确的 `UPSTREAM_BLOCKED` 错误。
- 配置了 `DOUBAN_COOKIE` 时，请求前会做一次主动健康检查（`https://www.douban.com/mine/`，结果缓存 10 分钟）；登录态失效返回 `DOUBAN_COOKIE_EXPIRED`（HTTP 403 / 业务码 `40302`）。超时或网络失败视为「未确认」，不会误判 Cookie 失效，海外出口上最多打一条提示，不刷屏。
- 也可以手动调用 `GET /api/v1/douban/cookie-status`（旧路径 `/api/douban/cookie-status` 保留）查看状态；加 `?refresh=1` 强制忽略缓存。
- `DOUBAN_COOKIE_EXPIRES_AT` 是手动填写的过期时间（Cookie 本身不携带到期信息）。配置 `TELEGRAM_BOT_TOKEN` 与 `TELEGRAM_CHAT_ID` 后，会在到期前 24 小时发送一次 Telegram 提醒。
- Node / Bun 每 6 小时主动检查一次；Workers / Vercel 没有常驻定时器，改为在豆瓣请求和 `cookie-status` 接口中按需检查。告警去重状态保存在进程内，多实例部署可能重复发送一次。
- 外部后端自身的取数实现不在本项目控制范围内。

### 鉴权模型

- **外部 API**：调用方携带 `API_TOKEN`（只由部署者在服务端配置，前端不读取也不保存）。
- **浏览器 UI**：无需填写密钥。首次请求遇到 `401` 时：
  1. `GET /api/auth/challenge` 获取签名挑战；
  2. 浏览器完成 SHA-256 PoW；
  3. `POST /api/auth/session` 换取 `HttpOnly; SameSite=Lax` 会话 Cookie；
  4. 自动重试原请求。
- `AUTH_SECRET` 只存在服务端，用于签名挑战和会话，**绝不能放进 `VITE_*`**；`API_TOKEN` 与 `AUTH_SECRET` 必须使用不同的值。
- 会话默认 30 分钟过期；服务端同时按 IP 和会话 ID 限流。
- 浏览器 UI 完全不走 `API_TOKEN`：只配置 `API_TOKEN` 而不配置 `AUTH_SECRET` 时，UI 会因为拿不到会话而被 `401` 拒绝，请同时配置 `AUTH_SECRET`。
- `AUTH_SECRET` 让**任何访客**都能通过 PoW 获得会话，它只消除“前端内置长期密钥”，不限制访问者身份；需要限制调用方时请配置 `API_TOKEN`，或在前面加登录 / Access。

> 这能防止“从 JS 包里提取长期密钥后无限调用”，但无法阻止用户复制自己的 Cookie。
> 生产环境仍应叠加 Cloudflare / EdgeOne / Vercel 的边缘限流与 WAF。
> 修改 `AUTH_SECRET` 会立即使所有已签发会话失效。

### 会话接口

| 接口                         | 说明                                          |
|----------------------------|---------------------------------------------|
| `GET /api/auth/challenge`  | 获取 PoW 挑战（公开）                               |
| `POST /api/auth/session`   | 提交 `challenge` / `solution`，返回 `Set-Cookie` |
| `GET /api/auth/session`    | 查询当前会话状态                                    |
| `DELETE /api/auth/session` | 清除会话 Cookie                                 |

## API

所有接口返回统一信封：

```json
{
  "code": 20000,
  "message": "OK",
  "data": {
    "success": true,
    "site": "douban",
    "sid": "1292052",
    "chinese_title": "肖申克的救赎",
    "format": "◉　译　　名 ..."
  },
  "error": null,
  "meta": {
    "requestId": "…",
    "timestamp": "2026-01-01T00:00:00.000Z",
    "durationMs": 812,
    "version": "3.0.0",
    "cached": false,
    "source": "api"
  }
}
```

错误响应使用同一结构，`code` 为 `HTTP 状态码 × 100 + 序号`，`error.type` 为稳定的字符串错误符号。

### 统一详情入口

```http
GET /api/v1/{provider}/{id}
```

| 参数         | 位置    | 说明                                                                                                                             |
|------------|-------|--------------------------------------------------------------------------------------------------------------------------------|
| `provider` | path  | `douban`、`douban_book`、`imdb`、`bangumi`、`tmdb`、`trakt`、`steam`、`melon`、`hongguo`、`qq_music`；别名（`movie`、`qqmusic`、`book` 等）会归一化 |
| `id`       | path  | 条目 ID：豆瓣 / 豆瓣读书为纯数字，IMDb 为 `tt` 编号，TMDb 为数字，Trakt 为 slug 或数字 ID，红果短剧可直接传链接                                                     |
| `type`     | query | 只有 TMDb（`movie` / `tv`）与 Trakt（`movie` / `show`）需要，缺省 `movie`；也可写成 `/api/v1/{provider}/{type}/{id}`                            |
| `full`     | query | `true`（默认）或 `false`（精简演员 / 奖项等大字段）                                                                                             |

`data` 中额外包含 `format` 字段（PT 简介文本）。

```http
GET /api/v1/douban/1292052
GET /api/v1/imdb/tt0111161
GET /api/v1/tmdb/550?type=movie
GET /api/v1/tmdb/movie/550
GET /api/v1/qq_music/f0M4Z4a2
GET /api/v1/douban/1292052?full=false
```

已知资源上的其它方法（`POST` / `PUT` / `PATCH` / `DELETE`）返回 `405` 并在 `Allow` 头列出可用方法；路径末尾的 `/` 会以 `308` 重定向到规范地址（保留方法与查询串）。

### 数据源目录与链接解析

```http
GET /api/v1/providers
GET /api/v1/resolve?url=https%3A%2F%2Fmovie.douban.com%2Fsubject%2F1292052%2F
GET /api/v1/resolve?source=imdb&id=tt0111161
GET /api/v1/resolve?source=bangumi&q=孤独摇滚
```

- `providers` 返回每个数据源的规范 ID、别名、是否支持搜索、媒体类型是否可放路径，以及示例 ID；对接或替换后端时可用它对齐能力。
- `resolve` 接受 `url`、`id` 或 `q`，可以配合 `source` / `type` 指定数据源；只给 `q` 时等价于“先搜索，再取第一条”。

#### 条件请求与状态码

- 所有 JSON 成功响应都带 `ETag`（弱校验；`requestId`、`durationMs` 等易变元信息不参与计算）。
- 带上 `If-None-Match` 且内容未变化时返回 `304`，无响应体。
- `HEAD` 返回与 `GET` 相同的响应头，不带 body。
- 错误响应使用同一信封，`code` 为 `HTTP 状态码 × 100 + 序号`，`error.type` 为稳定的字符串错误符号。

```http
GET /api/v1/douban/1292052
If-None-Match: W/"358d3d65536d2088"
```

### OpenAPI

`GET /openapi.json`（别名 `GET /api/openapi.json`，均为公开）返回 OpenAPI 3.1 描述，可导入 Postman、生成 SDK 或做契约测试；面向人的说明页在 `GET /docs`。

### 搜索

```http
GET /api/v1/search?q=盗梦空间&source=auto&limit=12
GET /api/v1/search?q=Frieren&source=bangumi
GET /api/v1/douban/search?q=盗梦空间&limit=5
GET /api/v1/imdb/search?q=shawshank&limit=10
```

`source` 支持 `auto`、`douban`、`imdb`、`tmdb`、`bangumi`、`trakt`、`steam`；每个数据源另有 `/{provider}/search`，可传各自的过滤参数（如 IMDb 的 `type` / `year_from` / `year_to` / `exact`，Bangumi 的 `type`）。

### 兼容入口

旧路径全部保留，行为与 v1 完全一致（同一套缓存键、持久层与静态数据库回退），在 OpenAPI 中标记为 `deprecated`；新代码请只使用 `/api/v1`：

- `GET /api/{provider}/{id}` — 等价于 `GET /api/v1/{provider}/{id}`
- `GET /api/imdb/:id`、`GET /api/douban/:id`、`GET /api/douban/book/:id`
- `GET /api/bangumi/:id`、`GET /api/steam/:id`、`GET /api/melon/:id`、`GET /api/hongguo/:id`、`GET /api/qqmusic/:id`
- `GET /api/tmdb/:type/:id`、`GET /api/trakt/:type/:id`
- `GET /api/search`、`GET /api/imdb/search`、`GET /api/douban/search`、`GET /api/douban/cookie-status`、`GET /api/egress`

参数别名同样保留：`sid`（等价于路径里的 `id`）、`site`（等价于 `source`）。旧的 `GET /api/getData` 已移除，链接或关键词请用 `GET /api/v1/resolve`（`url` / `id` / `q`）。

### 其它接口

| 接口                                        | 说明                              |
|-------------------------------------------|---------------------------------|
| `GET /api/v1/search?q=`                   | 聚合搜索                            |
| `GET /api/v1/douban/search?q=`            | 豆瓣搜索                            |
| `GET /api/v1/imdb/search?q=`              | IMDb 搜索                         |
| `GET /api/v1/douban/cookie-status`        | 豆瓣 Cookie 登录态（`refresh=1` 强制刷新） |
| `GET /api/config`                         | 前端能力探测（不返回机密）                   |
| `GET /api/v1/egress`                      | 出口 IP 与 IMDb 可达性自检              |
| `GET /health` 或 `/api/health`             | 健康检查                            |
| `GET /docs`                               | 内置 API 文档页                      |
| `GET /openapi.json` 或 `/api/openapi.json` | OpenAPI 3.1 描述                  |

## 前端

React 前端位于 `frontend/`：

- 自动识别豆瓣 / IMDb / TMDb / Bangumi / Steam / Melon / 红果 / QQ 音乐链接
- 输入关键词时按所选数据源搜索，支持聚合搜索
- 多语言界面与深色模式
- 设置面板只调整界面语言与主题；浏览器 UI 不保存任何密钥，首次请求自动完成 PoW 并换取短期会话
- 一键复制格式化结果；底部提供三步使用流程
- 服务状态页（`/#/status`）展示数据源与运行信息，数据来自 `/api/health` 与 `/api/config`

### 状态页「服务能力」说明

状态页读取 `GET /api/health`，只反映服务端配置的解析结果，不会主动请求上游站点。
「未配置」「不支持」都**不是故障**：这些是可选的增强能力，未开启时基础查询仍然可用。

补充说明：

- `runtime` 取值：`node`、`bun`、`edge`。Vercel Node Function、Docker、自建 Node / 面板服属于 `node`。
- 「浏览器」只看运行时，不需要额外配置；Cloudflare Workers、EdgeOne Makers 等边缘运行时不能启动无头浏览器，因此固定为「不支持」。
- 「持久化缓存」只影响跨实例 / 冷启动复用；未启用持久层时进程内缓存照常工作，只是多实例命中率较低。
- 所有 Secret 都不会出现在仓库或 `/health` 响应里；`/health` 只返回布尔值和缓存层名称。

状态页本身不主动请求豆瓣，首次豆瓣请求会触发 Cookie 校验；
也可以手动调用 `GET /api/v1/douban/cookie-status?refresh=1`（需要鉴权）立即校验并刷新缓存。
多实例部署下各实例的缓存互相独立，状态可能短暂不一致。

## 安全提示

- 豆瓣 / IMDb 的 Cookie 属于账号凭据，使用前请自行评估封禁风险。
- 建议在生产环境配置 `API_TOKEN` / `AUTH_SECRET`，并叠加边缘限流与 WAF。

## 项目结构

```text
src/
  app.ts                 Hono 应用与路由挂载
  config.ts              环境变量解析
  types.ts               公共类型
  index.ts               Workers 入口
  node.ts / bun.ts       Node / Bun 入口
  vercel.ts              Vercel 入口
  middleware/            上下文、鉴权、限流
  lib/                   缓存、HTTP、DOM、错误、响应、源识别
  douban/                豆瓣后端 / Cookie / 搜索 / 详情
  imdb/                  IMDb 后端 / GraphQL / HTML / 服务层
  providers/             Bangumi、Steam、TMDb、Trakt、Melon、红果、QQ 音乐、豆瓣读书
  format/                PT 简介生成器
  routes/                API 路由
  views/docs.ts          内置文档页
frontend/                React + Vite 前端（构建到 public/）
public/                  前端构建产物
```

## 感谢

- 感谢 [Rhilip/pt-gen-cfworker](https://github.com/Rhilip/pt-gen-cfworker) 提供部分逻辑参考。

## 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](LICENSE) 文件。

## 版本更新说明

有关详细的版本更新历史，请参阅 [VERSION.md](VERSION.md) 文件。
