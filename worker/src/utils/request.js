import {activeAbortControllers, AUTHOR, CORS_HEADERS, DEFAULT_TIMEOUT, VERSION} from "../core/constants.js";
import {
    PROVIDER_CONFIG,
    URL_PROVIDERS,
    _extractParams,
    _handleOptionsRequest,
    createErrorResponse,
    handleRootRequest,
    isRateLimited,
    isMaliciousRequest,
} from "./helpers.js";
import {handleAutoSearch, handleSearchRequest} from "./search.js";
import {_withCache} from "./cache.js";
import logger from "../logger.js";
import {ValidationError, AuthError, AntiBotError, NotFoundError, RateLimitError} from "../core/errors.js";

const DEFAULT_BODY_TEMPLATE = Object.freeze({
    success: false,
    error: null,
    format: "",
    version: VERSION,
    generate_at: 0,
});

/**
 * Verifies HMAC-SHA256 signature from request headers for authentication.
 * 验证请求头中的 HMAC-SHA256 签名以进行身份认证。
 *
 * @param {Request} request - The incoming HTTP request object (传入的 HTTP 请求对象)
 * @param {Object} env - Environment object containing AUTH_SECRET for signature verification (包含用于签名验证的 AUTH_SECRET 的环境对象)
 * @returns {Promise<Object>} Verification result with valid flag and optional reason (包含有效标志和可选原因的验证结果)
 */
const verifySignature = async (request, env) => {
    const timestamp = request.headers.get("X-Timestamp");
    const signature = request.headers.get("X-Signature");

    if (!timestamp || !signature) {
        logger.debug("🚨 缺少签名参数", {
            hasTimestamp: !!timestamp,
            hasSignature: !!signature
        });
        return {valid: false, reason: "missing_signature"};
    }

    const now = Date.now();
    const timeDiff = Math.abs(now - parseInt(timestamp));
    if (timeDiff > 5 * 60 * 1000) { // 5 分钟
        logger.warn("🚨 签名时间戳超出有效窗口", {
            timeDiff,
            maxAllowed: 5 * 60 * 1000,
            timestamp: new Date(parseInt(timestamp)).toLocaleString(),
            now: new Date().toLocaleString()
        });
        return {valid: false, reason: "expired_timestamp"};
    }

    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(env.AUTH_SECRET),
            {name: "HMAC", hash: "SHA-256"},
            false,
            ["verify"]
        );

        const signatureBytes = Uint8Array.from(
            atob(signature.replace(/-/g, '+').replace(/_/g, '/')),
            c => c.charCodeAt(0)
        );

        const isValid = await crypto.subtle.verify(
            "HMAC",
            key,
            signatureBytes,
            encoder.encode(timestamp)
        );

        logger.debug("🔐 签名验证结果", {isValid, timestamp: new Date(parseInt(timestamp)).toLocaleString()});
        return {valid: isValid};
    } catch (error) {
        logger.error("❌ 签名验证过程出错", {error: error.message});
        return {valid: false, reason: "verification_error"};
    }
};

/**
 * Validates incoming requests through multiple security and authentication checks.
 * 通过多重安全和身份认证检查验证传入请求。
 *
 * @param {Request} request - The incoming HTTP request object (传入的 HTTP 请求对象)
 * @param {Object} corsHeaders - CORS headers to include in responses (要包含在响应中的 CORS 头)
 * @param {Object} env - Environment object containing API_KEY and other configuration (包含 API_KEY 和其他配置的环境对象)
 * @returns {Promise<Object>} Validation result with valid flag, optional clientIP, and error response if invalid (验证结果，包含有效标志、可选的 clientIP，以及无效时的错误响应)
 */
const validateRequest = async (request, corsHeaders, env) => {
    const clientIP =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";

    const url = new URL(request.url);
    const method = request.method;
    const acceptHeader = request.headers.get("Accept") || "";
    const isBrowserRequest = acceptHeader.includes("text/html");
    if (
        env?.API_KEY &&
        method === "GET" &&
        (url.pathname === "/" || url.pathname === "/api") &&
        isBrowserRequest &&
        !url.searchParams.has("key")
    ) {
        return {valid: false, response: await handleRootRequest(env, true)};
    }

    if (env?.API_KEY) {
        const apiKey = url.searchParams.get("key");
        if (url.pathname === "/api" && (!apiKey || apiKey !== env.API_KEY)) {
            return {
                valid: false,
                response: createErrorResponse(new AuthError("Invalid or missing API key. Access denied."))
            };
        }
    }

    if (isMaliciousRequest(request.url)) {
        return {
            valid: false,
            response: createErrorResponse(new AntiBotError("Malicious request detected. Access denied."))
        };
    }

    if (await isRateLimited(clientIP)) {
        return {
            valid: false,
            response: createErrorResponse(new RateLimitError("Rate limit exceeded. Please try again later."))
        };
    }

    return {valid: true, clientIP};
};

/**
 * Handles URL-based requests by identifying the provider, extracting resource ID, and fetching data with caching.
 * 处理基于 URL 的请求，通过识别提供者、提取资源 ID 并使用缓存获取数据。
 *
 * @param {string} url_ - The source URL to process (e.g., Douban, IMDb, TMDb links) (要处理的源 URL，如豆瓣、IMDb、TMDb 链接)
 * @param {Object} env - Environment object containing configuration and API keys (包含配置和 API 密钥的环境对象)
 * @param {string|null} [requestId=null] - Optional request identifier for tracking (可选的请求标识符用于跟踪)
 * @returns {Promise<Object>} Processed result with success flag, data, formatted output, or error message (处理后的结果，包含成功标志、数据、格式化输出或错误消息)
 */
const handleUrlRequest = async (url_, env, requestId = null) => {
    const urlString = String(url_);
    logger.info(`Processing URL request: url=${url_}`, {requestId});

    const provider = URL_PROVIDERS.find((p) =>
        p.domains.some((domain) => urlString.includes(domain.toLowerCase())),
    );

    if (!provider) {
        return {success: false, error: "Unsupported URL"};
    }

    const match = String(url_).match(provider.regex);
    if (!match) {
        return {success: false, error: `Invalid ${provider.name} URL`};
    }

    const sid = provider.idFormatter ? provider.idFormatter(match) : match[1];
    const cleanResourceId = sid.split("/").pop();
    logger.info(`Resource ID: ${cleanResourceId}`, {requestId});

    const fetchData = async () => {
        try {
            return await provider.generator(sid, env, requestId);
        } catch (error) {
            logger.error(`Provider ${provider.name} error:`, error.message);
            return {
                success: false,
                error: error.message || `${provider.name} processing failed`,
            };
        }
    };

    let subType = null;
    if (provider.name === "tmdb") {
        const parts = sid.split("/");
        if (parts.length >= 2) subType = parts[0];
    }

    const result = await _withCache(
        cleanResourceId,
        fetchData,
        env,
        provider.name,
        subType,
    );

    if (result?.success) {
        result.format = provider.formatter(result, env);
    }

    return result;
};

/**
 * Handles query-based requests by routing to appropriate handlers based on parameters.
 * Supports URL processing, search operations, and direct ID lookups with caching.
 * 通过根据参数路由到适当的处理程序来处理基于查询的请求。
 * 支持 URL 处理、搜索操作和带有缓存的直接 ID 查找。
 *
 * @param {Request} request - The incoming HTTP request object (传入的 HTTP 请求对象)
 * @param {Object} env - Environment object containing configuration and API keys (包含配置和 API 密钥的环境对象)
 * @param {URL} uri - Parsed URL object containing query parameters (包含查询参数的解析后 URL 对象)
 * @returns {Promise<Response>} JSON-formatted response with processed data or error (带有处理后数据或错误的 JSON 格式响应)
 */
const handleQueryRequest = async (request, env, uri) => {
    const params = await _extractParams(request, uri);
    const requestId = params.requestId;

    if (requestId) {
        const controller = new AbortController();
        activeAbortControllers.set(requestId, controller);
        logger.debug(`[Task] 注册任务 ${requestId}`);
    }

    try {
        if (params.url) {
            const responseData = await handleUrlRequest(params.url, env, requestId);
            return makeJsonResponse(responseData, env);
        }

        if (params.source && params.query) {
            return await handleSearchRequest(params.source, params.query, env);
        }

        if (params.query) {
            return await handleAutoSearch(params.query, env);
        }

        const source = params.tmdb_id ? "tmdb" : params.source;
        let sid = params.tmdb_id || params.sid;

        if (source && sid) {
            const sourceConfig = {
                tmdb: {
                    validTypes: ["movie", "tv"],
                    errorMsg: "Invalid type parameter for TMDB. Must be 'movie' or 'tv'.",
                    requireMsg:
                        "For TMDB requests with numeric IDs, the 'type' parameter is required. Please specify type as 'movie' or 'tv'.",
                },
                trakt: {
                    validTypes: ["movies", "shows"],
                    errorMsg:
                        "Invalid type parameter for Trakt. Must be 'movies' or 'shows'.",
                    requireMsg:
                        "For Trakt requests with numeric IDs, the 'type' parameter is required. Please specify type as 'movies' or 'shows'.",
                },
            };

            const sourceLower = source.toLowerCase();
            const config = sourceConfig[sourceLower];

            if (config && !sid.includes("/")) {
                if (!params.type) {
                    return createErrorResponse(new ValidationError(config.requireMsg));
                }

                if (!config.validTypes.includes(params.type)) {
                    return createErrorResponse(new ValidationError(config.errorMsg));
                }

                sid = `${params.type}/${sid}`;
            }

            const provider = PROVIDER_CONFIG[sourceLower];
            if (!provider) {
                return createErrorResponse(new ValidationError(`Unsupported source: ${source}`));
            }

            const decodedSid = String(sid).replace(/_/g, "/");
            const fetchData = () => provider.generator(decodedSid, env, requestId);
            const subType =
                sourceLower === "tmdb" || sourceLower === "trakt"
                    ? decodedSid.split("/")[0] || null
                    : null;

            const baseResourceId = sid.split("/").pop();

            const responseData = await _withCache(
                baseResourceId,
                fetchData,
                env,
                sourceLower,
                subType,
            );

            if (responseData?.success) {
                responseData.format = provider.formatter(responseData, env);
            }
            
            return makeJsonResponse(responseData, env);
        }

        return createErrorResponse(new ValidationError("Invalid parameters. Please provide 'url', 'query', or 'source' and 'sid'."));
    } catch (e) {
        logger.error("Global error in handleQueryRequest:", e);
        return createErrorResponse(e);
    } finally {
        if (requestId) {
            activeAbortControllers.delete(requestId);
            logger.debug(`[Task] 清理任务 ${requestId}`);
        }
    }
};

/**
 * Performs a fetch request with timeout control and optional external abort signal support.
 * 执行带有超时控制和可选外部中止信号支持的 fetch 请求。
 *
 * @param {string} url - The URL to fetch (要获取的 URL)
 * @param {Object} [opts={}] - Fetch options such as headers, method, etc. (Fetch 选项，如头信息、方法等)
 * @param {number} [timeout=DEFAULT_TIMEOUT] - Timeout in milliseconds before aborting the request (中止请求前的超时时间（毫秒）)
 * @param {AbortSignal|null} [externalSignal=null] - Optional external abort signal for manual cancellation (可选的外部中止信号用于手动取消)
 * @returns {Promise<Response>} The fetch response object (Fetch 响应对象)
 */
export const fetchWithTimeout = async (url, opts = {}, timeout = DEFAULT_TIMEOUT, externalSignal = null) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        let signal = controller.signal;
        if (externalSignal) {
            if (typeof AbortSignal.any === "function") {
                signal = AbortSignal.any([controller.signal, externalSignal]);
            } else {
                externalSignal.addEventListener("abort", () => controller.abort(), {
                    once: true,
                });
            }
        }

        return await fetch(url, {...opts, signal});
    } finally {
        clearTimeout(id);
    }
};

/**
 * Creates a raw JSON Response object with customizable status and headers.
 * 创建带有可自定义状态和头的原始 JSON Response 对象。
 *
 * @param {*} body - The data to serialize as JSON (要序列化为 JSON 的数据)
 * @param {Object} [initOverride] - Optional override for response initialization (status, headers, etc.) (可选的响应初始化覆盖，如状态码、头信息等)
 * @returns {Response} A Response object with JSON content type and CORS headers (带有 JSON 内容类型和 CORS 头的 Response 对象)
 */
export const makeJsonRawResponse = (body, initOverride) => {
    const defaultHeaders = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    };

    const init = {
        status: 200,
        headers: {
            ...defaultHeaders,
            ...(initOverride && initOverride.headers ? initOverride.headers : {}),
        },
        ...(initOverride || {}),
    };

    init.status = typeof init.status === "number" ? init.status : 200;

    const payload = JSON.stringify(body || {}, null, 2);
    return new Response(payload, init);
};

/**
 * Creates a standardized JSON response with default template, copyright info, and timestamp.
 * 创建带有默认模板、版权信息和时间戳的标准化 JSON 响应。
 *
 * @param {Object} body_update - The response body data to merge with default template (要与默认模板合并的响应主体数据)
 * @param {Object} env - Environment object containing AUTHOR configuration (包含 AUTHOR 配置的环境对象)
 * @param {number} [status=200] - HTTP status code for the response (响应的 HTTP 状态码，默认为 200)
 * @returns {Response} A Response object with standardized JSON structure (带有标准化 JSON 结构的 Response 对象)
 */
export const makeJsonResponse = (body_update, env, status = 200) => {
    const body = {
        ...DEFAULT_BODY_TEMPLATE,
        copyright: `Powered by @${env?.AUTHOR || AUTHOR}`,
        generate_at: Date.now(),
        ...(body_update || {}),
    };
    return makeJsonRawResponse(body, {status});
};

/**
 * Main request handler that routes incoming requests to appropriate handlers based on path and method.
 * Implements security checks, authentication, and rate limiting before processing.
 * 主请求处理程序，根据路径和方法将传入请求路由到适当的处理程序。
 * 在处理前实施安全检查、身份认证和频率限制。
 *
 * @param {Request} request - The incoming HTTP request object (传入的 HTTP 请求对象)
 * @param {Object} env - Environment object containing configuration and secrets (包含配置和密钥的环境对象)
 * @returns {Promise<Response>} The processed response object (处理后的响应对象)
 */
export const handleRequest = async (request, env) => {
    logger.info("🌐 收到请求", {
        method: request.method,
        path: new URL(request.url).pathname,
        ip: request.headers.get("CF-Connecting-IP") || "unknown",
    });

    if (request.method === "OPTIONS") {
        logger.debug("↔️ OPTIONS 预检请求");
        return _handleOptionsRequest();
    }

    const validation = await validateRequest(request, CORS_HEADERS, env);
    if (!validation.valid) {
        logger.warn("❌ 请求验证失败", {
            reason: validation?.["reason"],
        });
        return validation.response;
    }

    const url = new URL(request.url);
    const {pathname} = url;
    const {method} = request;
    const isApiPath = pathname === "/" || pathname === "/api";

    if (isApiPath) {
        if (method === "GET" || method === "POST") {
            const apiKey = url.searchParams.get("key");
            if (
                (pathname === "/" || pathname === "/api" || pathname === "/api/") &&
                !apiKey
            ) {
                return handleRootRequest(env, true);
            } else if (pathname === "/api" && apiKey !== env?.API_KEY) {
                return createErrorResponse(
                    "API key required. Access denied.",
                    CORS_HEADERS,
                );
            } else {
                return await handleQueryRequest(request, env, url);
            }
        }
    }

    if (url.pathname.startsWith("/api/") && url.pathname !== "/api/cancel") {
        const signatureVerification = await verifySignature(request, env);
        if (!signatureVerification.valid) {
            logger.warn("⚠️ 签名验证失败", {
                reason: signatureVerification.reason,
                path: url.pathname
            });
            return createErrorResponse(
                signatureVerification.reason === "expired_timestamp"
                    ? "签名已过期，请刷新页面重试"
                    : "认证失败：缺少或无效的签名",
                CORS_HEADERS
            );
        }
        logger.debug("✅ 签名验证通过");
    }

    if (url.pathname === "/api/cancel") {
        return await handleCancelRequest(request);
    }

    if (
        url.pathname.startsWith("/api/getData") ||
        url.pathname === "/api/getData/"
    ) {
        logger.debug("📡 处理业务请求", {path: url.pathname});
        return await handleQueryRequest(request, env, url);
    }

    return createErrorResponse(new NotFoundError("API endpoint not found. Please check the documentation for valid endpoints."));
};

/**
 * Handles task cancellation requests by aborting active fetch operations.
 * 通过中止活跃的 fetch 操作来处理任务取消请求。
 *
 * @param {Request} request - The incoming HTTP POST request containing requestId (包含 requestId 的传入 HTTP POST 请求)
 * @returns {Promise<Response>} JSON response indicating success or failure of cancellation (指示取消成功或失败的 JSON 响应)
 */
const handleCancelRequest = async (request) => {
    if (request.method !== "POST") {
        return createErrorResponse("Method Not Allowed", CORS_HEADERS);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return createErrorResponse("Invalid JSON", CORS_HEADERS);
    }

    const {requestId} = body;
    if (requestId && activeAbortControllers.has(requestId)) {
        activeAbortControllers.get(requestId).abort();
        activeAbortControllers.delete(requestId);
        logger.info(`[Cancel] 成功中止任务：${requestId}`);
        return new Response(JSON.stringify({ok: true}), {
            headers: {"Content-Type": "application/json", ...CORS_HEADERS},
        });
    }

    logger.warn(`[Cancel] 未找到活跃任务：${requestId}`);
    return createErrorResponse("No active task found", CORS_HEADERS);
};
