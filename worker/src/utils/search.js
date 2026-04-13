import {getImdbHeaders, getDouBanHeaders} from "../core/config.js";
import {DATA_SELECTOR} from "../core/constants.js"
import {
    SOURCE_PROCESSORS,
    DEFAULT_FIELDS,
    isChineseText,
    handleSearchError,
    page_parser, tryParseJson
} from "./helpers.js";
import {makeJsonResponse, fetchWithTimeout} from "./request.js";
import logger from "../../src/logger.js";

const IMDB_CONSTANTS = {
    //FREE_API_URL: "https://api.imdbapi.dev/search/titles",
    FIND_URL: "https://www.imdb.com/search/title/?title=",
    BASE_URL: "https://www.imdb.com",
    SEARCH_HEADERS: getImdbHeaders(),
    MAX_RESULTS: 10,
};

/**
 * TODO 暂时弃用, 待找到可用的API!
 */
// const _searchViaApi = async (query) => {
//     const searchUrl = `${IMDB_CONSTANTS.FREE_API_URL}?query=${encodeURIComponent(
//         query,
//     )}`;
//     try {
//         const response = await fetch(searchUrl, {
//             headers: {
//                 "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
//                 "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8",
//                 "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="139", "Google Chrome";v="139"',
//                 "Sec-Ch-Ua-Mobile": "?0",
//                 "Sec-Ch-Ua-Platform": '"Windows"',
//                 "Upgrade-Insecure-Requests": "1",
//             }
//         });
//         if (!response.ok) {
//             logger.warn(`IMDB API search failed: ${response.status}`);
//             return null;
//         }
//
//         const data = await response.json();
//         const results = data?.d ?? [];
//
//         return results.length > 0
//             ? processSearchResults(results, "imdb").data
//             : null;
//     } catch (error) {
//         logger.error(`IMDB API request failed for query "${query}":`, error);
//         return null;
//     }
// };

/**
 * Searches IMDb via web scraping by parsing __NEXT_DATA__ from search results page.
 * 通过解析搜索结果页面中的 __NEXT_DATA__ 来爬取搜索 IMDb。
 *
 * @param {string} query - The search query string (搜索查询字符串)
 * @returns {Promise<Array>} Array of search result objects with year, subtype, title, subtitle, rating, and id (包含 year、subtype、title、subtitle、rating 和 id 的搜索结果对象数组)
 */
const _searchViaScraping = async (query) => {
    const searchUrl = `${IMDB_CONSTANTS.FIND_URL}${encodeURIComponent(query)}&s=tt`;
    let data = [];

    try {
        logger.debug("🔍 IMDb 爬虫搜索", {query, url: searchUrl});

        const response = await fetchWithTimeout(searchUrl, {
            headers: IMDB_CONSTANTS.SEARCH_HEADERS,
        });

        if (!response.ok) {
            logger.warn("⚠️ IMDb 爬虫请求失败", {status: response.status, query});
            return [];
        }

        const html = await response.text();
        const getters = page_parser(html);
        const dataElement = getters(DATA_SELECTOR);

        if (dataElement.length === 0) {
            return [];
        }

        const htmlStr = dataElement.first().html();
        const parsed = tryParseJson(htmlStr);

        if (!parsed) {
            logger.warn(`Failed to parse __NEXT_DATA__ : invalid JSON format`);
            return [];
        }

        const titleListItems = parsed?.['props']?.['pageProps']?.['searchResults']?.['titleResults']?.['titleListItems'] || [];

        data = titleListItems.map((item) => {
            return {
                year: item['releaseYear'],
                subtype: item['titleType']?.['id'],
                title: item['originalTitleText'],
                subtitle: item['plot'],
                rating: item['ratingSummary']?.['aggregateRating'], // 解决 aggregateRating 报错
                id: item['titleId'],
            };
        });

        return processSearchResults(data, "imdb").data || [];

    } catch (e) {
        logger.error("❌ IMDb 爬虫搜索失败", {query, error: e.message});
        return [];
    }
};

/**
 * Searches IMDb for media content using web scraping.
 * 使用网络爬取搜索 IMDb 媒体内容。
 *
 * @param {string} query - The search query string (搜索查询字符串)
 * @returns {Promise<Object>} Search result object with success flag, data array, and optional error message (包含成功标志、数据数组和可选错误消息的搜索结果对象)
 */
const search_imdb = async (query) => {
    try {
        logger.debug("🎬 开始 IMDb 搜索", {query});
        // TODO: Temporarily disabled, waiting for a working API!
        // TODO: 暂时弃用, 待找到可用的API!
        // let searchData = await _searchViaApi(query);
        //
        // if (!searchData || searchData.length === 0) {
        //     logger.debug("⚠️ IMDb API 无结果，尝试爬虫 fallback", {query});
        //     searchData = await _searchViaScraping(query);
        // }
        const searchData = await _searchViaScraping(query);
        if (searchData?.length > 0) {
            logger.info("✅ IMDb 搜索成功", {
                query,
                resultCount: searchData.length,
            });
            return {success: true, data: searchData};
        }

        logger.warn("⚠️ IMDb 搜索无结果", {query});
        return {
            success: false,
            error: "未找到查询的结果 | No results found for the given query",
            data: [],
        };
    } catch (error) {
        logger.error("❌ IMDb 搜索异常", {query, error: error.message});
        return handleSearchError("IMDb", query, error);
    }
};

/**
 * Searches Douban for media content using the WMDB suggestion API.
 * 使用 WMDB 建议 API 搜索豆瓣媒体内容。
 *
 * @param {string} query - The search query string (搜索查询字符串)
 * @returns {Promise<Object>} Search result object with status, success flag, data array, and error message (包含状态、成功标志、数据数组和错误消息的搜索结果对象)
 */
const search_douban = async (query) => {
    if (!query) {
        return {
            status: 400,
            success: false,
            error: "Invalid query",
            data: []
        };
    }
    const SEARCH_URL = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(query)}&cat=1002`;

    const response = await fetchWithTimeout(SEARCH_URL, {headers: getDouBanHeaders()});

    if (!response.ok) {
        logger.warn(`Douban API search failed: ${response.status}`, {
            query,
            status: response.status,
            url: SEARCH_URL,
        });
    }
    const html = await response.text();
    const getText = page_parser(html);
    let dataScript = '';
    getText('script').each((i, elem) => {
        const content = getText(elem).html();
        if (content && content.includes('window.__DATA__')) {
            dataScript = content;
            return false;
        }
    });

    if (!dataScript) {
        console.warn('⚠️ 未找到 window.__DATA__');
        return {total: 0, results: []};
    }

    // 提取 JSON 数据 - 修复正则表达式
    const match = dataScript.match(/window\.__DATA__\s*=\s*({[\s\S]*?});?\s*(?:window\.__USER__|$)/);
    if (!match) {
        console.warn('⚠️ 无法解析 window.__DATA__');
        return {total: 0, results: []};
    }
    const parsed = tryParseJson(match[1]);
    if (!parsed) {
        logger.warn("Douban API search failed: Invalid JSON", {
            query,
            html,
        });
        return {
            status: 500,
            success: false,
            error: "Invalid JSON",
            data: []
        };
    }
    if (parsed.error_info === '搜索访问太频繁。') {
        return {
            status: 429,
            success: false,
            error: parsed.error_info,
            data: []
        }
    }

    const data = [];

    if (parsed.items && Array.isArray(parsed.items)) {
        parsed.items.forEach(item => {
            const result = {
                title: item.title || '',
                abstract: item.abstract || '',
                actors: item.abstract_2 || '',
                type: item.labels ? item.labels.map(label => label.text).join('/') : '',
                rating: item.rating?.value ? parseFloat(item.rating.value) : 0,
                link: item.url || '',
                image: item.cover_url || '',
                id: item.id || ''
            };

            if (result.title) {
                data.push(result);
            }
        });
    }
    console.log(data)
    return {
        success: true,
        data: processSearchResults(data, "douban").data,
    };
};

/**
 * Constructs the TMDb search API URL with authentication and query parameters.
 * 构建带有认证和查询参数的 TMDb 搜索 API URL。
 *
 * @param {string} apiKey - The TMDb API key for authentication (用于认证的 TMDb API 密钥)
 * @param {string} query - The search query string (搜索查询字符串)
 * @param {string} type - The media type to search (e.g., "movie", "tv") (要搜索的媒体类型，如 "movie", "tv")
 * @returns {string} The complete TMDb search API URL (完整的 TMDb 搜索 API URL)
 */
const buildSearchUrl = (apiKey, query, type) => {
    const base = `https://api.themoviedb.org/3/search/${type}`;
    return `${base}?api_key=${apiKey}&language=zh-CN&query=${encodeURIComponent(
        query,
    )}`;
};

/**
 * Parses TMDb API response and extracts search results with media type annotation.
 * 解析 TMDb API 响应并提取带有媒体类型标注的搜索结果。
 *
 * @param {Response} response - The HTTP response object from TMDb API (来自 TMDb API 的 HTTP 响应对象)
 * @param {string} type - The media type identifier (e.g., "movie", "tv") (媒体类型标识符，如 "movie", "tv")
 * @returns {Promise<Array>} Array of result objects with added media_type field, or empty array on failure (添加了 media_type 字段的结果对象数组，失败时返回空数组)
 */
const parseResults = async (response, type) => {
    if (!response?.ok) {
        logger.warn(`TMDB ${type} response failed: ${response?.status}`);
        return [];
    }

    try {
        const {results = []} = await response.json();
        return results.map((item) => ({...item, media_type: type}));
    } catch (e) {
        logger.warn(`TMDB ${type} parse failed:`, e?.message || e);
        return [];
    }
};

/**
 * Constructs fetch request options with browser-like User-Agent and abort signal.
 * 构建带有浏览器类似 User-Agent 和中止信号的 fetch 请求选项。
 *
 * @param {AbortSignal} signal - The abort signal for request timeout control (用于请求超时控制的中止信号)
 * @returns {Object} Fetch options object with method, headers, and signal (包含 method、headers 和 signal 的 fetch 选项对象)
 */
const buildRequestOptions = (signal) => ({
    method: "GET",
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
    signal,
});

/**
 * Searches TMDb for movies and TV shows related to the query.
 * 搜索 TMDb 中与查询相关的电影和电视节目。
 *
 * @param {string} query - Search keyword used to find movies and TV shows in TMDb (用于在 TMDb 中查找电影和电视节目的搜索关键词)
 * @param {Object} env - Environment object containing configuration such as TMDb API key (包含配置（如 TMDb API 密钥）的环境对象)
 *                       Expected structure: { TMDB_API_KEY: 'your_api_key_here' } (预期结构：{ TMDB_API_KEY: 'your_api_key_here' })
 * @returns {Promise<Object>} Object containing the following fields (包含以下字段的对象):
 *   - success {boolean}: Indicates whether the search succeeded (指示搜索是否成功)
 *   - error {string}: Error message if failed (optional) (失败时的错误消息，可选)
 *   - data {Array}: Search results data, sorted by popularity and limited to 10 records (搜索结果数据，按流行度排序并限制为 10 条记录)
 */
const search_tmdb = async (query, env) => {
    try {
        const apiKey = env?.TMDB_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "TMDB API密钥未配置 | TMDB API key not configured",
                data: [],
            };
        }

        const q = String(query || "").trim();
        if (!q) {
            return {success: false, error: "Invalid query", data: []};
        }

        const movieUrl = buildSearchUrl(apiKey, q, "movie");
        const tvUrl = buildSearchUrl(apiKey, q, "tv");
        const TIMEOUT = 8000;
        const controller =
            typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller
            ? setTimeout(() => controller.abort(), TIMEOUT)
            : null;

        let movieResponse, tvResponse;
        try {
            [movieResponse, tvResponse] = await Promise.all([
                fetch(movieUrl, buildRequestOptions(controller?.signal)),
                fetch(tvUrl, buildRequestOptions(controller?.signal)),
            ]);
        } catch (fetchError) {
            if (fetchError?.name === "AbortError") {
                return {
                    success: false,
                    error: "TMDB API请求超时 | TMDB API request timeout",
                    data: [],
                };
            }
            return {
                success: false,
                error: `TMDB API网络错误: ${fetchError?.message || "Unknown error"}`,
                data: [],
            };
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }

        const [movieResults, tvResults] = await Promise.all([
            parseResults(movieResponse, "movie"),
            parseResults(tvResponse, "tv"),
        ]);

        const results = [...movieResults, ...tvResults]
            .sort((a, b) => (b?.["popularity"] || 0) - (a?.["popularity"] || 0))
            .slice(0, 10);

        if (results.length > 0) {
            return {
                success: true,
                data: processSearchResults(results, "tmdb").data,
            };
        }

        return {
            success: false,
            error: "未找到查询的结果 | No results found for the given query",
            data: [],
        };
    } catch (error) {
        console.error(`TMDB search failed for query "${query}":`, error);
        return handleSearchError("TMDb", query, error);
    }
};

/**
 * Handles IMDb search requests and formats the response.
 * 处理 IMDb 搜索请求并格式化响应。
 *
 * @param {string} query - Search keyword or phrase used to search in IMDb (用于在 IMDb 中搜索的关键词或短语)
 * @param {Object} env - Environment object containing configuration or context information for response generation (包含响应生成配置或上下文信息的环境对象)
 * @returns {Promise<Response>} JSON-formatted response object containing success flag, data array, site identifier, or error message (JSON 格式的响应对象，包含成功标志、数据数组、站点标识符或错误消息)
 */
const handleImdbSearch = async (query, env) => {
    const result = await search_imdb(query);
    const success = result.success && result.data && result.data.length > 0;
    const response = {
        success,
        ...(success
            ? {data: result.data, site: "search-imdb"}
            : {
                error: result.error || result.message || "IMDb搜索未找到相关结果",
                data: [],
            }),
    };
    return makeJsonResponse(response, env);
};

/**
 * Handles TMDb search requests and formats the response.
 * 处理 TMDb 搜索请求并格式化响应。
 *
 * @param {string} query - Search keyword or phrase used to search in TMDb (用于在 TMDb 中搜索的关键词或短语)
 * @param {Object} env - Environment configuration object containing environment variables or settings for TMDb API interaction (包含 TMDb API 交互的环境变量或设置的环境配置对象)
 * @returns {Promise<Response>} JSON-formatted response object containing success flag, data array, site identifier, or error message (JSON 格式的响应对象，包含成功标志、数据数组、站点标识符或错误消息)
 */
const handleTmdbSearch = async (query, env) => {
    const result = await search_tmdb(query, env);
    const hasData = result.data && result.data.length > 0;
    const success = result.success && hasData;
    const response = {
        success,
        ...(success
            ? {data: result.data, site: "search-tmdb"}
            : {
                error: result.success
                    ? "TMDB搜索未找到相关结果"
                    : result.error || result.message || "TMDB搜索失败",
                data: [],
            }),
    };
    return makeJsonResponse(response, env);
};

/**
 * Handles Douban search requests and formats the response with appropriate HTTP status codes.
 * 处理豆瓣搜索请求并使用适当的 HTTP 状态码格式化响应。
 *
 * @param {string} query - Search keyword or phrase used to search in Douban (用于在豆瓣中搜索的关键词或短语)
 * @param {Object} env - Environment object containing configuration for response generation (包含响应生成配置的环境对象)
 * @returns {Promise<Response>} JSON-formatted response object with appropriate HTTP status code (带有适当 HTTP 状态码的 JSON 格式响应对象)
 */
const handleDoubanSearch = async (query, env) => {
    const result = await search_douban(query);

    // 如果是错误响应，直接返回错误状态
    if (!result.success) {
        const statusCode = result.status || 500;
        return makeJsonResponse(
            {
                success: false,
                error: result.error || "豆瓣搜索失败 | Douban search failed",
            },
            env,
            statusCode,
        );
    }

    const response = {
        success: true,
        data: result.data,
        site: "search-douban",
    };
    return makeJsonResponse(response, env);
};

/**
 * Handles search requests by routing to the appropriate provider based on source.
 * 根据源将搜索请求路由到相应的提供者进行处理。
 *
 * @param {string} source - Search data source, supports "imdb", "tmdb", or "douban" (搜索数据源，支持 "imdb"、"tmdb" 或 "douban")
 * @param {string} query - Search keyword used to query the specified data source (用于查询指定数据源的搜索关键词)
 * @param {Object} env - Environment object containing configuration or context information related to the search (包含与搜索相关的配置或上下文信息的环境对象)
 * @returns {Promise<Response>} JSON-formatted response object containing success flag, data array, or error message (JSON 格式的响应对象，包含成功标志、数据数组或错误消息)
 */
export const handleSearchRequest = async (source, query, env) => {
    logger.info(`Processing search request: source=${source}, query=${query}`);
    if (typeof source !== "string") {
        return makeJsonResponse(
            {
                success: false,
                error: "Invalid source type. Expected string.",
            },
            env,
        );
    }
    try {
        const normalizedSource = source.toLowerCase();
        const handlers = {
            imdb: handleImdbSearch,
            tmdb: handleTmdbSearch,
            douban: handleDoubanSearch,
        };
        const handler = handlers[normalizedSource];
        if (!handler) {
            return makeJsonResponse(
                {
                    success: false,
                    error: "Invalid source. Supported sources: imdb, tmdb",
                },
                env,
            );
        }
        return await handler(query, env);
    } catch (error) {
        const errorResponse = handleSearchError(source, query, error);
        return makeJsonResponse(errorResponse, env);
    }
};

/**
 * Handles auto-search requests by intelligently selecting the search provider based on query language.
 * Chinese queries use Douban first (with TMDB fallback), non-Chinese queries use IMDb.
 * 通过根据查询语言智能选择搜索提供者来处理自动搜索请求。
 * 中文查询首先使用豆瓣（带 TMDB 回退），非中文查询使用 IMDb。
 *
 * @param {string} query - Search keyword (搜索关键词)
 * @param {Object} env - Environment object containing configuration or context information related to the search (包含与搜索相关的配置或上下文信息的环境对象)
 * @returns {Promise<Response>} Formatted JSON response object with search results (带有搜索结果的格式化 JSON 响应对象)
 */
export const handleAutoSearch = async (query, env) => {
    logger.info("🔍 自动搜索请求", {query});

    if (typeof query !== "string" || !query.trim()) {
        logger.warn("⚠️ 自动搜索参数无效", {query});
        return makeJsonResponse(
            {
                success: false,
                error: "Query parameter is missing or invalid.",
                data: [],
            },
            env,
        );
    }
    try {
        const isChinese = isChineseText(query);
        let searchResult;
        let provider;

        if (isChinese) {
            logger.debug("🇨🇳 检测到中文，使用豆瓣搜索", {query});
            const doubanResult = await search_douban(query);
            if (
                doubanResult.success &&
                doubanResult.data &&
                doubanResult.data.length > 0
            ) {
                logger.info("✅ 豆瓣搜索成功", {
                    query,
                    resultCount: doubanResult.data.length,
                });
                provider = {
                    search: () => doubanResult,
                    site: "search-douban",
                    name: "Douban",
                };
                searchResult = doubanResult;
            } else {
                logger.warn("⚠️ 豆瓣搜索失败，回退到 TMDB", {
                    query,
                    status: doubanResult.status,
                });
                provider = {search: search_tmdb, site: "search-tmdb", name: "TMDB"};
                searchResult = await search_tmdb(query, env);
            }
        } else {
            logger.debug("🇺🇸 检测到外文，使用 IMDb 搜索", {query});
            provider = {search: search_imdb, site: "search-imdb", name: "IMDb"};
            searchResult = await search_imdb(query);
        }

        logger.info("✅ 搜索完成", {
            query,
            provider: provider.name,
            resultCount: searchResult.data?.length || 0,
            success: searchResult.success,
        });

        const hasData = searchResult.data && searchResult.data.length > 0;
        const success = searchResult.success && hasData;
        const response = {
            success,
            ...(success
                ? {data: searchResult.data, site: provider.site}
                : {
                    error: searchResult.success
                        ? `${provider.name} 未找到相关结果 | No results found`
                        : searchResult.error ||
                        searchResult.message ||
                        `${provider.name} search failed due to an unknown reason.`,
                    data: [],
                }),
        };
        return makeJsonResponse(response, env);
    } catch (err) {
        logger.error(env, "❌ 自动搜索异常", {query, error: err.message});
        return makeJsonResponse(
            {
                success: false,
                error: "Search failed. Please try again later.",
                data: [],
            },
            env,
        );
    }
};

/**
 * Processes and normalizes search results using source-specific processors.
 * 使用源特定的处理器处理并规范化搜索结果。
 *
 * @param {Array} results - Array of raw search results. Returns empty data object if empty or not an array (原始搜索结果数组。如果为空或不是数组则返回空数据对象)
 * @param {string} source - Data source identifier used to select the corresponding processor (用于选择相应处理器的数据源标识符)
 * @returns {Object} Object containing processed data with structure { data: [] }. Returns empty data array if input is invalid or no results (包含处理后数据的对象，结构为 { data: [] }。如果输入无效或无结果则返回空数据数组)
 */
const processSearchResults = (results, source) => {
    if (!Array.isArray(results) || results.length === 0) return {
        data: []
    };

    const processor = SOURCE_PROCESSORS[source] || DEFAULT_FIELDS;
    const out = results.slice(0, 10).map((raw) => {
        const item = raw && typeof raw === "object" ? raw : {};
        return processor(item, source);
    });

    return {data: out};
};
