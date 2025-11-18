import { 
  makeJsonResponse, 
  AUTHOR, VERSION, 
  generateDoubanFormat, 
  generateImdbFormat, 
  generateTmdbFormat, 
  generateMelonFormat, 
  generateBangumiFormat, 
  generateSteamFormat 
} from "./lib/common.js";
import { gen_douban } from "./lib/douban.js";
import { gen_imdb } from "./lib/imdb.js";
import { gen_bangumi } from "./lib/bangumi.js";
import { gen_tmdb } from "./lib/tmdb.js";
import { gen_melon } from "./lib/melon.js";
import { gen_steam } from "./lib/steam.js";
import * as cheerio from 'cheerio';

// 请求频率限制常量
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
    formatter: generateDoubanFormat,
  },
  {
    name: 'imdb',
    domains: ['www.imdb.com'],
    regex: /\/title\/(tt\d+)/,
    generator: gen_imdb,
    formatter: generateImdbFormat,
  },
  {
    name: 'tmdb',
    domains: ['api.themoviedb.org', 'www.themoviedb.org'],
    regex: /\/(movie|tv)\/(\d+)/,
    // 自定义ID格式化，以匹配旧逻辑
    idFormatter: (match) => `${match[1]}/${match[2]}`,
    generator: gen_tmdb,
    formatter: generateTmdbFormat,
  },
  {
    name: 'melon',
    domains: ['www.melon.com'],
    regex: /\/album\/detail\.htm\?albumId=(\d+)/,
    idFormatter: (match) => `album/${match[1]}`,
    generator: gen_melon,
    formatter: generateMelonFormat,
  },
  {
    name: 'bangumi',
    domains: ['bgm.tv', 'bangumi.tv'],
    regex: /\/subject\/(\d+)/,
    generator: gen_bangumi,
    formatter: generateBangumiFormat,
  },
  {
    name: 'steam',
    domains: ['store.steampowered.com'],
    regex: /\/app\/(\d+)/,
    generator: gen_steam,
    formatter: generateSteamFormat,
  },
];

const ROOT_PAGE_CONFIG = {
  HTML_TEMPLATE: `
<!DOCTYPE html>
<html>
<head>
    <title>PT-Gen - Generate PT Descriptions</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 12px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>PT-Gen API Service</h1>
        <p>这是一个媒体信息生成服务，支持从豆瓣、IMDb、TMDB、Bangumi等平台获取媒体信息。</p>
        <h2>更多信息</h2>
        <p>请访问<a href="https://github.com/rabbitwit/PT-Gen-Refactor" target="_blank" rel="noopener noreferrer">PT-Gen-Refactor</a>项目文档了解详细使用方法。</p>
        <p>__COPYRIGHT__</p>
    </div>
</body>
</html>`,

  API_DOC: {
    "API Status": "PT-Gen API Service is running",
    "Endpoints": {
      "/": "API documentation (this page)",
      "/?source=[douban|imdb|tmdb|bgm|melon]&query=[name]": "Search for media by name",
      "/?url=[media_url]": "Generate media description by URL"
    },
    "Notes": "Please use the appropriate source and query parameters for search, or provide a direct URL for generation."
  }
};

const PROVIDER_CONFIG = {
  douban: { generator: gen_douban, formatter: generateDoubanFormat },
  imdb:   { generator: gen_imdb,   formatter: generateImdbFormat   },
  tmdb:   { generator: gen_tmdb,   formatter: generateTmdbFormat   },
  bgm:    { generator: gen_bangumi,formatter: generateBangumiFormat},
  melon:  { generator: gen_melon,  formatter: generateMelonFormat  },
  steam:  { generator: gen_steam,  formatter: generateSteamFormat  },
};

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
 * 解析HTML文本为对象
 * @param {string} responseText - HTML文本内容
 * @returns {Object} 对象
 */
const page_parser = (responseText) => {
  return cheerio.load(responseText, {
    decodeEntities: false
  });
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
 * 处理搜索结果，标准化不同来源的数据格式
 * @param {Array} results - 搜索结果数组
 * @param {string} source - 数据来源 (douban/imdb/tmdb等)
 * @returns {Object} 标准化后的数据对象
 */
const processSearchResults = (results, source) => {
  if (!Array.isArray(results) || results.length === 0) return { data: [] };

  /**
   * 构建详情页链接
   * @param {Object} item - 单个搜索结果项
   * @param {string} src - 数据来源
   * @returns {string} 构建好的链接
   */
  const buildLink = (item, src) => {
    if (!item || typeof item !== 'object') return '';
    if (item.link) return String(item.link);
    if (item.url) return String(item.url);

    const id = pick(item, 'id', 'imdb_id', 'douban_id', 'tt');
    if (!id) return '';

    switch (src) {
      case 'douban':
        return `https://movie.douban.com/subject/${id}/`;
      case 'imdb':
        return `https://www.imdb.com/title/${id}/`;
      case 'tmdb': {
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        return `https://www.themoviedb.org/${mediaType}/${id}`;
      }
      default:
        return '';
    }
  };

  /**
   * 安全地从日期字符串中提取年份
   * @param {string} dateStr - 日期字符串 (YYYY-MM-DD格式)
   * @returns {string} 年份
   */
  const safeGetYearFromReleaseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    try {
      return dateStr.split('-')[0] || '';
    } catch (err) {
      return '';
    }
  };

  const out = results.slice(0, 10).map(raw => {
    const item = raw && typeof raw === 'object' ? raw : {};

    switch (source) {
      case 'douban':
        return {
          year: pick(item, 'year'),
          subtype: pick(item, 'type') || 'movie',
          title: pick(item, 'title'),
          subtitle: String(pick(item, 'sub_title') || ''),
          link: buildLink(item, 'douban'),
          id: pick(item, 'id'),
          img: pick(item, 'img'),
          episode: pick(item, 'episode')
        };

      case 'imdb':
        return {
          year: pick(item, 'y'),
          subtype: pick(item, 'qid'),
          title: pick(item, 'l'),
          subtitle: pick(item, 's'),
          link: item.id ? `https://www.imdb.com/title/${item.id}/` : buildLink(item, 'imdb'),
          id: pick(item, 'id')
        };

      case 'tmdb':
        return {
          year: safeGetYearFromReleaseDate(item.release_date),
          subtype: item.media_type === 'tv' ? 'tv' : 'movie',
          title: item.original_name 
            ? `${pick(item, 'name')} / ${pick(item, 'original_name')}`
            : item.original_title 
              ? pick(item, 'original_title') 
              : pick(item, 'name'),
          subtitle: truncate(pick(item, 'overview'), 100),
          link: buildLink(item, 'tmdb'),
          rating: item.vote_average != null ? String(item.vote_average) : '',
          id: pick(item, 'id')
        };

      default:
        return {
          year: pick(item, 'year') ||
                pick(item, 'y') ||
                safeGetYearFromReleaseDate(item.release_date) ||
                '',
          subtype: pick(item, 'subtype') ||
                   pick(item, 'type') ||
                   pick(item, 'q') ||
                   'movie',
          title: pick(item, 'title') || pick(item, 'l'),
          subtitle: pick(item, 'subtitle') ||
                    pick(item, 's') ||
                    pick(item, 'sub_title') ||
                    '',
          link: buildLink(item, source) || '',
          id: pick(item, 'id')
        };
    }
  });

  return { data: out };
};

/**
 * 通过IMDb的API进行搜索 (首选方法)注: 不知哪来的API，稳定性未知.
 * @param {string} query 搜索关键词
 * @returns {Promise<Array|null>} 如果成功则返回处理后的数据数组，否则返回 null
 */
const _searchViaApi = async (query) => {
  const searchUrl = `${IMDB_CONSTANTS.SUGGESTION_API_URL}${encodeURIComponent(query)}.json`;
  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      console.log(`API search failed with status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log("IMDB suggestion API data:", data);

    const results = data?.d ?? [];

    if (results.length > 0) {
      const processed = processSearchResults(results, 'imdb');
      return processed.data;
    }

    return null;
  } catch (error) {
    console.error("IMDb API request failed:", error);
    return null;
  }
};

/**
 * 通过抓取IMDb搜索结果页面进行搜索 (备用方法)
 * @param {string} query 搜索关键词
 * @returns {Promise<Array>} 返回处理后的数据数组
 */
const _searchViaScraping = async (query) => {
  const searchUrl = `${IMDB_CONSTANTS.FIND_URL}?q=${encodeURIComponent(query)}&s=tt`;
  console.log("Trying IMDb fallback scraping URL:", searchUrl);

  const response = await fetch(searchUrl, { headers: IMDB_CONSTANTS.SEARCH_HEADERS });
  if (!response.ok) {
    throw new Error(`IMDb scrape failed with status ${response.status}`);
  }

  const html = await response.text();
  const $ = page_parser(html);
  const results = [];

  $('.findResult').each((i, el) => {
    if (i >= IMDB_CONSTANTS.MAX_RESULTS) return false;

    const $el = $(el);
    const $resultText = $el.find('.result_text');
    const $link = $resultText.find('a');

    const linkHref = $link.attr('href');
    if (!linkHref || !linkHref.includes('/title/tt')) return;

    const idMatch = linkHref.match(/\/title\/(tt\d+)/);
    if (!idMatch) return;

    const title = $link.text().trim();
    const fullText = $resultText.text();
    const yearMatch = fullText.match(/\((\d{4})\)/);
    
    results.push({
      year: yearMatch ? yearMatch[1] : '',
      subtype: 'feature',
      title: title,
      subtitle: fullText.replace(title, '').trim(),
      link: `${IMDB_CONSTANTS.BASE_URL}${linkHref}`
    });
  });

  const processed = processSearchResults(results, 'imdb');
  return processed.data;
};

/**
 * IMDB主搜索函数
 * @param {string} query 搜索关键词
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
 */
const search_imdb = async (query) => {
  try {
    // 1. 尝试使用API搜索
    let searchData = await _searchViaApi(query);

    // 2. 如果API没有结果，则回退到HTML抓取
    if (!searchData || searchData.length === 0) {
      console.log("API search yielded no results, falling back to scraping.");
      searchData = await _searchViaScraping(query);
    }
    
    // 3. 检查最终结果
    if (searchData && searchData.length > 0) {
      return { success: true, data: searchData };
    } else {
      return { success: false, error: "未找到查询的结果 | No results found for the given query", data: [] };
    }

  } catch (error) {
    return handleSearchError('IMDb', query, error);
  }
};

/**
 * 搜索TMDB数据库获取电影和电视剧信息
 * @param {string} query - 搜索关键词
 * @param {Object} env - 环境变量，包含TMDB_API_KEY
 * @returns {Promise<Object>} 搜索结果对象
 */
const search_tmdb = async (query, env) => {
  try {
    const apiKey = env?.TMDB_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'TMDB API密钥未配置 | TMDB API key not configured', data: [] };
    }

    const q = String(query || '').trim();
    if (!q) return { success: false, error: 'Invalid query', data: [] };

    const buildRequestOptions = (signal) => ({
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal
    });

    const movieSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(q)}`;
    const tvSearchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(q)}`;
    const TIMEOUT = 8000;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), TIMEOUT) : null;

    let movieResponse, tvResponse;
    try {
      [movieResponse, tvResponse] = await Promise.all([
        fetch(movieSearchUrl, buildRequestOptions(controller?.signal)),
        fetch(tvSearchUrl, buildRequestOptions(controller?.signal))
      ]);
    } catch (fetchError) {
      if (fetchError?.name === 'AbortError') {
        return { success: false, error: 'TMDB API请求超时 | TMDB API request timeout', data: [] };
      }
      return { success: false, error: `TMDB API网络错误: ${fetchError?.message || 'Unknown error'}`, data: [] };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const results = [];

    const parseAndPushResults = async (response, type) => {
      if (!response || !response.ok) {
        console.warn(`TMDB ${type} response status:`, response?.status);
        return;
      }

      try {
        const data = await response.json();
        if (Array.isArray(data.results)) {
          results.push(...data.results.map(item => ({ ...item, media_type: type })));
        }
      } catch (e) {
        console.warn(`TMDB ${type} parse failed:`, e && e.message ? e.message : e);
      }
    };

    await Promise.all([
      parseAndPushResults(movieResponse, 'movie'),
      parseAndPushResults(tvResponse, 'tv')
    ]);

    // 按受欢迎程度排序并限制数量
    results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    const limited = results.slice(0, 10);

    if (limited.length > 0) {
      const processed = processSearchResults(limited, 'tmdb');
      return { success: true, data: processed.data };
    }

    return { success: false, error: "未找到查询的结果 | No results found for the given query", data: [] };
  } catch (error) {
    console.error("TMDB search error:", error);

    const errorResponse = {
      success: false,
      data: []
    };

    if (error?.message) {
      errorResponse.error = error.message;
    } else {
      errorResponse.error = "TMDB搜索失败 | TMDB search failed";
    }

    if (error?.stack) {
      errorResponse.stack = error.stack;
    }

    return handleSearchError('TMDb', query, errorResponse);
  }
};

/**
 * 处理IMDb搜索请求的箭头函数
 * @param {string} query - 搜索关键词
 * @param {Object} env - 环境变量对象
 * @returns {Promise<Object>} 格式化的JSON响应对象
 */
const handleImdbSearch = async (query, env) => {
  const result = await search_imdb(query);

  if (!result.success || !result.data || result.data.length === 0) {
    return makeJsonResponse({
      success: false,
      error: result.error || result.message || "IMDb搜索未找到相关结果",
      data: []
    }, env);
  }

  return makeJsonResponse({
    success: true,
    data: result.data,
    site: "search-imdb"
  }, env);
};

/**
 * 处理TMDB搜索请求的箭头函数
 * @param {string} query - 搜索关键词
 * @param {Object} env - 环境变量对象，包含TMDB_API_KEY等配置
 * @returns {Promise<Object>} 格式化的JSON响应对象
 */
const handleTmdbSearch = async (query, env) => {
  const result = await search_tmdb(query, env);

  if (!result.success) {
    return makeJsonResponse({
      success: false,
      error: result.error || result.message || "TMDB搜索失败",
      data: []
    }, env);
  }

  if (!result.data || result.data.length === 0) {
    return makeJsonResponse({
      success: false,
      error: "TMDB搜索未找到相关结果",
      data: []
    }, env);
  }

  return makeJsonResponse({
    success: true,
    data: result.data,
    site: "search-tmdb"
  }, env);
};

/**
 * 处理搜索请求的箭头函数
 * 根据指定的数据源执行相应的搜索操作
 * @param {string} source - 搜索数据源 (imdb/tmdb)
 * @param {string} query - 搜索关键词
 * @param {Object} env - 环境变量对象
 * @returns {Promise<Object>} 格式化的JSON响应对象
 */
const handleSearchRequest = async (source, query, env) => {
  console.log(`Processing search request: source=${source}, query=${query}`);

  // 防御性检查 source 是否合法
  if (typeof source !== 'string') {
    return makeJsonResponse({
      success: false,
      error: "Invalid source type. Expected string."
    }, env);
  }

  try {
    const normalizedSource = source.toLowerCase();

    switch (normalizedSource) {
      case "imdb":
        return await handleImdbSearch(query, env);

      case "tmdb":
        return await handleTmdbSearch(query, env);

      default:
        return makeJsonResponse({
          success: false,
          error: "Invalid source. Supported sources: imdb, tmdb"
        }, env);
    }
  } catch (search_error) {
    return handleSearchError(source, query, search_error);
  }
};

/**
 * 处理自动搜索请求的箭头函数
 * 根据查询文本的语言自动选择搜索源（中文使用TMDB，非中文使用IMDb）
 * @param {string} query - 搜索关键词
 * @param {Object} env - 环境变量对象
 * @returns {Promise<Object>} 格式化的JSON响应对象
 */
const handleAutoSearch = async (query, env) => {
  console.log(`Processing auto search request: query=${query}`);

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return makeJsonResponse({
      success: false,
      error: "Query parameter is missing or invalid.",
      data: []
    }, env);
  }

  try {
    const isChinese = isChineseText(query);
    const searchProvider = {
      searchFunction: isChinese ? () => search_tmdb(query, env) : () => search_imdb(query),
      site: isChinese ? "search-tmdb" : "search-imdb",
      name: isChinese ? "TMDB" : "IMDb",
    };

    console.log(`Using ${searchProvider.name} for query: ${query}`);
    
    const searchResult = await searchProvider.searchFunction();
    console.log(`${searchProvider.name} search completed for query: ${query}`);

    if (!searchResult.success) {
      const errorMessage = searchResult.error || searchResult.message || 
                          `${searchProvider.name} search failed due to an unknown reason.`;
      return makeJsonResponse({ 
        success: false, 
        error: errorMessage, 
        data: [] 
      }, env);
    }

    if (searchResult.data.length === 0) {
      return makeJsonResponse({
        success: false,
        error: `${searchProvider.name} 未找到相关结果 | No results found`,
        data: []
      }, env);
    }

    return makeJsonResponse({
      success: true,
      data: searchResult.data,
      site: searchProvider.site
    }, env);

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
 * 统一处理URL请求的核心函数
 * @param {string} url_ 输入的URL
 * @param {object} env 环境变量，包含R2_BUCKET等
 * @returns {Promise<object>} 返回处理结果
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
  const resourceId = `${provider.name}_${sid.replace(/\//g, '_')}`;
  console.log(`Resource ID: ${resourceId}`);

  // 使用通用缓存函数处理缓存逻辑
  const fetchData = () => provider.generator(sid, env);
  const result = await _withCache(resourceId, fetchData, env);

  // 动态添加 format 字段
  if (result?.success) {
    result.format = provider.formatter(result);
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
  return new Response(JSON.stringify({ error: message }), {
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
      if (url.pathname === "/" && request.method === "GET") {
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
  
  // 优化点 3: 主函数逻辑变得极为清晰，只负责协调和决策
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
  if (request.method === 'POST') {
    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const bodyText = await request.text();
        if (bodyText.trim()) {
          const body = JSON.parse(bodyText);
          return {
            source: body.source || uri.searchParams.get("source"),
            query: body.query || uri.searchParams.get("query"),
            url: body.url || uri.searchParams.get("url"),
            tmdb_id: body.tmdb_id || uri.searchParams.get("tmdb_id"),
            sid: body.sid || uri.searchParams.get("sid"),
          };
        }
      }
    } catch (e) {
      console.warn("Failed to parse POST body as JSON:", e);
    }
  }
  
  return {
    source: uri.searchParams.get("source"),
    query: uri.searchParams.get("query"),
    url: uri.searchParams.get("url"),
    tmdb_id: uri.searchParams.get("tmdb_id"),
    sid: uri.searchParams.get("sid"),
  };
};

/**
 * 带有缓存功能的执行器。
 * @param {string} resourceId - R2中的缓存键。
 * @param {Function} fetchFunction - 当缓存未命中时执行的异步函数，它应返回要缓存的数据。
 * @param {object} env - 包含 R2_BUCKET 的环境变量。
 * @returns {Promise<object>} 返回缓存或新抓取的数据。
 */
async function _withCache(resourceId, fetchFunction, env) {
  if (env.R2_BUCKET) {
    try {
      const cachedData = await env.R2_BUCKET.get(resourceId);
      if (cachedData) {
        console.log(`[Cache Hit] Returning cached data for resource: ${resourceId}`);
        return await cachedData.json();
      }
    } catch (e) {
      console.error(`Error reading from R2 for ${resourceId}:`, e);
    }
  }

  // 缓存未命中或R2不可用/读取失败
  console.log(`[Cache Miss] Fetching data for resource: ${resourceId}`);
  const freshData = await fetchFunction();

  if (freshData?.success && env.R2_BUCKET) {
    try {
      const lightweightResult = { ...freshData };
      delete lightweightResult.format;
      await env.R2_BUCKET.put(resourceId, JSON.stringify(lightweightResult));
      console.log(`[Cache Write] Cached result for resource: ${resourceId}`);
    } catch (e) {
      console.error(`Error writing to R2 for ${resourceId}:`, e);
    }
  }
  
  return freshData;
}

/**
 * 处理查询请求的主函数，根据不同的参数执行不同的处理逻辑
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - 环境变量对象，包含配置信息
 * @param {URL} uri - 解析后的URL对象
 * @returns {Promise<Response>} 返回JSON格式的响应数据
 */
async function handleQueryRequest(request, env, uri) {
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
    const sid = params.tmdb_id || params.sid;

    if (source && sid) {
      const provider = PROVIDER_CONFIG[source.toLowerCase()];
      if (!provider) {
        return makeJsonResponse({ error: `Unsupported source: ${source}` }, env);
      }

      const decodedSid = String(sid).replace(/_/g, '/');
      const resourceId = `${source}_${String(sid).replace(/\//g, '_')}`;
      const fetchData = () => provider.generator(decodedSid, env);
      let responseData = await _withCache(resourceId, fetchData, env);
      
      if (responseData?.success) {
        responseData.format = provider.formatter(responseData);
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
      error: `Internal Server Error. Please contact the administrator.`
    }, env, 500);
  }
}

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
 * 处理传入的HTTP请求，根据请求方法和路径进行路由分发
 * @param {Request} request - HTTP请求对象，包含请求方法、URL、headers等信息
 * @param {Object} env - 环境变量对象，包含运行时环境配置和绑定资源
 * @returns {Promise<Response>} 返回处理后的HTTP响应对象
 */
const handleRequest = async (request, env) => {
  if (request.method === 'OPTIONS') {
    return _handleOptionsRequest();
  }

  const validation = await validateRequest(request, CORS_HEADERS, env);
  if (!validation.valid) {
    return validation.response;
  }

  const uri = new URL(request.url);
  const { pathname } = uri;
  const { method } = request;

  if ((pathname === "/" || pathname === "/api") && method === "POST") {
    return await handleQueryRequest(request, env, uri);
  }

  if ((pathname === "/" || pathname === "/api") && method === "GET") {
    return handleRootRequest(env, true); 
  }

  return _createNotFoundResponse(env);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};