import {serve} from '@hono/node-server'
import {serveStatic} from '@hono/node-server/serve-static'
import {Hono} from 'hono'
import {app} from './app'
import {startDoubanCookieMonitor} from './douban/cookie-monitor'
import {createFsCacheBackend, resolveFsCacheDir} from './lib/fs-cache'
import {applyEnvFile} from './lib/load-env-file'
import {registerFsCacheBackend} from './lib/persistent-cache'

// 面板可能预置空环境变量；空值允许被 .env 填补
applyEnvFile('.env')

registerFsCacheBackend(createFsCacheBackend())

// 静态前端：先尝试 public 下的文件，未命中再交给 API 路由
const serverApp = new Hono()
serverApp.use('*', serveStatic({root: './public'}))
serverApp.route('/', app)

/**
 * Node.js / 自建服务器入口。
 *
 * 端口探测顺序（对齐常见面板与容器约定）：
 *   SERVER_PORT（Pterodactyl / Pelican）→ PORT（Heroku / Railway / Render / Docker）→ 3000
 */
function resolvePort(): number {
    for (const value of [process.env.SERVER_PORT, process.env.PORT]) {
        const port = Number.parseInt(value ?? '', 10)
        if (Number.isInteger(port) && port > 0) return port
    }
    return 3000
}

// 容器内必须监听 0.0.0.0，否则健康检查与端口转发无法连通
const hostname = process.env.HOST ?? '0.0.0.0'
const port = resolvePort()

const server = serve({fetch: serverApp.fetch, port, hostname}, (info) => {
    console.log(`PT-Gen listening on http://${hostname}:${info.port}`)
    console.log(`UI: http://localhost:${info.port}/  Docs: http://localhost:${info.port}/docs`)
})

startDoubanCookieMonitor()
console.log('Persistent cache:', resolveFsCacheDir())

server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use`)
    else if (error.code === 'EACCES') console.error(`No permission to bind port ${port}`)
    else console.error('Server error:', error.message)
    process.exit(1)
})

// 面板停止服务时发送 SIGTERM，需要优雅关闭以便端口及时释放
function shutdown(signal: string): void {
    console.log(`${signal} received, shutting down...`)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// 单个请求的异常不应导致整个服务退出（面板会视为崩溃并重启）
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason instanceof Error ? reason.message : reason)
})
