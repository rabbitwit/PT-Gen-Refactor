/** 稳定的机器可读错误符号 / Stable machine-readable error symbols. */
export const ErrorCode = {
    OK: 'OK',
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
    RATE_LIMITED: 'RATE_LIMITED',
    UPSTREAM_CHALLENGE: 'UPSTREAM_CHALLENGE',
    UPSTREAM_ERROR: 'UPSTREAM_ERROR',
    UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
    UPSTREAM_BLOCKED: 'UPSTREAM_BLOCKED',
    DOUBAN_COOKIE_EXPIRED: 'DOUBAN_COOKIE_EXPIRED',
    INVALID_IMDB_ID: 'INVALID_IMDB_ID',
    INVALID_DOUBAN_ID: 'INVALID_DOUBAN_ID',
    INVALID_SOURCE_ID: 'INVALID_SOURCE_ID',
    CONFIG_REQUIRED: 'CONFIG_REQUIRED',
    NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]

/** 与错误符号绑定的 HTTP 状态码 / HTTP status paired with each error symbol. */
const STATUS_BY_CODE: Record<ErrorCodeValue, number> = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    RATE_LIMITED: 429,
    UPSTREAM_CHALLENGE: 503,
    UPSTREAM_ERROR: 502,
    UPSTREAM_TIMEOUT: 504,
    UPSTREAM_BLOCKED: 403,
    DOUBAN_COOKIE_EXPIRED: 403,
    INVALID_IMDB_ID: 400,
    INVALID_DOUBAN_ID: 400,
    INVALID_SOURCE_ID: 400,
    CONFIG_REQUIRED: 501,
    NOT_IMPLEMENTED: 501,
    INTERNAL_ERROR: 500,
}

/**
 * 对外暴露的数字业务码 / Numeric business codes exposed to clients.
 *
 * 规则：`HTTP 状态码 × 100 + 序号`，因此 `40001` 一眼能看出是 400 家族的
 * 第 1 种情况。用数字而不是直接复用状态码，是为了让同一个状态码下的
 * 不同原因可区分（例如 400 下的 `INVALID_IMDB_ID` 与 `BAD_REQUEST`）。
 *
 * 编号一经发布不再复用；新增错误只追加。
 */
const NUMBER_BY_CODE: Record<ErrorCodeValue, number> = {
    OK: 20000,
    BAD_REQUEST: 40000,
    INVALID_IMDB_ID: 40001,
    INVALID_DOUBAN_ID: 40002,
    INVALID_SOURCE_ID: 40003,
    CONFIG_REQUIRED: 50101,
    UNAUTHORIZED: 40100,
    FORBIDDEN: 40300,
    UPSTREAM_BLOCKED: 40301,
    DOUBAN_COOKIE_EXPIRED: 40302,
    NOT_FOUND: 40400,
    METHOD_NOT_ALLOWED: 40500,
    RATE_LIMITED: 42900,
    INTERNAL_ERROR: 50000,
    NOT_IMPLEMENTED: 50100,
    UPSTREAM_ERROR: 50200,
    UPSTREAM_CHALLENGE: 50300,
    UPSTREAM_TIMEOUT: 50400,
}

/** 符号 → 数字业务码 / Symbol to numeric business code. */
export function toNumberCode(code: ErrorCodeValue): number {
    return NUMBER_BY_CODE[code]
}

export interface ApiErrorOptions {
    details?: unknown
    retryable?: boolean
    retryAfterSeconds?: number
    cause?: unknown
}

export class ApiError extends Error {
    /** 字符串符号，用于日志与 `error.type` */
    readonly symbol: ErrorCodeValue
    /** 数字业务码，用于响应体的 `code` */
    readonly code: number
    readonly status: number
    readonly details?: unknown
    readonly retryable: boolean
    readonly retryAfterSeconds?: number

    constructor(symbol: ErrorCodeValue, message: string, options: ApiErrorOptions = {}) {
        super(message, {cause: options.cause})
        this.name = 'ApiError'
        this.symbol = symbol
        this.code = toNumberCode(symbol)
        this.status = STATUS_BY_CODE[symbol]
        this.details = options.details
        this.retryable = options.retryable ?? false
        this.retryAfterSeconds = options.retryAfterSeconds
    }

    static badRequest(message: string, details?: unknown): ApiError {
        return new ApiError(ErrorCode.BAD_REQUEST, message, {details})
    }

    static unauthorized(message = '缺少或无效的 API Token'): ApiError {
        return new ApiError(ErrorCode.UNAUTHORIZED, message)
    }

    static notFound(message = '资源不存在', details?: unknown): ApiError {
        return new ApiError(ErrorCode.NOT_FOUND, message, {details})
    }

    static invalidImdbId(value: string): ApiError {
        return new ApiError(
            ErrorCode.INVALID_IMDB_ID,
            `无效的 IMDb ID: "${value}"，应形如 tt0111161 或 0111161`,
        )
    }

    static upstreamTimeout(message = '上游请求超时', details?: unknown): ApiError {
        return new ApiError(ErrorCode.UPSTREAM_TIMEOUT, message, {
            details,
            retryable: true,
            retryAfterSeconds: 10,
        })
    }

    static upstreamChallenge(message = 'IMDb 触发了 WAF 挑战，暂时无法获取数据'): ApiError {
        return new ApiError(ErrorCode.UPSTREAM_CHALLENGE, message, {
            retryable: true,
            retryAfterSeconds: 30,
            details: {hint: '等待 1-5 分钟后重试，或为当前运行时配置有效的代理 / IMDB_COOKIE'},
        })
    }

    static upstreamError(message = '上游返回异常状态', details?: unknown): ApiError {
        return new ApiError(ErrorCode.UPSTREAM_ERROR, message, {details, retryable: true})
    }

    static internal(message = '服务内部错误', cause?: unknown): ApiError {
        return new ApiError(ErrorCode.INTERNAL_ERROR, message, {cause})
    }

    static notImplemented(message: string, details?: unknown): ApiError {
        return new ApiError(ErrorCode.NOT_IMPLEMENTED, message, {details})
    }
}

export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError
}

export function toApiError(error: unknown): ApiError {
    if (isApiError(error)) return error
    if (error instanceof Error) {
        if (error.name === 'TimeoutError') return ApiError.upstreamTimeout(error.message)
        return ApiError.internal(error.message, error)
    }
    return ApiError.internal(typeof error === 'string' ? error : '未知错误', error)
}
