import {
  NONE_EXIST_ERROR,
  NOT_FOUND_PATTERN,
  ANTI_BOT_ERROR,
  isAntiBot,
  page_parser,
  fetchWithTimeout,
  buildHeaders,
} from "./common.js";
import { fetchAnchorText, parseJsonLd } from "./utils.js";

/**
 * 根据给定的选择器从 DOM 中提取字段文本内容。
 * 
 * 此函数尝试以多种方式获取与标签关联的文本或链接内容：
 * - 首先查找标签后紧邻的文本节点或链接；
 * - 若未找到，则查找同级或父级中的链接；
 * - 最后回退到处理纯文本和清理格式。
 *
 * @param {Function} $ - Cheerio 实例，用于操作 DOM。
 * @param {string} selector - 用于定位标签元素的选择器字符串。
 * @returns {string} 提取到的字段文本内容，若失败则返回空字符串。
 */
const fetchFieldText = ($, selector) => {
  try {
    const $label = $(selector);
    if (!$label.length) return '';
    
    const $parent = $label.parent();
    if (!$parent.length) return '';

    if ($label[0].nextSibling && $label[0].nextSibling.nodeType === 3) {
      const nextText = $label[0].nextSibling.nodeValue?.trim();
      if (nextText === '' && $label[0].nextSibling.nextSibling) {
        const nextElement = $($label[0].nextSibling.nextSibling);
        if (nextElement.is('a')) {
          return nextElement.text().trim();
        }
      }
    }
    
    const $links = $label.siblings('a');
    if ($links.length > 0) {
      const texts = [];
      $links.each((_, element) => {
        const text = $(element).text().trim();
        if (text) texts.push(text);
      });
      return texts.join(' / ');
    }
    
    const $allLinks = $parent.find('a');
    if ($allLinks.length > 0) {
      const texts = [];
      $allLinks.each((_, element) => {
        const text = $(element).text().trim();
        if (text) texts.push(text);
      });
      return texts.join(' / ');
    }
    
    const nextSibling = $label[0].nextSibling;
    if (nextSibling && nextSibling.nodeType === 3) {
      let text = nextSibling.nodeValue?.trim();
      text = text?.replace(/^[:：\s]*/, '').trim();
      if (text) return text;
    }
    
    let fullText = $parent.text().replace(/\s+/g, ' ').trim();
    const labelText = $label.text().trim();
    if (labelText && fullText) {
      fullText = fullText.replace(new RegExp(`${labelText}\\s*[:：]?\\s*`, 'i'), '').trim();
    }
    return fullText || '';
    
  } catch (error) {
    console.warn(`Error fetching field with selector ${selector}:`, error);
    return '';
  }
};

/**
 * 提取页面介绍内容的函数
 * @param {Function} $ - cheerio 实例
 * @returns {string} 返回清理后的介绍文本内容，如果没有找到内容则返回空字符串
 */
const extractIntroduction = ($) => {
  const $intro = $('#link-report > span.all.hidden').length 
    ? $('#link-report > span.all.hidden')
    : $('#link-report .intro');
    
  if (!$intro.length) return '';
  
  const $clone = $intro.clone();
  $clone.find('style').remove();

  return $clone.text().trim();
};
/**
 * 解析数值字符串或数字，返回对应的数值
 * @param {string|number} value - 需要解析的值，可以是字符串或数字
 * @param {Function} parser - 解析函数，默认使用parseInt
 * @returns {number} 解析后的数值，如果解析失败则返回0
 */
const parseNumber = (value, parser = parseInt) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = parser(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * 提取图书信息字段的函数
 * @param {Object} $ - cheerio 实例
 * @param {Object} ldJson - JSON-LD数据对象，包含结构化数据
 * @returns {Object} 包含提取的图书信息的对象
 */
const extractBookFields = ($, ldJson) => {
  const getField = (selector) => fetchFieldText($, selector);
  const getAnchor = (selector) => fetchAnchorText($(selector));
  
  const translatorText = getField('#info span.pl:contains("译者")');
  
  return {
    translator: translatorText
      ? translatorText.split(' / ').map(s => s.trim()).filter(Boolean).sort()
      : [],
    series: getField('#info span.pl:contains("丛书")'),
    original_title: getAnchor('#info span.pl:contains("原作名")'),
    publisher: getField('#info span.pl:contains("出版社")'),
    year: getAnchor('#info span.pl:contains("出版年")'),
    pages: getAnchor('#info span.pl:contains("页数")'),
    pricing: getAnchor('#info span.pl:contains("定价")'),
    binding: getAnchor('#info span.pl:contains("装帧")'),
    isbn: ldJson?.isbn || '',
  };
};

/**
 * 异步获取豆瓣书籍信息并解析返回结构化数据
 * 
 * @param {string} sid - 豆瓣书籍的唯一标识符（subject id）
 * @param {object} env - 环境配置对象，用于构建请求头等操作
 * @returns {Promise<object>} 返回包含书籍信息的对象
 */
export const gen_douban_book = async (sid, env) => {
  const data = { site: 'douban_book', sid };
  
  if (!sid) {
    return { ...data, error: 'Invalid Douban Book id' };
  }
  
  const baseLink = `https://book.douban.com/subject/${encodeURIComponent(sid)}/`;
  
  try {
    const headers = buildHeaders(env);
    const response = await fetchWithTimeout(baseLink, { headers });
    
    if (!response) {
      return { ...data, error: 'No response from Douban Book' };
    }
    
    if (response.status === 404) {
      return { ...data, error: NONE_EXIST_ERROR };
    }
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        ...data,
        error: isAntiBot(text)
          ? ANTI_BOT_ERROR
          : `Failed to fetch: ${response.status} ${text.slice(0, 200)}`,
      };
    }
    
    const html = await response.text();
    
    if (NOT_FOUND_PATTERN.test(html)) {
      return { ...data, error: NONE_EXIST_ERROR };
    }
    
    if (isAntiBot(html)) {
      return { ...data, error: ANTI_BOT_ERROR };
    }
    
    const $ = page_parser(html);
    const ldJson = parseJsonLd($);
    const title = ldJson?.name || $('span[property="v:itemreviewed"]').text().trim();
    const cover = $('#mainpic a.nbg').attr('href');
    const rating = parseNumber($('.rating_self strong[property="v:average"]').text().trim(), parseFloat);
    const votes = parseNumber($('.rating_self span[property="v:votes"]').text().trim());
    const introduction = extractIntroduction($);
    const author = ldJson?.author?.map(a => a.name).sort() || [];
    const fields = extractBookFields($, ldJson);
    
    return {
      ...data,
      ...fields,
      title,
      poster: cover,
      author,
      rating,
      votes,
      introduction,
      link: baseLink,
      success: true,
    };
    
  } catch (error) {
    console.error('Error fetching Douban book:', error);
    return { 
      ...data, 
      error: `Failed to fetch book data: ${error.message || 'Unknown error'}` 
    };
  }
};