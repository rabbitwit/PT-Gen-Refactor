<p align="center">
  <img src="logo.png" alt="PT-Gen Logo" width="200">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/github/languages/top/rabbitwit/PT-Gen-Refactor" alt="GitHub top language">
  <img src="https://img.shields.io/badge/Used-JavaScript%20React-blue.svg" alt="Used">
</p>

## 关于PT-Gen-Refactor

这是一个基于 Cloudflare Worker 和 React 的应用程序，用于生成 PT (Private Tracker) 资源描述。支持从多个平台（如豆瓣、IMDb、TMDB、Bangumi、Melon、Steam等）获取媒体信息，并生成标准的 PT 描述格式。

## 支持的平台

| 平台 | 类型 | 需要API密钥 | 备注 |
|------|------|------------|------|
| 豆瓣 (Douban) | 电影、电视剧 | 否 | 可选Cookie以获取更多信息 |
| IMDb | 电影、电视剧 | 否 | - |
| TMDB | 电影、电视剧 | 是 | 需要在环境变量中配置API密钥 |
| Bangumi | 动画 | 否 | - |
| Melon | 音乐 | 否 | 韩国音乐平台 |
| Steam | 游戏 | 否 | - |

## DEMO预览

<a href="https://pt-gen.hares.dpdns.org" target="_blank">
  <img src="https://img.shields.io/badge/Demo-Click%20Here-blue?style=for-the-badge" alt="Demo">
</a>

## 功能特性

- 支持从多个平台获取媒体信息：
  - 豆瓣 (Douban) - 增强版，支持演员/导演图片信息获取
  - IMDb (Internet Movie Database)
  - TMDB (The Movie Database)
  - Bangumi (番组计划)
  - Melon (韩国音乐平台)
  - Steam (游戏平台)
- 自动生成标准 PT 描述格式
- 响应式 React 前端界面
- 基于 Cloudflare Worker 的后端服务
- 支持多种媒体类型（电影、电视剧、音乐、游戏等）
- 智能搜索功能（根据关键词语言自动选择搜索平台）
- 请求频率限制和恶意请求防护
- R2缓存存储（避免重复抓取相同资源，提高响应速度）

## 环境要求

- Node.js (推荐版本 16+)
- npm 或 yarn

## 安装与设置

### 1. 克隆项目

```bash
git clone https://github.com/rabbitwit/PT-Gen-Refactor.git
cd new-pt-gen
```

### 2. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装 Worker 依赖
cd worker
npm install
cd ..

# 安装前端依赖 (如不需要前端界面，请忽略此步骤)
cd frontend
npm install
cd ..
```

## 开发环境

### 启动开发服务器

1. 启动 Cloudflare Worker:
   ```bash
   npm run dev
   ```
   默认运行在 http://localhost:8787

2. 启动 React 开发服务器:
   ```bash
   npm run dev:frontend
   ```
   默认运行在 http://localhost:5173

### 项目脚本

- `npm run dev` - 启动 Worker 开发服务器
- `npm run dev:frontend` - 启动前端开发服务器
- `npm run deploy` - 部署 Worker 到 Cloudflare
- `npm run install:all` - 一次性安装所有依赖

## 部署

### 1. 配置 Cloudflare

1. 注册或登录 [Cloudflare](https://www.cloudflare.com/) 账户
2. 获取 Cloudflare API Token（用于部署 Worker）
3. 安装 Wrangler CLI：
   ```bash
   npm install -g wrangler
   ```
4. 登录 Wrangler：
   ```bash
   npx wrangler login
   ```

### 2. 创建 R2 存储桶

R2 是 Cloudflare 提供的对象存储服务，本项目使用 R2 来缓存已抓取的数据，避免重复请求相同的资源。

1. 登录 Cloudflare 控制台
2. 导航到 R2 页面
3. 创建一个新的存储桶，命名为 `pt-gen-cache`
4. 确保存储桶名称与 `wrangler.toml` 文件中配置的 `bucket_name` 一致

### 3. 配置环境变量

编辑根目录下的 `wrangler.toml` 文件，更新以下配置：
```toml
name = "pt-gen-refactor"  # Worker 名称，可以修改为你自己的名称

# 静态资源绑定 (如不需要前端界面，请使用# 注释)
[assets]
directory = "./frontend/dist"
binding = "ASSETS"

[vars]
AUTHOR = "your_author"
# TMDB API密钥（如果需要使用TMDB功能）
TMDB_API_KEY = "your_tmdb_api_key"
# 豆瓣Cookie（可选，用于获取更多信息）
DOUBAN_COOKIE = "your_douban_cookie"
# 安全API密钥（可选）
API_KEY = "your_api_key"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "pt-gen-cache"
```

下表列出了所有可用的环境变量及其说明：

| 环境变量 | 是否必需 | 默认值 | 说明 |
|---------|---------|--------|------|
| `AUTHOR` | 否 | - | 作者信息，用于标识资源描述的生成者 |
| `TMDB_API_KEY` | 否* | - | TMDB API 密钥，如果需要使用 TMDB 功能则必需 |
| `DOUBAN_COOKIE` | 否 | - | 豆瓣 Cookie，用于获取更多豆瓣信息（可选） |
| `API_KEY` | 否 | - | 安全 API 密钥，用于保护 API 接口（可选） |

> *注意：如果要使用中文搜索功能，必须配置 TMDB_API_KEY，否则只能使用英文进行搜索（调用 IMDb）。

### 4. 部署方式

#### 方式一：前后端一起部署到 Cloudflare Worker（推荐）

这种方式将前端静态文件和后端 API 都部署到同一个 Worker 中，避免跨域问题。

1. 构建前端应用：
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

2. 部署到 Cloudflare Worker：
   ```bash
   npm run deploy
   ```
   
   或者直接使用 Wrangler 命令：
   ```bash
   cd worker
   npx wrangler deploy
   cd ..
   ```

部署成功后，会输出类似以下的信息：
```
Uploaded pt-gen-refactor (1.2 seconds)
Published pt-gen-refactor (0.3 seconds)
  https://pt-gen-refactor.your-subdomain.workers.dev
```

#### 方式二：只部署后端到 Cloudflare Worker

这种方式将后端 API 部署到 Cloudflare Worker。

1. 构建后端应用：
   ```bash
   cd worker
   npx wrangler deploy
   cd ..
   ```

部署成功后，会输出类似以下的信息：
```
Uploaded pt-gen-refactor (1.2 seconds)
Published pt-gen-refactor (0.3 seconds)
  https://pt-gen-refactor.your-subdomain.workers.dev
```

#### 方式三：使用预构建的 bundle.js 文件（无需本地构建环境）

对于没有 Node.js 构建环境的用户，可以使用我们预构建的 bundle.js 文件。这个文件通过 GitHub Actions 自动构建并推送到 `build` 分支。

1. 从 [build 分支](https://github.com/rabbitwit/PT-Gen-Refactor/tree/build) 下载 `bundle.js` 文件
2. 重命名为 `index.js`
3. 将该文件直接上传到 Cloudflare Worker 控制台，或直接复制代码到 Cloudflare Worker 控制台。
4. 在变量和机密的设置中添加所需的环境变量。

## API 接口 (所有的接口请求是"POST")

### URL 参数方式（只部署后端）
直接解析特定平台的资源链接:
- `/?url=https://movie.douban.com/subject/123456/` - 解析豆瓣资源（包含演员/导演图片）
- `/?url=https://www.imdb.com/title/tt123456/` - 解析 IMDb 资源
- `/?url=https://www.themoviedb.org/movie/123456` - 解析 TMDB 资源

### URL 参数方式（前后端一起部署,后端的API则是以下的）
- `/api?url=https://movie.douban.com/subject/123456/` - 解析豆瓣资源（包含演员/导演图片）
- `/api?url=https://www.imdb.com/title/tt123456/` - 解析 IMDb 资源
- `/api?url=https://www.themoviedb.org/movie/123456` - 解析 TMDB 资源

## 使用说明

1. **豆瓣功能限制**：如果不提供豆瓣 Cookie，将无法获取一些需要登录才能查看的条目信息。
2. **反爬虫机制**：短时间不要重复请求多次豆瓣，否则会触发豆瓣的反爬虫机制。
3. **TMDB 功能限制**：需要提供 TMDB API 密钥，否则将无法获取 TMDB 资源信息。
4. **搜索功能限制**：如要使用中文搜索功能,必须要配置TMDB API KEY,如果没有配置的话,则只能使用英文进行搜索(调用IMDB)。
5. **安全API 密钥**：如配置了安全API密钥,则调用时必须携带URL参数"key=YOUR_API_KEY",才能获取数据。
6. **R2 缓存功能**：系统会自动将抓取的数据存储在 R2 中，下次请求相同资源时会直接从缓存中读取，提高响应速度并减少源站压力。
7. 启动应用后，访问前端地址 (默认 https://pt-gen-refactor.your-subdomain.workers.dev)
8. 输入媒体资源的链接或 ID
9. 系统将自动获取并生成标准 PT 描述（豆瓣资源包含演员/导演图片信息）
10. 复制生成的描述用于 PT 站点发布

## 新增功能亮点

- **豆瓣信息增强**：豆瓣资源现在包含演员和导演的图片信息
- **更丰富的元数据**：提供更完整的媒体信息用于PT站点发布
- **性能优化**：改进了数据抓取和处理逻辑

## 感谢

- 感谢[Rhilip/pt-gen-cfworker](https://github.com/Rhilip/pt-gen-cfworker)提供部分逻辑参考。

## 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](LICENSE) 文件。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=rabbitwit/PT-Gen-Refactor&type=Date)](https://www.star-history.com/#rabbitwit/PT-Gen-Refactor&Date)

## 贡献

欢迎提交 Issue 和 Pull Request 来改进项目。