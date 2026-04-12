/**
 * @typedef {Object} Env
 * @property {string} AUTHOR
 * @property {string} LOG_LEVEL
 * @property {string} ENABLED_CACHE
 * @property {string} [API_KEY]
 * @property {string} [TMDB_API_KEY]
 * @property {string} [DOUBAN_COOKIE]
 * @property {string} [QQ_COOKIE]
 * @property {string} [TRAKT_API_CLIENT_ID]
 * @property {string} [TRAKT_APP_NAME]
 * @property {string} [AUTH_SECRET]
 */
import * as cheerio from "cheerio";
import * as providers from "../api/index.js";
import * as formats from "./format.js";
import {CORS_HEADERS, ROOT_PAGE_CONFIG, VERSION, AUTHOR} from "../core/constants.js";
import {makeJsonResponse, fetchWithTimeout} from "./request.js";
import {ApiError, createProviderError} from "../core/errors.js";
import logger from "../logger.js";

const TIME_WINDOW = 60000; // 1分钟
const MAX_REQUESTS = 30; // 每分钟最多30个请求
const CLEANUP_INTERVAL = 10000; // 10秒清理一次过期记录
const requestCounts = new Map();
/**
 * @typedef {Object} MediaItem
 * @property {string} [media_type] - 媒体类型
 * @property {string} [type] - 类型
 * @property {Object} [ids] - ID集合
 * @property {string} [ids.slug] - slug标识
 */
const LINK_TEMPLATES = {
    douban: (id) => `https://movie.douban.com/subject/${id}/`,
    imdb: (id) => `https://www.imdb.com/title/${id}/`,
    tmdb: (item, id) => {
        const mediaType = item.media_type === "tv" ? "tv" : "movie";
        return `https://www.themoviedb.org/${mediaType}/${id}`;
    },
    trakt: (item, id) => {
        const mediaType =
            item.type === "shows" || id.startsWith("shows") ? "shows" : "movies";
        // 从数据中获取 slug，如果没有则使用 ID
        const slug = item.ids?.slug || id.split("/")[1];
        return `https://app.trakt.tv/${mediaType}/${slug}`;
    },
};

export const URL_PROVIDERS = [
    {
        name: "douban",
        domains: ["movie.douban.com"],
        regex: /\/subject\/(\d+)/,
        generator: providers.gen_douban,
        formatter: (data) => formats.generateDoubanFormat(data),
    },
    {
        name: "douban_book",
        domains: ["book.douban.com"],
        regex: /\/subject\/(\d+)/,
        generator: providers.gen_douban_book,
        formatter: (data) => formats.generateDoubanBookFormat(data),
    },
    {
        name: "imdb",
        domains: ["www.imdb.com"],
        regex: /\/title\/(tt\d+)/,
        generator: providers.gen_imdb,
        formatter: (data, env) => {
            // 如果是从 OurBits 获取的数据，使用 notCacheImdbFormat
            if (data._from_ourbits) {
                return formats.notCacheImdbFormat(data);
            }
            // 否则根据 ENABLED_CACHE 选择对应的格式化函数
            return env.ENABLED_CACHE === "false"
                ? formats.notCacheImdbFormat(data)
                : formats.generateImdbFormat(data);
        },
    },
    {
        name: "tmdb",
        domains: ["api.themoviedb.org", "www.themoviedb.org"],
        regex: /\/(movie|tv)\/(\d+)/,
        idFormatter: (match) => `${match[1]}/${match[2]}`,
        generator: providers.gen_tmdb,
        formatter: (data) => formats.generateTmdbFormat(data),
    },
    {
        name: "melon",
        domains: ["www.melon.com"],
        regex: /\/album\/detail\.htm\?albumId=(\d+)/,
        idFormatter: (match) => match[1],
        generator: providers.gen_melon,
        formatter: (data) => formats.generateMelonFormat(data),
    },
    {
        name: "bangumi",
        domains: ["bgm.tv", "bangumi.tv"],
        regex: /\/subject\/(\d+)/,
        generator: providers.gen_bangumi,
        formatter: (data, env) =>
            env.ENABLED_CACHE === "false"
                ? formats.notCacheBangumiFormat(data)
                : formats.generateBangumiFormat(data),
    },
    {
        name: "steam",
        domains: ["store.steampowered.com"],
        regex: /\/app\/(\d+)/,
        generator: providers.gen_steam,
        formatter: (data, env) =>
            env.ENABLED_CACHE === "false"
                ? formats.notCacheSteamFormat(data)
                : formats.generateSteamFormat(data),
    },
    {
        name: "hongguo",
        domains: ["novelquickapp.com"],
        regex: /s\/([A-Za-z0-9_-]+)|series_id=(\d+)/,
        idFormatter: (match) => match[1] || match[2],
        generator: providers.gen_hongguo,
        formatter: (data) => formats.generateHongguoFormat(data),
    },
    {
        name: "qq_music",
        domains: ["y.qq.com"],
        regex: /\/albumDetail\/([A-Za-z0-9]+)/,
        generator: providers.gen_qq_music,
        formatter: (data) => formats.generateQQMusicFormat(data),
    },
    {
        name: "trakt",
        domains: ["app.trakt.tv", "trakt.tv"],
        regex: /\/(movies|shows)\/([a-z0-9-]+)/,
        idFormatter: (match) => `${match[1]}/${match[2]}`,
        generator: providers.gen_trakt,
        formatter: (data) => formats.generateTraktFormat(data),
    },
];

export const DEFAULT_FIELDS = (item, source) => ({
    year:
        pick(item, "year") ||
        pick(item, "y") ||
        safeGetYearFromReleaseDate(item.release_date) ||
        "",
    subtype:
        pick(item, "subtype") || pick(item, "type") || pick(item, "q") || "movie",
    title:
        pick(item, "title") || pick(item, "l") || pick(item.data, "name") || "",
    subtitle:
        pick(item, "subtitle") || pick(item, "s") || pick(item, "sub_title") || "",
    link: buildLink(item, source) || "",
    id: pick(item, "id"),
});

export const PROVIDER_CONFIG = {
    douban: {
        generator: providers.gen_douban,
        formatter: (data) => formats.generateDoubanFormat(data),
    },
    imdb: {
        generator: providers.gen_imdb,
        formatter: (data, env) => {
            // 如果是从 OurBits 获取的数据，使用 notCacheImdbFormat
            if (data._from_ourbits) {
                return formats.notCacheImdbFormat(data);
            }
            // 否则根据 ENABLED_CACHE 选择对应的格式化函数
            return env.ENABLED_CACHE === "false"
                ? formats.notCacheImdbFormat(data)
                : formats.generateImdbFormat(data);
        },
    },
    tmdb: {generator: providers.gen_tmdb, formatter: (data) => formats.generateTmdbFormat(data)},
    bangumi: {
        generator: providers.gen_bangumi,
        formatter: (data, env) =>
            env.ENABLED_CACHE === "false"
                ? formats.notCacheBangumiFormat(data)
                : formats.generateBangumiFormat(data),
    },
    melon: {
        generator: providers.gen_melon,
        formatter: (data) => formats.generateMelonFormat(data),
    },
    steam: {
        generator: providers.gen_steam,
        formatter: (data, env) =>
            env.ENABLED_CACHE === "false"
                ? formats.notCacheSteamFormat(data)
                : formats.generateSteamFormat(data),
    },
    hongguo: {
        generator: providers.gen_hongguo,
        formatter: (data) => formats.generateHongguoFormat(data),
    },
    qq_music: {
        generator: providers.gen_qq_music,
        formatter: (data) => formats.generateQQMusicFormat(data),
    },
    douban_book: {
        generator: providers.gen_douban_book,
        formatter: (data) => formats.generateDoubanBookFormat(data),
    },
    trakt: {
        generator: providers.gen_trakt,
        formatter: (data) => formats.generateTraktFormat(data),
    },
};

/**
 * @typedef {Object} DoubanItem
 * @property {string} [year]
 * @property {string} [type]
 * @property {Array<{name: string, description: string}>} [data]
 * @property {string} [doubanId]
 * @property {number} [doubanRating]
 * @property {string} [img]
 * @property {string} [episode]
 * @typedef {Object} ImdbItem
 * @property {string} [y] - 年份
 * @property {string} [qid] - 类型
 * @property {string} [l] - 标题
 * @property {string} [s] - 副标题
 * @property {string} [id]
 * @typedef {Object} TmdbItem
 * @property {string} [name]
 * @property {string} [title]
 * @property {string} [original_name]
 * @property {string} [original_title]
 * @property {string} [release_date]
 * @property {string} [media_type]
 * @property {string} [overview]
 * @property {number} [vote_average]
 * @property {string|number} [id]
 */
export const SOURCE_PROCESSORS = {
    douban: (item) => ({
        subtype: pick(item, "type") || "movie",
        title: pick(item, "title"),
        abstract: String(pick(item, "abstract") || ""),
        actors: String(pick(item, "actors") || ""),
        link: pick(item, "link"),
        id: pick(item, "id"),
        rating: String(pick(item, "rating") || "暂无评分"),
        img: pick(item, "image"),
    }),
    imdb: (item) => ({
        year: pick(item, "year"),
        subtype: pick(item, "subtype"),
        title: pick(item, "title"),
        subtitle: pick(item, "subtitle"),
        rating: String(pick(item, "rating") || "暂无评分"),
        link: item.id
            ? `https://www.imdb.com/title/${item.id}/`
            : buildLink(item, "imdb"),
        id: pick(item, "id"),
    }),
    tmdb: (item) => {
        const cnTitle = pick(item, "name", "title");
        const enTitle = pick(item, "original_name", "original_title");
        const title = cnTitle && enTitle && cnTitle !== enTitle
            ? `${cnTitle} / ${enTitle}`
            : cnTitle || enTitle || "";

        return {
            year: safeGetYearFromReleaseDate(item.release_date),
            subtype: item.media_type === "tv" ? "tv" : "movie",
            title: title,
            subtitle: truncate(pick(item, "overview"), 100),
            link: buildLink(item, "tmdb"),
            rating: item.vote_average != null ? String(item.vote_average) : "暂无评分",
            id: pick(item, "id"),
        };
    },
};

export const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
export const safe = (v, fallback = "") =>
    v === undefined || v === null ? fallback : v;

let lastCleanup = Date.now();

/**
 * Converts various input types to an HTML string.
 * 将各种输入类型转换为 HTML 字符串。
 *
 * @param {string|Buffer|ArrayBuffer|*} input - The input value to convert (要转换的输入值)
 * @returns {string} The converted HTML string (转换后的 HTML 字符串)
 */
const toHtmlString = (input) => {
    if (typeof input === "string") {
        return input;
    }

    if (input == null) {
        return "";
    }

    if (Buffer.isBuffer(input)) {
        return input.toString("utf8");
    }

    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
        return new TextDecoder('utf-8').decode(input);
    }

    return String(input);
};

/**
 * Formats an array of actors into a Chinese comma-separated string.
 * 将演员数组格式化为中文顿号分隔的字符串。
 *
 * @param {Array<Object>} actors - Array of actor objects with name or name_cn fields (包含 name 或 name_cn 字段的演员对象数组)
 * @returns {string} Formatted actor names separated by "、", or "未知" if empty (用 "、" 分隔的格式化演员名称，如果为空则返回 "未知")
 */
const formatActorList = (actors) => {
    return (
        ensureArray(actors)
            .map((a) => safe(a?.name_cn || a?.name))
            .filter(Boolean)
            .join("、") || "未知"
    );
};

/**
 * Picks the first non-empty value from an object by trying multiple keys in order.
 * 通过按顺序尝试多个键，从对象中选取第一个非空值。
 *
 * @param {Object} item - The source object to extract value from (要提取值的源对象)
 * @param {...string} keys - Variable number of keys to try in priority order (按优先级顺序尝试的多个键名)
 * @returns {*} The first valid value found, or empty string if none found (找到的第一个有效值，如果未找到则返回空字符串)
 */
const pick = (item, ...keys) => {
    if (!item || typeof item !== "object") return "";

    for (const k of keys) {
        const v = item[k];
        if (v != null && String(v).trim() !== "") {
            return v;
        }
    }
    return "";
};

/**
 * Truncates a string to a specified length and appends ellipsis if needed.
 * 将字符串截断到指定长度，并在需要时添加省略号。
 *
 * @param {string} s - The input string to truncate (要截断的输入字符串)
 * @param {number} [n=100] - Maximum length before truncation (截断前的最大长度，默认为 100)
 * @returns {string} The truncated string with "..." if exceeded, or original string (如果超出则返回带 "..." 的截断字符串，否则返回原字符串)
 */
const truncate = (s, n = 100) => {
    if (!s || n <= 0) return "";
    let str = String(s).trim();
    return str.length > n ? str.slice(0, n).trim() + "..." : str;
};

/**
 * Builds a URL link for the given item based on the source platform.
 * 根据源平台为给定项构建 URL 链接。
 *
 * @param {Object} item - The data item containing link information (包含链接信息的数据项)
 * @param {string} source - The source platform identifier, e.g., 'tmdb', 'douban', 'imdb' (源平台标识符，如 'tmdb', 'douban', 'imdb')
 * @returns {string} The constructed URL link, or empty string if unable to build (构建的 URL 链接，如果无法构建则返回空字符串)
 */
const buildLink = (item, source) => {
    if (!item || typeof item !== "object") return "";
    if (item.link) return String(item.link);
    if (item.url) return String(item.url);

    const id = pick(item, "id", "imdb_id", "douban_id", "tt", "doubanId");
    if (!id) return "";

    const template = LINK_TEMPLATES[source];
    return template
        ? source === "tmdb"
            ? template(item, id)
            : template(id)
        : "";
};

/**
 * Safely extracts the year from a release date string.
 * 安全地从发布日期字符串中提取年份。
 *
 * @param {string} dateStr - The release date string in "YYYY-MM-DD" format ("YYYY-MM-DD" 格式的发布日期字符串)
 * @returns {string} The extracted year (e.g., "2024"), or empty string if invalid (提取的年份，如 "2024"，如果无效则返回空字符串)
 */
const safeGetYearFromReleaseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return "";
    try {
        return dateStr.split("-")[0] || "";
    } catch (err) {
        logger.error("Error parsing date:", err);
        return "";
    }
};

/**
 * Processes awards data for specific sites if needed.
 * 在需要时处理特定网站的奖项数据。
 *
 * @param {Object} data - The data object that may contain awards information (可能包含奖项信息的数据对象)
 * @param {string | Array<{festival: string, awards: string[]}>} data.awards - 奖项数据
 * @param {string} site - The source site identifier (e.g., "douban") (源网站标识符，如 "douban")
 * @returns {Object} The processed data object with parsed awards if applicable (如果适用，返回包含已解析奖项的处理后数据对象)
 */
const processAwardsIfNeeded = (data, site) => {
    if (site === "douban" && data.awards && typeof data.awards === "string") {
        data.awards = parseDoubanAwards(data.awards);
    }
    return data;
};

/**
 * Attempts to fetch data from static CDN fallback sources.
 * 尝试从静态 CDN 备用源获取数据。
 *
 * @param {string} site - The source site identifier (e.g., "douban", "imdb") (源网站标识符，如 "douban", "imdb")
 * @param {string} trimmedSid - The trimmed ID to use in the CDN URL (用于 CDN URL 的修剪后的 ID)
 * @returns {Promise<Object|null>} The fetched and processed data object, or null if all attempts fail (获取并处理的数据对象，如果所有尝试都失败则返回 null)
 */
const tryStaticCdn = async (site, trimmedSid) => {
    const staticUrls = [
        `https://cdn.ourhelp.club/ptgen/${encodeURIComponent(
            site,
        )}/${encodeURIComponent(trimmedSid)}.json`,
        `https://ourbits.github.io/PtGen/${encodeURIComponent(
            site,
        )}/${encodeURIComponent(trimmedSid)}.json`,
    ];

    for (const url of staticUrls) {
        try {
            const resp = await fetchWithTimeout(url, {
                cf: {cacheTtl: 86400, cacheEverything: true},
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data && Object.keys(data).length > 0) {
                    return processAwardsIfNeeded(data, site);
                }
            }
        } catch (e) {
            logger.error(
                `Static CDN fetch failed for ${site}/${trimmedSid} at ${url}:`,
                e,
            );
        }
    }

    return null;
};

/**
 * Creates an HTML response for browser access with copyright text.
 * 创建带有版权文本的浏览器访问 HTML 响应。
 *
 * @param {string} copyrightText - The copyright text to inject into the HTML template (要注入到 HTML 模板中的版权文本)
 * @returns {Response} A Response object containing the rendered HTML page (包含渲染后 HTML 页面的 Response 对象)
 */
const _createBrowserResponse = (copyrightText) => {
    const html = ROOT_PAGE_CONFIG.HTML_TEMPLATE.replace(
        "__COPYRIGHT__",
        copyrightText,
    );
    return new Response(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            ...CORS_HEADERS,
        },
    });
};

/**
 * Creates a JSON API documentation response with author and security info.
 * 创建包含作者和安全信息的 JSON API 文档响应。
 *
 * @param {string} author - The author name to include in the API documentation (要包含在 API 文档中的作者名称)
 * @param {Object} env - The environment object that may contain API_KEY configuration (可能包含 API_KEY 配置的环境对象)
 * @returns {Response} A Response object containing the API documentation as JSON (包含 API 文档的 Response 对象，格式为 JSON)
 */
const _createApiResponse = (author, env) => {
    const apiDoc = {
        ...ROOT_PAGE_CONFIG.API_DOC,
        Version: VERSION,
        Author: author,
        Copyright: `Powered by @${author}`,
        Security: env?.API_KEY ? "API key required for access" : "Open access",
    };
    return makeJsonResponse(apiDoc, env);
};

/**
 * Detects whether a request URL contains malicious patterns.
 * 检测请求 URL 是否包含恶意模式。
 *
 * @param {string} url - The request URL to check (要检查的请求 URL)
 * @returns {boolean} True if the request is malicious or invalid, false otherwise (如果请求是恶意的或无效的则返回 true，否则返回 false)
 */
export const isMaliciousRequest = (url) => {
    if (!url || typeof url !== "string") {
        return true;
    }

    try {
        const {pathname, search} = new URL(url, "http://localhost");
        const DIRECTORY_TRAVERSAL_PATTERN = /(\.{2,}\/)/g;
        const SCRIPT_PROTOCOL_PATTERN = /(script|javascript|scripts):/i;
        const EMBED_TAG_PATTERN = /(<\s*iframe|<\s*object|<\s*embed)/i;

        const patterns = [
            DIRECTORY_TRAVERSAL_PATTERN,
            SCRIPT_PROTOCOL_PATTERN,
            EMBED_TAG_PATTERN,
        ];

        return patterns.some((p) => p.test(pathname) || p.test(search));
    } catch (error) {
        return true;
    }
};

/**
 * Checks if a client IP has exceeded the rate limit within the time window.
 * 检查客户端 IP 是否在时间窗口内超过频率限制。
 *
 * @param {string} clientIP - The client's IP address to check (要检查的客户端 IP 地址)
 * @returns {Promise<boolean>} True if rate limited, false otherwise (如果超过频率限制则返回 true，否则返回 false)
 */
export const isRateLimited = async (clientIP) => {
    const now = Date.now();
    const windowStart = now - TIME_WINDOW;

    if (now - lastCleanup > CLEANUP_INTERVAL) {
        for (const [ip, requests] of requestCounts.entries()) {
            const validRequests = requests.filter(
                (timestamp) => timestamp > windowStart,
            );
            if (validRequests.length > 0) {
                requestCounts.set(ip, validRequests);
            } else {
                requestCounts.delete(ip);
            }
        }
        lastCleanup = now;
    }

    let validRequests = [];

    if (requestCounts.has(clientIP)) {
        const requests = requestCounts.get(clientIP);

        validRequests = requests.filter((timestamp) => timestamp > windowStart);

        if (validRequests.length >= MAX_REQUESTS) {
            return true; // 超过频率限制
        }

        validRequests.push(now);
        requestCounts.set(clientIP, validRequests);
    } else {
        requestCounts.set(clientIP, [now]);
    }

    return false;
};

/**
 * Parses HTML response text into a Cheerio DOM object for querying.
 * 将 HTML 响应文本解析为 Cheerio DOM 对象以供查询。
 *
 * @param {string|Buffer|ArrayBuffer} responseText - The HTML content to parse (要解析的 HTML 内容)
 * @returns {import('cheerio').CheerioAPI} A Cheerio instance loaded with the parsed HTML (加载了解析后 HTML 的 Cheerio 实例)
 */
export const page_parser = (responseText) => {
    try {
        const htmlString = toHtmlString(responseText);
        if (!htmlString || htmlString.trim().length === 0) {
            logger.warn("Empty HTML string provided to parser");
            return cheerio.load("");
        }
        return cheerio.load(htmlString);
    } catch (error) {
        logger.error("Failed to parse HTML:", {
            error: error.message,
            inputType: typeof responseText,
            inputLength: responseText?.length || 0,
        });
        logger.debug("Input HTML:", responseText);
        return cheerio.load("");
    }
};

/**
 * Safely parses a JSON string, handling whitespace and errors gracefully.
 * 安全地解析 JSON 字符串，优雅地处理空白字符和错误。
 *
 * @param {string} text - The JSON string to parse (要解析的 JSON 字符串)
 * @returns {Object|null} The parsed object, or null if parsing fails (解析后的对象，如果解析失败则返回 null)
 */
export const tryParseJson = (text) => {
    if (!text) return null;
    const cleaned = text.replace(/[\r\n]/g, "").trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        return null;
    }
};

/**
 * Handles requests to the root path based on client type.
 * 根据客户端类型处理根路径请求。
 *
 * @param {Object} env - The environment object containing configuration (包含配置的环境对象)
 * @param {boolean} isBrowser - Whether the request comes from a browser (请求是否来自浏览器)
 * @returns {Promise<Response>} An HTML response for browsers or JSON response for API clients (浏览器的 HTML 响应或 API 客户端的 JSON 响应)
 */
export const handleRootRequest = async (env, isBrowser) => {
    const author = env?.AUTHOR || AUTHOR;
    const copyright = `Powered by @${author}`;

    if (isBrowser) {
        return _createBrowserResponse(copyright);
    } else {
        return _createApiResponse(author, env);
    }
};

/**
 * Extracts parameters from both URL query string and POST request body.
 * Merges URL parameters with JSON body parameters, with body taking precedence.
 * 从 URL 查询字符串和 POST 请求体中提取参数。
 * 合并 URL 参数和 JSON 体参数，请求体参数优先。
 *
 * @param {Request} request - The incoming HTTP request object (传入的 HTTP 请求对象)
 * @param {URL} uri - The parsed URL object containing query parameters (包含查询参数的解析后 URL 对象)
 * @returns {Promise<Object>} Object containing extracted parameters (包含提取参数的对象)
 */
export const _extractParams = async (request, uri) => {
    const defaults = {
        source: uri.searchParams.get("source"),
        query: uri.searchParams.get("query"),
        url: uri.searchParams.get("url"),
        tmdb_id: uri.searchParams.get("tmdb_id"),
        sid: uri.searchParams.get("sid"),
        type: uri.searchParams.get("type"),
        requestId: uri.searchParams.get("requestId"),
    };

    // Only parse body for POST requests / 仅对 POST 请求解析请求体
    if (request.method !== "POST") return defaults;

    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) return defaults;

    try {
        // Clone the request to avoid consuming the body stream multiple times
        // 克隆请求以避免多次消耗请求体流
        const clonedRequest = request.clone();
        const text = await clonedRequest.text();

        // If body is empty, return defaults without attempting JSON parse
        // 如果请求体为空，则返回默认值而不尝试 JSON 解析
        if (!text || text.trim() === "") {
            return defaults;
        }

        // Parse JSON body / 解析 JSON 请求体
        const body = JSON.parse(text);
        return {
            source: body.source || defaults.source,
            query: body.query || defaults.query,
            url: body.url || defaults.url,
            tmdb_id: body.tmdb_id || defaults.tmdb_id,
            sid: body.sid || defaults.sid,
            type: body.type || defaults.type,
            requestId: body.requestId || defaults.requestId,
        };
    } catch (e) {
        // Only log warning for actual parsing errors, not empty bodies
        // 仅对实际解析错误记录警告，而非空请求体
        if (e instanceof SyntaxError && e.message.includes("Unexpected end of JSON")) {
            // Empty or incomplete JSON, return defaults silently
            // 空或不完整的 JSON，静默返回默认值
            return defaults;
        }

        console.warn("Failed to parse POST body as JSON:", e.message);
        return defaults;
    }
};

/**
 * Fetches media data from OurBits static CDN with dynamic API fallback.
 * 从 OurBits 静态 CDN 获取媒体数据，并提供动态 API 备用方案。
 *
 * @param {string} source - The source platform identifier (e.g., "douban", "imdb") (源平台标识符，如 "douban", "imdb")
 * @param {string} sid - The source ID to look up (要查找的源 ID)
 * @returns {Promise<Object|null>} The fetched media data object, or null if all attempts fail (获取的媒体数据对象，如果所有尝试都失败则返回 null)
 */
export const getStaticMediaDataFromOurBits = async (source, sid) => {
    const site = source.toLowerCase();
    const trimmedSid = sid.trim();
    const staticResult = await tryStaticCdn(site, trimmedSid);
    if (staticResult) {
        return staticResult;
    }

    const dynamicUrl = `https://api.ourhelp.club/infogen?site=${encodeURIComponent(
        site,
    )}&sid=${encodeURIComponent(trimmedSid)}`;
    try {
        const resp = await fetchWithTimeout(dynamicUrl, {
            headers: {"User-Agent": `PT-Gen-Refactor/${VERSION}`},
            cf: {cacheTtl: 86400, cacheEverything: true},
        });
        if (resp.ok) {
            const result = await resp.json();
            if (result) {
                processAwardsIfNeeded(result.data || result, site);
                return result;
            }
        }
    } catch (e) {
        console.error(`Dynamic API fetch failed for ${site}/${trimmedSid}:`, e);
    }

    return null;
};

/**
 * Handles HTTP OPTIONS preflight requests for CORS.
 * 处理 CORS 的 HTTP OPTIONS 预检请求。
 *
 * @returns {Response} A 204 No Content response with CORS headers (带有 CORS 头的 204 No Content 响应)
 */
export const _handleOptionsRequest = () => {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
};

/**
 * Determines if the given text is primarily Chinese based on character count comparison.
 * 基于字符计数比较确定给定文本是否主要为中文。
 *
 * @param {string} text - The text to analyze (要分析的文本)
 * @returns {boolean} True if Chinese characters outnumber English letters, false otherwise (如果中文字符数多于英文字母则返回 true，否则返回 false)
 */
export const isChineseText = (text) => {
    if (typeof text !== "string" || !text.trim()) {
        return false;
    }

    const chineseRegex =
        /[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73\u2b740-\u2b81\u2b820-\u2cea9\uf900-\ufaff]/g;
    const englishRegex = /[a-zA-Z]/g;
    const chineseCount = (text.match(chineseRegex) || []).length;
    const englishCount = (text.match(englishRegex) || []).length;

    if (chineseCount + englishCount < 2) {
        return chineseCount > 0;
    }

    return chineseCount > englishCount;
};

/**
 * Formats an array of character objects into readable strings with actor names.
 * 将角色对象数组格式化为包含演员名称的可读字符串。
 *
 * @param {Array<Object>} chars - Array of character objects with name, name_cn, and actors fields (包含 name、name_cn 和 actors 字段的角色对象数组)
 * @returns {Array<string>} Formatted strings in "Character Name (中文名): Actors" format (格式化的字符串，格式为 "Character Name (中文名): Actors")
 */
export const formatCharacters = (chars = []) => {
    return chars
        .filter((c) => c)// Skip falsy values / 跳过 falsy 值
        .map((c) => {
            const name = safe(c.name);
            const nameCn = safe(c.name_cn);
            const actors = formatActorList(c.actors);
            const title = nameCn ? `${name} (${nameCn})` : name || nameCn;
            return title ? `${title}: ${actors}` : null;
        })
        .filter(Boolean);
};

/**
 * Parses Douban awards string into structured festival and award data.
 * 将豆瓣奖项字符串解析为结构化的电影节和奖项数据。
 *
 * @param {string} awardsStr - The raw awards text from Douban, separated by double newlines between festivals (来自豆瓣的原始奖项文本，电影节之间用双换行符分隔)
 * @returns {Array<Object>} Array of objects with festival name and awards list (包含电影节名称和奖项列表的对象数组)
 */
export const parseDoubanAwards = (awardsStr) => {
    if (!awardsStr || typeof awardsStr !== "string") {
        return [];
    }

    const festivals = awardsStr
        .split("\n\n")
        .filter((item) => item.trim() !== "");

    const awardItems = [];

    for (const festival of festivals) {
        const lines = festival.split("\n").filter((line) => line.trim() !== "");
        if (lines.length > 0) {
            const festivalInfo = lines[0];
            const festivalAwards = [];
            for (let i = 1; i < lines.length; i++) {
                const awardLine = lines[i];
                festivalAwards.push(awardLine);
            }

            awardItems.push({
                festival: festivalInfo,
                awards: festivalAwards,
            });
        }
    }

    return awardItems;
};

/**
 * Cleans and normalizes Douban text by removing extra whitespace and leading colons.
 * 通过移除多余空白和前导冒号来清理和规范化豆瓣文本。
 *
 * @param {string} text - The raw text to clean (要清理的原始文本)
 * @returns {string} The cleaned and normalized text (清理和规范化后的文本)
 */
const cleanDoubanText = (text) => {
    if (!text) return "";

    return text
        .trim()
        .replace(/\s+/g, " ")
        .replace(/^[:：]\s*/, "")
        .replace(/\n+/g, " ")
        .trim();
};

/**
 * Extracts text content associated with an anchor element using multiple strategies.
 * 使用多种策略提取与锚点元素关联的文本内容。
 *
 * @param {Cheerio} $anchor - The Cheerio-wrapped anchor element (Cheerio 包装的锚点元素)
 * @returns {string} The extracted and cleaned text, or empty string if extraction fails (提取并清理后的文本，如果提取失败则返回空字符串)
 */
export const fetchAnchorText = ($anchor) => {
    try {
        if (!$anchor?.length) {
            return "";
        }

        const element = $anchor[0];
        const nextNode = element.nextSibling;
        if (nextNode?.nodeValue) {
            const text = cleanDoubanText(nextNode.nodeValue);
            if (text) {
                return text;
            }
        }

        const $parent = $anchor.parent();
        if ($parent?.length) {
            let parentText = $parent.text();

            const $label = $parent.find("span.pl");
            if ($label.length) {
                parentText = parentText.replace($label.text(), "");
            }

            const anchorText = $anchor.text();
            if (anchorText) {
                parentText = parentText.replace(anchorText, "");
            }

            const cleaned = cleanDoubanText(parentText);
            if (cleaned) {
                return cleaned;
            }
        }

        return "";
    } catch (error) {
        logger.warn("fetchAnchorText failed:", error.message);
        return "";
    }
};

/**
 * Parses JSON-LD structured data from the HTML document head.
 * 从 HTML 文档头部解析 JSON-LD 结构化数据。
 *
 * @param {Cheerio} $ - The Cheerio instance loaded with the HTML document (加载了 HTML 文档的 Cheerio 实例)
 * @returns {Object} The parsed JSON-LD object, or empty object if parsing fails (解析后的 JSON-LD 对象，如果解析失败则返回空对象)
 */
export const parseJsonLd = ($) => {
    try {
        if (!$) return {};

        const $scripts = $('head > script[type="application/ld+json"]');
        if (!$scripts.length) return {};

        const script = $scripts.first().html();
        if (!script) return {};

        const cleaned = script.replace(/[\r\n\t\s]+/g, " ").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed && typeof parsed === "object") {
            return parsed;
        }

        return {};
    } catch (error) {
        logger.warn("JSON-LD parsing error:", error.message || error);
        return {};
    }
};

/**
 * Creates a standardized JSON error response with appropriate HTTP status code.
 * 创建带有适当 HTTP 状态码的标准化 JSON 错误响应。
 *
 * @param {ApiError|Error|string} errorOrMessage - The error object or message string (错误对象或消息字符串)
 * @param {Object} [corsHeaders=CORS_HEADERS] - Optional CORS headers to include (可选的要包含的 CORS 头)
 * @returns {Response} A Response object with JSON error body and correct status code (包含 JSON 错误体和正确状态码的 Response 对象)
 */
export const createErrorResponse = (errorOrMessage, corsHeaders = CORS_HEADERS) => {
    let message = "Internal Server Error";
    let statusCode = 500;

    if (errorOrMessage instanceof ApiError) {
        message = errorOrMessage.message || message;
        statusCode = errorOrMessage.statusCode || statusCode;
    } else if (errorOrMessage instanceof Error) {
        message = errorOrMessage.message || message;
        const errorMessage = message.toLowerCase();
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
            statusCode = 404;
        } else if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
            statusCode = 429;
        } else if (errorMessage.includes("forbidden") || errorMessage.includes("403")) {
            statusCode = 403;
        } else if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
            statusCode = 401;
        } else if (errorMessage.includes("invalid") || errorMessage.includes("400")) {
            statusCode = 400;
        }
    } else if (typeof errorOrMessage === "string") {
        message = errorOrMessage;
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes("not found") || lowerMessage.includes("404")) {
            statusCode = 404;
        } else if (lowerMessage.includes("rate limit") || lowerMessage.includes("429")) {
            statusCode = 429;
        } else if (lowerMessage.includes("forbidden") || lowerMessage.includes("403")) {
            statusCode = 403;
        } else if (lowerMessage.includes("unauthorized") || lowerMessage.includes("401")) {
            statusCode = 401;
        } else if (lowerMessage.includes("invalid") || lowerMessage.includes("400")) {
            statusCode = 400;
        }
    }

    const responseBody = {
        success: false,
        error: message,
        code: statusCode,
    };

    if (errorOrMessage instanceof ApiError && errorOrMessage.data !== null) {
        responseBody.data = errorOrMessage.data;
    }

    return new Response(JSON.stringify(responseBody, null, 2), {
        status: statusCode,
        headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
        },
    });
};

/**
 * Creates a standardized error response for search operations with detailed error messages.
 * 为搜索操作创建标准化的错误响应，包含详细的错误消息。
 *
 * @param {string} source - The source platform identifier (e.g., "douban", "tmdb") (源平台标识符，如 "douban", "tmdb")
 * @param {string} query - The search query that failed (失败的搜索查询)
 * @param {Error} error - The error object caught during the search operation (搜索操作中捕获的错误对象)
 * @returns {Object} An error response object with success flag, empty data array, and error message (包含成功标志、空数据数组和错误消息的错误响应对象)
 */
export const handleSearchError = (source, query, error) => {
    const errorResponse = {
        success: false,
        data: [],
    };

    if (error.name === "AbortError") {
        errorResponse.error = `${source} API请求超时 | ${source} API request timeout`;
    } else if (error.message) {
        errorResponse.error = error.message;
    } else {
        errorResponse.error = `Failed to search ${source} for: ${query}.`;

        if (error instanceof TypeError) {
            errorResponse.error += " Network or API error.";
        } else if (error.code === "ETIMEDOUT") {
            errorResponse.error += " Request timed out.";
        } else {
            errorResponse.error += " Please try again later.";
        }
    }

    console.error(`Search error (${source}):`, {
        query,
        error: error?.message || error,
        stack: error?.stack,
    });

    return errorResponse;
};

/**
 * Safely executes a provider function and wraps the result or error in a standardized format.
 * 安全地执行提供者函数，并将结果或错误包装为标准格式。
 *
 * @param {Function} asyncFn - The asynchronous provider function to execute (要执行的异步提供者函数)
 * @param {string} site - The source site identifier (源网站标识符)
 * @param {string} sid - The source ID (源 ID)
 * @param {Object} [fallbackData={}] - Fallback data to include in error responses (错误响应中包含的备用数据)
 * @returns {Promise<Object>} A standardized response object with success flag and data or error details (包含成功标志和数据或错误详情的标准化响应对象)
 */
export const safeExecuteProvider = async (asyncFn, site, sid, fallbackData = {}) => {
    try {
        const result = await asyncFn();
        return {
            success: true,
            site,
            sid,
            ...result
        };
    } catch (error) {
        return createProviderError(site, sid, error, fallbackData);
    }
};
