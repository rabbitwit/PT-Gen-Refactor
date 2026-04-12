import {fetchWithTimeout} from "../../utils/request.js";
import {DEFAULT_TIMEOUT} from "../../core/constants.js";
import {getStaticMediaDataFromOurBits, safe, safeExecuteProvider} from "../../utils/helpers.js";
import logger from "../../logger.js";

const STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails";
const MAX_SCREENSHOTS = 3;
const isNumericString = s => typeof s === 'string' && /^\d+$/.test(s);

/**
 * Formats Steam price data from cents to decimal currency with discount information.
 * Converts integer cent values to formatted decimal strings and extracts discount percentage.
 * 将 Steam 价格数据从分转换为十进制货币格式，并包含折扣信息。
 * 将整数分值转换为格式化的十进制字符串并提取折扣百分比。
 *
 * @param {Object|null} p - The price object from Steam API containing currency, initial, final, and discount_percent (来自 Steam API 的价格对象，包含货币、初始价格、最终价格和折扣百分比)
 * @returns {Object|null} Formatted price object with currency, initial, final, and discount properties, or null if input is invalid (格式化的价格对象，包含货币、初始价格、最终价格和折扣属性，如果输入无效则返回 null)
 */
const formatPrice = p => {
    /** @namespace p.discount_percent **/
    if (!p || typeof p !== 'object') return null;
    const currency = p.currency || '';
    const initial = typeof p.initial === 'number' ? (p.initial / 100).toFixed(2) : null;
    const final = typeof p.final === 'number' ? (p.final / 100).toFixed(2) : null;
    const discount = p.discount_percent || 0;
    return {currency, initial, final, discount};
};

/**
 * Asynchronously fetches Steam app information and returns structured data.
 * Checks cache first if enabled, then fetches from Steam API with proper error handling.
 * Uses safeExecuteProvider for unified error handling.
 * 异步获取 Steam 应用信息并返回结构化数据。
 * 如果启用则首先检查缓存，然后从 Steam API 获取数据并进行适当的错误处理。
 * 使用 safeExecuteProvider 进行统一的错误处理。
 *
 * @param {string|number} sid - The Steam app ID (must be numeric) (Steam 应用 ID，必须为数字)
 * @param {Object} env - Environment configuration object (环境配置对象)
 * @returns {Promise<Object>} Promise resolving to structured Steam app data or error details (解析为结构化的 Steam 应用数据或错误详情的 Promise)
 */
export const gen_steam = async (sid, env) => {
    const data = {site: 'steam', sid: sid};

    if (!sid || (!isNumericString(String(sid)))) {
        return Object.assign(data, {error: "Invalid Steam ID format. Expected numeric appid"});
    }

    const appid = String(sid);

    if (env.ENABLED_CACHE === 'false') {
        const cachedData = await getStaticMediaDataFromOurBits('steam', appid);
        if (cachedData) {
            logger.info(`[Cache Hit] GitHub OurBits DB For steam ${appid}`);
            return {...data, ...cachedData, success: true};
        }
    }

    return await safeExecuteProvider(async () => {
        const steam_api_url = `${STEAM_APP_DETAILS_URL}?appids=${encodeURIComponent(appid)}&l=cn`;

        let steam_response;
        try {
            steam_response = await fetchWithTimeout(steam_api_url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/json',
                    'Accept-Language': 'zh-CN,zh;q=0.9'
                }
            }, DEFAULT_TIMEOUT);
        } catch (err) {
            throw new Error(`Steam API fetch error: ${err?.name === 'AbortError' ? 'Request timeout' : err?.message || err}`);
        }

        if (!steam_response || !steam_response.ok) {
            const status = steam_response ? steam_response.status : 'no response';
            throw new Error(`Steam API request failed with status ${status}`);
        }

        let steam_data;
        try {
            steam_data = await steam_response.json();
        } catch (err) {
            throw new Error("Failed to parse Steam API response");
        }

        const entry = safe(steam_data[appid]);
        if (!entry.success) {
            throw new Error("Failed to retrieve Steam app details");
        }

        const app_data = safe(entry.data);

        data.name = safe(app_data.name, "N/A");
        data.type = safe(app_data.type, "N/A");
        data.about_the_game = safe(app_data.about_the_game, "");
        data.header_image = safe(app_data.header_image, "");
        data.website = safe(app_data.website, "");
        data.developers = Array.isArray(app_data.developers) ? app_data.developers : [];
        data.publishers = Array.isArray(app_data.publishers) ? app_data.publishers : [];
        data.release_date = app_data.release_date ? safe(app_data.release_date.date, "N/A") : "N/A";
        data.coming_soon = !!(app_data.release_date && app_data.release_date.coming_soon);

        /** @namespace app_data.price_overview **/
        if (app_data.price_overview) {
            const p = formatPrice(app_data.price_overview);
            if (p) data.price = p;
        }

        data.supported_languages = safe(app_data.supported_languages, "");

        if (app_data.platforms) {
            data.platforms = {
                windows: !!app_data.platforms.windows,
                mac: !!app_data.platforms.mac,
                linux: !!app_data.platforms.linux
            };
        } else {
            data.platforms = {windows: false, mac: false, linux: false};
        }

        data.categories = Array.isArray(app_data.categories) ? app_data.categories.map(c => c.description) : [];
        data.genres = Array.isArray(app_data.genres) ? app_data.genres.map(g => g.description) : [];

        if (app_data.pc_requirements) {
            data.pc_requirements = {
                minimum: safe(app_data.pc_requirements.minimum, ""),
                recommended: safe(app_data.pc_requirements.recommended, "")
            };
        } else {
            data.pc_requirements = {minimum: "", recommended: ""};
        }

        if (Array.isArray(app_data.screenshots)) {
            data.screenshots = app_data.screenshots.slice(0, MAX_SCREENSHOTS).map(s => ({
                id: s.id,
                path_thumbnail: s.path_thumbnail,
                path_full: s.path_full
            }));
        } else {
            data.screenshots = [];
        }

        data.success = true;
        return data;
    }, "steam", appid);
};