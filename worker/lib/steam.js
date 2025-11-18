import {  DEFAULT_TIMEOUT, fetchWithTimeout, generateSteamFormat } from "./common.js";

const STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails";
const MAX_SCREENSHOTS = 3;
const safe = (v, fallback = '') => (v === undefined || v === null ? fallback : v);
const isNumericString = s => typeof s === 'string' && /^\d+$/.test(s);
const formatPrice = p => {
  if (!p || typeof p !== 'object') return null;
  const currency = p.currency || '';
  const initial = typeof p.initial === 'number' ? (p.initial / 100).toFixed(2) : null;
  const final = typeof p.final === 'number' ? (p.final / 100).toFixed(2) : null;
  const discount = p.discount_percent || 0;
  return { currency, initial, final, discount };
};

/**
 * 异步生成指定Steam游戏ID对应的游戏信息数据
 * @param {string|number} sid - Steam游戏的唯一标识符（AppID）
 * @returns {Promise<object>} 返回一个包含Steam游戏数据的对象，包括基本信息、价格、系统需求等，
 *                           若发生错误则返回带有error字段的失败信息
 */
export const gen_steam = async (sid) => {
  let data = { site: "steam", sid: sid };

  try {
    if (!sid || (!isNumericString(String(sid)))) {
      return Object.assign(data, { error: "Invalid Steam ID format. Expected numeric appid" });
    }
    const appid = String(sid);

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
      return Object.assign(data, { error: `Steam API fetch error: ${err?.name === 'AbortError' ? 'Request timeout' : err?.message || err}` });
    }

    if (!steam_response || !steam_response.ok) {
      const status = steam_response ? steam_response.status : 'no response';
      return Object.assign(data, { error: `Steam API request failed with status ${status}` });
    }

    let steam_data;
    try {
      steam_data = await steam_response.json();
    } catch (err) {
      return Object.assign(data, { error: "Failed to parse Steam API response" });
    }

    const entry = safe(steam_data[appid], {});
    if (!entry.success) {
      return Object.assign(data, { error: "Failed to retrieve Steam app details" });
    }

    const app_data = safe(entry.data, {});
    data.name = safe(app_data.name, "N/A");
    data.type = safe(app_data.type, "N/A");
    data.about_the_game = safe(app_data.about_the_game, "");
    data.header_image = safe(app_data.header_image, "");
    data.website = safe(app_data.website, "");
    data.developers = Array.isArray(app_data.developers) ? app_data.developers : [];
    data.publishers = Array.isArray(app_data.publishers) ? app_data.publishers : [];
    data.release_date = app_data.release_date ? safe(app_data.release_date.date, "N/A") : "N/A";
    data.coming_soon = !!(app_data.release_date && app_data.release_date.coming_soon);

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
      data.platforms = { windows: false, mac: false, linux: false };
    }

    data.categories = Array.isArray(app_data.categories) ? app_data.categories.map(c => c.description) : [];
    data.genres = Array.isArray(app_data.genres) ? app_data.genres.map(g => g.description) : [];

    if (app_data.pc_requirements) {
      data.pc_requirements = {
        minimum: safe(app_data.pc_requirements.minimum, ""),
        recommended: safe(app_data.pc_requirements.recommended, "")
      };
    } else {
      data.pc_requirements = { minimum: "", recommended: "" };
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

    data.format = generateSteamFormat(data);
    data.success = true;
    return data;
  } catch (error) {
    return Object.assign(data, { error: `Steam app processing error: ${error?.message || error}` });
  }
};