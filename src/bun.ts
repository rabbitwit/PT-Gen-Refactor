import {serveStatic} from '@hono/node-server/serve-static'
import {Hono} from 'hono'
import {app} from './app'
import {startDoubanCookieMonitor} from './douban/cookie-monitor'
import {createFsCacheBackend, resolveFsCacheDir} from './lib/fs-cache'
import {applyEnvFile} from './lib/load-env-file'
import {registerFsCacheBackend} from './lib/persistent-cache'

// Bun 会先自动读 .env，但不会覆盖面板预置的空字符串；这里再补一次空值
applyEnvFile('.env')

registerFsCacheBackend(createFsCacheBackend())

// Bun 兼容 node:fs，可直接复用 Node 的静态文件中间件
const serverApp = new Hono()
serverApp.use('*', serveStatic({root: './public'}))
serverApp.route('/', app)

/**
 * Bun 入口：`bun run src/bun.ts`，或面板默认启动文件 `bun run index.ts`（根目录转发到这里）
 *
 * Bun 直接复用 Web 标准 `fetch`，与 Workers 走同一条代码路径，
 * 因此无需额外适配层。
 *
 * 这里用局部类型声明而不是 `@types/bun`：Bun 是可选运行时，
 * 不应把它的类型约束强加给 Node / Workers 构建。
 */
interface BunServer {
    port: number
}

interface BunRuntime {
    serve: (options: {
        port: number
        hostname?: string
        /** 秒。Bun 默认 10s，面板反代会先于应用超时返回 HTML 502 */
        idleTimeout?: number
        fetch: (request: Request) => Response | Promise<Response>
    }) => BunServer
}

const bun = (globalThis as unknown as { Bun: BunRuntime }).Bun

/**
 * 端口探测顺序与 Node 入口一致（对齐常见面板与容器约定）：
 *   SERVER_PORT（Pterodactyl / Pelican）→ PORT（Heroku / Railway / Render / Docker）→ 3000
 */
function resolvePort(): number {
    for (const value of [process.env.SERVER_PORT, process.env.PORT]) {
        const port = Number.parseInt(value ?? '', 10)
        if (Number.isInteger(port) && port > 0) return port
    }
    return 3000
}

const port = resolvePort()
const hostname = process.env.HOST ?? '0.0.0.0'

const server = bun.serve({
    port,
    hostname,
    // 默认 10s 会让豆瓣/IMDb 慢请求被 Bun 掐掉，bot-hosting 反代就回 HTML 502。
    // 255s 是 Bun 上限；真正的超时仍由 REQUEST_TIMEOUT_MS 控制。
    idleTimeout: 255,
    fetch: serverApp.fetch,
})

startDoubanCookieMonitor()
console.log('Persistent cache:', resolveFsCacheDir())

console.log(`PT-Gen listening on http://${hostname}:${server.port}`)
console.log(`UI: http://localhost:${server.port}/  Docs: http://localhost:${server.port}/docs`)
