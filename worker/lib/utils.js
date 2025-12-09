import { makeJsonResponse, AUTHOR, VERSION, ROOT_PAGE_CONFIG, page_parser, fetchWithTimeout } from "./common.js";
import { generateDoubanFormat, generateImdbFormat, generateTmdbFormat, generateMelonFormat, generateBangumiFormat, generateSteamFormat, generateHongguoFormat, notCacheImdbFormat, notCacheBangumiFormat, notCacheSteamFormat } from "./format.js";
import { gen_douban } from "./douban.js";
import { gen_imdb } from "./imdb.js";
import { gen_bangumi } from "./bangumi.js";
import { gen_tmdb } from "./tmdb.js";
import { gen_melon } from "./melon.js";
import { gen_steam } from "./steam.js";
import { gen_hongguo } from "./hongguo.js";

const TIME_WINDOW = 60000; // 1分钟
const MAX_REQUESTS = 30; // 每分钟最多30个请求
const CLEANUP_INTERVAL = 10000; // 10秒清理一次过期记录
const requestCounts = new Map();

const IMDB_CONSTANTS = {
  SUGGESTION_API_URL: 'https://v2.sg.media-imdb.com/suggestion/h/',
  FIND_URL: 'https://www.imdb.com/find',
  BASE_URL: 'https://www.imdb.com',
  SEARCH_HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  },
  MAX_RESULTS: 10
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "false"
};

const URL_PROVIDERS = [
  {
    name: 'douban',
    domains: ['movie.douban.com'],
    regex: /\/subject\/(\d+)/,
    generator: gen_douban,
    formatter: (data) => generateDoubanFormat(data),
  },
  {
    name: 'imdb',
    domains: ['www.imdb.com'],
    regex: /\/title\/(tt\d+)/,
    generator: gen_imdb,
    formatter: (data, env) => env.ENABLED_CACHE === 'false' ? notCacheImdbFormat(data) : generateImdbFormat(data),
  },
  {
    name: 'tmdb',
    domains: ['api.themoviedb.org', 'www.themoviedb.org'],
    regex: /\/(movie|tv)\/(\d+)/,
    idFormatter: (match) => `${match[1]}/${match[2]}`,
    generator: gen_tmdb,
    formatter: (data) => generateTmdbFormat(data),
  },
  {
    name: 'melon',
    domains: ['www.melon.com'],
    regex: /\/album\/detail\.htm\?albumId=(\d+)/,
    idFormatter: (match) => `album/${match[1]}`,
    generator: gen_melon,
    formatter: (data) => generateMelonFormat(data),
  },
  {
    name: 'bangumi',
    domains: ['bgm.tv', 'bangumi.tv'],
    regex: /\/subject\/(\d+)/,
    generator: gen_bangumi,
    formatter: (data, env) => env.ENABLED_CACHE === 'false' ? notCacheBangumiFormat(data) : generateBangumiFormat(data),
  },
  {
    name: 'steam',
    domains: ['store.steampowered.com'],
    regex: /\/app\/(\d+)/,
    generator: gen_steam,
    formatter: (data,env) => env.ENABLED_CACHE === 'false' ? notCacheSteamFormat(data) : generateSteamFormat(data),
  },
  {
    name: 'hongguo',
    domains: ['novelquickapp.com'],
    regex: /(?:s\/([A-Za-z0-9_-]+)|series_id=(\d+))/,
    idFormatter: (match) => match[1] || match[2],
    generator: gen_hongguo,
    formatter: (data) => generateHongguoFormat(data),
  },
];

const PROVIDER_CONFIG = {
  douban: { generator: gen_douban, formatter: (data) => generateDoubanFormat(data) },
  imdb:   { generator: gen_imdb,   formatter: (data, env) => env.ENABLED_CACHE === 'false' ? notCacheImdbFormat(data) : generateImdbFormat(data) },
  tmdb:   { generator: gen_tmdb,   formatter: (data) => generateTmdbFormat(data) },
  bangumi:{ generator: gen_bangumi,formatter: (data, env) => env.ENABLED_CACHE === 'false' ? notCacheBangumiFormat(data) : generateBangumiFormat(data) },
  melon:  { generator: gen_melon,  formatter: (data) => generateMelonFormat(data) },
  steam:  { generator: gen_steam,  formatter: (data, env) => env.ENABLED_CACHE === 'false' ? notCacheSteamFormat(data) : generateSteamFormat(data) },
  hongguo:{ generator: gen_hongguo,formatter: (data) => generateHongguoFormat(data) },
};

const LINK_TEMPLATES = {
  douban: (id) => `https://movie.douban.com/subject/${id}/`,
  imdb: (id) => `https://www.imdb.com/title/${id}/`,
  tmdb: (item, id) => {
    const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
    return `https://www.themoviedb.org/${mediaType}/${id}`;
  }
};

const SOURCE_PROCESSORS = {
  douban: (item) => ({
    year: pick(item, 'year'),
    subtype: pick(item, 'type') || 'movie',
    title: item.data && Array.isArray(item.data) && item.data.length > 0 ? pick(item.data[0], 'name') : '',
    subtitle: String(item.data && Array.isArray(item.data) && item.data.length > 0 ? pick(item.data[0], 'description') : ''),
    link: buildLink(item, 'douban'),
    id: pick(item, 'doubanId'),
    rating: String(pick(item, 'doubanRating') || ''),
    img: pick(item, 'img'),
    episode: pick(item, 'episode')
  }),
  imdb: (item) => ({
    year: pick(item, 'y'),
    subtype: pick(item, 'qid'),
    title: pick(item, 'l'),
    subtitle: pick(item, 's'),
    link: item.id ? `https://www.imdb.com/title/${item.id}/` : buildLink(item, 'imdb'),
    id: pick(item, 'id')
  }),
  tmdb: (item) => {
    // 加强标题逻辑：优先 "中文 (name) / 英文 (original_name 或 original_title)"
    const cnTitle = pick(item, 'name', 'title');  // 假设 name/title 为中文
    const enTitle = pick(item, 'original_name', 'original_title');  // 英文优先
    let title = '';
    if (cnTitle && enTitle && cnTitle !== enTitle) {
      title = `${cnTitle} / ${enTitle}`;  // 双语格式
    } else if (cnTitle) {
      title = cnTitle;
    } else if (enTitle) {
      title = enTitle;
    }

    return {
      year: safeGetYearFromReleaseDate(item.release_date),
      subtype: item.media_type === 'tv' ? 'tv' : 'movie',
      title: title,
      subtitle: truncate(pick(item, 'overview'), 100),
      link: buildLink(item, 'tmdb'),
      rating: item.vote_average != null ? String(item.vote_average) : '',
      id: pick(item, 'id')
    };
  }
};

const DEFAULT_FIELDS = (item, source) => ({
  year: pick(item, 'year') ||
        pick(item, 'y') ||
        safeGetYearFromReleaseDate(item.release_date) ||
        '',
  subtype: pick(item, 'subtype') ||
           pick(item, 'type') ||
           pick(item, 'q') ||
           'movie',
  title: pick(item, 'title') || pick(item, 'l') || pick(item.data, 'name') || '',
  subtitle: pick(item, 'subtitle') ||
            pick(item, 's') ||
            pick(item, 'sub_title') ||
            '',
  link: buildLink(item, source) || '',
  id: pick(item, 'id')
});

export const ensureArray = v => Array.isArray(v) ? v : (v ? [v] : []);
export const safe = (v, fallback = '') => (v === undefined || v === null ? fallback : v);

let lastCleanup = Date.now();

/**
 * 检查请求频率是否超过限制 - 使用滑动窗口计数器算法
 * @param {string} clientIP - 客户端IP地址
 * @returns {Promise<boolean>} - 是否超过频率限制
 */
const isRateLimited = async (clientIP) => {
  const now = Date.now();
  const windowStart = now - TIME_WINDOW;

  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [ip, requests] of requestCounts.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
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

    validRequests = requests.filter(timestamp => timestamp > windowStart);

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
 * 格式化演员列表，将演员信息转换为一个以中文顿号（、）分隔的字符串。
 * 如果演员列表为空或无效，则返回默认值“未知”。
 *
 * @param {Array|Object|string} actors - 演员数据，可以是数组、对象或字符串。
 *   - 如果是数组，每个元素应包含演员信息（如 name_cn 或 name 属性）。
 *   - 如果是对象，直接提取其 name_cn 或 name 属性。
 *   - 如果是其他类型，会被 ensureArray 转换为数组。
 * @returns {string} - 格式化后的演员名称字符串，多个演员以“、”分隔。
 *   如果没有有效的演员名称，则返回“未知”。
 */
const formatActorList = (actors) => {
  return ensureArray(actors)
    .map(a => safe(a?.name_cn || a?.name))
    .filter(Boolean)
    .join('、') || '未知';
};

/**
 * 从对象中选择第一个有效值
 * @param {any} item - 要从中选择值的对象
 * @param {...string} keys - 要检查的属性键列表
 * @returns {any} 返回找到的第一个有效值，如果没有找到则返回空字符串
 */
const pick = (item, ...keys) => {
  if (!item || typeof item !== 'object') return '';
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null) {
      try {
        const strV = String(v);
        if (strV.trim() !== '') return v;
      } catch (e) {
        continue; // 忽略无法转换为字符串的值
      }
    }
  }
  return '';
};

/**
 * 截断字符串并在末尾添加省略号
 * @param {string|any} s - 要截断的字符串或可转换为字符串的值
 * @param {number} [n=100] - 截断长度，默认为100个字符
 * @returns {string} 截断后的字符串，如果输入无效则返回空字符串
 */
const truncate = (s, n = 100) => {
  if (!s || n <= 0) return '';
  let str = String(s).trim();
  return str.length > n ? str.slice(0, n).trim() + '...' : str;
};

/**
 * 构建链接的函数。
 * 
 * @param {Object} item - 包含链接信息的对象。可以包含以下字段：
 *                        - link: 直接返回的链接字符串。
 *                        - url: 直接返回的链接字符串。
 *                        - id, imdb_id, douban_id, tt: 用于生成链接的标识符。
 * @param {string} source - 指定链接模板来源的字符串，用于从 LINK_TEMPLATES 中获取对应的模板。
 * 
 * @returns {string} 返回生成的链接字符串。如果无法生成链接，则返回空字符串。
 */
const buildLink = (item, source) => {
  if (!item || typeof item !== 'object') return '';
  if (item.link) return String(item.link);
  if (item.url) return String(item.url);

  const id = pick(item, 'id', 'imdb_id', 'douban_id', 'tt', 'doubanId');
  if (!id) return '';

  const template = LINK_TEMPLATES[source];
  return template ? (source === 'tmdb' ? template(item, id) : template(id)) : '';
};

/**
 * 安全地从日期字符串中提取年份。
 * 
 * @param {string} dateStr - 表示日期的字符串，格式通常为 "YYYY-MM-DD"。
 *                           如果为空或不是字符串类型，则返回空字符串。
 * @returns {string} - 返回日期字符串中的年份部分（即 "YYYY"）。
 *                     如果输入无效或解析失败，则返回空字符串。
 */
const safeGetYearFromReleaseDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  try {
    return dateStr.split('-')[0] || '';
  } catch (err) {
    return '';
  }
};

/**
 * 异步函数：通过IMDB API执行搜索操作。
 * 
 * @param {string} query - 搜索查询的关键字或短语。
 * @returns {Promise<Object|null>} - 返回处理后的搜索结果数据，如果搜索失败或无结果则返回null。
 * 
 * 功能描述：
 * 1. 构造IMDB API的搜索URL，并对查询参数进行编码。
 * 2. 使用fetch发起HTTP请求，获取搜索结果。
 * 3. 如果响应状态不为成功（response.ok为false），记录警告日志并返回null。
 * 4. 解析返回的JSON数据，提取搜索结果列表。
 * 5. 如果结果列表不为空，调用processSearchResults函数处理结果并返回处理后的数据。
 * 6. 捕获任何请求或处理中的错误，记录错误日志并返回null。
 */
const _searchViaApi = async (query) => {
  const searchUrl = `${IMDB_CONSTANTS.SUGGESTION_API_URL}${encodeURIComponent(query)}.json`;
  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      console.warn(`IMDB API search failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const results = data?.d ?? [];

    return results.length > 0 ? processSearchResults(results, 'imdb').data : null;
  } catch (error) {
    console.error(`IMDB API request failed for query "${query}":`, error);
    return null;
  }
};

/**
 * 提取结果信息。
 * 
 * @param {jQuery} $el - 包含结果信息的元素。
 *                       该元素应包含一个带有 `.result_text` 类的子元素，
 *                       且该子元素中应包含一个链接 (`<a>` 标签)。
 * 
 * @returns {Object|null} - 返回一个对象，包含以下字段：
 *   - year {string}: 提取的年份信息，如果没有找到则为空字符串。
 *   - subtype {string}: 固定值为 'feature'。
 *   - title {string}: 链接文本内容，表示标题。
 *   - subtitle {string}: 完整文本中去掉标题后的剩余部分。
 *   - link {string}: 构造的完整链接地址。
 *                     如果无法提取有效信息，则返回 null。
 */
const extractResult = ($el) => {
  const $resultText = $el.find('.result_text');
  const $link = $resultText.find('a');

  const linkHref = $link.attr('href');
  if (!linkHref || !linkHref.includes('/title/tt')) return null;

  const idMatch = linkHref.match(/\/title\/(tt\d+)/);
  if (!idMatch) return null;

  const title = $link.text().trim();
  const fullText = $resultText.text();
  const yearMatch = fullText.match(/\((\d{4})\)/);

  return {
    year: yearMatch ? yearMatch[1] : '',
    subtype: 'feature',
    title: title,
    subtitle: fullText.replace(title, '').trim(),
    link: `${IMDB_CONSTANTS.BASE_URL}${linkHref}`
  };
};

/**
 * 通过IMDb的网页抓取方式搜索影视内容。
 * 
 * @param {string} query - 搜索关键词，用于构建IMDb的搜索URL。
 * @returns {Promise<Array>} - 返回一个Promise，解析为处理后的搜索结果数组。
 *                            如果抓取失败或没有结果，则返回空数组。
 */
const _searchViaScraping = async (query) => {
  const searchUrl = `${IMDB_CONSTANTS.FIND_URL}?q=${encodeURIComponent(query)}&s=tt`;
  console.debug("Trying IMDb fallback scraping URL:", searchUrl);

  try {
    const response = await fetch(searchUrl, { headers: IMDB_CONSTANTS.SEARCH_HEADERS });
    if (!response.ok) {
      console.warn(`IMDb scrape failed: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = page_parser(html);
    const results = [];

    $('.findResult').slice(0, IMDB_CONSTANTS.MAX_RESULTS).each((i, el) => {
      const $el = $(el);
      const result = extractResult($el);
      if (result) results.push(result);
    });

    return processSearchResults(results, 'imdb').data;
  } catch (error) {
    console.error(`IMDb scraping failed for query "${query}":`, error);
    return [];
  }
};

/**
 * 搜索IMDb的异步函数，通过API或网页抓取方式获取查询结果。
 * 
 * @param {string} query - 要搜索的查询字符串（例如电影名称或演员名字）。
 * @returns {Promise<Object>} - 返回一个Promise，解析为包含以下字段的对象：
 *   - success (boolean): 搜索是否成功。
 *   - data (Array): 搜索结果数据（如果成功）。
 *   - error (string): 错误信息（如果失败）。
 */
const search_imdb = async (query) => {
  try {
    let searchData = await _searchViaApi(query);

    if (!searchData || searchData.length === 0) {
      console.debug('API yielded no results, falling back to scraping for IMDb query:', query);
      searchData = await _searchViaScraping(query);
    }

    if (searchData?.length > 0) {
      return { success: true, data: searchData };
    }

    return { success: false, error: '未找到查询的结果 | No results found for the given query', data: [] };
  } catch (error) {
    return handleSearchError('IMDb', query, error);
  }
};

const search_douban = async (query) => { 
  if (!query) {
    return { status: 400, success: false, error: 'Invalid query', data: [] };
  }
  const SUGGESTION_API_URL = `https://api.wmdb.tv/api/v1/movie/search?q=${encodeURIComponent(query)}&skip=0&lang=Cn`;
  const response = await fetch(SUGGESTION_API_URL);
  if (!response.ok) {
    console.warn(`Douban API search failed: ${response.status}`);
    // 特别处理429状态码
    if (response.status === 429) {
      return { status: response.status, success: false, error: '请求过于频繁，请等待30秒后再试 | Too many requests, please wait 30 seconds and try again', data: [] };
    }
    return { status: response.status, success: false, error: '豆瓣API请求失败 | Douban API request failed', data: [] };
  }
  const data = await response.json();

  if (data.data.length > 0) {
    return { success: true, data: processSearchResults(data.data, 'douban').data };
  }
  return { status: 404, success: false, error: '未找到查询的结果 | No results found for the given query', data: [] };
};

/**
 * 构建用于搜索电影或电视节目的URL。
 * 
 * @param {string} apiKey - 用于访问TMDb API的密钥。
 * @param {string} query - 搜索关键词，例如电影名称或电视节目名称。
 * @param {string} type - 搜索类型，通常为"movie"（电影）或"tv"（电视节目）。
 * @returns {string} 返回完整的搜索URL，包含API密钥、语言设置和编码后的查询参数。
 */
const buildSearchUrl = (apiKey, query, type) => {
  const base = `https://api.themoviedb.org/3/search/${type}`;
  return `${base}?api_key=${apiKey}&language=zh-CN&query=${encodeURIComponent(query)}`;
};

/**
 * 解析从 TMDB API 返回的响应数据。
 * 
 * @param {Response} response - 从 TMDB API 获取的响应对象，通常是一个 Fetch API 的 Response 实例。
 *                              需要包含 `ok` 属性和 `json()` 方法。
 * @param {string} type - 数据的媒体类型（例如 "movie", "tv", "person" 等），用于标记解析后的数据。
 * 
 * @returns {Promise<Array>} - 返回一个 Promise，解析后是一个数组，数组中的每个对象都包含原始数据，
 *                             并附加了一个 `media_type` 字段，值为传入的 `type` 参数。
 *                             如果响应失败或解析出错，则返回空数组。
 */
const parseResults = async (response, type) => {
  if (!response?.ok) {
    console.warn(`TMDB ${type} response failed: ${response?.status}`);
    return [];
  }

  try {
    const { results = [] } = await response.json();
    return results.map(item => ({ ...item, media_type: type }));
  } catch (e) {
    console.warn(`TMDB ${type} parse failed:`, e?.message || e);
    return [];
  }
};

/**
 * 构建一个用于发起 HTTP 请求的选项对象。
 * 
 * @param {AbortSignal} signal - 用于取消请求的信号对象，通常由 AbortController 提供。
 *                               如果需要支持请求取消功能，可以传入此参数。
 * @returns {Object} 返回一个包含 HTTP 请求配置的对象，具体包括：
 *                   - method: 请求方法，固定为 'GET'。
 *                   - headers: 请求头，包含一个模拟浏览器的 User-Agent 字段。
 *                   - signal: 传入的信号对象，用于请求取消。
 */
const buildRequestOptions = (signal) => ({
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  signal
});

/**
 * 搜索TMDb以获取与查询相关的电影和电视剧信息。
 * 
 * @param {string} query - 搜索关键字，用于在TMDb中查找相关电影和电视剧。
 * @param {Object} env - 环境变量对象，包含TMDb API密钥等配置信息。
 *                       预期结构：{ TMDB_API_KEY: 'your_api_key_here' }
 * @returns {Object} - 返回一个对象，包含以下字段：
 *   - success {boolean}: 表示搜索是否成功。
 *   - error {string}: 如果失败，包含错误信息（可选）。
 *   - data {Array}: 搜索结果数据，按流行度排序并限制为最多10条记录。
 */
const search_tmdb = async (query, env) => {
  try {
    const apiKey = env?.TMDB_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'TMDB API密钥未配置 | TMDB API key not configured', data: [] };
    }

    const q = String(query || '').trim();
    if (!q) {
      return { success: false, error: 'Invalid query', data: [] };
    }

    const movieUrl = buildSearchUrl(apiKey, q, 'movie');
    const tvUrl = buildSearchUrl(apiKey, q, 'tv');
    const TIMEOUT = 8000;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), TIMEOUT) : null;

    let movieResponse, tvResponse;
    try {
      [movieResponse, tvResponse] = await Promise.all([
        fetch(movieUrl, buildRequestOptions(controller?.signal)),
        fetch(tvUrl, buildRequestOptions(controller?.signal))
      ]);
    } catch (fetchError) {
      if (fetchError?.name === 'AbortError') {
        return { success: false, error: 'TMDB API请求超时 | TMDB API request timeout', data: [] };
      }
      return { success: false, error: `TMDB API网络错误: ${fetchError?.message || 'Unknown error'}`, data: [] };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const [movieResults, tvResults] = await Promise.all([
      parseResults(movieResponse, 'movie'),
      parseResults(tvResponse, 'tv')
    ]);

    const results = [...movieResults, ...tvResults]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 10);

    if (results.length > 0) {
      return { success: true, data: processSearchResults(results, 'tmdb').data };
    }

    return { success: false, error: "未找到查询的结果 | No results found for the given query", data: [] };
  } catch (error) {
    console.error(`TMDB search failed for query "${query}":`, error);
    return handleSearchError('TMDb', query, error);
  }
};

/**
 * 处理IMDb搜索请求的异步函数。
 * 
 * @param {string} query - 搜索的关键字或查询字符串，用于在IMDb中进行搜索。
 * @param {Object} env - 环境对象，通常包含与响应生成相关的配置或上下文信息。
 * @returns {Promise<Object>} 返回一个JSON格式的响应对象，包含以下字段：
 *  - success: 布尔值，表示搜索是否成功。
 *  - data: 如果成功，包含搜索结果的数组；如果失败，则为空数组。
 *  - site: 如果成功，固定为"search-imdb"。
 *  - error: 如果失败，包含错误信息（优先级：result.error > result.message > 默认错误信息）。
 */
const handleImdbSearch = async (query, env) => {
  const result = await search_imdb(query);
  const success = result.success && result.data && result.data.length > 0;
  const response = {
    success,
    ...(success
      ? { data: result.data, site: "search-imdb" }
      : {
          error: result.error || result.message || "IMDb搜索未找到相关结果",
          data: [],
        }),
  };
  return makeJsonResponse(response, env);
};

/**
 * 处理TMDB搜索请求的异步函数。
 * 
 * @param {string} query - 搜索的关键字或查询条件，用于传递给TMDB搜索接口。
 * @param {Object} env - 环境配置对象，包含与TMDB API交互所需的环境变量或配置。
 * @returns {Promise<Object>} 返回一个JSON格式的响应对象，包含以下字段：
 *  - success: 布尔值，表示搜索是否成功。
 *  - data: 如果成功，包含搜索结果的数据数组；如果失败，则为空数组。
 *  - error: 如果失败，包含错误信息（仅在success为false时存在）。
 *  - site: 如果成功，固定为"search-tmdb"，标识数据来源。
 */
const handleTmdbSearch = async (query, env) => {
  const result = await search_tmdb(query, env);
  const hasData = result.data && result.data.length > 0;
  const success = result.success && hasData;
  const response = {
    success,
    ...(success
      ? { data: result.data, site: "search-tmdb" }
      : {
          error: result.success
            ? "TMDB搜索未找到相关结果"
            : result.error || result.message || "TMDB搜索失败",
          data: []
        })
  };
  return makeJsonResponse(response, env);
};

const handleDoubanSearch = async (query, env) => { 
  const result = await search_douban(query);
  // 如果是429或400错误，直接返回错误响应而不是包装成成功响应
  if (result.status === 429 || result.status === 400) {
    return makeJsonResponse({ 
      success: false, 
      error: result.error || "请求过于频繁，请等待30秒后再试 | Too many requests, please wait 30 seconds and try again"
    }, env, result.status);
  }
  
  const success = result.success && result.data && result.data.length > 0;
  console.log(JSON.stringify(result));
  const response = {
    success,
    ...(success
      ? { data: result.data, site: "search-douban" }
      : {
          error: result.error || result.message || "Douban搜索未找到相关结果",
          data: []
        })
  };
  return makeJsonResponse(response, env);
};

/**
 * 处理搜索请求的异步函数。
 * 根据指定的数据源（如IMDb或TMDb）执行相应的搜索操作，并返回格式化的JSON响应。
 * 
 * @param {string} source - 搜索数据源，支持 "imdb" 或 "tmdb"。必须为字符串类型，否则返回错误响应。
 * @param {string} query - 搜索关键词，用于在指定数据源中进行查询。
 * @param {Object} env - 环境变量对象，包含与搜索相关的配置或上下文信息。
 * @returns {Promise<Object>} 返回一个JSON格式的响应对象，包含以下字段：
 *   - success: 布尔值，表示搜索是否成功。
 *   - data: 如果成功，包含搜索结果的数据；如果失败，则为空数组。
 *   - error: 如果失败，包含错误信息。
 */
const handleSearchRequest = async (source, query, env) => {
  console.log(`Processing search request: source=${source}, query=${query}`);
  if (typeof source !== 'string') {
    return makeJsonResponse({
      success: false,
      error: 'Invalid source type. Expected string.'
    }, env);
  }
  try {
    const normalizedSource = source.toLowerCase();
    const handlers = {
      imdb: handleImdbSearch,
      tmdb: handleTmdbSearch,
      douban: handleDoubanSearch
    };
    const handler = handlers[normalizedSource];
    if (!handler) {
      return makeJsonResponse({
        success: false,
        error: "Invalid source. Supported sources: imdb, tmdb"
      }, env);
    }
    return await handler(query, env);
  } catch (search_error) {
    return handleSearchError(source, query, search_error);
  }
};

/**
 * 处理自动搜索请求的异步函数。
 * 根据查询文本的语言自动选择搜索源（中文使用TMDB，非中文使用IMDb）。
 * 
 * @param {string} query - 搜索关键词。
 * @param {Object} env - 环境变量对象，包含与搜索相关的配置或上下文信息。
 * @returns {Promise<Object>} 返回格式化的JSON响应对象。
 */
const handleAutoSearch = async (query, env) => {
  console.log(`Processing auto search request: query=${query}`);
  if (typeof query !== 'string' || !query.trim()) {
    return makeJsonResponse({
      success: false,
      error: "Query parameter is missing or invalid.",
      data: []
    }, env);
  }
  try {
    const isChinese = isChineseText(query);
    let searchResult;
    let provider;

    if (isChinese) {
      console.log(`Using douban for query: ${query}`);
      const doubanResult = await search_douban(query);
      // 检查是否是因为429错误或者搜索不成功而需要回退到TMDB
      if (doubanResult.success && doubanResult.data && doubanResult.data.length > 0) {
        console.log(`Douban search succeeded for query: ${query}`);
        provider = { search: () => doubanResult, site: "search-douban", name: "Douban" };
        searchResult = doubanResult;
      } else {
        console.log(`Douban search failed (status: ${doubanResult.status}), falling back to TMDB for query: ${query}`);
        provider = { search: search_tmdb, site: "search-tmdb", name: "TMDB" };
        searchResult = await search_tmdb(query, env);
      }
    } else {
      console.log(`Using IMDb for query: ${query}`);
      provider = { search: search_imdb, site: "search-imdb", name: "IMDb" };
      searchResult = await search_imdb(query);
    }

    console.log(`${provider.name} search completed for query: ${query}`);
    
    const hasData = searchResult.data && searchResult.data.length > 0;
    const success = searchResult.success && hasData;
    const response = {
      success,
      ...(success
        ? { data: searchResult.data, site: provider.site }
        : {
            error: searchResult.success
              ? `${provider.name} 未找到相关结果 | No results found`
              : searchResult.error || searchResult.message || `${provider.name} search failed due to an unknown reason.`,
            data: []
          })
    };
    return makeJsonResponse(response, env);
  } catch (err) {
    console.error("Error in auto search:", err.message || err);
    return makeJsonResponse({
      success: false,
      error: "Search failed. Please try again later.",
      data: []
    }, env);
  }
};

/**
 * 处理搜索结果的函数。
 * 
 * @param {Array} results - 搜索结果数组。如果为空或不是数组，则返回空数据对象。
 * @param {string} source - 数据来源标识符，用于选择对应的处理器。
 * @returns {Object} - 包含处理后的数据的对象，结构为 { data: [] }。
 *                    如果输入无效或无结果，data 为空数组。
 */
const processSearchResults = (results, source) => {
  if (!Array.isArray(results) || results.length === 0) return { data: [] };

  const processor = SOURCE_PROCESSORS[source] || DEFAULT_FIELDS;
  const out = results.slice(0, 10).map(raw => {
    const item = raw && typeof raw === 'object' ? raw : {};
    return processor(item, source);
  });

  return { data: out };
};

/**
 * 处理 URL 请求的异步函数。
 * 
 * @param {string} url_ - 需要处理的目标 URL。
 * @param {object} env - 环境对象，包含运行时的配置或依赖。
 * @returns {Promise<object>} - 返回一个 Promise，解析为一个对象，包含以下字段：
 *   - success: {boolean} - 操作是否成功。
 *   - error: {string} - 如果失败，包含错误信息（可选）。
 *   - format: {any} - 如果成功，动态添加的格式化数据（可选）。
 */
const handleUrlRequest = async (url_, env) => {
  console.log(`Processing URL request: url=${url_}`);

  const provider = URL_PROVIDERS.find(p => p.domains.some(domain => url_.includes(domain)));

  if (!provider) {
    return { success: false, error: "Unsupported URL" };
  }

  const match = url_.match(provider.regex);
  if (!match) {
    return { success: false, error: `Invalid ${provider.name} URL` };
  }

  const sid = provider.idFormatter ? provider.idFormatter(match) : match[1];
  const idOnly = sid.split('/').pop();
  const cleanResourceId = idOnly;
  console.log(`Resource ID: ${cleanResourceId}`);
  const fetchData = () => provider.generator(sid, env);
  let subType = null;
  if (provider.name === 'tmdb') {
    const parts = sid.split('/');
    if (parts.length >= 2) {
      subType = parts[0];
    }
  }
  
  const result = await _withCache(cleanResourceId, fetchData, env, provider.name, subType);

  if (result?.success) {
    result.format = provider.formatter(result, env);
  }

  return result;
};

/**
 * 创建一个标准的JSON错误响应 (保持不变的优化点)
 * @param {string} message 错误信息
 * @param {number} status HTTP状态码
 * @param {object} corsHeaders CORS头部
 * @returns {Response}
 */
const createErrorResponse = (message, status, corsHeaders) => {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
};

/**
 * 验证请求的有效性，包括API密钥、恶意请求和速率限制
 * @param {Request} request 传入的请求对象
 * @param {object} corsHeaders CORS头部
 * @param {object} env 环境变量
 * @returns {Promise<{valid: boolean, response?: Response, clientIP?: string}>}
 */
const validateRequest = async (request, corsHeaders, env) => { 
  const clientIP = request.headers.get('cf-connecting-ip') ||
                   request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
  
  const url = new URL(request.url);
  const isInternalRequest = request.headers.get('X-Internal-Request') === 'true';
  
  if (env?.API_KEY && !isInternalRequest) {
    const apiKey = url.searchParams.get("key");

    if (!apiKey) {
      // 检查是否为浏览器请求（通过 Accept 头部判断）
      const acceptHeader = request.headers.get('Accept') || '';
      const isBrowserRequest = acceptHeader.includes('text/html');
      
      // 对于根路径，根据请求类型决定返回什么
      if ((url.pathname === '/' || url.pathname === '/api') && request.method === "GET" && isBrowserRequest) {
          return { valid: false, response: await handleRootRequest(env, true) };
      }
      
      return {
        valid: false,
        response: createErrorResponse("API key required. Access denied.", 401, corsHeaders),
      };
    }
    
    if (apiKey !== env.API_KEY) {
      return {
        valid: false,
        response: createErrorResponse("Invalid API key. Access denied.", 401, corsHeaders),
      };
    }
  }

  if (isMaliciousRequest(request.url)) {
    return {
      valid: false,
      response: createErrorResponse("Malicious request detected. Access denied.", 403, corsHeaders),
    };
  }

  if (await isRateLimited(clientIP, env)) {
    return {
      valid: false,
      response: createErrorResponse("Rate limit exceeded. Please try again later.", 429, corsHeaders),
    };
  }

  return { valid: true, clientIP };
}

/**
 * 创建浏览器访问时的HTML响应
 * @param {string} copyrightText 版权信息文本
 * @returns {Response}
 */
const _createBrowserResponse = (copyrightText) => { 
  const html = ROOT_PAGE_CONFIG.HTML_TEMPLATE.replace('__COPYRIGHT__', copyrightText);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...CORS_HEADERS
    }
  });
}

/**
 * 创建API访问时的JSON响应
 * @param {string} author 作者名
 * @param {object} env 环境变量
 * @returns {Response}
 */
const _createApiResponse = (author, env) => {
  const apiDoc = {
    ...ROOT_PAGE_CONFIG.API_DOC,
    "Version": VERSION,
    "Author": author,
    "Copyright": `Powered by @${author}`,
    "Security": env?.API_KEY ? "API key required for access" : "Open access",
  };
  return makeJsonResponse(apiDoc, env);
}

/**
 * 处理根路径请求的主函数
 * @param {object} env 环境变量
 * @param {boolean} isBrowser 是否为浏览器请求
 * @returns {Response}
 */
const handleRootRequest = async (env, isBrowser) => { 
  const author = env?.AUTHOR || AUTHOR;
  const copyright = `Powered by @${author}`;

  if (isBrowser) {
    return _createBrowserResponse(copyright);
  } else {
    return _createApiResponse(author, env);
  }
}

/**
 * 从请求中提取参数，优先从POST body获取，失败则从URL query获取。
 * @param {Request} request
 * @param {URL} uri
 * @returns {Promise<object>} 包含所有参数的对象
 */
const _extractParams = async (request, uri) => {
  const defaults = {
    source: uri.searchParams.get("source"),
    query: uri.searchParams.get("query"),
    url: uri.searchParams.get("url"),
    tmdb_id: uri.searchParams.get("tmdb_id"),
    sid: uri.searchParams.get("sid"),
    type: uri.searchParams.get("type"),
  };

  if (request.method !== 'POST') return defaults;

  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) return defaults;

  try {
    const body = await request.json();
    return {
      source: body.source || defaults.source,
      query: body.query || defaults.query,
      url: body.url || defaults.url,
      tmdb_id: body.tmdb_id || defaults.tmdb_id,
      sid: body.sid || defaults.sid,
      type: body.type || defaults.type,
    };
  } catch (e) {
    console.warn("Failed to parse POST body as JSON:", e);
    return defaults;
  }
};

/**
 * 使用缓存机制获取资源数据，支持 R2 和 D1 双缓存层，自动处理缓存命中/未命中场景
 * 
 * @param {string} resourceId - 资源唯一标识符（可能包含路径结构，如 "movies/123"）
 * @param {Function} fetchFunction - 异步函数，用于获取新鲜数据（无参数调用）
 * @param {Object} env - 环境配置对象，包含：
 *   - ENABLED_CACHE: 缓存开关（字符串，'false' 表示禁用）这个控制主要用于判断是否使用ourbits/PtGen的静态数据CDN
 *   - R2_BUCKET: R2 存储桶实例（可选）
 *   - DB: D1 数据库实例（可选）
 * @param {string} source - 数据源标识（如 'tmdb', 'douban' 等）
 * @param {string|null} [subType=null] - 子类型标识（主要用于 tmdb 源的区分）
 * 
 * @returns {Promise<any>} 缓存数据或新鲜获取的数据
 *   - 若缓存命中：返回解析后的缓存对象
 *   - 若缓存未命中：返回 fetchFunction 的执行结果
 *   - 特殊情况：当数据无效（非对象）时直接返回原始值
 */
const _withCache = async (resourceId, fetchFunction, env, source, subType = null) => {
  const isCacheEnabled = env.ENABLED_CACHE !== 'false';
  const sourcesWithNoCache = ['douban', 'imdb', 'bangumi', 'steam'];
  if (!isCacheEnabled && sourcesWithNoCache.includes(source)) {
    console.log(`[Cache Disabled] Fetching data for resource: ${resourceId}`);
    return await fetchFunction();
  }

  const getR2Key = () => {
    if (!source) return resourceId;
    if (source === 'tmdb' && subType) return `${source}/${subType}/${resourceId}`;
    return `${source}/${resourceId}`;
  };

  const getD1Key = () => {
    if (!source) return resourceId;
    if (source === 'tmdb' && subType) return `${source}_${subType}_${resourceId}`;
    return `${source}_${resourceId}`;
  };

  const r2Key = getR2Key();
  const d1Key = getD1Key();

  const [r2Result, d1Result] = await Promise.allSettled([
    env.R2_BUCKET?.get(r2Key)?.then(cached => cached?.json()) ?? Promise.reject('No R2'),
    env.DB?.prepare("SELECT data FROM cache WHERE key = ?").bind(d1Key).first().then(row => row ? JSON.parse(row.data) : null) ?? Promise.reject('No D1')
  ]);

  let cachedData = null;
  if (r2Result.status === 'fulfilled' && r2Result.value) {
    cachedData = r2Result.value;
    console.log(`[Cache Hit] R2 for: ${r2Key}`);
  } else if (d1Result.status === 'fulfilled' && d1Result.value) {
    cachedData = d1Result.value;
    console.log(`[Cache Hit] D1 for: ${d1Key}`);
  }

  if (cachedData) return cachedData;

  console.log(`[Cache Miss] Fetching for R2: ${r2Key}, D1: ${d1Key}`);
  const freshData = await fetchFunction();

  if (!freshData || typeof freshData !== 'object') return freshData;

  const cacheData = { ...freshData };
  delete cacheData.format;
  const cacheDataStr = JSON.stringify(cacheData);

  await Promise.allSettled([
    env.R2_BUCKET?.put(r2Key, cacheDataStr) ?? Promise.reject('No R2'),
    env.DB?.prepare("INSERT OR REPLACE INTO cache (key, data, timestamp) VALUES (?, ?, ?)")
      .bind(d1Key, cacheDataStr, Date.now()).run() ?? Promise.reject('No D1')
  ]).then(results => {
    if (results[0].status === 'fulfilled') console.log(`[Cache Write] R2 for: ${r2Key}`);
    if (results[1]?.status === 'fulfilled') console.log(`[Cache Write] D1 for: ${d1Key}`);
  }).catch(e => console.error('Cache write error:', e));

  return freshData;
};

/**
 * 根据站点类型处理奖项数据，仅当站点为豆瓣且奖项字段为字符串时进行解析。
 * @param {Object} data - 包含原始奖项数据的对象
 * @param {string} site - 站点标识符（如 'douban'）
 * @returns {Object} 处理后的数据对象（若满足条件则解析奖项字段，否则返回原对象）
 */
const processAwardsIfNeeded = (data, site) => {
  if (site === 'douban' && data.awards && typeof data.awards === 'string') {
    data.awards = parseDoubanAwards(data.awards);
  }
  return data;
};

/**
 * 尝试从静态CDN获取资源数据，支持多源回退机制
 * 
 * 该函数按顺序尝试两个CDN地址获取JSON数据，对成功响应进行数据验证和处理。
 * 使用缓存配置优化重复请求性能，失败时自动切换备用源。
 * 
 * @param {string} site - 站点标识符（将进行URL编码）
 * @param {string} trimmedSid - 修剪后的资源ID（将进行URL编码）
 * @returns {Promise<Object|null>} 处理后的数据对象（成功时）或 null（所有源失败时）
 */
const tryStaticCdn = async (site, trimmedSid) => {
  const staticUrls = [
    `https://cdn.ourhelp.club/ptgen/${encodeURIComponent(site)}/${encodeURIComponent(trimmedSid)}.json`,
    `https://ourbits.github.io/PtGen/${encodeURIComponent(site)}/${encodeURIComponent(trimmedSid)}.json`
  ];

  for (const url of staticUrls) {
    try {
      const resp = await fetchWithTimeout(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
      if (resp.ok) {
        const data = await resp.json();
        if (data && Object.keys(data).length > 0) {
          return processAwardsIfNeeded(data, site);
        }
      }
    } catch (e) {
      console.error(`Static CDN fetch failed for ${site}/${trimmedSid} at ${url}:`, e);
    }
  }

  return null;
};

/**
 * 从OurBits获取静态媒体数据，优先尝试静态CDN，失败后回退到动态API
 * 
 * @param {string} source - 媒体来源站点标识（将被转换为小写）
 * @param {string} sid - 媒体唯一标识（将被去除首尾空格）
 * @returns {Promise<Object|null>} 返回媒体数据对象，若所有获取方式均失败则返回null
 * 
 * 流程说明：
 * 1. 优先尝试多级静态CDN获取数据（通过tryStaticCdn函数）
 * 2. 静态CDN失败时回退到动态API请求
 * 3. 动态API响应成功时处理奖项数据（通过processAwardsIfNeeded）
 * 4. 所有途径失败时返回null
 */
export const getStaticMediaDataFromOurBits = async (source, sid) => {
  const site = source.toLowerCase();
  const trimmedSid = sid.trim();

  // 1. 尝试多个静态 CDN（优先级顺序）
  const staticResult = await tryStaticCdn(site, trimmedSid);
  if (staticResult) {
    return staticResult;
  }

  // 2. Fallback 到动态 API
  const dynamicUrl = `https://api.ourhelp.club/infogen?site=${encodeURIComponent(site)}&sid=${encodeURIComponent(trimmedSid)}`;
  try {
    const resp = await fetchWithTimeout(dynamicUrl, {
      headers: { "User-Agent": `PT-Gen-Refactor/${VERSION}` },
      cf: { cacheTtl: 86400, cacheEverything: true }
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
 * 处理查询请求的主函数，根据不同的参数执行不同的处理逻辑
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - 环境变量对象，包含配置信息
 * @param {URL} uri - 解析后的URL对象
 * @returns {Promise<Response>} 返回JSON格式的响应数据
 */
const handleQueryRequest = async (request, env, uri) => {
  const params = await _extractParams(request, uri);
  
  try {
    if (params.url) {
      const responseData = await handleUrlRequest(params.url, env);
      return makeJsonResponse(responseData, env);
    }
    
    if (params.source && params.query) {
      return await handleSearchRequest(params.source, params.query, env);
    }
    
    if (params.query) {
      return await handleAutoSearch(params.query, env);
    }
    
    const source = params.tmdb_id ? 'tmdb' : params.source;
    let sid = params.tmdb_id || params.sid;
    
    if (source && sid) {
      // TMDB 特殊处理
      if (source.toLowerCase() === 'tmdb') {
        const isNumericSid = !sid.includes('/');
        
        if (isNumericSid) {
          if (!params.type) {
            return makeJsonResponse({ 
              error: "For TMDB requests with numeric IDs, the 'type' parameter is required. Please specify type as 'movie' or 'tv'." 
            }, env);
          }
          
          if (params.type !== 'movie' && params.type !== 'tv') {
            return makeJsonResponse({ 
              error: "Invalid type parameter for TMDB. Must be 'movie' or 'tv'." 
            }, env);
          }
          
          sid = `${params.type}/${sid}`;
        }
      }

      const provider = PROVIDER_CONFIG[source.toLowerCase()];
      if (!provider) {
        return makeJsonResponse({ error: `Unsupported source: ${source}` }, env);
      }

      const decodedSid = String(sid).replace(/_/g, '/');
      const fetchData = () => provider.generator(decodedSid, env);
      const subType = source.toLowerCase() === 'tmdb' 
        ? decodedSid.split('/')[0] || null 
        : null;
      
      const baseResourceId = sid.split('/').pop();
      const responseData = await _withCache(baseResourceId, fetchData, env, source.toLowerCase(), subType);

      if (responseData?.success) {
        responseData.format = provider.formatter(responseData, env);
      }
      
      return makeJsonResponse(responseData, env);
    }

    return makeJsonResponse({
      error: "Invalid parameters. Please provide 'url', 'query', or 'source' and 'sid'."
    }, env);
    
  } catch (e) {
    console.error("Global error in handleQueryRequest:", e);
    return makeJsonResponse({
      success: false,
      error: "Internal Server Error. Please contact the administrator."
    }, env, 500);
  }
};

/**
 * 处理OPTIONS请求的函数
 * 
 * 该函数用于处理HTTP OPTIONS请求，通常用于CORS预检请求
 * 返回一个状态码为204的空响应，并包含CORS相关的响应头
 * 
 * @returns {Response} 返回一个HTTP响应对象，状态码为204（No Content）
 */
const _handleOptionsRequest = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

/**
 * 创建一个表示API端点未找到的错误响应
 * @param {Object} env - 环境配置对象，用于响应处理
 * @returns {Object} 返回一个JSON格式的错误响应对象，状态码为404
 */
const _createNotFoundResponse = (env) => {
  const errorPayload = {
    success: false,
    error: "API endpoint not found. Please check the documentation for valid endpoints.",
  };

  return makeJsonResponse(errorPayload, env, 404);
};

/**
 * 检查请求URL是否包含恶意模式
 * @param {string} url - 要检查的URL
 * @returns {boolean} - 如果检测到恶意模式返回true，否则返回false
 */
const isMaliciousRequest = (url) => {
  if (!url || typeof url !== 'string') {
    return true;
  }

  try {
    const { pathname, search } = new URL(url, 'http://localhost');
    const DIRECTORY_TRAVERSAL_PATTERN = /(\.{2,}\/)/g;
    const SCRIPT_PROTOCOL_PATTERN = /(script|javascript|vbscript):/i;
    const EMBED_TAG_PATTERN = /(<\s*iframe|<\s*object|<\s*embed)/i;
    
    const patterns = [
      DIRECTORY_TRAVERSAL_PATTERN,
      SCRIPT_PROTOCOL_PATTERN,
      EMBED_TAG_PATTERN
    ];
    
    // 使用some确保短路求值，并分别测试pathname和search
    return patterns.some(p => p.test(pathname) || p.test(search));
  } catch (error) {
    return true;
  }
};

/**
 * 检测文本是否主要为中文
 * @param {string} text - 要检测的文本
 * @returns {boolean} - 如果文本中中文字符数量超过英文字符则返回true，否则返回false
 */
const isChineseText = (text) => {
  if (typeof text !== 'string' || !text.trim()) {
    return false;
  }

  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff]/g;
  const englishRegex = /[a-zA-Z]/g;
  const chineseCount = (text.match(chineseRegex) || []).length;
  const englishCount = (text.match(englishRegex) || []).length;

  if ((chineseCount + englishCount) < 2) {
    return chineseCount > 0;
  }

  return chineseCount > englishCount;
};

/**
 * 通用搜索函数错误处理
 * @param {string} source - 搜索源名称
 * @param {string} query - 搜索查询词
 * @param {Error} error - 捕获的错误对象
 * @returns {Object} - 格式化的错误响应对象
 */
const handleSearchError = (source, query, error) => {
  const errorResponse = {
    success: false,
    data: []
  };

  if (error.name === 'AbortError') {
    errorResponse.error = `${source} API请求超时 | ${source} API request timeout`;
  } else if (error.message) {
    errorResponse.error = error.message;
  } else {
    errorResponse.error = `Failed to search ${source} for: ${query}.`;

    if (error instanceof TypeError) {
      errorResponse.error += ' Network or API error.';
    } else if (error.code === 'ETIMEDOUT') {
      errorResponse.error += ' Request timed out.';
    } else {
      errorResponse.error += ' Please try again later.';
    }
  }

  console.error(`Search error (${source}):`, {
    query,
    error: error?.message || error,
    stack: error?.stack
  });

  return errorResponse;
};

/**
 * 格式化角色列表，生成包含角色名称和演员列表的字符串数组。
 * 
 * @param {Array} chars - 角色对象数组，默认为空数组。每个角色对象应包含以下属性：
 *   - name: 角色的英文名称（可选）。
 *   - name_cn: 角色的中文名称（可选）。
 *   - actors: 演员列表（可选），格式需与 [formatActorList] 函数兼容。
 * @returns {Array} - 返回一个字符串数组，每个字符串表示一个角色及其对应的演员列表。
 *   如果角色名称和演员列表均为空，则该角色会被过滤掉。
 */
export const formatCharacters = (chars = []) => {
  return chars
    .filter(c => c)  // 跳过 falsy 值
    .map(c => {
      const name = safe(c.name);
      const nameCn = safe(c.name_cn);
      const actors = formatActorList(c.actors);
      const title = nameCn ? `${name} (${nameCn})` : name || nameCn;
      return title ? `${title}: ${actors}` : null;
    })
    .filter(Boolean);  // 移除 null/空 title
};

/**
 * 解析豆瓣奖项字符串为数组格式
 * @param {string} awardsStr - 原始奖项字符串
 * @returns {Array} 解析后的奖项数组
 */
export const parseDoubanAwards = (awardsStr) => {
  if (!awardsStr || typeof awardsStr !== 'string') {
    return [];
  }

  // 按双换行符分割不同电影节
  const festivals = awardsStr.split('\n\n').filter(item => item.trim() !== '');
  
  const awardItems = [];
  
  for (const festival of festivals) {
    // 每个电影节的信息按单个换行符分割
    const lines = festival.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 0) {
      const festivalInfo = lines[0]; // 第一行是电影节名称和年份
      
      // 处理该电影节的每个奖项
      const festivalAwards = [];
      for (let i = 1; i < lines.length; i++) {
        const awardLine = lines[i];
        festivalAwards.push(awardLine);
      }
      
      // 将电影节信息和奖项列表组合
      awardItems.push({
        festival: festivalInfo,
        awards: festivalAwards
      });
    }
  }
  
  return awardItems;
};

/**
 * 处理传入的HTTP请求，根据请求方法和路径进行路由分发
 * @param {Request} request - HTTP请求对象，包含请求方法、URL、headers等信息
 * @param {Object} env - 环境变量对象，包含运行时环境配置和绑定资源
 * @returns {Promise<Response>} 返回处理后的HTTP响应对象
 */
export const handleRequest = async (request, env) => {
  if (request.method === 'OPTIONS') {
    return _handleOptionsRequest();
  }

  const validation = await validateRequest(request, CORS_HEADERS, env);
  if (!validation.valid) {
    return validation.response;
  }
  
  const url = new URL(request.url);
  const { pathname } = url;
  const { method } = request;
  const isApiPath = pathname === '/' || pathname === '/api';
  
  if (isApiPath) {
    if (method === 'POST') {
      return await handleQueryRequest(request, env, url);
    }

    if (method === 'GET') {
      const apiKey = url.searchParams.get("key");
      if (pathname === '/' && !apiKey) {
        return handleRootRequest(env, true);
      } else if (pathname === '/api' && !apiKey) {
        // /api路径无key参数：返回JSON错误
        return createErrorResponse("API key required. Access denied.", 401, CORS_HEADERS);
      } else {
        // 其他情况（有key或特定路径）：处理查询请求
        return await handleQueryRequest(request, env, url);
      }
    }
  }

  return _createNotFoundResponse(env);
};