import * as cheerio from 'cheerio';

export const AUTHOR = "Hares";
export const VERSION = "1.0.6";
export const NONE_EXIST_ERROR = "The corresponding resource does not exist.";
export const DEFAULT_TIMEOUT = 15000;
export const ANTI_BOT_PATTERNS = /验证码|检测到有异常请求|机器人程序|访问受限|请先登录/i;
export const NOT_FOUND_PATTERN = /你想访问的页面不存在/;
export const ANTI_BOT_ERROR = 'Douban blocked request (captcha/anti-bot). Provide valid cookie or try later.';
export const ROOT_PAGE_CONFIG = {
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

export const DOUBAN_REQUEST_HEADERS_BASE = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Cache-control": "max-age=0",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua":
    '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

const JSONP_REGEX = /^[^(]+\(\s*([\s\S]+?)\s*\);?$/i;
const DEFAULT_BODY_TEMPLATE = Object.freeze({ // 默认响应体模板（不可变）
  success: false,
  error: null,
  format: '',
  version: VERSION,
  generate_at: 0
});

export const isAntiBot = (text) => text && ANTI_BOT_PATTERNS.test(text);

/**
 * 构建请求头对象
 * @param {Object} env - 环境变量对象
 * @param {string} env.DOUBAN_COOKIE - 豆瓣Cookie值
 * @returns {Object} 包含基础请求头和可选Cookie的请求头对象
 */
export const buildHeaders = (env = {}) => ({
  ...DOUBAN_REQUEST_HEADERS_BASE,
  ...(env?.DOUBAN_COOKIE && { Cookie: env.DOUBAN_COOKIE }),
});

/**
 * 带超时控制的fetch请求函数
 * @param {string} url - 请求地址
 * @param {Object} opts - fetch选项配置
 * @param {number} timeout - 超时时间（毫秒），默认为DEFAULT_TIMEOUT
 * @returns {Promise<Response>} 返回fetch响应结果
 */
export const fetchWithTimeout = async (url, opts = {}, timeout = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
};

/**
 * 解析HTML页面为 cheerio 实例
 * 支持 string 或 Buffer 输入
 * @param {string|Buffer} responseText
 * @returns {cheerio}
 */
export const page_parser = (responseText) => {
  try {
    if (typeof responseText !== 'string') {
      if (typeof globalThis !== 'undefined' && globalThis.Buffer && globalThis.Buffer.isBuffer(responseText)) {
        responseText = responseText.toString('utf8');
      } else if (responseText instanceof ArrayBuffer) {
        responseText = new TextDecoder('utf-8').decode(new Uint8Array(responseText));
      } else if (ArrayBuffer.isView(responseText)) {
        const view = new Uint8Array(responseText.buffer, responseText.byteOffset, responseText.byteLength);
        responseText = new TextDecoder('utf-8').decode(view);
      } else {
        responseText = String(responseText || '');
      }
    }
  } catch (e) {
    responseText = String(responseText || '');
  }

  return cheerio.load(responseText, { decodeEntities: false });
};

/**
 * 解析 JSONP 返回值，返回对象或空对象（解析失败时）
 * @param {string} responseText
 * @returns {Object}
 */
export const jsonp_parser = (responseText) => {
  try {
    if (typeof responseText !== 'string') responseText = String(responseText || '');
    const m = responseText.replace(/\r?\n/g, '').match(JSONP_REGEX);
    if (!m || !m[1]) {
      console.error('JSONP解析失败：未匹配到有效的 JSON 内容');
      return {};
    }
    return JSON.parse(m[1]);
  } catch (e) {
    console.error('JSONP解析错误:', e);
    return {};
  }
};

/**
 * 返回 JSON Response
 * @param {Object} body
 * @param {Object} initOverride - 可包含 status 和 headers 字段，用于覆盖默认值
 * @returns {Response}
 */
export const makeJsonRawResponse = (body, initOverride) => {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  const init = {
    status: 200,
    headers: {
      ...defaultHeaders,
      ...(initOverride && initOverride.headers ? initOverride.headers : {})
    },
    ...(initOverride || {})
  };

  init.status = typeof init.status === 'number' ? init.status : 200;

  const payload = JSON.stringify(body || {}, null, 2);
  return new Response(payload, init);
};

/**
 * 合并默认字段并返回 Response
 * @param {Object} body_update
 * @param {Object} env - 环境变量对象，用于获取AUTHOR等配置
 * @param {number} status - HTTP状态码，默认为200
 * @returns {Response}
 */
export const makeJsonResponse = (body_update, env, status = 200) => {
  const body = {
    ...DEFAULT_BODY_TEMPLATE,
    copyright: `Powered by @${env?.AUTHOR || AUTHOR}`,
    generate_at: Date.now(),
    ...(body_update || {})
  };
  return makeJsonRawResponse(body, { status });
};