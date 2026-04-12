import {useEffect, useState} from "react";
import "./App.css";
import logger from "./utils/logger";

function App() {
    const [url, setUrl] = useState("");
    const [result, setResult] = useState("");
    const [formattedResult, setFormattedResult] = useState(null);
    const [searchResults, setSearchResults] = useState(null);
    const [lastSearchSource, setLastSearchSource] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showCopyNotification, setShowCopyNotification] = useState(false);
    const SITE_STRATEGIES = [
        {
            name: "imdb",
            regex: /imdb\.com\/title\/(tt\d{7,})/,
            transform: (m) => ({source: "imdb", sid: m[1]}),
        },
        {
            name: "tmdb",
            regex: /themoviedb\.org\/(movie|tv)\/(\d+)/,
            transform: (m) => ({source: "tmdb", sid: `${m[1]}/${m[2]}`}),
        },
        {
            name: "douban",
            regex: /douban\.com\/subject\/(\d+)/,
            transform: (m) => ({source: "douban", sid: m[1]}),
        },
    ];
    const SUBTYPE_MAP = Object.freeze({
        movie: "电影",
        tv: "电视剧",
        tvseries: "电视剧",
        tvepisode: "电视剧",
        tvmovie: "电视电影",
        video: "视频",
        tvspecial: "特别篇",
        short: "短片",
        podcastepisode: "播客节目",
        tvminiseries: "电视迷你剧"
    });
    const SEARCH_SOURCE_MAP = {
        "search-douban": "豆瓣",
        "search-tmdb": "TMDB",
        "search-imdb": "IMDb",
    };

    const DEFAULT_SOURCE_LABEL = "未知来源";
    const DEFAULT_LABEL = "暂无分类";

    // Auto-hide copy notification after 3 seconds
    // 3秒后自动隐藏复制通知
    useEffect(() => {
        if (showCopyNotification) {
            const timer = setTimeout(() => setShowCopyNotification(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showCopyNotification]);

    /**
     * Generate HMAC-SHA256 authentication signature
     * 生成 HMAC-SHA256 认证签名
     * @returns {Promise<{timestamp: number, signature: string}>} Object containing timestamp and Base64URL-encoded signature
     *                                                           包含时间戳和 Base64URL 编码签名的对象
     * @throws {Error} Throws error if VITE_AUTH_SECRET is not configured
     *                如果未配置 VITE_AUTH_SECRET 则抛出错误
     */
    const generateAuthSignature = async () => {
        const AUTH_SECRET = import.meta.env["VITE_AUTH_SECRET"];

        if (!AUTH_SECRET) {
            throw new Error("VITE_AUTH_SECRET 未配置，请检查 frontend/.env 文件");
        }

        const timestamp = Date.now();
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(AUTH_SECRET),
            {name: "HMAC", hash: "SHA-256"},
            false,
            ["sign"]
        );
        const signature = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(timestamp.toString())
        );
        const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        logger.debug("🔐 签名生成成功", {
            timestamp: new Date(timestamp).toLocaleString(),
            signaturePrefix: signatureBase64.slice(0, 20) + "..."
        });

        return {
            timestamp,
            signature: signatureBase64
        };
    };

    /**
     * Build API request parameters from user input
     * 从用户输入构建 API 请求参数
     * @param {string} input - User input string (URL, Chinese text, or ID)
     *                        用户输入字符串(URL、中文文本或ID)
     * @returns {{url: string}|{source: string, query: string}} Object containing either direct URL or source and query parameters
     *                                                         包含直接URL或来源和查询参数的对象
     * @throws {Error} Throws error if input is not a non-empty string
     *                如果输入不是非空字符串则抛出错误
     */
    const buildApiUrl = (input) => {
        if (typeof input !== 'string' || !input.trim()) {
            throw new Error('buildApiUrl: 输入必须是非空字符串');
        }

        const trimmedInput = input.trim();

        try {
            if (/^https?:\/\//.test(trimmedInput)) {
                new URL(trimmedInput);
                return {url: trimmedInput};
            }
        } catch {
            logger.debug("🔗 输入不是有效的 URL，尝试使用豆瓣搜索", trimmedInput);
        }

        if (isChineseText(trimmedInput)) {
            return {source: "douban", query: trimmedInput};
        }

        return {source: "imdb", query: trimmedInput};
    };

    /**
     * Reset all component states to initial values
     * 重置所有组件状态为初始值
     */
    const resetStates = () => {
        setError(null);
        setResult("");
        setFormattedResult(null);
        setSearchResults(null);
        setLastSearchSource(null);
    };

    /**
     * Handle search results from API response
     * 处理来自 API 响应的搜索结果
     * @param {Object} data - Search response data containing results array and site information
     *                       包含结果数组和站点信息的搜索响应数据
     */
    const handleSearchResults = (data) => {
        if (data.data?.length > 0) {
            setSearchResults(data.data);
            setLastSearchSource(data.site);
            setResult("");
            setFormattedResult(null);
        } else {
            setError("未找到相关结果");
            setSearchResults(null);
            setLastSearchSource(null);
            setResult("");
            setFormattedResult(null);
        }
    };

    /**
     * Handle direct result from API response (non-search mode)
     * 处理来自 API 响应的直接结果(非搜索模式)
     * @param {Object} data - Result data containing format, site, and ID information
     *                       包含格式、站点和ID信息的结果数据
     */
    const handleDirectResult = (data) => {
        setResult(data.format || "");
        setFormattedResult({
            format: data.format || "",
            site: data.site || "",
            id: data.sid || data.id || "",
        });
        setSearchResults(null);
        setLastSearchSource(null);
    };

    /**
     * Check if error is related to rate limiting or server issues
     * 检查错误是否与速率限制或服务器问题相关
     * @param {{ status?: number | string; message?: string }} [err] - Error object with status code and/or message
     *                            包含状态码和/或消息的错误对象
     * @returns {boolean} True if error indicates rate limit, timeout, or server error
     *                   如果错误表示速率限制、超时或服务器错误则返回 true
     */
    const isRateLimitError = (err) => {
        const status = err?.status;
        if (status === 429 || status === 400 || status === 401 || status === 500) {
            return true;
        }

        const message = err?.message;
        if (message && (
            message.includes("超时") ||
            message.includes("timeout") ||
            message.includes("AbortError") ||
            message.includes("500") ||
            message.includes("internal error")
        )) {
            return true;
        }

        return !!(
            message &&
            (message.includes("429") ||
                message.includes("400") ||
                message.includes("401") ||
                message.includes("500") ||
                message.includes("Too Many Requests") ||
                message.includes("请求过于频繁") ||
                message.includes("豆瓣 API"))
        );
    };

    /**
     * Gets the display label for a site identifier
     * 获取站点标识符的显示标签
     * @param {string} site - Site identifier (e.g., 'douban', 'imdb', 'tmdb')
     *                      站点标识符(如 'douban'、'imdb'、'tmdb')
     * @returns {string} Chinese display label for known sites, or original value if unknown
     *                  已知站点的中文显示标签,未知则返回原始值
     */
    const getSiteLabel = (site) => {
        const siteMap = {
            hongguo: "红果短剧",
            douban: "豆瓣电影",
            douban_book: "豆瓣读书",
            imdb: "IMDb",
            tmdb: "TMDb",
            bangumi: "Bangumi",
            steam: "Steam",
            melon: "Melon",
            qq_music: "QQ音乐",
            trakt: "Trakt",
        };

        return siteMap[site] || site;
    };

    /**
     * Determines if text is primarily Chinese by comparing character counts
     * 通过比较字符数量判断文本是否主要为中文
     * @param {string} text - Text to analyze
     *                      要分析的文本
     * @returns {boolean} True if Chinese characters outnumber English letters
     *                   如果中文字符数量多于英文字母则返回 true
     */
    const isChineseText = (text) => {
        const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
        const englishChars = text.match(/[a-zA-Z]/g) || [];
        return chineseChars.length > englishChars.length;
    };

    /**
     * Fetches data from Douban with automatic TMDB fallback on rate limit errors
     * 从豆瓣获取数据,在速率限制错误时自动回退到 TMDB
     * @param {Object} params - Request parameters containing source and query
     *                        包含来源和查询的请求参数
     * @returns {Promise<Object>} API response data from Douban or TMDB
     *                           来自豆瓣或 TMDB 的 API 响应数据
     * @throws {Error} Throws error if both Douban and TMDB requests fail
     *                如果豆瓣和 TMDB 请求都失败则抛出错误
     */
    const fetchWithTMDBFallback = async (params) => {
        try {
            return await fetchApiData("/api/getData", params);
        } catch (err) {
            const shouldTryTMDB = isRateLimitError(err) && params.query;

            if (!shouldTryTMDB) {
                throw err;
            }

            logger.debug("豆瓣请求失败 (限流或超时),尝试使用 TMDB...");
            return await fetchApiData("/api/getData", {
                source: "tmdb",
                query: params.query,
            });
        }
    };

    /**
     * Fetches API data with HMAC-SHA256 authentication and timeout handling
     * 使用 HMAC-SHA256 认证和超时处理获取 API 数据
     * @param {string} apiUrl - API endpoint URL
     *                        API 端点 URL
     * @param {Object} params - Request parameters object
     *                        请求参数对象
     * @param {number} timeout - Timeout in milliseconds (default: 30000ms / 30s)
     *                         超时时间(毫秒),默认 30000ms / 30秒
     * @returns {Promise<Object>} API response data
     *                           API 响应数据
     * @throws {Error} Throws error if request fails, times out, or authentication fails
     *                如果请求失败、超时或认证失败则抛出错误
     */
    const fetchApiData = async (apiUrl, params = {}, timeout = 30000) => {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        let fetchError = null;
        const controller = new AbortController();
        let timeoutId = null;

        try {
            const {timestamp, signature} = await generateAuthSignature();

            let finalTimeout = timeout;
            if (apiUrl.includes("melon") || apiUrl.includes("melon.com")) {
                finalTimeout = Math.max(timeout, 180000);
                logger.debug(`🎵 Melon 请求，超时延长至 ${finalTimeout / 1000}秒`);
            }

            timeoutId = setTimeout(() => {
                fetch("/api/cancel", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({requestId}),
                }).catch(() => {
                });
                controller.abort();
            }, finalTimeout);

            logger.debug("📡 发送请求", {
                url: apiUrl,
                timestamp: new Date(timestamp).toLocaleString(),
                signaturePrefix: signature.slice(0, 20) + "..."
            });

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Timestamp": timestamp.toString(),
                    "X-Signature": signature
                },
                body: JSON.stringify({...params, requestId}),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errText = await response.text();
                fetchError = new Error(`API 请求失败：${response.status} - ${errText}`);
            } else {
                return await response.json();
            }
        } catch (error) {
            if (error.name === "AbortError") {
                fetchError = new Error("请求超时，请重试");
            } else {
                fetchError = error;
            }
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }

        if (fetchError) {
            throw fetchError;
        }
    };

    /**
     * Performs search with Douban/TMDB fallback strategy
     * 执行搜索,使用豆瓣/TMDB 回退策略
     * @param {Object} params - Search parameters including source type
     *                        包含来源类型的搜索参数
     * @returns {Promise<Object>} Search results from primary or fallback source
     *                           来自主要或回退来源的搜索结果
     */
    const performSearch = async (params) => {
        const isDoubanSource = params.source === "douban";
        if (isDoubanSource) {
            return await fetchWithTMDBFallback(params);
        }
        return await fetchApiData("/api/getData", params);
    };

    /**
     * Processes API response and handles errors or routes to appropriate handler
     * 处理 API 响应,处理错误或路由到适当的处理器
     * @param {Object} data - Response data from API
     *                      来自 API 的响应数据
     * @returns {boolean} True if processing succeeded, false if error occurred
     *                   如果处理成功返回 true,发生错误返回 false
     */
    const processApiResponse = (data) => {
        if (data.success === false) {
            setError(data.error || "搜索失败");
            setSearchResults(null);
            setLastSearchSource(null);
            setResult("");
            setFormattedResult(null);
            setShowCopyNotification(false);
            return false;
        }

        if (data.site && data.site.startsWith("search-")) {
            handleSearchResults(data);
        } else {
            handleDirectResult(data);
        }
        return true;
    };

    /**
     * Handles form submission and orchestrates the search flow
     * 处理表单提交并协调搜索流程
     * @param {Event} e - Form submit event
     *                  表单提交事件
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!url) return;

        resetStates();
        setLoading(true);

        try {
            const params = buildApiUrl(url);
            if (!params) {
                setError("无效的输入");
                return;
            }

            const data = await performSearch(params);

            if (!processApiResponse(data)) {
                setLoading(false);
            }
        } catch (err) {
            console.error("提交错误:", err);
            setError(err.message || "搜索失败");
            setSearchResults(null);
            setLastSearchSource(null);
            setResult("");
            setFormattedResult(null);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Builds API request parameters by matching link against site strategies
     * 通过将链接与站点策略匹配来构建 API 请求参数
     * @param {string} link - Input link to parse
     *                      要解析的输入链接
     * @returns {Object} Transformed parameters object based on matched strategy, or original URL if no match
     *                  基于匹配策略的转换后参数对象,如果没有匹配则返回原始 URL
     */
    const buildSelectApiUrl = (link) => {
        if (!link || typeof link !== 'string') {
            return {};
        }

        for (const strategy of SITE_STRATEGIES) {
            const match = link.match(strategy.regex);
            if (match) {
                return strategy.transform(match);
            }
        }

        return {url: link};
    };

    /**
     * Handles link processing and API response for direct result or search results
     * 处理链接和 API 响应,用于直接结果或搜索结果
     * @param {string} link - Input link to process
     *                      要处理的输入链接
     */
    const handleSelectResult = async (link) => {
        const handleError = (msg) => {
            setError(msg);
            setResult("");
            setFormattedResult(null);
        };

        resetStates();
        setLoading(true);

        try {
            const params = buildSelectApiUrl(link);
            if (!params || Object.keys(params).length === 0) {
                handleError("无效的链接");
                return;
            }

            const data = await fetchApiData("/api/getData", params);

            if (!data || data.success === false) {
                handleError(data?.error || "搜索失败");
                return;
            }

            if (data.site?.startsWith("search-")) {
                handleSearchResults(data);
            } else {
                const resultData = {
                    format: data.format || "",
                    site: data.site || "",
                    id: data.sid || data.id || "",
                };
                setResult(resultData.format);
                setFormattedResult(resultData);
            }
        } catch (err) {
            console.error("系统错误:", err);
            handleError("处理链接时发生系统错误");
        } finally {
            setSearchResults(null);
            setLastSearchSource(null);
            setLoading(false);
            setShowCopyNotification(false);
        }
    };

    /**
     * Copies result text to clipboard and shows notification
     * 复制结果文本到剪贴板并显示通知
     */
    const handleCopy = async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result);
            setShowCopyNotification(true);
        } catch (err) {
            console.error("复制失败");
        }
    };

    /**
     * Clears all form fields and resets states to initial values
     * 清除所有表单字段并将状态重置为初始值
     */
    const handleClear = () => {
        setUrl("");
        setResult("");
        setFormattedResult(null);
        setSearchResults(null);
        setLastSearchSource(null);
        setError(null);
    };

    /**
     * 渲染搜索项标题 (Render search item title)
     * @param {Object} item - 搜索结果项 (Search result item)
     * @returns {JSX.Element} 标题内容 (Title content)
     */
    const searchItemTitle = (item) => {
        console.log(item)
        let result;
        if (item.subtitle) {
            result = item.subtitle;
        } else {
            result = (
                <>
                    {item.abstract}
                    <br/>
                    {item.actors}
                </>
            );
        }

        return (
            <p className="text-xs text-gray-500">
                {result}
            </p>
        );
    };

    /**
     * Renders a single search result item with clickable link and metadata
     * 渲染单个搜索结果项,包含可点击链接和元数据
     * @param {Object} item - Search result item data
     *                      搜索结果项数据
     * @param {number} index - Item index for key generation
     *                       用于生成 key 的项索引
     * @returns {React.JSX.Element} Search result list item element
     *                             搜索结果列表项元素
     */
    const renderSearchResultItem = (item, index) => (
        <li
            key={index}
            className="border-b border-gray-200 pb-2 last:border-0 last:pb-0"
        >
            <button
                onClick={() => handleSelectResult(item.link || item.url)}
                className="text-indigo-600 hover:text-indigo-900 text-sm text-left w-full flex justify-between items-center"
            >
            <span>
                {item.title}
                {item.year && <span className="text-gray-500 ml-2">({item.year})</span>}
            </span>

                {/* 徽章统一包裹在右侧 flex 容器中，无论是否有内容都保持右对齐 */}
                <div className="flex items-center space-x-2">
                    {renderEpisodeInfo(item)}
                    {renderRatingInfo(item)}
                </div>
            </button>

            <div className="flex justify-between items-center mt-1">
                <div className="flex-1 min-w-0">
                    {searchItemTitle(item)}
                </div>

                {item.subtype && (
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {getSubtypeLabel(item.subtype)}
                    </span>
                )}
            </div>
        </li>
    );

    /**
     * Renders episode information badge if available
     * 如果有剧集信息则渲染剧集徽章
     * @param {Object} item - Search result item containing episode data
     *                      包含剧集数据的搜索结果项
     * @returns {React.JSX.Element|null} Episode badge element or null if not available
     *                                  剧集徽章元素,如果不可用则返回 null
     */
    const renderEpisodeInfo = (item) => {
        if (!item.episode) return null;
        return (
            <span className="text-indigo-700 text-xs bg-yellow-50 pl-1.5 py-0.5 rounded">
                {item.episode} 集
            </span>
        );
    };

    /**
     * Renders rating information badge if available
     * 如果有评分信息则渲染评分徽章
     * @param {Object} item - Search result item containing rating data
     *                      包含评分数据的搜索结果项
     * @returns {React.JSX.Element|null} Rating badge element or null if not available
     *                                  评分徽章元素,如果不可用则返回 null
     */
    const renderRatingInfo = (item) => {
        if (!item.rating) return null;
        const rating = item.rating === '暂无评分' || item.rating === '0' ? '暂无评分' : `${item.rating} / 10`;
        return (
            <span className="text-indigo-700 text-xs bg-yellow-50 pl-1.5 py-0.5 rounded">
                {rating}
            </span>
        );
    };

    /**
     * Gets the display label for a given subtype using mapping or returns default/original value
     * 使用映射获取给定子类型的显示标签,或返回默认值/原始值
     * @param {string} subtype - The subtype value to map
     *                         要映射的子类型值
     * @returns {string} Mapped label, default label if empty, or original subtype if no mapping exists
     *                  映射后的标签,如果为空则返回默认标签,如果没有映射则返回原子类型
     */
    const getSubtypeLabel = (subtype) => {
        if (!subtype) {
            return DEFAULT_LABEL;
        }

        const key = String(subtype).toLowerCase();

        return SUBTYPE_MAP[key] || subtype;
    };

    /**
     * Gets the display label for a given search source using mapping or returns default value
     * 使用映射获取给定搜索来源的显示标签,或返回默认值
     * @param {string} source - The search source identifier
     *                        搜索来源标识符
     * @returns {string} Mapped source label or default label if not found/empty
     *                  映射后的来源标签,如果未找到或为空则返回默认标签
     */
    const getSearchSourceLabel = (source) => {
        if (!source) {
            return DEFAULT_SOURCE_LABEL;
        }

        return SEARCH_SOURCE_MAP[source] || DEFAULT_SOURCE_LABEL;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <img
                                src="/logo.png"
                                alt="PT-Gen Logo"
                                className="h-8 w-8 mr-2"
                            />
                            <h1 className="text-xl font-medium text-gray-900">PT-Gen</h1>
                        </div>
                        <nav className="flex space-x-4">
                            <a
                                href="https://github.com/rabbitwit/PT-Gen-Refactor"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                            >
                                <svg
                                    className="h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path
                                        d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                                    <path d="M9 18c-4.51 2-5-2-7-2"></path>
                                </svg>
                                <span>GitHub</span>
                            </a>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow rounded-lg p-5 mb-5">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="url"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                资源链接
                            </label>
                            <input
                                type="text"
                                id="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="请输入资源链接或搜索关键词"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>
                        <div className="flex items-center">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <svg
                                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        查询中...
                                    </>
                                ) : (
                                    "查询"
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="ml-2 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                清空
                            </button>
                        </div>
                    </form>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-5 w-5 text-red-400"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {searchResults && searchResults.length > 0 && (
                    <div className="bg-white shadow rounded-lg p-5 mb-5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-medium text-gray-900">搜索结果</h3>
                            <span className="text-sm text-gray-500">
                                {getSearchSourceLabel(lastSearchSource)}
                            </span>
                        </div>
                        <ul className="space-y-2">
                            {searchResults.map(renderSearchResultItem)}
                        </ul>
                    </div>
                )}

                {result && (
                    <div className="bg-white shadow rounded-lg p-5">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center">
                                <h3 className="text-lg font-medium text-gray-900">
                                    格式化结果
                                </h3>
                                {formattedResult && formattedResult.site && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                                        来源: {getSiteLabel(formattedResult.site)}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                                <svg
                                    className="h-4 w-4 mr-1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                                复制
                            </button>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                                {result}
                            </pre>
                        </div>
                    </div>
                )}

                <div className="bg-white shadow rounded-lg p-5 mt-5">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">使用说明</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                        <li>
                            支持多种资源站点：
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                                <li>豆瓣：电影、电视剧、读书</li>
                                <li>红果短剧：短剧链接</li>
                                <li>IMDb：电影、电视剧</li>
                                <li>TMDb：电影、电视剧</li>
                                <li>Bangumi：动画</li>
                                <li>Steam：游戏链接</li>
                                <li>Melon：音乐专辑链接</li>
                                <li>QQ音乐：音乐专辑链接</li>
                            </ul>
                        </li>
                        <li>
                            输入名称时会自动根据语言选择搜索源（中文名使用豆瓣如果失败则回退TMDB，英文名使用IMDB）
                        </li>
                        <li>点击"查询"按钮获取格式化结果</li>
                        <li>在搜索结果中选择匹配的条目</li>
                        <li>复制生成的格式化内容到PT站点发布资源</li>
                    </ul>

                    <h4 className="text-sm font-medium text-gray-900 mt-3 mb-2">
                        功能特点
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                        <li>支持多站点资源获取</li>
                        <li>自动生成标准PT格式描述</li>
                        <li>智能识别资源类型</li>
                        <li>支持中英文搜索</li>
                        <li>响应式设计，支持移动端使用</li>
                    </ul>
                </div>
            </main>

            {showCopyNotification && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                    <div
                        className="bg-purple-100 text-purple-800 px-4 py-2 rounded-md shadow-lg transform transition-all duration-300 ease-in-out"
                    >
                        <div className="flex items-center">
                            <svg
                                className="h-4 w-4 mr-2"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                            <span className="text-sm font-medium">已复制到剪贴板</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;