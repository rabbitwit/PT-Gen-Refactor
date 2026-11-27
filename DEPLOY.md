# 部署指南

本文件是逐平台的操作手册；`README.md` 的「部署」章节只保留概览。

支持的运行环境：

| 平台                 | 入口                                         | 构建产物                | 持久化缓存            |
|--------------------|--------------------------------------------|---------------------|------------------|
| Cloudflare Workers | `src/index.ts`                             | `public/`（静态资源）     | R2 / D1（可选）      |
| Vercel             | `api/index.js` → `dist/vercel.js`          | `public/`           | Vercel Blob（可选）  |
| EdgeOne Makers     | `node-functions/`                          | `public/`           | EdgeOne Blob（自动） |
| Node.js / Bun / 面板 | `dist/node.js` / `index.ts` → `src/bun.ts` | `public/` + `dist/` | 本地 `data/cache/` |

---

## 0. 通用准备

要求：Node.js >= 20（Vercel 按 `package.json` 的 `engines` 使用 26.x；EdgeOne 控制台为 24）。

```bash
# 后端依赖
npm install

# 前端依赖（vite 在 frontend/，根目录 install 不会安装）
npm run install:frontend

# 类型检查 / 完整构建
npm run typecheck
npm run build:all      # 前端 → public/，后端 → dist/node.js + dist/vercel.js
```

Windows 下把 `cp` 换成 `copy`，`&&` 换成先执行第一条再执行第二条。

### 不要提交的文件

以下路径已被 `.gitignore` 忽略，部署时仅保存在本机 / 平台环境变量里：

```
.env  .env.local  .env*        # 环境变量
.dev.vars                      # wrangler 本地密钥
wrangler.toml                  # 含本机配置与密钥
.vercel/  .edgeone/            # CLI 关联信息
dist/  public/  data/cache/    # 构建与运行产物
```

> 如果 `API_TOKEN`、`AUTH_SECRET` 或后端令牌曾经出现在提交、截图、日志里，请立即轮换。

---

## 1. 环境变量

### 鉴权（二选一，推荐两个都配）

| 变量            | 说明                                                                        |
|---------------|---------------------------------------------------------------------------|
| `API_TOKEN`   | 外部客户端凭证，请求头 `Authorization: Bearer <token>` 或 `X-API-Key`                 |
| `AUTH_SECRET` | UI 会话签名密钥（至少 32 位随机串）。配置后浏览器通过 PoW 换取 HttpOnly Cookie，前端不需要任何 `VITE_*` 密钥 |

- 两个都不配 = API 完全公开，只适合本地调试。
- **只配 `API_TOKEN` 不配 `AUTH_SECRET`**：外部客户端可用，但浏览器 UI 无法换取会话，会收到 401。
- 生成随机串：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 数据源

| 变量                                        | 必需性        | 说明                                                                                                      |
|-------------------------------------------|------------|---------------------------------------------------------------------------------------------------------|
| `DOUBAN_BACKEND_URL`                      | 推荐         | 外部豆瓣后端，**只支持 `/api/v1`**：`https://<host>/api/v1/douban`，也可只填 `https://<host>` 或 `https://<host>/api/v1` |
| `DOUBAN_BACKEND_TOKEN`                    | 配合上者       | 以 `Authorization: Bearer` 发送                                                                            |
| `IMDB_BACKEND_URL`                        | Workers 必填 | 外部 IMDb 后端：`https://<host>/api/v1/imdb`                                                                 |
| `IMDB_BACKEND_TOKEN`                      | 配合上者       | 同上                                                                                                      |
| `DOUBAN_COOKIE`                           | 可选         | 没有后端时抓取豆瓣网页用；含内嵌引号，写法见 §4.3「豆瓣 Cookie 的特殊写法」                                                            |
| `TMDB_API_KEY`                            | 可选         | TMDb v3 Key 或 v4 Read Token                                                                             |
| `TRAKT_API_CLIENT_ID`                     | Trakt 必需   | 否则 Trakt 数据拉不到                                                                                          |
| `QQ_COOKIE`                               | 可选         | QQ 音乐部分接口                                                                                               |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | 可选         | 豆瓣 Cookie 到期前 24 小时告警                                                                                   |

> **IMDb 在 Cloudflare Workers 上必须配置外部后端。** Workers 的 `fetch` 出口常被 IMDb 429；`connect()` 裸 TCP 又因为 IMDb 在 Cloudflare 前端后面而报 `TCP Loop detected`。外部后端是唯一稳定通道。

### 运行参数（一般不用改）

| 变量                                 | 默认                 | 说明                                                  |
|------------------------------------|--------------------|-----------------------------------------------------|
| `PORT` / `SERVER_PORT` / `HOST`    | `3000` / `0.0.0.0` | Node / Bun 监听地址；优先级 `SERVER_PORT` → `PORT` → `3000` |
| `CACHE_TTL_SECONDS`                | `600`              | 进程内缓存 TTL                                           |
| `ENABLED_CACHE`                    | `true`             | 是否使用持久化缓存层（`false` 只保留进程内缓存）                        |
| `ENABLED_DATABASE`                 | `true`             | 持久层未命中时是否查 PT-Gen-Database 静态库                      |
| `RATING_REFRESH_SECONDS`           | `1296000`          | 命中缓存后回源比对评分的间隔（15 天），`0` 关闭                         |
| `REQUEST_TIMEOUT_MS`               | `30000`            | 上游请求超时                                              |
| `RATE_LIMIT_MAX`                   | `60`               | 每 IP 每分钟请求上限                                        |
| `RUNTIME`                          | 自动                 | 强制 `node` / `bun` / `edge`（一般不需要）                   |
| `ALLOW_CLIENT_PROXY` / `PROXY_URL` | `false` / 空        | 出站代理；`ALLOW_CLIENT_PROXY` 会引入 SSRF 风险，默认关闭          |

配置写在哪里：

- 本地 Node / Bun：工作目录的 `.env`（Node / Bun 入口会自动加载）
- 本地 Wrangler：`.dev.vars`
- Workers 远端：`npx wrangler secret put <NAME>`
- Vercel：项目 Environment Variables 或 `npx vercel env add`
- EdgeOne：`npx edgeone makers env set`

**改完环境变量必须重新部署**，运行中的实例不会热更新。

### 持久化缓存语义（通用）

读取顺序：

```
进程内 TTL 缓存  →  R2  →  D1  →  PT-Gen-Database 静态库  →  回源上游
```

- 回源成功后并行写回 R2 / D1，任一层失败只记日志，不影响响应；只绑 R2 或只绑 D1 都可以。
- 持久层都没命中时先查 [rabbitwit/PT-Gen-Database](https://github.com/rabbitwit/PT-Gen-Database) 静态库（`ENABLED_DATABASE=false` 关闭）；静态库不可用时按未命中处理，不阻塞回源（未命中的键在进程内缓存 10 分钟）。可用 `DATABASE_BASE_URL` 指定镜像。
- 对象键带 `.json`（`douban/1292052.json`、`tmdb/movie/27205.json`），D1 表主键用下划线（`douban_1292052`、`tmdb_movie_27205`）；读取对象层时会回退无后缀的旧键。
- 写入带时间戳信封，按 `CACHE_TTL_SECONDS` 判断过期；旧版裸数据仍能读。
- `ENABLED_CACHE=false` 只关闭持久层，进程内缓存照常工作。
- 详情会落盘；关键词搜索（`/api/v1/*/search`、`/api/v1/search`）只进进程内缓存，避免每个查询词留下一次性键。
- 单条数据超过约 900 KB 时跳过 D1 写入（D1 单行上限 1 MB），R2 不受影响。
- `RATING_REFRESH_SECONDS`（默认 15 天）到期后回源比对评分：有变化就重写 R2 / D1 并返回新条目，没变化不重写，回源失败继续返回旧缓存。
- Node / Bun 用 `data/cache/`（`CACHE_DIR` 可改）；Vercel 用 Blob；EdgeOne 用 Blob。
- 本地 `wrangler dev` 的 R2 / D1 是 Miniflare 模拟（`.wrangler/state`），**不会出现在 Cloudflare 控制台**；验证远端桶请用 `wrangler dev --remote` 或部署后请求一次。

---

## 2. Cloudflare Workers

### 2.1 首次部署

```bash
# 1. 复制配置模板（不要直接拿 example 去 deploy）
copy wrangler.toml.example wrangler.toml

# 2. 按需修改：name、R2 / D1 绑定；密钥不要写进 [vars]
#    例如 name = "pt-gen-refactor"

# 3. 登录
npx wrangler login

# 4. 配置密钥（逐条执行，按提示粘贴值）
npx wrangler secret put API_TOKEN
npx wrangler secret put AUTH_SECRET
npx wrangler secret put DOUBAN_BACKEND_URL
npx wrangler secret put DOUBAN_BACKEND_TOKEN
npx wrangler secret put IMDB_BACKEND_URL
npx wrangler secret put IMDB_BACKEND_TOKEN
npx wrangler secret put DOUBAN_COOKIE
npx wrangler secret put TMDB_API_KEY
npx wrangler secret put TRAKT_API_CLIENT_ID

# 5. 部署（脚本内部先构建前端，再执行 wrangler deploy）
npm run deploy:workers
```

`wrangler.toml` 的关键项：

- `main = "src/index.ts"`：Wrangler 自己打包 TypeScript，不需要先 `npm run build`
- `[assets] directory = "./public"`：前端静态资源，SPA 回退到 `index.html`
- `run_worker_first`：`/api/*`、`/health`、`/docs`、`/openapi.json`、`/trakt/*`、`/callback` 交给 Worker，其余走静态资源
- 不需要 `nodejs_compat`

部署完成后 Worker 默认域名是 `https://<name>.<account>.workers.dev`（若关闭了 `workers_dev`，请在控制台绑定自定义域名）。

### 2.2 本地调试

```bash
npm run dev:workers          # wrangler dev，读取 wrangler.toml + .dev.vars
npm run dev:frontend         # 另一个终端，Vite 开发服务器
```

需要与线上隔离时使用 `wrangler.test.toml`（同样不入库）：

```bash
npm run dev:workers:test
npm run deploy:workers:test
```

### 2.3 R2 / D1 持久化缓存（可选）

```bash
npx wrangler r2 bucket create pt-gen-cache
npx wrangler d1 create pt-gen-cache
npx wrangler d1 execute pt-gen-cache --command "CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, data TEXT NOT NULL, timestamp INTEGER NOT NULL);"
```

把输出填回 `wrangler.toml`（绑定必须写在所有 `[vars]` 之后）：

```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "pt-gen-cache"

[[d1_databases]]
binding = "DB"
database_name = "pt-gen-cache"
database_id = "<wrangler d1 create 输出的 id>"
```

重新 `npm run deploy:workers`。只绑 R2 或只绑 D1 都可以，都不绑则只用进程内缓存。

### 2.4 验证

```bash
curl -s https://<worker域名>/health
```

确认：

- `status` 为 `ok`
- `runtime` 为 `edge`
- `capabilities.imdbBackend` 为 `true`（配了 `IMDB_BACKEND_URL` 时）
- `cacheLayers` 出现 `r2` / `d1`（如果绑定了）

### 2.5 单文件 API Worker（无本地构建环境）

`.github/workflows/build-worker.yml` 在每次 push 到 `main` 时：

1. 用 `wrangler deploy --dry-run --config wrangler.bundle.toml` 打包 `src/index.ts`
2. 把产物发布到孤立的 `build` 分支，文件名 `bundle.js`
3. 同时上传 Actions artifact `worker-api-bundle`

用法：

1. 从 `build` 分支下载 `bundle.js`（或从 Actions 页面下载 artifact）
2. 重命名为 `index.js`
3. Cloudflare 控制台 → Workers & Pages → Create → Worker，粘贴或上传该文件
4. 在 Worker 的 Settings → Variables 里配置环境变量（`API_TOKEN`、`AUTH_SECRET`、`DOUBAN_BACKEND_URL` 等）

限制：

- **只含后端**：`/api/*`、`/health`、`/docs`、`/openapi.json` 可用，不含前端静态资源，`/` 会 302 到不存在的 `/index.html`。需要 UI 请用 `wrangler.toml` 完整部署。
- 单文件不包含 R2 / D1 绑定，需要持久化缓存时在控制台手动绑定；`IMDB_BACKEND_URL` 等变量仍要配置。
- 体积参考：约 513 KiB（gzip 约 137 KiB）。

本地复现同样一条命令：

```bash
npx wrangler deploy --dry-run --outdir dist/bundle --config wrangler.bundle.toml
# 产物：dist/bundle/index.js
```

---

## 3. Vercel

### 3.1 控制台导入（推荐）

1. 在 [Vercel Dashboard](https://vercel.com/new) 导入本仓库
2. Framework Preset 选 **Other**（`vercel.json` 已固定 `framework: null`）
3. 添加环境变量（Production；需要预览环境就再勾 Preview）
4. Deploy

`vercel.json` 已配置：

- `installCommand`：同时安装根目录与 `frontend/` 依赖
- `buildCommand`：`npm run build:all`
- `outputDirectory`：`public`
- `api/index.js`：Node.js Serverless Function（不是 Edge），`maxDuration` 60 秒
- `/api/*`、`/health`、`/docs`、`/openapi.json`、`/trakt/*`、`/callback` 重写到该函数

### 3.2 CLI 部署

```bash
npx vercel login
npx vercel link                 # 目录保持 ./，生成 .vercel/

npx vercel env add API_TOKEN production
npx vercel env add AUTH_SECRET production
npx vercel env add DOUBAN_BACKEND_URL production
npx vercel env add DOUBAN_BACKEND_TOKEN production
npx vercel env add IMDB_BACKEND_URL production
npx vercel env add IMDB_BACKEND_TOKEN production
npx vercel env add TMDB_API_KEY production
npx vercel env add TRAKT_API_CLIENT_ID production

npx vercel                      # 预览部署
npm run deploy:vercel           # 生产部署（vercel deploy --prod）
```

说明：

- 必须在仓库根目录执行，不要 `cd frontend`
- CLI 会按 `vercel.json` 自动构建，本地不必先 `npm run build:all`
- `.vercel/` 只保存关联信息，不要提交
- CI 可用 `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID`

### 3.3 Vercel Blob 缓存（可选）

项目 **Storage → Create Database → Blob**，关联到本项目并重新部署。会自动注入 `BLOB_READ_WRITE_TOKEN`（或 `BLOB_STORE_ID`）。

- 默认按 **private** 读写；Public Store 想公开访问才设 `BLOB_ACCESS=public`
- 部署后 `/health` 的 `cacheLayers` 会出现 `blob`

---

## 4. EdgeOne Makers

### 4.1 控制台导入

在 [EdgeOne Makers](https://makers.edgeone.link) 导入仓库，填写环境变量后部署。`edgeone.json` 已配置安装、构建、输出目录与 `/api/*` 不缓存。

### 4.2 CLI 部署

```bash
npm i -g edgeone@latest
npx edgeone login --site global      # 国内站：--site china

npx edgeone makers link -n pt-gen-refactor

npx edgeone makers env set API_TOKEN "<token>" -e production
npx edgeone makers env set AUTH_SECRET "<随机密钥>" -e production
npx edgeone makers env set DOUBAN_BACKEND_URL "https://<host>/api/v1/douban" -e production
npx edgeone makers env set DOUBAN_BACKEND_TOKEN "<token>" -e production
npx edgeone makers env set IMDB_BACKEND_URL "https://<host>/api/v1/imdb" -e production
npx edgeone makers env set IMDB_BACKEND_TOKEN "<token>" -e production
npx edgeone makers env set TMDB_API_KEY "<key>" -e production
npx edgeone makers env set TRAKT_API_CLIENT_ID "<id>" -e production

npx edgeone makers deploy -e preview        # 预览
npm run deploy:edgeone                      # 生产（edgeone makers deploy -e production）
```

说明：

- `nodeVersion` 固定 24（控制台目前最高 24.x）
- `/openapi.json` 在 `edgeone.json` 里 rewrite 到 `/api/openapi.json`，避免被 SPA 兜底
- CLI 会按 `edgeone.json` 构建，本地不必先 `npm run build:all`
- CI 可用 `-t "$EDGEONE_TOKEN"` 代替交互登录
- `.edgeone/` 不要提交

### 4.3 豆瓣 Cookie 的特殊写法

Cookie 从浏览器复制：登录 [https://movie.douban.com/](https://movie.douban.com/) → F12 → Network → 任意 `movie.douban.com` 请求 → Request Headers → `Cookie`，整行复制。至少要有 `bid`、`dbcl2`、`ck`：

```text
ll="118281"; bid=xxxxxx; dbcl2="123456:abcdef"; ck=xxxx
```

这段值会踩中网页控制台的两条限制：

1. **不能有空格**：控制台会直接报「环境变量不能有空格」，必须先删掉 `;` 后的空格。
2. **不要用双引号包整段**：Cookie 本身含 `ll="118281"`、`dbcl2="..."`，再套一层 `"..."` 会在第一个 `"` 处截断，只剩 `ll=` / `ll="`。

**网页控制台**（先去空格，两端不加引号）：

```text
ll="118281";bid=xxxxxx;dbcl2="123456:abcdef";ck=xxxx
```

若保存后仍提示有空格，检查是否误粘了换行或两端多了引号；若输入框在 `ll="` 之后就被截断，说明控制台吃掉了内嵌 `"`，**改用下面的 CLI**。

**推荐：Windows PowerShell（整段单引号，空格可保留）**

```powershell
npx edgeone makers env set DOUBAN_COOKIE 'll="118281"; bid=xxxxxx; dbcl2="123456:abcdef"; ck=xxxx' -e production
```

Git Bash / macOS / Linux 同样用单引号；`QQ_COOKIE` 含 `"` 或空格时也用同一写法。**不要用 cmd.exe**，它只认双引号，无法安全传入这段 Cookie。

确认没有被截断：

```powershell
npx edgeone makers env ls -e production
```

`DOUBAN_COOKIE` 应是很长一串（多个 `;` 分隔的键值），不能只有 `ll=` / `ll="`。修改后必须重新部署：

```powershell
npx edgeone makers deploy -e production
```

### 4.4 EdgeOne Blob 缓存

`node-functions/` 入口已静态导入 `@edgeone/pages-blob`，部署时自动注入凭证。首次写入时自动创建 `pt-gen-cache`。

部署后访问一次 `/health`，`cacheLayers` 应出现 `eo`。

---

## 5. Node.js / Bun / 面板

### 5.1 Node.js（VPS / 容器）

```bash
npm install
npm run install:frontend
npm run build:all

# .env 放在工作目录（入口会自动加载）
npm start                    # node dist/node.js
```

- 监听地址：`HOST`（默认 `0.0.0.0`），端口优先级 `SERVER_PORT` → `PORT` → `3000`
- 静态前端从 `./public` 提供，API 在 `/api/*`
- 持久化缓存写入 `data/cache/`，可用 `CACHE_DIR` 覆盖
- 反向代理不需要额外 rewrite，Node 入口本身托管静态文件与 API

systemd 示例：

```ini
[Unit]
Description=PT-Gen
After=network.target

[Service]
WorkingDirectory=/opt/pt-gen
ExecStart=/usr/bin/node dist/node.js
Environment=NODE_ENV=production
Environment=PORT=3000
Restart=always

[Install]
WantedBy=multi-user.target
```

### 5.2 Bun / 面板（Pterodactyl、Pelican、Bot-Hosting）

```bash
bun install --production
bun run index.ts
```

- 面板默认启动文件就是根目录 `index.ts`（转去 `src/bun.ts`）
- `bunfig.toml` 默认跳过 devDependencies（不安装 wrangler），避免面板解压依赖失败
- 建议设置 `NODE_ENV=production`
- Bun 的 `idleTimeout` 已调到 255 秒，避免反代先于应用超时返回 HTML 502

本地开发请继续用 `npm install`；确实需要 Bun 安装开发依赖时用 `bun install --production=false`。

---

## 6. 部署后验证清单

把 `<base>` 换成实际域名：

```bash
# 1. 存活探针（公开）
curl -s <base>/health

# 2. 能力探测（公开，不返回机密）
curl -s <base>/api/config

# 3. 文档与 OpenAPI（公开）
curl -s <base>/docs
curl -s <base>/openapi.json

# 4. 详情（需要 token）
curl -s -H "Authorization: Bearer <API_TOKEN>" <base>/api/v1/douban/1292052
curl -s -H "Authorization: Bearer <API_TOKEN>" <base>/api/v1/imdb/tt0111161

# 5. 搜索
curl -s -H "Authorization: Bearer <API_TOKEN>" "<base>/api/v1/douban/search?q=test&limit=5"
curl -s -H "Authorization: Bearer <API_TOKEN>" "<base>/api/v1/imdb/search?q=shawshank&limit=5"

# 6. 出口自检（排查 429 / 风控）
curl -s -H "Authorization: Bearer <API_TOKEN>" <base>/api/egress
```

浏览器打开 `<base>/` 应能正常使用；配置了 `AUTH_SECRET` 时 UI 会自动换取会话，无需手动填 token。

---

## 7. 常见问题

| 现象                                        | 原因 / 处理                                                                                                                |
|-------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| `50200 豆瓣后端鉴权失败，请检查 DOUBAN_BACKEND_TOKEN` | `DOUBAN_BACKEND_TOKEN` 与外部后端 `API_TOKEN` 不一致，或后端地址不是 `/api/v1` 资源根                                                     |
| `50200 ... 必须指向 /api/v1 或 /api/v1/douban` | 后端地址填了旧式 `.../api/douban`、`.../api.php`；改成 `https://<host>/api/v1/douban`                                              |
| `50200 ... TCP Loop detected`（IMDb）       | Workers 用 `connect()` 连 Cloudflare 前端域名被拒。配置 `IMDB_BACKEND_URL`，这是 Workers 上唯一稳定通道                                     |
| `40301 UPSTREAM_BLOCKED` / IMDb 429       | 出口 IP 被风控。配置对应 `*_BACKEND_URL`，或换出口 / 代理                                                                               |
| `50101 CONFIG_REQUIRED`                   | 缺少对应数据源密钥（TMDb / Trakt 等）                                                                                              |
| UI 打开后接口全 401                             | 只配了 `API_TOKEN` 没配 `AUTH_SECRET`；补上 `AUTH_SECRET` 并重新部署                                                                |
| `/openapi.json` 返回 `index.html`           | Workers 漏配 `run_worker_first`；或反代把路径交给了 SPA                                                                            |
| 缓存不生效                                     | 确认 `ENABLED_CACHE=true` 且平台侧绑定已生效；`/health` 的 `cacheLayers` 可确认；Workers 本地 `wrangler dev` 写的是 `.wrangler/state`，不会进远端桶 |
| Node 启动后访问 404 / 白屏                       | 没有先执行 `npm run build:all`，`public/` 不存在                                                                                |
| 修改环境变量不生效                                 | 各平台都需要重新部署；Vercel / EdgeOne 不会热更新函数环境变量                                                                                |
| EdgeOne Cookie 只剩 `ll=`                   | 用了双引号包整段，被内嵌 `"` 截断；按「4.3 豆瓣 Cookie 的特殊写法」处理                                                                           |

---

## 8. 升级

```bash
git pull
npm install
npm run install:frontend
npm run typecheck
npm run build:all
```

然后按平台重新部署：

```bash
npm run deploy:workers
npm run deploy:vercel
npm run deploy:edgeone
# Node / Bun：重启进程即可
```

缓存键与响应格式向后兼容，旧缓存无需清理；需要强制刷新时换 `CACHE_TTL_SECONDS` 或清空持久层对象即可。
