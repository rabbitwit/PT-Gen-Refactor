/**
 * Creates a standardized error response object for provider failures.
 * 为提供者失败创建标准化的错误响应对象。
 *
 * @param {string} site - The source site identifier (源网站标识符)
 * @param {string} sid - The source ID that failed (失败的源 ID)
 * @param {Error|string} errorOrMessage - The error object or error message (错误对象或错误消息)
 * @param {Object} [extraData={}] - Additional data to include in the error response (要包含在错误响应中的额外数据)
 * @returns {Object} A standardized error response with site, sid, success flag, and error message (包含 site、sid、成功标志和错误消息的标准化错误响应)
 */
export const createProviderError = (site, sid, errorOrMessage, extraData = {}) => {
    const message = errorOrMessage instanceof Error
        ? errorOrMessage.message
        : errorOrMessage;

    return {
        site,
        sid,
        success: false,
        error: message,
        ...extraData
    };
};

/**
 * Custom error class for API-related errors with HTTP status codes.
 * 用于带有 HTTP 状态码的 API 相关错误的自定义错误类。
 */
export class ApiError extends Error {
    constructor(message, statusCode = 500, data = null) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.data = data;
    }
}

/**
 * Error thrown when a requested resource cannot be found.
 * 当请求的资源无法找到时抛出的错误。
 */
export class NotFoundError extends ApiError {
    constructor(message = "Resource not found") {
        super(message, 404);
        this.name = "NotFoundError";
    }
}

/**
 * Error thrown when API rate limit has been exceeded.
 * 当 API 频率限制被超出时抛出的错误。
 */
export class RateLimitError extends ApiError {
    constructor(message = "Rate limit exceeded") {
        super(message, 429);
        this.name = "RateLimitError";
    }
}

/**
 * Error thrown when request is blocked by anti-bot protection mechanisms.
 * 当请求被反机器人保护机制阻止时抛出的错误。
 */
export class AntiBotError extends ApiError {
    constructor(message = "Blocked by anti-bot protection") {
        super(message, 403);
        this.name = "AntiBotError";
    }
}

/**
 * Error thrown when input validation fails.
 * 当输入验证失败时抛出的错误。
 */
export class ValidationError extends ApiError {
    constructor(message = "Invalid input parameters") {
        super(message, 400);
        this.name = "ValidationError";
    }
}

/**
 * Error thrown when authentication or authorization fails.
 * 当认证或授权失败时抛出的错误。
 */
export class AuthError extends ApiError {
    constructor(message = "Authentication failed") {
        super(message, 401);
        this.name = "AuthError";
    }
}

/**
 * Error thrown when response data parsing fails.
 * 当响应数据解析失败时抛出的错误。
 */
export class ParseError extends ApiError {
    constructor(message = "Failed to parse response data") {
        super(message, 500); // 解析错误属于服务器内部错误
        this.name = "ParseError";
    }
}