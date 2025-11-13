import { makeJsonResponse, AUTHOR, VERSION } from "./lib/common.js";
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
let lastCleanup = Date.now();

// 简单的请求频率限制存储（在实际生产环境中应使用更可靠的存储）
const requestCounts = new Map();

/**
 * 验证API密钥
 * @param {string} apiKey - 提供的API密钥
 * @param {object} env - 环境变量
 * @returns {boolean} - 是否验证通过
 */
function validateApiKey(apiKey, env) {
  // 如果没有配置API_KEY环境变量，则不需要验证
  if (!env?.API_KEY || env.API_KEY === "your-secret-api-key-here") {
    return true;
  }
  
  // 验证提供的API密钥是否与环境变量中的匹配
  return apiKey === env.API_KEY;
}

/**
 * 检查请求频率是否超过限制 - 使用滑动窗口计数器算法
 * 改进点：
 * 1. 使用更精确的算法计算窗口请求数量
 * 2. 优化性能和内存使用
 */
async function isRateLimited(clientIP) {
  const now = Date.now();
  const windowStart = now - TIME_WINDOW;
  
  // 清理过期记录
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
  
  // 获取客户端IP的请求记录
  if (requestCounts.has(clientIP)) {
    const requests = requestCounts.get(clientIP);
    
    // 过滤有效请求记录
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= MAX_REQUESTS) {
      return true; // 超过频率限制
    }
    
    // 添加当前请求时间戳
    validRequests.push(now);
    requestCounts.set(clientIP, validRequests);
  } else {
    // 新的客户端IP，创建初始记录
    requestCounts.set(clientIP, [now]);
  }
  
  return false;
}

// 检查是否为恶意请求
function isMaliciousRequest(url) {
  try {
    const { pathname, search } = new URL(url, 'http://localhost');
    const patterns = [
      /(\.{2,}\/)/,                       // 目录遍历
      /(script|javascript|vbscript):/i,   // 脚本协议
      /(<\s*iframe|<\s*object|<\s*embed)/i // 嵌入标签
    ];
    return patterns.some(p => p.test(pathname) || p.test(search));
  } catch {
    return true; // URL解析失败视为恶意
  }
}

// 检测文本是否主要为中文
function isChineseText(text) {
  // 类型检查和空值处理
  if (typeof text !== 'string' || !text.trim()) {
    return false;
  }

  // 优化正则表达式以包含更多中文字符范围
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff]/g;
  const englishRegex = /[a-zA-Z]/g;

  // 计数
  const chineseCount = (text.match(chineseRegex) || []).length;
  const englishCount = (text.match(englishRegex) || []).length;

  // 如果文本太短，需要更严格的判断
  if ((chineseCount + englishCount) < 2) {
    return chineseCount > 0;
  }

  // 返回中文字符数量是否超过英文字符
  return chineseCount > englishCount;
}

// 通用搜索函数错误处理
function handleSearchError(source, query, error) {
  // 构建基础错误响应
  const errorResponse = {
    success: false,
    data: []
  };

  // 特殊处理 AbortError（超时）
  if (error.name === 'AbortError') {
    errorResponse.error = `${source} API请求超时 | ${source} API request timeout`;
  } 
  // 保留原始错误信息
  else if (error.message) {
    errorResponse.error = error.message;
  } 
  else {
    errorResponse.error = `Failed to search ${source} for: ${query}.`;
    
    // 根据错误类型添加具体提示
    if (error instanceof TypeError) {
      errorResponse.error += ' Network or API error.';
    } else if (error.code === 'ETIMEDOUT') {
      errorResponse.error += ' Request timed out.';
    } else {
      errorResponse.error += ' Please try again later.';
    }
  }

  // 记录错误日志
  console.error(`Search error (${source}):`, {
    query,
    error: error?.message || error,
    stack: error?.stack
  });

  return errorResponse;
}

// 统一搜索结果处理函数
function processSearchResults(results, source) {
  if (!Array.isArray(results) || results.length === 0) return { data: [] };

  // 安全取值：按候选键顺序返回第一个有效值
  const pick = (item, ...keys) => {
    if (!item) return '';
    for (const k of keys) {
      const v = item[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  };

  const truncate = (s, n = 100) => {
    if (!s) return '';
    s = String(s).trim();
    return s.length > n ? s.slice(0, n).trim() + '...' : s;
  };

  const buildLink = (item, src) => {
    if (!item) return '';
    if (item.link) return String(item.link);
    if (item.url) return String(item.url);
    const id = pick(item, 'id', 'imdb_id', 'douban_id', 'tt');
    if (!id) return '';
    if (src === 'douban') return `https://movie.douban.com/subject/${id}/`;
    if (src === 'imdb') return `https://www.imdb.com/title/${id}/`;
    if (src === 'tmdb') {
      const media = item.media_type === 'tv' ? 'tv' : 'movie';
      return `https://www.themoviedb.org/${media}/${id}`;
    }
    return '';
  };

  const out = results.slice(0, 10).map(raw => {
    const item = raw || {};

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
          year: item.release_date ? String(item.release_date).split('-')[0] : '',
          subtype: item.media_type === 'tv' ? 'tv' : 'movie',
          title: item.original_name ? pick(item, 'name') + ' / ' + pick(item, 'original_name') : item.original_title ? pick(item, 'original_title') : pick(item, 'name'),
          subtitle: truncate(pick(item, 'overview') || '', 100),
          link: buildLink(item, 'tmdb'),
          rating: item.vote_average != null ? String(item.vote_average) : '',
          id: pick(item, 'id')
        };

      default:
        return {
          year: pick(item, 'year') || pick(item, 'y') || (item.release_date ? String(item.release_date).split('-')[0] : '') || '',
          subtype: pick(item, 'subtype') || pick(item, 'type') || pick(item, 'q') || 'movie',
          title: pick(item, 'title') || pick(item, 'l'),
          subtitle: pick(item, 'subtitle') || pick(item, 's') || pick(item, 'sub_title') || '',
          link: buildLink(item, source) || '',
          id: pick(item, 'id')
        };
    }
  });

  return { data: out };
}

async function search_imdb(query) {
  try {
    const searchUrl = `https://v2.sg.media-imdb.com/suggestion/h/${encodeURIComponent(query)}.json`;
    const response = await fetch(searchUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log("IMDB search data:", data);
      if (data.d && data.d.length > 0) {
        const processed = processSearchResults(data.d, 'imdb');
        return { success: true, data: processed.data };
      }
    }
    
    // 如果建议API失败，使用备用搜索方法
    const searchUrl2 = `https://www.imdb.com/find?q=${encodeURIComponent(query)}&s=tt`;
    console.log("Trying IMDb search URL:", searchUrl2);
    
    const response2 = await fetch(searchUrl2, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      }
    });
    
    if (!response2.ok) {
      return { success: false, error: `IMDb search failed with status ${response2.status}`, data: [] };
    }
    
    const html = await response2.text();
    console.log("IMDb search page response length:", html.length);
    
    // 使用cheerio解析HTML
    const $ = page_parser(html);
    
    // 提取搜索结果
    const results = [];
    $('.findResult').each((i, el) => {
      if (i >= 10) return; // 最多返回10个结果
      
      const $el = $(el);
      const link = $el.find('.result_text a').attr('href');
      const title = $el.find('.result_text a').text().trim();
      const year = $el.find('.result_text').text().match(/\((\d{4})\)/);
      const subtitle = $el.find('.result_text').text().replace(title, '').trim();
      
      if (link && link.includes('/title/tt')) {
        const idMatch = link.match(/\/title\/(tt\d+)/);
        if (idMatch) {
          results.push({
            year: year ? year[1] : '',
            subtype: 'feature',
            title: title,
            subtitle: subtitle,
            link: `https://www.imdb.com${link}`
          });
        }
      }
    });
    
    const processed = processSearchResults(results, 'imdb');
    
    if (processed.data.length === 0) {
      return { success: false, error: "未找到查询的结果 | No results found for the given query", data: [] };
    }
    
    return { success: true, data: processed.data };
  } catch (error) {
    return handleSearchError('IMDb', query, error);
  }
}

async function search_tmdb(query, env) {
  try {
    const apiKey = env?.TMDB_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'TMDB API密钥未配置 | TMDB API key not configured', data: [] };
    }

    const q = String(query || '').trim();
    if (!q) return { success: false, error: 'Invalid query', data: [] };

    // 并行请求 movie 和 tv，带超时保护
    const movieSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(q)}`;
    const tvSearchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(q)}`;

    const TIMEOUT = 8000;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), TIMEOUT) : null;

    let movieResponse, tvResponse;
    try {
      [movieResponse, tvResponse] = await Promise.all([
        fetch(movieSearchUrl, { 
          signal: controller?.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }),
        fetch(tvSearchUrl, { 
          signal: controller?.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })
      ]);
    } catch (fetchError) {
      // 处理超时和其他网络错误
      if (fetchError?.name === 'AbortError') {
        return { success: false, error: 'TMDB API请求超时 | TMDB API request timeout', data: [] };
      }
      return { success: false, error: `TMDB API网络错误: ${fetchError?.message || 'Unknown error'}`, data: [] };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const results = [];

    if (movieResponse && movieResponse.ok) {
      try {
        const movieData = await movieResponse.json();
        if (Array.isArray(movieData.results)) {
          results.push(...movieData.results.map(item => ({ ...item, media_type: 'movie' })));
        }
      } catch (e) {
        console.warn('TMDB movie parse failed:', e && e.message ? e.message : e);
      }
    }

    if (tvResponse && tvResponse.ok) {
      try {
        const tvData = await tvResponse.json();
        if (Array.isArray(tvData.results)) {
          results.push(...tvData.results.map(item => ({ ...item, media_type: 'tv' })));
        }
      } catch (e) {
        console.warn('TMDB tv parse failed:', e && e.message ? e.message : e);
      }
    }

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
    // 如果错误对象包含响应数据，将其包含在返回结果中
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
    
    // 使用统一的错误处理函数
    return handleSearchError('TMDb', query, errorResponse);
  }
}

function page_parser(responseText) {
  return cheerio.load(responseText, {
    decodeEntities: false
  });
}

// 处理搜索请求
async function handleSearchRequest(source, query, env) {
  console.log(`Processing search request: source=${source}, query=${query}`);
  
  try {
    switch (source.toLowerCase()) {
      case "imdb":
        const imdbResult = await search_imdb(query);
        // 检查搜索结果是否成功
        if (!imdbResult.success || (imdbResult.data && imdbResult.data.length === 0)) {
          return makeJsonResponse({
            success: false,
            error: imdbResult.error || imdbResult.message || "IMDb搜索未找到相关结果",
            data: []
          }, env);
        }
        return makeJsonResponse({
          success: true,
          data: imdbResult.data,
          site: "search-imdb"
        }, env);
        
      case "tmdb":
        const tmdbResult = await search_tmdb(query, env);
        // 检查搜索结果是否成功
        if (!tmdbResult.success) {
          return makeJsonResponse({
            success: false,
            error: tmdbResult.error || tmdbResult.message || "TMDB搜索失败",
            data: []
          }, env);
        }
        if (!tmdbResult.data || tmdbResult.data.length === 0) {
          return makeJsonResponse({
            success: false,
            error: "TMDB搜索未找到相关结果",
            data: []
          }, env);
        }
        return makeJsonResponse({
          success: true,
          data: tmdbResult.data,
          site: "search-tmdb"
        }, env);
        
      default:
        return makeJsonResponse({
          success: false,
          error: "Invalid source. Supported sources: douban, imdb, tmdb"
        }, env);
    }
  } catch (search_error) {
    return handleSearchError(source, query, search_error);
  }
}

// 处理自动搜索（根据文本语言判断来源）
async function handleAutoSearch(query, env) {
  console.log(`Processing auto search request: query=${query}`);
  
  try {
    if (isChineseText(query)) {
      // 中文关键词使用豆瓣搜索
      searchResult = await search_tmdb(query, env);
      console.log(`TMDB search result: ${JSON.stringify(searchResult)}`);
      if (!searchResult.success) {
        return makeJsonResponse({
          success: false,
          error: searchResult.error,
          data: []
        }, env);
      }
      if (searchResult.data.length === 0) {
        return makeJsonResponse({
          success: false,
          error: "TMDB搜索未找到相关结果",
          data: []
        }, env);
      }
      
      return makeJsonResponse({
        success: true,
        data: searchResult.data,
        site: "search-tmdb"
      }, env);
    } else {
      // 英文关键词使用IMDb搜索
      const searchResult = await search_imdb(query);
      console.log(`IMDb search result: ${JSON.stringify(searchResult)}`);
      if (!searchResult.success || searchResult.data.length === 0) {
        return makeJsonResponse({
          success: false,
          error: searchResult.message || searchResult.error || "IMDb未找到相关结果",
          data: []
        }, env);
      }
      return makeJsonResponse({
        success: true,
        data: searchResult.data,
        site: "search-imdb"
      }, env);
    }
  } catch (err) {
    console.error("Error in auto search:", err);
    return makeJsonResponse({
      success: false,
      error: "Search failed. Please try again later.",
      data: []
    }, env);
  }
}

// 处理URL请求
async function handleUrlRequest(url_, env) {
  console.log(`Processing URL request: url=${url_}`);
  
  // 提取统一的资源标识符
  let resourceId = null;
  
  // 判断URL类型并提取资源ID
  if (url_.includes("://movie.douban.com/")) {
    // 豆瓣电影
    const sid = url_.match(/\/subject\/(\d+)/)?.[1];
    if (sid) {
      resourceId = `douban_${sid}`;
    }
  } else if (url_.includes("://www.imdb.com/")) {
    // IMDb
    const sid = url_.match(/\/title\/(tt\d+)/)?.[1];
    if (sid) {
      resourceId = `imdb_${sid}`;
    }
  } else if (url_.includes("://api.themoviedb.org/") || url_.includes("://www.themoviedb.org/")) {
    // TMDB
    const sid_match = url_.match(/\/(movie|tv)\/(\d+)/);
    if (sid_match) {
      const sid = `${sid_match[1]}/${sid_match[2]}`;
      resourceId = `tmdb_${sid.replace(/\//g, '__')}`;
    }
  } else if (url_.includes("://www.melon.com/")) {
    // Melon
    const sid_match = url_.match(/\/album\/detail\.htm\?albumId=(\d+)/);
    if (sid_match) {
      const sid = `album/${sid_match[1]}`;
      resourceId = `melon_${sid.replace(/\//g, '__')}`;
    }
  } else if (url_.includes("://bgm.tv/") || url_.includes("://bangumi.tv/")) {
    // Bangumi
    const sid = url_.match(/\/subject\/(\d+)/)?.[1];
    if (sid) {
      resourceId = `bgm_${sid}`;
    }
  } else if (url_.includes("://store.steampowered.com/")) {
    // Steam
    const sid = url_.match(/\/app\/(\d+)/)?.[1];
    if (sid) {
      resourceId = `steam_${sid}`;
    }
  }
    
  // 检查R2中是否已有缓存数据
  if (resourceId && env.R2_BUCKET) {
    try {
      const cachedData = await env.R2_BUCKET.get(resourceId);
      
      if (cachedData) {
        // 如果R2中有缓存数据，直接返回
        const cachedText = await cachedData.text();
        console.log(`Returning cached data for resource: ${resourceId}`);
        return JSON.parse(cachedText);
      }
    } catch (e) {
      console.error('Error reading from R2:', e);
      // 如果R2读取失败，继续执行正常流程
    }
  }
  
  let result;
  
  // 判断URL类型并调用相应函数
  if (url_.includes("://movie.douban.com/")) {
    // 豆瓣电影
    const sid = url_.match(/\/subject\/(\d+)/)?.[1];
    if (sid) {
      result = await gen_douban(sid, env);
    } else {
      result = {
        success: false,
        error: "Invalid Douban movie URL"
      };
    }
  } else if (url_.includes("://www.imdb.com/")) {
    // IMDb
    const sid = url_.match(/\/title\/(tt\d+)/)?.[1];
    if (sid) {
      result = await gen_imdb(sid, env);
    } else {
      result = {
        success: false,
        error: "Invalid IMDb title URL"
      };
    }
  } else if (url_.includes("://api.themoviedb.org/") || url_.includes("://www.themoviedb.org/")) {
    // TMDB
    const sid_match = url_.match(/\/(movie|tv)\/(\d+)/);
    if (sid_match) {
      const sid = `${sid_match[1]}/${sid_match[2]}`;
      result = await gen_tmdb(sid, env);
    } else {
      result = {
        success: false,
        error: "Invalid TMDB URL"
      };
    }
  } else if (url_.includes("://www.melon.com/")) {
    // Melon
    const sid_match = url_.match(/\/album\/detail\.htm\?albumId=(\d+)/);
    if (sid_match) {
      // 根据melon.js的实现，需要将sid格式化为"album/{id}"的形式
      const sid = `album/${sid_match[1]}`;
      result = await gen_melon(sid, env);
    } else {
      result = {
        success: false,
        error: "Invalid Melon album URL"
      };
    }
  } else if (url_.includes("://bgm.tv/") || url_.includes("://bangumi.tv/")) {
    // Bangumi
    const sid = url_.match(/\/subject\/(\d+)/)?.[1];
    if (sid) {
      result = await gen_bangumi(sid, env);
    } else {
      result = {
        success: false,
        error: "Invalid Bangumi subject URL"
      };
    }
  } else if (url_.includes("://store.steampowered.com/")) {
    // Steam
    const sid = url_.match(/\/app\/(\d+)/)?.[1];
    if (sid) {
      result = await gen_steam(sid, env);
    } else {
      result = {
        success: false,
        error: "Invalid Steam store URL"
      };
    }
  } else {
    result = {
      success: false,
      error: "Unsupported URL"
    };
  }
  
  // 如果获取到结果且R2可用，将结果存储到R2
  if (result && resourceId && env.R2_BUCKET) {
    try {
      await env.R2_BUCKET.put(resourceId, JSON.stringify(result));
      console.log(`Cached result for resource: ${resourceId}`);
    } catch (e) {
      console.error('Error writing to R2:', e);
    }
  }
  
  return result;
}

// 定义CORS常量
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "false"
};

// 验证请求
async function validateRequest(request, corsHeaders, env) {
  // 获取客户端IP地址
  const clientIP = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  // 检查是否提供了API密钥
  const apiKey = new URL(request.url).searchParams.get("key");
  
  // 检查是否为内部前端调用（通过特殊请求头标识）
  const internalHeader = request.headers.get('X-Internal-Request');
  const isInternalRequest = internalHeader === 'true';
  
  // 如果配置了API_KEY且不是默认值，则需要验证
  if (env?.API_KEY && env.API_KEY !== "your-secret-api-key-here") {
    // 如果是内部请求，直接通过验证
    if (isInternalRequest) {
      // 内部前端调用，通过验证
    } else {
      // 外部调用（包括直接浏览器访问），需要API密钥
      if (!apiKey) {
        //检查是否浏览器直接访问根路径
        const uri = new URL(request.url);
        if (uri.pathname === "/" && request.method === "GET") {
          // 允许浏览器访问根路径，返回API文档
          return { valid: false, response: await handleRootRequest(env, true) };
        } else {
          return {
            valid: false,
            response: new Response(
              JSON.stringify({ error: "API key required. Access denied." }),
              {
                status: 401,
                headers: {
                  "Content-Type": "application/json",
                  ...corsHeaders
                }
              }
            )
          };
        }
      }
      
      // 验证API密钥是否正确
      if (apiKey !== env.API_KEY) {
        return {
          valid: false,
          response: new Response(
            JSON.stringify({ error: "Invalid API key. Access denied." }),
            {
              status: 401,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders
              }
            }
          )
        }
      }
    }
  }
  
  // 检查是否为恶意请求
  if (isMaliciousRequest(request.url)) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: "Malicious request detected. Access denied." }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      )
    };
  }
  
  // 检查请求频率限制
  if (await isRateLimited(clientIP, env)) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      )
    };
  }
  
  return { valid: true, clientIP };
}

// 处理根路径请求
async function handleRootRequest(env, isBrowser) {
  const author = env?.AUTHOR || AUTHOR;
  const copyright = `Powered by @${author}`;
  
  if (isBrowser) {
    // 浏览器访问，返回简单的HTML页面，提示API信息
    const html = `
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
        <p>${copyright}</p>
    </div>
</body>
</html>`;
    
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...CORS_HEADERS
      }
    });
  } else {
    // API访问，返回API文档
    return makeJsonResponse({
      "API Status": "PT-Gen API Service is running",
      "Version": VERSION,
      "Author": author,
      "Copyright": `Powered by @${author}`,
      "Security": env?.API_KEY ? "API key required for access" : "Open access",
      "Endpoints": {
        "/": "API documentation (this page)",
        "/?source=[douban|imdb|tmdb|bgm|melon]&query=[name]": "Search for media by name",
        "/?url=[media_url]": "Generate media description by URL"
      },
      "Notes": "Please use the appropriate source and query parameters for search, or provide a direct URL for generation."
    }, env);
  }
}

// 处理查询参数请求
async function handleQueryRequest(request, env, uri) {
  let source, query, url_, tmdb_id, sid;
  
  // 如果是POST请求，从body中获取参数
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      source = body.source;
      query = body.query;
      url_ = body.url;
      tmdb_id = body.tmdb_id;
      sid = body.sid;
    } catch (e) {
      // 如果无法解析JSON，使用URL参数
      source = uri.searchParams.get("source");
      query = uri.searchParams.get("query");
      url_ = uri.searchParams.get("url");
      tmdb_id = uri.searchParams.get("tmdb_id");
      sid = uri.searchParams.get("sid");
    }
  } else {
    // GET请求，从URL参数中获取
    source = uri.searchParams.get("source");
    query = uri.searchParams.get("query");
    url_ = uri.searchParams.get("url");
    tmdb_id = uri.searchParams.get("tmdb_id");
    sid = uri.searchParams.get("sid");
  }
  
  try {
    let response_data;
    
    if (source && query) {
      // 如果指定了source，则使用指定的搜索源
      if (source === 'imdb' || source === 'tmdb') {
        // 处理搜索请求
        const searchResult = await handleSearchRequest(source, query, env);
        return searchResult;
      } else {
        response_data = {error: "Invalid source. Supported sources: douban, imdb, tmdb"};
      }
    } else if (query && !source) {
      // 自动根据关键词语言选择搜索源
      // handleAutoSearch已经返回makeJsonResponse包装的响应，不需要再次包装
      return await handleAutoSearch(query, env);
    } else if (url_) {
      // 处理直接URL请求
      response_data = await handleUrlRequest(url_, env);
    } else if (tmdb_id) {
      // 处理TMDB ID请求
      console.log("处理TMDB ID请求:", tmdb_id);
      
      // 构建统一的资源标识符
      const resourceId = `tmdb_${String(tmdb_id).replace(/\//g, '__')}`;
      
      // 检查R2中是否已有缓存数据（针对TMDB ID请求）
      if (env.R2_BUCKET) {
        try {
          const cachedData = await env.R2_BUCKET.get(resourceId);
          
          if (cachedData) {
            // 如果R2中有缓存数据，直接返回
            const cachedText = await cachedData.text();
            console.log(`Returning cached data for resource: ${resourceId}`);
            response_data = JSON.parse(cachedText);
          }
        } catch (e) {
          console.error('Error reading from R2:', e);
          // 如果R2读取失败，继续执行正常流程
        }
      }
      
      // 如果没有缓存数据，则正常处理
      if (!response_data) {
        // 对 TMDB ID 进行解码以处理之前编码过的斜杠
        const decodedTmdbId = String(tmdb_id).replace(/__/g, '/');
        response_data = await gen_tmdb(decodedTmdbId, env);
        
        // 如果获取到结果且R2可用，将结果存储到R2
        if (response_data && env.R2_BUCKET) {
          try {
            await env.R2_BUCKET.put(resourceId, JSON.stringify(response_data));
            console.log(`Cached result for resource: ${resourceId}`);
          } catch (e) {
            console.error('Error writing to R2:', e);
          }
        }
      }
    } else if (source && sid) {
      // 处理直接SID请求（豆瓣、IMDb等）
      console.log(`处理${source} SID请求:`, sid);
      
      // 构建统一的资源标识符
      let resourceId = null;
      switch (source.toLowerCase()) {
        case 'douban':
          resourceId = `douban_${sid}`;
          break;
        case 'imdb':
          resourceId = `imdb_${sid}`;
          break;
        case 'tmdb':
          // TMDB 的 sid 应该已经是编码格式（如 movie__12345），直接解码使用
          const decodedSid = String(sid).replace(/__/g, '/');
          response_data = await gen_tmdb(decodedSid, env);
          break;
        case 'bgm':
          resourceId = `bgm_${sid}`;
          break;
        case 'melon':
          resourceId = `melon_${sid.replace(/\//g, '__')}`;
          break;
        case 'steam':
          resourceId = `steam_${sid}`;
          break;
        default:
          resourceId = null;
      }
      
      // 检查R2中是否已有缓存数据（针对SID请求）
      if (resourceId && env.R2_BUCKET) {
        try {
          const cachedData = await env.R2_BUCKET.get(resourceId);
          
          if (cachedData) {
            // 如果R2中有缓存数据，直接返回
            const cachedText = await cachedData.text();
            console.log(`Returning cached data for resource: ${resourceId}`);
            response_data = JSON.parse(cachedText);
          }
        } catch (e) {
          console.error('Error reading from R2:', e);
          // 如果R2读取失败，继续执行正常流程
        }
      }
      
      // 如果没有缓存数据，则正常处理
      if (!response_data) {
        switch (source.toLowerCase()) {
          case 'douban':
            response_data = await gen_douban(sid, env);
            break;
          case 'imdb':
            response_data = await gen_imdb(sid, env);
            break;
          case 'tmdb':
            // 对 SID 进行解码以处理之前编码过的斜杠
            const decodedSid = String(sid).replace(/__/g, '/');
            response_data = await gen_tmdb(decodedSid, env);
            break;
          case 'bgm':
            response_data = await gen_bangumi(sid, env);
            break;
          case 'melon':
            const decodedMelonSid = String(sid).replace(/__/g, '/');
            response_data = await gen_melon(decodedMelonSid, env);
            break;
          case 'steam':
            response_data = await gen_steam(sid, env);
            break;
          default:
            response_data = {error: `Unsupported source: ${source}`};
        }
        
        // 如果获取到结果且R2可用，将结果存储到R2
        if (response_data && resourceId && env.R2_BUCKET) {
          try {
            // 在存储时使用编码后的sid作为resourceId的一部分
            await env.R2_BUCKET.put(resourceId, JSON.stringify(response_data));
            console.log(`Cached result for resource: ${resourceId}`);
          } catch (e) {
            console.error('Error writing to R2:', e);
          }
        }
      }
    } else {
      // 参数不完整的情况
      response_data = {error: "Invalid parameters. For search, use both `source` and `query`. For generation, use `url` or `source` and `sid`."};
    }
    
    return response_data ? makeJsonResponse(response_data, env) : new Response(null, { status: 404 });
  } catch (e) {
    console.error("Global error:", e);
    return makeJsonResponse({
      success: false,
      error: `Internal Error, Please contact @Hares.`
    }, env);
  }
}

// 处理主API响应
async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "false"
      }
    });
  }
  
  const uri = new URL(request.url);
  
  // 验证请求
  const { valid, response } = await validateRequest(request, CORS_HEADERS, env);
  if (!valid) return response;
  
  // 处理不同路径和方法
  if ((uri.pathname === "/" || uri.pathname === "/api")) {
    // 如果是POST请求，正常处理API功能
    if (request.method === "POST") {
      return await handleQueryRequest(request, env, uri);
    }
    
    // 如果是GET请求，一律返回API文档
    if (request.method === "GET") {
      return await handleRootRequest(env, true);
    }
  } else {
    // 对于不匹配任何API端点的请求，返回404和安全提示
    return makeJsonResponse({
      success: false,
      error: "API endpoint not found. Please check the documentation for valid endpoints.",
      message: "This is a backend API service. For API usage, please refer to the documentation."
    }, env);
  }
}

export default {
  async fetch(request, env) {
    return await handleRequest(request, env);
  }
};