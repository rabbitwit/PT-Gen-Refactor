import {fetchWithTimeout} from "../../utils/request.js";
import {page_parser, safeExecuteProvider} from "../../utils/helpers.js";
import logger from "../../logger.js";

const HEADERS_BASE = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
};

/**
 * Constructs HTTP headers for QQ Music API requests, optionally including authentication cookies.
 * Merges base headers with environment-specific cookie if provided.
 * 为 QQ 音乐 API 请求构建 HTTP 头，可选包含身份验证 Cookie。
 * 将基础头与环境特定的 Cookie（如果提供）合并。
 *
 * @param {Object} [env={}] - Environment configuration object (环境配置对象)
 * @param {string} [env.QQ_COOKIE] - Optional QQ authentication cookie string (可选的 QQ 身份验证 Cookie 字符串)
 * @returns {Object} The complete headers object for API requests (用于 API 请求的完整头对象)
 */
const buildHeaders = (env = {}) => {
    const headers = {...HEADERS_BASE};
    if (env?.QQ_COOKIE) {
        headers.Cookie = env.QQ_COOKIE;
    }
    return headers;
};

/**
 * 获取QQ音乐专辑信息
 * @param {string} sid - QQ音乐专辑ID
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 专辑信息对象
 */

// ... existing code ...

/**
 * Asynchronously fetches QQ Music album information and returns structured data.
 * Validates cookie, fetches page, extracts __INITIAL_DATA__, and parses album details.
 * Uses safeExecuteProvider for unified error handling.
 * 异步获取 QQ 音乐专辑信息并返回结构化数据。
 * 验证 Cookie，获取页面，提取 __INITIAL_DATA__，并解析专辑详情。
 * 使用 safeExecuteProvider 进行统一的错误处理。
 *
 * @param {string} sid - The QQ Music album ID (QQ 音乐专辑 ID)
 * @param {Object} env - Environment configuration object containing QQ_COOKIE (包含 QQ_COOKIE 的环境配置对象)
 * @returns {Promise<Object>} Promise resolving to structured QQ Music album data or error details (解析为结构化的 QQ 音乐专辑数据或错误详情的 Promise)
 */
export async function gen_qq_music(sid, env) {
    if (!env?.QQ_COOKIE) {
        return {
            success: false,
            error: "未提供QQ音乐Cookie,不能使用此功能！请联系管理员。",
        };
    }

    return await safeExecuteProvider(async () => {
        const headers = buildHeaders(env);
        const url = `https://y.qq.com/n/ryqq/albumDetail/${sid}`;

        const response = await fetchWithTimeout(url, {headers});

        if (!response.ok) {
            logger.warn(`[HTTP Error] ${url}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();

        if (!html || typeof html !== "string") {
            logger.warn("[Invalid HTML]");
            throw new Error("获取到的页面内容无效");
        }

        const $ = page_parser(html);

        let initialDataScript = null;

        const scripts = $("script").get();
        for (let i = 0; i < scripts.length; i++) {
            const el = scripts[i];
            const text = $(el).html();
            if (text && text.includes("window.__INITIAL_DATA__")) {
                initialDataScript = text;
                break;
            }
        }

        if (!initialDataScript) {
            logger.warn("[No Initial Data]");
            throw new Error("使用的COOKIE可能已过期,请检查COOKIE是否正确或页面结构是否发生变化");
        }

        const dataMatch = initialDataScript.match(
            /window\.(__INITIAL_DATA__)\s*=\s*(\{[^<]*})/
        );

        if (!dataMatch || !dataMatch[2]) {
            logger.warn("[Invalid Initial Data]");
            throw new Error("无法从页面脚本中提取初始数据");
        }

        let initData;
        try {
            let jsonString = dataMatch[2];
            jsonString = jsonString.replace(/:undefined/g, ":null");
            initData = JSON.parse(jsonString);
        } catch (parseError) {
            logger.warn("[Invalid JSON]");
            throw new Error("解析页面初始数据失败: " + parseError.message);
        }

        if (!initData.detail) {
            throw new Error("返回数据中缺少详情信息");
        }

        const detail = initData.detail || {};
        const songList = initData.songList || [];

        /** @namespace detail.picurl **/
        /** @namespace detail.albumMid **/
        let coverUrl = "";
        if (detail.picurl) {
            coverUrl = `https:${detail.picurl}`;
            coverUrl = coverUrl.replace(/T002R\d+x\d+M000/, "T002R500x500M000");
        }

        const data = {
            id: detail.id,
            mid: detail.albumMid,
            name: detail.title,
            cover: coverUrl,
            singer: detail.singer || [],
            albumName: detail.albumName,
            genre: detail.genre,
            language: detail.language,
            albumType: detail.albumType,
            company: detail.company,
            publishTime: detail.ctime,
            desc: detail.desc,
            songList: songList.map((song) => ({
                id: song.id,
                mid: song.mid,
                name: song.title,
                sub_name: song.subtitle || "",
                singer: song.singer || [],
                interval: song.interval,
                playTime: song.playTime,
            })),
        };

        return {
            success: true,
            site: "qq_music",
            sid: sid,
            ...data,
        };
    }, "qq_music", sid);
}