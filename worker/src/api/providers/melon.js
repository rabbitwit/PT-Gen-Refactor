import {fetchWithTimeout} from "../../utils/request.js";
import {NONE_EXIST_ERROR} from "../../core/constants.js";
import {page_parser, safeExecuteProvider} from "../../utils/helpers.js";
import logger from "../../logger.js";

const MELOON_ALBUM_INFO_URL = "https://www.melon.com/album/detail.htm";
const NETWORK_ERROR_MESSAGES = [
    "Network connection lost",
    "Failed to fetch",
    "NetworkError",
    "network timeout",
    "connection refused",
    "ECONNREFUSED",
    "ENOTFOUND",
];
const translations = {
    "발라드": "Ballad",
    "댄스": "Dance",
    "랩/힙합": "Rap / Hip-Hop",
    "R&B/Soul": "R&B / Soul",
    "인디음악": "Indie",
    "록/메탈": "Rock / Metal",
    "트로트": "Trot",
    "포크/블루스": "Folk / Blues",
    "재즈": "Jazz",
    "애시드/퓨전/팝": "Acid / Fusion / Pop",
    "게임": "Games",
};

/**
 * Checks if an error object represents a network-related failure.
 * Compares the error message and name against known network error patterns.
 * 检查错误对象是否表示网络相关故障。
 * 将错误消息和名称与已知的网络错误模式进行比较。
 *
 * @param {Error|*} error - The error object or value to check (要检查的错误对象或值)
 * @returns {boolean} True if the error matches network error patterns, false otherwise (如果错误匹配网络错误模式则返回 true，否则返回 false)
 */
const isNetworkError = (error) => {
    if (!error) {
        return false;
    }

    const errorMessage = error.message || String(error);
    const errorName = error.name || "";

    return NETWORK_ERROR_MESSAGES.some(
        (pattern) =>
            errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
            errorName.toLowerCase().includes(pattern.toLowerCase()),
    );
};

/**
 * Safely extracts text content from a Cheerio element, returning an empty string on failure.
 * Handles null/undefined elements and potential errors during text extraction.
 * 安全地从 Cheerio 元素中提取文本内容，失败时返回空字符串。
 * 处理 null/undefined 元素以及文本提取过程中可能出现的错误。
 *
 * @param {Cheerio|null|undefined} $el - The Cheerio element to extract text from (要从中提取文本的 Cheerio 元素)
 * @returns {string} The trimmed text content, or an empty string if extraction fails (修剪后的文本内容，如果提取失败则返回空字符串)
 */
const safeText = ($el) => {
    try {
        return $el && $el.length ? $el.text().trim() : "";
    } catch {
        return "";
    }
};

/**
 * Normalizes and optimizes a Melon poster image URL.
 * Removes query parameters, upgrades resolution from 500px to 1000px, and ensures absolute URL format.
 * 标准化并优化 Melon 海报图片 URL。
 * 移除查询参数，将分辨率从 500px 升级到 1000px，并确保绝对 URL 格式。
 *
 * @param {string|null} src - The raw poster image source URL (原始海报图片来源 URL)
 * @returns {string|null} The normalized absolute URL, or null if input is invalid (标准化后的绝对 URL，如果输入无效则返回 null)
 */
const normalizePoster = (src) => {
    const HTTP_REGEX = /^https?:\/\//i;
    if (!src) return null;
    let url = String(src).split("?")[0];
    const jpgIndex = url.indexOf(".jpg");
    if (jpgIndex !== -1) url = url.substring(0, jpgIndex + 4);
    url = url.replace(/500\.jpg$/, "1000.jpg");

    if (!HTTP_REGEX.test(url)) {
        url = `https://www.melon.com${url.startsWith("/") ? "" : "/"}${url}`;
    }

    return url;
};

/**
 * Translates an array of music genres from Korean to English using a translation map.
 * Preserves null/undefined values and returns the original string if no translation is found.
 * 使用翻译映射表将音乐流派数组从韩语翻译成英语。
 * 保留 null/undefined 值，如果找不到翻译则返回原始字符串。
 *
 * @param {Array<string|null|undefined>} genres - The array of genre strings to translate (要翻译的流派字符串数组)
 * @returns {Array<string|null|undefined>} The translated array with English genre names or original values (包含英语流派名称或原始值的翻译后数组)
 */
const translateGenres = (genres) => {
    if (!Array.isArray(genres)) {
        return [];
    }

    return genres.map((genre) => {
        if (genre == null) {
            return genre;
        }
        return translations[genre] || genre;
    });
};

/**
 * Returns a randomly selected User-Agent string from a predefined list of modern browsers.
 * Used to simulate different client environments and avoid simple bot detection.
 * 从预定义的现代浏览器列表中随机返回一个 User-Agent 字符串。
 * 用于模拟不同的客户端环境并避免简单的机器人检测。
 *
 * @returns {string} A random User-Agent string for Windows, macOS, or Linux (适用于 Windows、macOS 或 Linux 的随机 User-Agent 字符串)
 */
const getRandomUserAgent = () => {
    const browsers = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    ];
    return browsers[Math.floor(Math.random() * browsers.length)];
};

/**
 * Asynchronously fetches Melon album information with retry logic and detailed parsing.
 * Handles network errors, rate limiting, and HTML structure changes gracefully.
 * Uses safeExecuteProvider for unified error handling.
 * 异步获取 Melon 专辑信息，带有重试逻辑和详细解析。
 * 优雅地处理网络错误、速率限制和 HTML 结构变化。
 * 使用 safeExecuteProvider 进行统一的错误处理。
 *
 * @param {string} albumId - The Melon album ID (Melon 专辑 ID)
 * @returns {Promise<Object>} Promise resolving to structured Melon album data or error details (解析为结构化的 Melon 专辑数据或错误详情的 Promise)
 */
const fetchAlbumInfo = async (albumId) => {
    const encodedAlbumId = encodeURIComponent(albumId);
    const data = {site: "melon", sid: albumId};
    const maxRetries = 3;
    const baseTimeout = 120000;
    let lastNetworkError = null;

    return await safeExecuteProvider(async () => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const melon_url = `${MELOON_ALBUM_INFO_URL}?albumId=${encodedAlbumId}`;
            const resp = await fetchWithTimeout(
                melon_url,
                {
                    headers: {
                        "User-Agent": getRandomUserAgent(),
                        Accept: "text/html",
                        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
                    },
                },
                baseTimeout,
            );

            if (!resp.ok) {
                if (resp.status === 404) {
                    throw new Error(NONE_EXIST_ERROR);
                } else if (resp.status === 429) {
                    throw new Error("您的请求已被限制，请稍后再试。");
                } else if (resp.status === 403) {
                    throw new Error("该请求被拒绝。确保你的 IP 地址没有被封锁");
                } else if (resp.status === 500 || resp.status === 503) {
                    lastNetworkError = new Error(`服务器错误 ${resp.status}`);
                    logger.warn(`[Melon] Server error ${resp.status}, retrying...`);
                    if (attempt < maxRetries) {
                        await new Promise((r) => setTimeout(r, 3000 * attempt));
                        continue;
                    }
                    throw lastNetworkError;
                }

                logger.error(`[Melon] ${albumId} request failed, status code ${resp.status}`);
                throw new Error(`请求失败，状态码 ${resp.status}`);
            }

            const html = await resp.text();
            const $ = typeof page_parser === "function" ? page_parser(html) : null;
            if (!$) throw new Error("没有 HTML 解析器");

            const $info = $(".wrap_info");
            if (!$info || $info.length === 0) {
                throw new Error("无法找到专辑信息");
            }

            data.success = true;
            data.melon_id = encodedAlbumId;
            data.melon_link = melon_url;

            const typeElem = $info.find(".gubun").first();
            let koreanType = safeText(typeElem);
            const typeMatch = koreanType.match(/\[(.*?)]/);
            if (typeMatch) {
                const rawType = typeMatch[1];
                const typeTranslations = {
                    "정규": "正规专辑",
                    "싱글": "单曲",
                    "EP": "EP",
                    "OST": "OST",
                };
                data.album_type = typeTranslations[rawType] || rawType;
            } else {
                const cleanType = koreanType.replace(/[[\]]/g, "").trim();
                if (cleanType) data.album_type = cleanType;
            }

            const titleElem = $info.find(".song_name").first();
            let title = safeText(titleElem)
                .replace(/^앨범명\s*/i, "")
                .trim();
            if (title) data.title = title;

            const artistElems = $info.find('.artist a[href*="goArtistDetail"]');
            if (artistElems && artistElems.length) {
                const artists = [
                    ...new Set(artistElems.map((_, el) => $(el).text().trim())),
                ].filter(Boolean);
                if (artists.length) data.artists = artists;
            }

            const $infoWrapper = $info;
            const date_elem = $infoWrapper.find(".meta dl:nth-child(1) dd").first();
            if (date_elem && date_elem.length > 0)
                data.release_date = date_elem.text().trim();

            const genre_elem = $infoWrapper.find(".meta dl:nth-child(2) dd").first();
            if (genre_elem && genre_elem.length > 0) {
                const rawGenres = genre_elem
                    .text()
                    .trim()
                    .split(",")
                    .map((g) => g.trim())
                    .filter(Boolean);
                data.genres = translateGenres(rawGenres);
            }

            const publisher_elem = $infoWrapper
                .find(".meta dl:nth-child(3) dd")
                .first();
            if (publisher_elem && publisher_elem.length > 0)
                data.publisher = publisher_elem.text().trim();

            let meta_items = $infoWrapper.find(".meta dl.list dt");
            if (!meta_items || meta_items.length === 0)
                meta_items = $infoWrapper.find(".meta dl dt");
            meta_items.each(function () {
                const $dt = $(this);
                const label = $dt.text().trim();
                const $dd = $dt.next("dd");
                const value = $dd.text().trim();
                switch (label) {
                    case "발매일":
                        if (value) data.release_date = value;
                        break;
                    case "장르":
                        if (value) {
                            const rawGenres = value
                                .split(",")
                                .map((g) => g.trim())
                                .filter(Boolean);
                            data.genres = translateGenres(rawGenres);
                        }
                        break;
                    case "발매사":
                        if (value) data.publisher = value;
                        break;
                    case "기획사":
                        if (value) data.planning = value;
                        break;
                    case "유형":
                        if (value) data.album_type = value;
                        break;
                }
            });

            const posterElem = $info.find(".thumb img").first();
            if (posterElem && posterElem.length) {
                const src = posterElem.attr("src") || posterElem.attr("data-src") || "";
                const poster = normalizePoster(src);
                if (poster) data.poster = poster;
            }

            const albumInfo = $(".dtl_albuminfo").first();
            if (albumInfo && albumInfo.length) {
                const raw = albumInfo.html() || "";
                data.description = raw
                    .replace(/<br\s*\/?>/gi, "\n")
                    .replace(/<[^>]+>/g, "")
                    .trim();
            }

            let rows = $("#frm .tbl_song_list tbody tr");
            if (!rows || rows.length === 0) rows = $(".tbl_song_list tbody tr");
            if (!rows || rows.length === 0)
                rows = $('table:has(caption:contains("곡 리스트")) tbody tr');

            if (rows && rows.length) {
                const tracks = [];
                rows.each(function () {
                    const $row = $(this);
                    const number =
                        safeText($row.find(".rank")).replace(/\D+/g, "") ||
                        safeText($row.find(".no"));
                    let t = extractTrackTitle($row);
                    if (!t) return;
                    const artLinks = $row.find('a[href*="goArtistDetail"]');
                    const trackArtists = [
                        ...new Set(artLinks.map((_, el) => $(el).text().trim())),
                    ].filter(Boolean);
                    tracks.push({
                        number: number || "",
                        title: t,
                        artists: trackArtists,
                    });
                });
                if (tracks.length) data.tracks = tracks;
            }

            return data;
        }

        throw new Error("Unknown error");
    }, "melon", albumId);
};

/**
 * Extracts the track title from a table row element in Melon's song list.
 * Tries multiple selectors to find the most accurate title text.
 * 从 Melon 歌曲列表的表格行元素中提取曲目名称。
 * 尝试多种选择器以找到最准确的标题文本。
 *
 * @param {any} $row - Cheerio object representing a table row (表示表格行的 Cheerio 对象)
 * @returns {string} The extracted track title, or an empty string if not found (提取的曲目名称，如果未找到则返回空字符串)
 */
const extractTrackTitle = ($row) => {
    let t = "";

    const aPlay = $row.find('a[title*="재생"]').first();
    if (aPlay && aPlay.length) t = safeText(aPlay);

    if (!t) {
        const aInfo = $row.find('a[title*="곡정보"]').first();
        if (aInfo && aInfo.length) {
            const aInfoNode = aInfo.get(0);
            const titleAttr = aInfoNode?.attribs?.title || "";
            const m = titleAttr.match(/^(.*?)\s+(재생|곡정보)/);
            if (m && m[1]) t = m[1].trim();
            else {
                const candidate = aInfo.closest(".ellipsis").find("a").first();
                t = safeText(candidate);
            }
        }
    }

    if (!t) {
        t =
            safeText($row.find(".ellipsis a").first()) ||
            safeText($row.find(".song_name").first());
    }

    return t;
};

/**
 * Main entry point for generating Melon album information.
 * Validates the album ID and delegates to fetchAlbumInfo with unified error handling.
 * 生成 Melon 专辑信息的主入口点。
 * 验证专辑 ID 并委托给 fetchAlbumInfo，使用统一的错误处理。
 *
 * @param {string} sid - The Melon album ID (must be digits only) (Melon 专辑 ID，必须仅为数字)
 * @returns {Promise<Object>} Promise resolving to structured Melon album data or error details (解析为结构化的 Melon 专辑数据或错误详情的 Promise)
 */
export const gen_melon = async (sid) => {
    const data = {site: "melon", sid};

    if (!/^\d+$/.test(sid)) {
        return Object.assign(data, {
            error: "Invalid Melon ID format. Expected '<digits>'",
            errorCode: "INVALID_ID_FORMAT",
        });
    }

    return await safeExecuteProvider(async () => {
        const result = await fetchAlbumInfo(sid);

        if (result && result.errorCode) {
            logger.info(`[Melon] Returning error code: ${result.errorCode}`);
            throw new Error(result.error || "Unknown error");
        }

        if (result.success) {
            logger.info(`[Melon] Successfully fetched album info (albumId=${sid})`);
        }

        return result;
    }, "melon", sid);
};