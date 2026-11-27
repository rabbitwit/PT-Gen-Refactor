# 版本更新说明

## v2.0.0 (当前版本)

### 重构

- 后端迁移到 Hono + TypeScript，统一响应信封为 `{ code, message, data, error, meta }`
- 前端使用 React 19 重写，支持简中 / 繁中 / English / 日本語 / 한국어
- 统一详情入口 `GET /api/v1/{provider}/{id}` 与 `/api/v1/search`，覆盖豆瓣、IMDb、Bangumi、TMDB、Trakt、Steam、Melon、红果、QQ 音乐、豆瓣读书
- 支持 Cloudflare Workers / Vercel / Node.js / Bun / EdgeOne Makers 部署
- 持久化缓存覆盖各平台：Cloudflare R2 / D1、Vercel Blob、EdgeOne Blob、Node / Bun 本地 `data/cache` 目录
- 持久层未命中时先查 PT-Gen-Database 静态库（`ENABLED_DATABASE`、`DATABASE_BASE_URL`），再回源上游
- `DOUBAN_BACKEND_URL` / `IMDB_BACKEND_URL` 支持多个端点（逗号或换行分隔），拿不到数据就试下一个，全部失败再按原逻辑回退或报错
- 移除旧版 `worker/` 实现

### 接口

- 版本化 REST 面 `/api/v1`：详情 `GET /api/v1/{provider}/{id}`（TMDb / Trakt 也可写 `/api/v1/{provider}/{type}/{id}`），聚合搜索 `/api/v1/search`，各数据源搜索 `/api/v1/{provider}/search`，目录 `/api/v1/providers`，链接 / 关键词解析 `/api/v1/resolve`
- 参数规范化为 `id` / `type` / `full` / `q` / `source`；`sid` / `site` / `query` 等旧名继续作为兼容别名生效
- 所有详情入口（含各站点旧路径）共用同一条读取路径：进程内缓存 → 持久层 → 静态数据库 → 回源
- 旧路径全部保留为别名，OpenAPI 中标记 `deprecated`，缓存键与响应内容与 v1 完全一致
- 移除 `GET /api/getData`：链接 / 关键词解析改用 `GET /api/v1/resolve`（`url` / `id` / `q`）
- JSON 成功响应带 `ETag`，支持 `If-None-Match` → `304` 与 `HEAD`；路径尾斜杠以 `308` 重定向到规范地址
- 已知路径上的不支持方法返回 `405`，并在 `Allow` 头列出可用方法
- 新增 `GET /openapi.json`（OpenAPI 3.1，别名 `/api/openapi.json`），`GET /docs` 文档页同步更新；`/openapi.json` 在 Cloudflare（`run_worker_first`）、Vercel（rewrite）、EdgeOne（rewrite 到 `/api/openapi.json`）上均可达

### 运行时

- Cloudflare Workers 的 `compatibility_date` 从 `2024-11-01` 提升到 `2025-11-01`
- IMDb 裸 TCP 通道在按域名建连时不再向 `startTls()` 传 `expectedServerHostname`：本地 `wrangler dev`（workerd）对该选项只打印 `NOSENTRY` 错误，而域名建连本身已由运行时用该域名做 SNI 与证书校验；仅当按 DoH 解析出的 IP 建连时才传，运行时不支持则抛出明确错误交给上层回退

### 安全

- 新增 PoW + HttpOnly 会话认证：浏览器自动解 SHA-256 挑战并换取短期会话，前端不再内置任何长期密钥
- 外部 API 客户端继续使用 `API_TOKEN`；新增 `SESSION_TTL_SECONDS`、`POW_DIFFICULTY`
- 移除 `VITE_AUTH_SECRET` 与 `?ts=&sig=` HMAC 方案；`AUTH_SECRET` 仅保存在服务端
- 会话 Cookie 使用 `HttpOnly; SameSite=Lax`，HTTPS 下自动加 `Secure`
- 按 IP 与会话 ID 双重限流，并保留边缘 WAF / 限流建议
- 豆瓣 Cookie 生命周期：登录重定向 / 反爬页被动识别为 `DOUBAN_COOKIE_EXPIRED`，请求前主动健康检查（缓存 10 分钟），支持
  `DOUBAN_COOKIE_EXPIRES_AT` 与 Telegram 到期前 24 小时告警

## v1.0.8

### 新增功能

- HMAC-SHA256 认证签名机制作为前后端验证机制
- 增加日志功能,方便开发测试

### 功能优化

- 更改豆瓣搜索为爬取方式,弃用之前的外部API
- 优化IMDB的请求头避免出现挑战
- 重构目录结构和重命名部分文件名称
- 更改前端部分数据显示样式

### Bug Fix

- 修复前端API可修改请求头绕过验证,防止API被滥用

## v1.0.7

### 新增功能

- 添加Trakt平台官方API支持,具体请看Readme的使用说明

### 功能优化

- 优化豆瓣抓取功能，改进名人信息提取和奖项信息获取逻辑
- 优化IMDB的请求头避免出现挑战,如果出现挑战回退到[PtGen Archive](https://github.com/ourbits/PtGen)获取数据

### Bug Fix

- 修复了豆瓣的片名输出显示的问题

## v1.0.6

### 新增功能

- 增加了对豆瓣读书和QQ音乐的支持

### 功能优化

- 优化前端显示来源的站点显示
- 优化格式化输出函数

## v1.0.5

### 新增功能

-

增加了中文搜索支持豆瓣,该搜索API稳定性有待观察,所以如果出现搜索失败时会自动回退使用TMDB进行搜索,暂时知道这个豆瓣搜索有些关键词是会搜索失败的,例如"
拯救"、"地球"等

- 增加了后端API功能支持GET请求,但务必要携带key参数才可以正常使用
- 增加了支持获取红果短剧平台的信息功能,感谢[@jiongjiongJOJO](https://github.com/jiongjiongJOJO)贡献

### 功能优化

- 优化了Bangumi元数据的演员信息不再元数据里构建展示格式,交由格式函数输出时构建格式化
- 优化了豆瓣获取数据时演员信息超时导致无法获取的问题,增加了重试机制

### 组件更新

- 由于React在2025年11月29日爆出一个重大的安全漏洞,根据官方修复,已更新React版本至19.2.1及其相关依赖组件的更新版本

## v1.0.4

### 新增功能

- 添加了对OurBits静态数据缓存的支持，作为API调用失败时的备用数据源
- 实现了豆瓣奖项信息的结构化解析和展示
- 增加了对豆瓣、IMDb、Bangumi和Steam平台的缓存优化

### 功能优化

- 改进了数据抓取和处理逻辑，提高了稳定性和准确性
- 优化了错误处理机制，提供了更清晰的错误信息
- 增强了对反爬虫机制的应对能力

### 技术改进

- 重构了代码结构，提高了模块化程度和可维护性
- 更新了依赖库和工具链，提升了整体性能
- 完善了工具函数文档，方便开发者使用和二次开发