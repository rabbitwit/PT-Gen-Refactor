import {API_VERSION} from '../config'
import {ErrorCode, toApiError, toNumberCode, type ApiError} from './errors'
import type {DataSource} from '../types'

/** 统一响应体中的元信息 / Metadata attached to every response. */
export interface ResponseMeta {
    requestId: string
    timestamp: string
    durationMs: number
    version: string
    cached: boolean
    source?: DataSource
}

/** 统一 JSON Envelope / The unified JSON envelope. */
export interface Envelope<T> {
    /** 数字业务码，规则为 `HTTP 状态码 × 100 + 序号`；`20000` 即成功 */
    code: number
    message: string
    data: T | null
    /** `type` 是 `code` 对应的字符串符号，便于日志检索与客户端 switch */
    error: { type: string; details?: unknown; retryable: boolean } | null
    meta: ResponseMeta
}

export interface EnvelopeContext {
    requestId: string
    startedAt: number
    cached?: boolean
    source?: DataSource
}

function baseMeta(ctx: EnvelopeContext): ResponseMeta {
    return {
        requestId: ctx.requestId,
        timestamp: new Date().toISOString(),
        durationMs: Math.max(0, Date.now() - ctx.startedAt),
        version: API_VERSION,
        cached: ctx.cached ?? false,
        ...(ctx.source ? {source: ctx.source} : {}),
    }
}

export function successEnvelope<T>(
    data: T,
    ctx: EnvelopeContext,
    message = 'OK',
): Envelope<T> {
    return {
        code: toNumberCode(ErrorCode.OK),
        message,
        data,
        error: null,
        meta: baseMeta(ctx),
    }
}

export function errorEnvelope(error: ApiError, ctx: EnvelopeContext): Envelope<never> {
    return {
        code: error.code,
        message: error.message,
        data: null,
        error: {
            type: error.symbol,
            ...(error.details !== undefined ? {details: error.details} : {}),
            retryable: error.retryable,
        },
        meta: baseMeta(ctx),
    }
}

export interface ResponseHeaderOptions {
    status: number
    requestId: string
    startedAt: number
    /** 数字业务码，同时写入 `X-Business-Code` 便于日志与 CDN 统计 */
    code?: number
    cache?: 'hit' | 'miss' | 'bypass'
    cacheTtlSeconds?: number
    source?: DataSource
    rateLimit?: { limit: number; remaining: number; resetAt: number }
    retryAfterSeconds?: number
    origin?: string | null
    varyAuthorization?: boolean
}

const ALLOWED_METHOD_HEADERS = 'GET, HEAD, OPTIONS'

/**
 * 构造标准响应头。
 *
 * 约定：
 * - `X-Request-Id` 全链路透传，便于日志关联
 * - `X-API-Version` 便于客户端感知破坏性变更
 * - `X-Data-Source` 标明本次数据来自 graphql / html / probe / backend
 * - `X-Cache` 与 `Cache-Control` 配合，让 CDN 承担重复请求
 * - 携带鉴权时强制 `private`，避免共享缓存把私有响应发给别人
 */
export function buildResponseHeaders(options: ResponseHeaderOptions): Headers {
    const headers = new Headers()

    headers.set('Content-Type', 'application/json; charset=utf-8')
    headers.set('X-Request-Id', options.requestId)
    headers.set('X-API-Version', API_VERSION)
    headers.set('X-Response-Time', `${Math.max(0, Date.now() - options.startedAt)}ms`)

    if (options.code !== undefined) headers.set('X-Business-Code', String(options.code))

    if (options.source) headers.set('X-Data-Source', options.source)

    if (options.cache) {
        headers.set('X-Cache', options.cache === 'hit' ? 'HIT' : options.cache === 'miss' ? 'MISS' : 'BYPASS')
    }

    if (options.status === 200 && options.cacheTtlSeconds && options.cache !== 'bypass') {
        const ttl = options.cacheTtlSeconds
        headers.set(
            'Cache-Control',
            `public, max-age=${Math.floor(ttl / 2)}, s-maxage=${ttl}, stale-while-revalidate=${ttl}`,
        )
    } else if (options.status >= 400) {
        headers.set('Cache-Control', 'no-store')
    } else {
        headers.set('Cache-Control', 'no-cache')
    }

    if (options.rateLimit) {
        headers.set('X-RateLimit-Limit', String(options.rateLimit.limit))
        headers.set('X-RateLimit-Remaining', String(options.rateLimit.remaining))
        headers.set('X-RateLimit-Reset', String(Math.ceil(options.rateLimit.resetAt / 1000)))
    }

    if (options.retryAfterSeconds) {
        headers.set('Retry-After', String(options.retryAfterSeconds))
    }

    if (options.origin) {
        headers.set('Access-Control-Allow-Origin', options.origin)
        headers.set(
            'Access-Control-Expose-Headers',
            'X-Request-Id, X-API-Version, X-Data-Source, X-Business-Code, X-Cache, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Response-Time, Retry-After',
        )
        headers.set('Access-Control-Allow-Credentials', 'true')
    }

    headers.set(
        'Vary',
        options.varyAuthorization ? 'Accept-Encoding, Origin, Authorization' : 'Accept-Encoding, Origin',
    )
    headers.set('X-Content-Type-Options', 'nosniff')

    return headers
}

export function corsPreflightHeaders(origin: string | null): Headers {
    const headers = new Headers()
    if (origin) {
        headers.set('Access-Control-Allow-Origin', origin)
        headers.set('Access-Control-Allow-Credentials', 'true')
    }
    headers.set('Access-Control-Allow-Methods', ALLOWED_METHOD_HEADERS)
    headers.set(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, X-Request-Id, X-API-Key',
    )
    headers.set('Access-Control-Max-Age', '86400')
    headers.set('Vary', 'Origin')
    return headers
}

function jsonResponse(body: Envelope<unknown>, headers: Headers, status: number): Response {
    return new Response(JSON.stringify(body), {status, headers})
}

export function sendSuccess<T>(
    data: T,
    ctx: EnvelopeContext,
    options: Omit<ResponseHeaderOptions, 'status' | 'requestId' | 'startedAt'> & {
        message?: string
    } = {},
): Response {
    const headers = buildResponseHeaders({
        status: 200,
        requestId: ctx.requestId,
        startedAt: ctx.startedAt,
        code: toNumberCode(ErrorCode.OK),
        cache: options.cache,
        cacheTtlSeconds: options.cacheTtlSeconds,
        source: ctx.source ?? options.source,
        rateLimit: options.rateLimit,
        origin: options.origin,
        varyAuthorization: options.varyAuthorization,
    })
    return jsonResponse(successEnvelope(data, ctx, options.message ?? 'OK'), headers, 200)
}

export function sendError(
    error: unknown,
    ctx: EnvelopeContext,
    options: { origin?: string | null; rateLimit?: ResponseHeaderOptions['rateLimit'] } = {},
): Response {
    const apiError = toApiError(error)
    const headers = buildResponseHeaders({
        status: apiError.status,
        requestId: ctx.requestId,
        startedAt: ctx.startedAt,
        code: apiError.code,
        origin: options.origin,
        rateLimit: options.rateLimit,
        retryAfterSeconds: apiError.retryAfterSeconds,
    })
    return jsonResponse(errorEnvelope(apiError, ctx), headers, apiError.status)
}
