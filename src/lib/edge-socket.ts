import type {HttpClient, HttpRequestOptions} from './http'
import {isRedirectStatus, MAX_REDIRECTS, nextRedirectRequest, tooManyRedirectsError} from './redirect'

/**
 * Cloudflare Workers 的裸 TCP 出站通道。
 *
 * Workers 的 `fetch` 出口会被 IMDb 一律回 429，但运行时提供 `connect()`
 * （`cloudflare:sockets`），可以自行建立 TCP 连接并对目标发起 TLS。
 * 拿到 TLS 通道后自己拼 HTTP/1.1 报文，因为 Workers 里没有可用的 socket 版 fetch。
 */

/** `cloudflare:sockets` 的最小类型，避免引入 @cloudflare/workers-types */
interface SocketLike {
    readonly readable: ReadableStream<Uint8Array>
    readonly writable: WritableStream<Uint8Array>
    readonly opened: Promise<unknown>
    readonly closed: Promise<unknown>

    startTls(options?: { expectedServerHostname?: string }): SocketLike

    close(): Promise<void>
}

type ConnectFn = (
    address: { hostname: string; port: number },
    options?: { secureTransport?: 'off' | 'on' | 'starttls'; allowHalfOpen?: boolean },
) => SocketLike

/** 单次响应体上限，防止异常上游把 Worker 内存打满 */
const MAX_BODY_BYTES = 12 * 1024 * 1024
const MAX_HEADER_BYTES = 64 * 1024

let connectLoader: Promise<ConnectFn> | null = null

/**
 * 动态加载 `cloudflare:sockets`。
 *
 * 用变量传模块名，避免 Node 构建（tsup）静态解析这个运行时内置模块；
 * 该分支只在边缘运行时执行。
 */
function loadConnect(): Promise<ConnectFn> {
    if (!connectLoader) {
        const specifier = 'cloudflare:sockets'
        connectLoader = (import(specifier) as Promise<{ connect: ConnectFn }>).then((module) => module.connect)
    }
    return connectLoader
}

function normalizePort(port: number): number {
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : 443
}

function targetPort(target: URL): number {
    return normalizePort(Number.parseInt(target.port || '443', 10))
}

function encode(value: string): Uint8Array {
    return new TextEncoder().encode(value)
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
    const merged = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.byteLength
    }
    return merged
}

function timeoutError(url: string, timeoutMs: number): Error {
    const error = new Error(`Request timed out after ${timeoutMs}ms: ${url}`)
    error.name = 'TimeoutError'
    return error
}

/**
 * 把 Workers 的 TCP 报错翻译成可操作的提示。
 *
 * 云侧限制（见 TCP sockets 文档）：
 * - `TCP Loop detected`：Worker 连回了自身网络，Cloudflare 明确不支持
 * - `cannot connect to the specified address`：目标是 Cloudflare IP 段 / localhost / 内网
 */
/** 标记已经拼接过诊断说明的错误，避免多层 catch 重复追加 */
const DESCRIBED = Symbol('connectErrorDescribed')

type DescribedError = Error & { [DESCRIBED]?: boolean }

function describeConnectError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error)
    if (error instanceof Error && (error as DescribedError)[DESCRIBED]) return message
    if (/TCP Loop detected/i.test(message)) {
        return `${message}（Cloudflare 认为这条连接会绕回自身网络：目标可能是 Cloudflare IP 段。若换任意目标都报这个错，说明当前 Worker 建立不了裸 TCP，此时只能用 fetch 出网）`
    }
    if (/cannot connect to the specified address/i.test(message)) {
        return `${message}（目标是 Cloudflare IP 段 / localhost / 内网地址，Workers 禁止连出）`
    }
    return message
}

/** 保留 TimeoutError 语义，其余错误附带可操作的说明 */
function mapConnectError(error: unknown): Error {
    if (error instanceof Error && error.name === 'TimeoutError') return error
    const mapped = new Error(describeConnectError(error)) as DescribedError
    mapped[DESCRIBED] = true
    return mapped
}

/**
 * 建立 socket。
 *
 * 目标被判定为回环（`TCP Loop detected`）时，运行时会**同步抛出**，
 * 不会返回一个 `opened` 失败的 socket —— 这类错误必须在调用处就接住，
 * 否则会绕过下面的诊断信息直接冒到接口层。
 */
function openSocket(connect: ConnectFn, address: {
    hostname: string;
    port: number
}, options?: Parameters<ConnectFn>[1]): SocketLike {
    try {
        return connect(address, options)
    } catch (error) {
        throw mapConnectError(error)
    }
}

/**
 * 超时看门狗：时间一到就关闭 socket。
 *
 * 不直接和读写 Promise 竞速 —— 那样超时后仍有 pending 的 read，
 * 再 `releaseLock()` 会抛 "Cannot call releaseLock() on a reader with
 * outstanding read promises"。关连接会让 pending 的读写自然失败。
 */
function createWatchdog(close: () => void, timeoutMs: number, url: string) {
    let expired = false
    const timer = setTimeout(
        () => {
            expired = true
            close()
        },
        Math.max(0, timeoutMs),
    )

    return {
        clear() {
            clearTimeout(timer)
        },
        wrap(error: unknown): Error {
            if (expired) return timeoutError(url, timeoutMs)
            return error instanceof Error ? error : new Error(String(error))
        },
    }
}

function protocolError(message: string): never {
    throw new Error(message)
}

/** 建立一条已完成 TLS 的通道 / Open a TLS tunnel to `target` */
type TunnelOpener = (target: URL, deadline: number) => Promise<SocketLike>

function buildRequestBytes(target: URL, options: HttpRequestOptions): Uint8Array {
    const headers = new Map<string, string>()
    for (const [key, value] of Object.entries(options.headers ?? {})) {
        headers.set(key.toLowerCase(), value)
    }

    // 自己控制连接与压缩：Connection: close 让服务端在响应后关闭，直接读到 EOF
    headers.delete('accept-encoding')
    headers.set('accept-encoding', 'gzip, deflate')
    headers.set('connection', 'close')
    if (!headers.has('host')) headers.set('host', target.host)

    const body = options.body
    if (body !== undefined) headers.set('content-length', String(encode(body).byteLength))

    const path = `${target.pathname || '/'}${target.search}`
    const lines = [`${options.method ?? 'GET'} ${path} HTTP/1.1`]
    for (const [key, value] of headers) lines.push(`${key}: ${value}`)

    return encode(`${lines.join('\r\n')}\r\n\r\n${body ?? ''}`)
}

function decodeChunked(body: Uint8Array): Uint8Array {
    const chunks: Uint8Array[] = []
    let total = 0
    let offset = 0

    while (offset < body.byteLength) {
        let lineEnd = -1
        for (let i = offset; i < body.byteLength - 1; i += 1) {
            if (body[i] === 0x0d && body[i + 1] === 0x0a) {
                lineEnd = i
                break
            }
        }
        if (lineEnd === -1) break

        const size = Number.parseInt(new TextDecoder('latin1').decode(body.subarray(offset, lineEnd)).trim(), 16)
        if (!Number.isFinite(size) || size <= 0) break

        const start = lineEnd + 2
        const chunk = body.subarray(start, start + size)
        chunks.push(chunk)
        total += chunk.byteLength
        offset = start + size + 2
    }

    return concat(chunks, total)
}

async function decodeBody(body: Uint8Array, contentEncoding: string | null): Promise<Uint8Array> {
    const encoding = contentEncoding?.split(',').pop()?.trim().toLowerCase()
    if (!encoding || encoding === 'identity') return body
    if (encoding !== 'gzip' && encoding !== 'x-gzip' && encoding !== 'deflate') return body

    const format = encoding === 'deflate' ? 'deflate' : 'gzip'
    // 流读出的 Uint8Array 在类型上是 ArrayBufferLike，运行时是普通 BufferSource
    const stream = new Blob([body as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream(format))
    return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function exchange(tunnel: SocketLike, target: URL, options: HttpRequestOptions, timeoutMs: number): Promise<Response> {
    const watchdog = createWatchdog(
        () => void tunnel.close().catch(() => undefined),
        timeoutMs,
        target.toString(),
    )
    const writer = tunnel.writable.getWriter()
    const reader = tunnel.readable.getReader()
    let finished = false

    try {
        await writer.write(buildRequestBytes(target, options))

        // 服务端按 Connection: close 回包，直接读到 EOF 即可
        const chunks: Uint8Array[] = []
        let total = 0
        for (; ;) {
            const {done, value} = await reader.read()
            if (done) break
            chunks.push(value)
            total += value.byteLength
            if (total > MAX_BODY_BYTES) protocolError('上游响应体超过上限')
        }

        const merged = concat(chunks, total)
        let headerEnd = -1
        for (let i = 0; i < merged.byteLength - 3; i += 1) {
            if (merged[i] === 0x0d && merged[i + 1] === 0x0a && merged[i + 2] === 0x0d && merged[i + 3] === 0x0a) {
                headerEnd = i
                break
            }
        }
        if (headerEnd === -1) protocolError('上游响应缺少 HTTP 头')
        if (headerEnd > MAX_HEADER_BYTES) protocolError('上游响应头过长')

        finished = true

        const head = new TextDecoder('latin1').decode(merged.subarray(0, headerEnd))
        const rest = merged.subarray(headerEnd + 4)

        const [statusLine, ...headerLines] = head.split('\r\n')
        const statusMatch = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\s*(.*)$/.exec(statusLine ?? '')
        const status = Number.parseInt(statusMatch?.[1] ?? '0', 10)
        if (!status) protocolError(`上游返回了无法解析的响应: ${statusLine ?? ''}`)

        const headers = new Headers()
        for (const line of headerLines) {
            const separator = line.indexOf(':')
            if (separator <= 0) continue
            headers.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim())
        }

        const transferEncoding = headers.get('transfer-encoding')?.toLowerCase() ?? ''
        const contentEncoding = headers.get('content-encoding')
        const rawBody = transferEncoding.includes('chunked') ? decodeChunked(rest) : rest
        const body = await decodeBody(rawBody, contentEncoding)

        // 已经解压 / 去分块，这些头不再成立
        headers.delete('transfer-encoding')
        headers.delete('content-encoding')
        headers.delete('content-length')

        return new Response(body as unknown as BodyInit, {status, statusText: statusMatch?.[2] ?? '', headers})
    } catch (error) {
        throw watchdog.wrap(error)
    } finally {
        watchdog.clear()
        if (finished) {
            writer.releaseLock()
            reader.releaseLock()
        }
        void tunnel.close().catch(() => undefined)
    }
}

function createTunnelClient(label: string, open: TunnelOpener): HttpClient {
    return {
        label,
        async request(rawUrl, options) {
            const redirectMode = options.redirect ?? 'follow'
            let target = new URL(rawUrl)
            let method = options.method ?? 'GET'
            let body = options.body
            const deadline = Date.now() + options.timeoutMs

            for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
                const remaining = deadline - Date.now()
                if (remaining <= 0) throw timeoutError(rawUrl, options.timeoutMs)

                const tunnel = await open(target, deadline)
                const response = await exchange(
                    tunnel,
                    target,
                    {...options, method, body},
                    Math.max(1, deadline - Date.now()),
                )

                const location = response.headers.get('location')
                const redirectable = Boolean(location) && isRedirectStatus(response.status)
                if (redirectMode === 'manual' || !redirectable) return response
                if (hop === MAX_REDIRECTS) break

                    ;
                ({
                    target,
                    method,
                    body
                } = nextRedirectRequest(target, location as string, method, body, response.status))
            }

            throw tooManyRedirectsError(rawUrl)
        },
    }
}

/** `connect()` 按域名判回环时的 DoH 回退缓存：TTL 取短一些，跟得上 CloudFront 的轮换 */
const DOH_CACHE_TTL_MS = 60 * 1000
const dohCache = new Map<string, { ip: string; expiresAt: number }>()
const DOH_ENDPOINTS = ['https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve']

interface DohAnswer {
    Answer?: Array<{ type?: number; data?: string }>
}

/** 用 DoH 解析 IPv4（走 fetch，不受 connect() 的回环判定影响） */
async function resolveHostnameViaDoh(hostname: string): Promise<string> {
    const cached = dohCache.get(hostname)
    if (cached && cached.expiresAt > Date.now()) return cached.ip

    for (const endpoint of DOH_ENDPOINTS) {
        try {
            const response = await fetch(`${endpoint}?name=${encodeURIComponent(hostname)}&type=A`, {
                headers: {accept: 'application/dns-json'},
                signal: AbortSignal.timeout(3000),
            })
            if (!response.ok) continue

            const payload = (await response.json()) as DohAnswer
            const ip = (payload.Answer ?? []).find((answer) => answer.type === 1 && answer.data)?.data
            if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) continue

            dohCache.set(hostname, {ip, expiresAt: Date.now() + DOH_CACHE_TTL_MS})
            return ip
        } catch {
            // 换下一个 DoH 服务
        }
    }

    return ''
}

/** workerd 的部分版本（含本地 wrangler dev）不支持 `startTls` 的 `expectedServerHostname` 选项 */
function isUnsupportedHostnameOption(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return /unsupported expectedServerHostname/i.test(message)
}

/**
 * 对已建立的 TCP 连接发起 TLS。
 *
 * 按域名建连时运行时本来就把该域名当作 SNI 并校验证书，不需要额外参数；
 * 只有按 DoH 解析出的 IP 建连时才必须用 `expectedServerHostname` 把 SNI 和
 * 证书校验目标改回原域名。该选项由 compatibility date 门控，较旧的运行时
 * 会直接抛 "startTls called with unsupported expectedServerHostname option"，
 * 所以域名建连一律不传。
 */
function openTls(raw: SocketLike, connectHost: string, serverHostname: string): SocketLike {
    if (connectHost.toLowerCase() === serverHostname.toLowerCase()) return raw.startTls()
    return raw.startTls({expectedServerHostname: serverHostname})
}

/** 连到 `address` 后对这条连接做 TLS，SNI 用 `serverHostname`（按 IP 建连时仍是原域名） */
async function openDirectTls(
    connect: ConnectFn,
    address: { hostname: string; port: number },
    serverHostname: string,
    url: string,
    deadline: number,
): Promise<SocketLike> {
    const viaIp = address.hostname.toLowerCase() !== serverHostname.toLowerCase()
    const raw = openSocket(connect, address, {
        secureTransport: 'starttls',
        allowHalfOpen: false,
    })
    raw.closed.catch(() => undefined)

    const watchdog = createWatchdog(
        () => void raw.close().catch(() => undefined),
        deadline - Date.now(),
        url,
    )

    try {
        await raw.opened
        const tls = openTls(raw, address.hostname, serverHostname)
        tls.closed.catch(() => undefined)
        await tls.opened
        return tls
    } catch (error) {
        await raw.close().catch(() => undefined)
        if (viaIp && isUnsupportedHostnameOption(error)) {
            throw new Error(
                `当前运行时不支持 startTls({expectedServerHostname})，无法按 IP 连接 ${serverHostname}；` +
                    `请改用域名建连或关闭 socket 通道`,
            )
        }
        throw mapConnectError(watchdog.wrap(error))
    } finally {
        watchdog.clear()
    }
}

/** 直连（不经任何中继），用于对比 `fetch` 的出站链路。
 *
 * Workers 的 `fetch` 和 `connect` 走的是不同的出站链路：同一个 Worker 里，
 * `fetch` 出的 IP 被上游限流时，`connect` 出的 IP 往往还能用。
 *
 * 按域名建连报 `TCP Loop detected` 时，改用 DoH 解析出的 IPv4 重连一次：
 * Cloudflare 会把部分域名解析到自家网段（IMDb 的 `api.graphql.imdb.com` 实测会间歇命中），
 * 而按 IP 建连只校验目标 IP，SNI 与 Host 头仍是原域名。
 */
export function createDirectSocketClient(): HttpClient {
    return createTunnelClient('socket:direct', async (target, deadline) => {
        const connect = await loadConnect()
        const port = targetPort(target)

        try {
            return await openDirectTls(
                connect,
                {hostname: target.hostname, port},
                target.hostname,
                target.toString(),
                deadline,
            )
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (!/TCP Loop detected/i.test(message)) throw error

            const ip = await resolveHostnameViaDoh(target.hostname)
            if (!ip) throw error

            return openDirectTls(connect, {hostname: ip, port}, target.hostname, target.toString(), deadline)
        }
    })
}
