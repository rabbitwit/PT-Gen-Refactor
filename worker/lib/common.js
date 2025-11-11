import * as cheerio from 'cheerio'; // HTML页面解析

// 常量定义
export const AUTHOR = "Hares";
export const VERSION = "1.0.2";
export const NONE_EXIST_ERROR = "The corresponding resource does not exist.";

// 预编译正则表达式以提高性能并增强鲁棒性
const JSONP_REGEX = /^[^(]+\(\s*([\s\S]+?)\s*\);?$/i;

// 默认响应体模板（不可变）
const DEFAULT_BODY_TEMPLATE = Object.freeze({
  success: false,
  error: null,
  format: "",
  version: VERSION,
  generate_at: 0
});

/**
 * 解析HTML页面为 cheerio 实例
 * 支持 string 或 Buffer 输入
 * @param {string|Buffer} responseText
 * @returns {cheerio}
 */
export function page_parser(responseText) {
  // 兼容多种运行时：Node Buffer / ArrayBuffer / TypedArray / string
  try {
    if (typeof responseText !== 'string') {
      // Node 环境的 Buffer
      if (typeof globalThis !== 'undefined' && globalThis.Buffer && globalThis.Buffer.isBuffer(responseText)) {
        responseText = responseText.toString('utf8');
      } else if (responseText instanceof ArrayBuffer) {
        responseText = new TextDecoder('utf-8').decode(new Uint8Array(responseText));
      } else if (ArrayBuffer.isView(responseText)) {
        // 包括 Uint8Array 等 TypedArray
        const view = new Uint8Array(responseText.buffer, responseText.byteOffset, responseText.byteLength);
        responseText = new TextDecoder('utf-8').decode(view);
      } else {
        responseText = String(responseText || '');
      }
    }
  } catch (e) {
    // 兜底为字符串
    responseText = String(responseText || '');
  }

  return cheerio.load(responseText, { decodeEntities: false });
}

/**
 * 解析 JSONP 返回值，返回对象或空对象（解析失败时）
 * @param {string} responseText
 * @returns {Object}
 */
export function jsonp_parser(responseText) {
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
}

/**
 * 返回标准化的 JSON Response
 * @param {Object} body
 * @param {Object} initOverride - 可包含 status 和 headers 字段，用于覆盖默认值
 * @returns {Response}
 */
export function makeJsonRawResponse(body, initOverride) {
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

  // 确保 init.headers 不被 initOverride.status 等覆盖
  init.status = typeof init.status === 'number' ? init.status : 200;

  const payload = JSON.stringify(body || {}, null, 2);
  return new Response(payload, init);
}

/**
 * 合并默认字段并返回 Response
 * @param {Object} body_update
 * @param {Object} env - 环境变量对象，用于获取AUTHOR等配置
 * @returns {Response}
 */
export function makeJsonResponse(body_update, env) {
  const body = {
    ...DEFAULT_BODY_TEMPLATE,
    copyright: `Powered by @${env?.AUTHOR || AUTHOR}`,
    generate_at: Date.now(),
    ...(body_update || {})
  };
  return makeJsonRawResponse(body);
}
