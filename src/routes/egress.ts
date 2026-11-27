import {Hono} from 'hono'
import type {AppConfig, AppEnv} from '../types'
import type {HttpClient} from '../lib/http'
import {getHttpClient} from '../lib/http'
import {createDirectSocketClient} from '../lib/edge-socket'
import {sendSuccess} from '../lib/response'
import {canUseImdb, hasImdbBackend} from '../config'
import {graphqlQuery} from '../imdb/graphql-client'
import {fetchRatingViaBackend} from '../imdb/backend'

/**
 * 出站通道自检。
 *
 * IMDb 的 429 是出口 IP 级限流。这个接口把当前通道的实际出口 IP 查出来，
 * 并（在 IMDb 可用的运行时上）顺带探一次 IMDb GraphQL。
 *
 * Workers 上 IMDb 接口只能走外部后端（`IMDB_BACKEND_URL`）：
 * - 配置了后端：探一次后端的 rating 动作，这才是实际数据通道；
 * - 未配置：只报 `imdbUsable: false` 和原因，不再消耗一次注定 429 的请求。
 * `socket` 只用来确认裸 TCP 是否可用。
 */
const IP_ENDPOINTS = ['https://api.ipify.org?format=json', 'https://ipinfo.io/ip']

const PROBE_QUERY = `query EgressProbe { title(id: "tt0111161") { id } }`

const IMDB_UNAVAILABLE =
    '当前部署未配置 IMDb 通道（IMDB_BACKEND_URL），已跳过探活（IMDb 接口返回 501）'

/** 探外部后端（php-backend/ 或 edgeone/）：它是 Workers 上真实的数据通道 */
async function probeBackend(
    client: HttpClient,
    config: AppConfig,
): Promise<{ status: number; ok: boolean; message: string }> {
    try {
        const rating = await fetchRatingViaBackend(client, config, 'tt0111161')
        return rating
            ? {status: 200, ok: true, message: 'IMDb 后端可用'}
            : {status: 200, ok: false, message: 'IMDb 后端可达，但未返回评分'}
    } catch (error) {
        const status = Number((error as { details?: { status?: number } })?.details?.status) || 0
        return {status, ok: false, message: error instanceof Error ? error.message : String(error)}
    }
}

async function probeChannel(client: HttpClient, config: AppConfig, imdbUsable: boolean) {
    if (!imdbUsable) {
        return {
            egressIp: await fetchEgressIp(client),
            imdb: {
                status: 0,
                ok: false,
                message: IMDB_UNAVAILABLE,
            },
        }
    }

    const imdb = hasImdbBackend(config)
        ? await probeBackend(client, config)
        : await probeImdb(client, config)
    const egressIp = await fetchEgressIp(client)
    return {egressIp, imdb}
}

async function fetchEgressIp(client: HttpClient): Promise<string> {
    for (const url of IP_ENDPOINTS) {
        try {
            const response = await client.request(url, {
                timeoutMs: 5000,
                headers: {accept: 'application/json, text/plain'},
            })
            if (!response.ok) continue

            const text = (await response.text()).trim()
            if (text.startsWith('{')) {
                const payload = JSON.parse(text) as { ip?: string }
                if (payload.ip) return payload.ip
                continue
            }
            if (/^[\d.:a-f]+$/i.test(text)) return text
        } catch {
            // 换下一个探测源
        }
    }
    return ''
}

async function probeImdb(
    client: HttpClient,
    config: AppConfig,
): Promise<{ status: number; ok: boolean; message: string }> {
    try {
        await graphqlQuery(client, config, PROBE_QUERY, {})
        return {status: 200, ok: true, message: 'IMDb GraphQL 可用'}
    } catch (error) {
        const status = Number((error as { details?: { status?: number } })?.details?.status) || 0
        return {status, ok: false, message: error instanceof Error ? error.message : String(error)}
    }
}

function describeChannel(label: string): string {
    if (label.startsWith('socket:')) return 'cloudflare:sockets 裸 TCP'
    return '直连（fetch）'
}

export const egress = new Hono<AppEnv>()

/** GET /api/egress — 查看实际出口 IP 与 IMDb 可达性 */
egress.get('/', async (c) => {
    const config = c.get('config')
    const client = await getHttpClient(config)
    const imdbUsable = canUseImdb(config)

    const [primary, viaSocket] = await Promise.all([
        probeChannel(client, config, imdbUsable),
        // 只有边缘运行时才有 connect()：它和 fetch 是两条出站链路，用来确认裸 TCP 是否可用
        config.runtime === 'edge' ? probeChannel(createDirectSocketClient(), config, imdbUsable) : Promise.resolve(null),
    ])

    return sendSuccess(
        {
            channel: client.label,
            channelType: describeChannel(client.label),
            runtime: config.runtime,
            /** IMDb 接口在当前部署上是否提供（Workers 上需配置 IMDB_BACKEND_URL） */
            imdbUsable,
            /** IMDb 数据是否来自外部后端 */
            imdbBackend: hasImdbBackend(config),
            egressIp: primary.egressIp,
            imdb: primary.imdb,
            /** Workers 上 connect() 与 fetch 走不同出站链路，出口 IP 可能不同 */
            socket: viaSocket,
        },
        {requestId: c.get('requestId'), startedAt: c.get('startedAt')},
        {cache: 'bypass', rateLimit: c.get('rateLimit'), origin: c.req.header('origin') ?? null},
    )
})
