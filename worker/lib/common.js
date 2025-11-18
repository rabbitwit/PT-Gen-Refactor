import * as cheerio from 'cheerio';

export const AUTHOR = "Hares";
export const VERSION = "1.0.3";
export const NONE_EXIST_ERROR = "The corresponding resource does not exist.";
export const DEFAULT_TIMEOUT = 15000;

const JSONP_REGEX = /^[^(]+\(\s*([\s\S]+?)\s*\);?$/i;
const MAX_WIDTH = 150;
const DEFAULT_BODY_TEMPLATE = Object.freeze({ // 默认响应体模板（不可变）
  success: false,
  error: null,
  format: "",
  version: VERSION,
  generate_at: 0
});

/**
 * 计算字符串的视觉长度，其中中文字符和全角字符计为2个单位长度，英文字符和半角字符计为1个单位长度
 * @param {string} str - 需要计算长度的字符串
 * @returns {number} 字符串的视觉长度
 */
function getStringVisualLength(str) {
  let length = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    // 判断字符是否为宽字符（CJK字符、全角字符等）
    if (
      // CJK字符范围
      (charCode >= 0x4e00 && charCode <= 0x9fff) ||
      // 全角ASCII和片假名
      (charCode >= 0xff00 && charCode <= 0xffef) ||
      // CJK符号和标点
      (charCode >= 0x3000 && charCode <= 0x303f) ||
      // 全角形式
      (charCode >= 0xfe30 && charCode <= 0xfe6f)
    ) {
      length += 2;
    } else {
      length += 1;
    }
  }
  return length;
}

/**
 * 将带标签的行格式化为自动换行并对齐的字符串
 * @param {object} options
 * @param {string} options.label - 标签文本，例如 "❁ 标签:"
 * @param {string} options.content - 内容文本
 * @param {number} options.maxWidth - 每行的最大视觉宽度
 * @param {string} [options.separator=' / '] - 内容项之间的分隔符
 * @returns {string} - 格式化后的完整字符串 (可能包含多行)
 */
function formatWrappedLine({ label, content, maxWidth, separator = ' / ' }) {
  if (!content || content.trim() === '') {
    return label;
  }
  const items = content.split(separator);
  const labelVisualWidth = getStringVisualLength(label);
  const indentString = ' '.repeat(labelVisualWidth);
  let lines = [];
  let currentLine = label;
  
  items.forEach((item, index) => {
    const itemVisualWidth = getStringVisualLength(item);
    const separatorVisualWidth = getStringVisualLength(separator);
    const currentLineVisualWidth = getStringVisualLength(currentLine);
    
    if (index > 0 && currentLineVisualWidth + separatorVisualWidth + itemVisualWidth > maxWidth) {
      // 保留分隔符在前一行
      lines.push(currentLine.trimEnd() + separator);
      currentLine = indentString + item;
    } else {
      // 第一项直接添加，后续项添加分隔符后再添加内容
      if (index === 0) {
        currentLine += item;
      } else {
        currentLine += separator + item;
      }
    }
  });
  
  lines.push(currentLine);
  return lines.join('\n');
}

/**
 * 处理需求文本，将其格式化为带标题的结构化文本。
 * 主要功能包括清洗HTML、按行处理、识别并过滤特定标签（如配置要求）、
 * 并将剩余内容进行换行包装后输出。
 *
 * @param {string} reqText - 需要处理的原始需求文本，可能包含HTML标签
 * @param {string} title - 显示在结果最前面的标题内容
 * @returns {string} 格式化后的字符串，以标题开头，随后是处理过的内容，
 *                   每个段落之间用空行分隔；如果输入无效或无有效内容则返回空字符串
 */
const processRequirements = (reqText, title) => {
  // 类型保护
  if (typeof reqText !== 'string') return '';
  if (!reqText) return '';

  const cleaned = cleanHtml(reqText);
  const lines = cleaned.split('\n')
    .map(line => line.trim())
    .filter(line => Boolean(line));

  if (lines.length === 0) return '';

  const result = [];
  result.push(`❁ ${title}`);
  let buffer = [];

  // 扩展标签集合，包含中英文的最低配置与推荐配置关键词
  const labelSet = new Set([
    'minimum:', 'recommended:', 'minimum', 'recommended',
    '最低配置:', '推荐配置:', '最低配置', '推荐配置'
  ]);

  /**
   * 将缓冲区中的多行文本逐行进行换行包装，并加入到最终结果数组中
   * @param {string[]} bufLines - 要处理的文本行数组
   * @param {string} indent - 换行时使用的缩进，默认为四个空格
   * @param {number} max - 每行最大字符数限制，默认为80
   */
  const appendWrapped = (bufLines, indent = '    ', max = 80) => {
    for (let i = 0; i < bufLines.length; i++) {
      const line = bufLines[i];
      const wrapped = wrapLines(line, indent, max);
      if (Array.isArray(wrapped)) {
        result.push(...wrapped);
      } else {
        result.push(wrapped);
      }
    }
  };

  for (const rawLine of lines) {
    if (!rawLine) continue;
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    if (labelSet.has(lower) || labelSet.has(line)) {
      if (buffer.length > 0) {
        appendWrapped(buffer);
        buffer = [];
      }
      continue;
    }

    // 过滤掉附注事项相关的内容
    if (/^(additional notes|附注事项|备注)[:：]?\s*/i.test(line)) {
      if (buffer.length > 0) {
        appendWrapped(buffer);
        buffer = [];
      }
      continue;
    }

    buffer.push(line);
  }

  if (buffer.length > 0) {
    appendWrapped(buffer);
  }

  result.push('');
  return result.join('\n');
};

/**
 * 清理HTML字符串，将其转换为纯文本
 * @param {string} html - 需要清理的HTML字符串
 * @returns {string} 清理后的纯文本字符串
 */
const cleanHtml = (html) => {
  if (!html) return '';
  let s = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<\/?(?:strong|ul|li)[^>]*>/gi, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\r\n/g, '\n')
    .trim();
  return s;
};

/**
 * 将文本按指定宽度自动换行，并添加缩进
 * @param {string} text - 需要处理的文本内容
 * @param {string} [indent='  '] - 每行的缩进字符串，默认为两个空格
 * @param {number} [max=80] - 每行最大字符数，默认为80
 * @returns {string} 处理后的文本，包含适当的换行和缩进
 */
const wrapLines = (text, indent = '  ', max = 80) => {
  if (!text) return '';
  if (max <= 0) max = 80;
  if (indent.length >= max) indent = '  ';
  
  const words = String(text).split(/\s+/);
  let currentLine = indent;
  const lines = [];
  
  for (const word of words) {
    // 如果单个单词就超过行宽限制，强制放在新行
    if (word.length >= max - indent.length) {
      if (currentLine !== indent) {
        lines.push(currentLine);
      }
      lines.push(indent + word);
      currentLine = indent;
      continue;
    }
    
    // 检查是否需要换行
    const separator = (currentLine === indent) ? '' : ' ';
    if (currentLine.length + separator.length + word.length > max) {
      lines.push(currentLine);
      currentLine = indent + word;
    } else {
      currentLine += separator + word;
    }
  }

  if (currentLine !== indent) {
    lines.push(currentLine);
  }
  
  return lines.join('\n');
};

/**
 * 将文本以固定缩进进行自动换行
 * @param {string} text - 需要换行的原始文本
 * @param {number} maxWidth - 每行的最大视觉宽度
 * @param {string} indentString - 应用于每一行开头的缩进字符串
 * @returns {string} - 格式化后、包含换行符的完整字符串
 */
const wrapTextWithIndent = (text, maxWidth, indentString) => {
  const indentWidth = getStringVisualLength(indentString);
  const contentWidth = maxWidth - indentWidth;

  // 如果可用内容宽度小于等于0，无法换行，直接返回缩进+文本
  if (contentWidth <= 0) {
    return indentString + text;
  }

  let lines = [];
  let currentLine = '';
  let currentLineWidth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charWidth = getStringVisualLength(char);

    // 如果当前字符加上后会超长
    if (currentLineWidth + charWidth > contentWidth) {
      lines.push(indentString + currentLine);
      currentLine = char; // 新的一行以这个字符开始
      currentLineWidth = charWidth;
    } else {
      // 否则，将字符添加到当前行
      currentLine += char;
      currentLineWidth += charWidth;
    }
  }

  if (currentLine) {
    lines.push(indentString + currentLine);
  }

  return lines.join('\n');
};

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

  // 确保 init.headers 不被 initOverride.status 等覆盖
  init.status = typeof init.status === 'number' ? init.status : 200;

  const payload = JSON.stringify(body || {}, null, 2);
  return new Response(payload, init);
};

/**
 * 合并默认字段并返回 Response
 * @param {Object} body_update
 * @param {Object} env - 环境变量对象，用于获取AUTHOR等配置
 * @returns {Response}
 */
export const makeJsonResponse = (body_update, env) => {
  const body = {
    ...DEFAULT_BODY_TEMPLATE,
    copyright: `Powered by @${env?.AUTHOR || AUTHOR}`,
    generate_at: Date.now(),
    ...(body_update || {})
  };
  return makeJsonRawResponse(body);
};

/**
 * 根据豆瓣数据生成格式化文本
 * @param {Object} data - 豆瓣电影/电视剧数据对象
 * @returns {string} 格式化后的文本内容
 */
export const generateDoubanFormat = (data) => {
    const lines = [];
    if (data.poster) lines.push(`[img]${data.poster}[/img]\n`);
    if (data.foreign_title) {
      lines.push(`❁ 片　　名:　${data.foreign_title}`);
    } else if (data.chinese_title) {
      lines.push(`❁ 片　　名:　${data.chinese_title}`);
    }
    if (data.aka && data.aka.length) lines.push(`❁ 译　　名:　${data.aka.join(" / ").trim()}`);
    if (data.year) lines.push(`❁ 年　　代:　${data.year}`);
    if (data.region && data.region.length) lines.push(`❁ 产　　地:　${data.region.join(" / ")}`);
    if (data.genre && data.genre.length) lines.push(`❁ 类　　别:　${data.genre.join(" / ")}`);
    if (data.language && data.language.length) lines.push(`❁ 语　　言:　${data.language.join(" / ")}`);
    if (data.playdate && data.playdate.length) lines.push(`❁ 上映日期:　${data.playdate.join(" / ")}`);
    if (data.imdb_rating) lines.push(`❁ IMDb评分:　${data.imdb_rating}`);
    if (data.imdb_link) lines.push(`❁ IMDb链接:　${data.imdb_link}`);
    lines.push(`❁ 豆瓣评分:　${data.douban_rating}`);
    lines.push(`❁ 豆瓣链接:　${data.douban_link}`);
    if (data.episodes) lines.push(`❁ 集　　数:　${data.episodes}`);
    if (data.duration) lines.push(`❁ 片　　长:　${data.duration}`);
    if (data.director && data.director.length) lines.push(`❁ 导　　演:　${data.director.map(x => x.name).join(" / ")}`);
    if (data.writer && data.writer.length) {
      const content = data.writer.map(x => x.name).join(" / ").trim();
      lines.push(`❁ 编　　剧:　${content}`);
    }

    if (data.cast && data.cast.length) {
      const castNames = data.cast.map(x => x.name).filter(Boolean);
      if (castNames.length) {
        lines.push(formatWrappedLine({
          label: '❁ 主　　演:　',
          content: castNames.join('\n　　　　　　　').trim(),
          maxWidth: 100
        }));
      }
    }

    if (data.tags && data.tags.length) lines.push(`\n❁ 标　　签:　${data.tags.join(" | ")}`);
    if (data.introduction) {
      lines.push(`\n❁ 简　　介\n`);
      lines.push(`　${data.introduction.replace(/\n/g, "\n　　")}`);
    }
    
    if (data.awards && Array.isArray(data.awards) && data.awards.length) {
      lines.push(`\n❁ 获奖情况\n`);
      lines.push(`　　${data.awards.join('\n　　')}`);
    }

    return lines.join('\n').trim();
};

/**
 * 根据IMDb数据生成格式化文本
 * @param {Object} data - IMDb电影/电视剧数据对象
 * @returns {string} 格式化后的文本内容
 */
export const generateImdbFormat = (data) => {
  const lines = [];
  const releaseInfo = [];
  lines.push(`[img]${data.image}[/img]\n`);
  lines.push(`❁ Original Title:　${data.original_title}`);
  lines.push(`❁ Type:　${data.type}`);
  lines.push(`❁ Year:　${data.year}`);
  lines.push(`❁ Origin Country:　${data.origin_country.join(' / ')}`);
  lines.push(formatWrappedLine({label: '❁ Languages:　', content: data.languages.join(' / '), maxWidth: MAX_WIDTH}));
  lines.push(formatWrappedLine({label: '❁ Genres:　', content: data.genres.join(' / '), maxWidth: MAX_WIDTH}));

  if (data.episodes && data.episodes > 0) {
      lines.push(`❁ Episodes:　${data.episodes}`);
      if (data.seasons && data.seasons.length > 0) {
          lines.push(`❁ Seasons:　${data.seasons.join(' | ').trim()}`);
      }
  }

  lines.push(`❁ Runtime:　${data.runtime}`);
  lines.push(`❁ IMDb Rating:　${data.rating} / 10 from ${data.vote_count} users`);
  lines.push(`❁ IMDb Link:　${data.link}`);
  if (data.release_date) {
    const formattedDate = `${data.release_date.year}-${String(data.release_date.month).padStart(2, '0')}-${String(data.release_date.day).padStart(2, '0')}`;
    const country = data.release_date.country || '';
    const dateWithCountry = country ? `${formattedDate} (${country})` : formattedDate;
    releaseInfo.push(dateWithCountry);
  }

  if (data.release && data.release.length) {
    data.release.forEach(item => {
      if (item.date) {
        let formattedDate = item.date;
        const dateMatch = item.date.match(/([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
        if (dateMatch) {
          const [, monthStr, day, year] = dateMatch;
          const months = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
          };
          const month = months[monthStr] || '01';
          formattedDate = `${year}-${month}-${day.padStart(2, '0')}`;
        }
        const country = item.country || 'Unknown';
        const releaseText = `${formattedDate} (${country})`;
        releaseInfo.push(releaseText);
      }
    });
  }
  
  // 输出合并后的发布日期信息
  if (releaseInfo.length > 0) {
    lines.push(`❁ Release Date:　${releaseInfo.join(' / ').trim()}`);
  }

  if (data.aka && data.aka.length) {
    // 构造包含国家信息的 AKA 字符串，格式为 "标题 (国家)"
    const akaWithCountries = data.aka
      .map(item => {
        if (typeof item === 'string') return item;
        const title = item.title || '';
        const country = item.country || '';
        // 如果有国家信息，则添加括号标注
        return country ? `${title} (${country})` : title;
      })
      .filter(Boolean);
    
    if (akaWithCountries.length > 0) {
      lines.push(formatWrappedLine({
        label: '❁ Also Known As:　',
        content: akaWithCountries.join(' / ').trim(),
        maxWidth: MAX_WIDTH,
      }));
    }
  }
  
  if (data.keywords) {
    lines.push(formatWrappedLine({label: '❁ Keywords:　', content: data.keywords.join(' | ').trim(), maxWidth: MAX_WIDTH}));
  }
  
  // 导演
  if (data.directors && data.directors.length) {
    const directors = Array.isArray(data.directors) ? data.directors : [data.directors];
    lines.push(`❁ Directors:　${directors.map(i => i.name || i).join(' / ').trim()}`);
  }
  // 编剧
  if (data.writers && data.writers.length) {
    const writers = Array.isArray(data.writers) ? data.writers : [data.writers];
    lines.push(`❁ Writers:　${writers.map(i => i.name || i).join(' / ').trim()}`);
  }
  if (data.cast && data.cast.length) {
    lines.push(formatWrappedLine({
      label: '❁ Actors:　',
      content: data.cast.map(i => {
        if (typeof i === 'string') return i;
        return i.name || 'Unknown';
      }).join(' / ').trim(),
      maxWidth: 145,
    }));
  }

  // 剧情简介
  if (data.plot) {
    lines.push(formatWrappedLine({label: '❁ Plot:　', content: data.plot.replace(/\n/g, "\n　　"), maxWidth: MAX_WIDTH}));
  }

  return lines.join('\n').trim();
};

/**
 * 根据TMDB数据生成格式化文本
 * @param {Object} data - TMDB电影/电视剧数据对象
 * @returns {string} 格式化后的文本内容
 */
export const generateTmdbFormat = (data) => {
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]`, '');
  lines.push(`❁ Title:　${data.title || 'N/A'}`);
  lines.push(`❁ Original Title:　${data.original_title || 'N/A'}`);
  lines.push(`❁ Genres:　${data.genres && data.genres.length ? data.genres.join(' / ') : 'N/A'}`);
  lines.push(`❁ Languages:　${data.languages && data.languages.length ? data.languages.join(' / ') : 'N/A'}`);

  const isMovie = data.release_date && !data.first_air_date || 
                  (data.tmdb_id && typeof data.tmdb_id === 'string' && data.tmdb_id.includes('movie'));
  
  if (isMovie) {
    lines.push(`❁ Release Date:　${data.release_date || 'N/A'}`);
    lines.push(`❁ Runtime:　${data.runtime || 'N/A'}`);
  } else {
    lines.push(`❁ First Air Date:　${data.first_air_date || 'N/A'}`);
    lines.push(`❁ Number of Episodes:　${data.number_of_episodes || 'N/A'}`);
    lines.push(`❁ Number of Seasons:　${data.number_of_seasons || 'N/A'}`);
    lines.push(`❁ Episode Runtime:　${data.episode_run_time || 'N/A'}`);
  }
  
  lines.push(`❁ Production Countries:　${data.countries && data.countries.length ? data.countries.join(' / ') : 'N/A'}`);
  lines.push(`❁ Rating:　${data.tmdb_rating || 'N/A'}`);

  if (data.tmdb_id) {
    const mediaType = isMovie ? 'movie' : 'tv';
    const tmdbLink = `https://www.themoviedb.org/${mediaType}/${data.tmdb_id}/`;
    lines.push(`❁ TMDB Link:　${tmdbLink}`);
  }
  
  if (data.imdb_link) lines.push(`❁ IMDb Link:　${data.imdb_link}`);

  if (data.directors && data.directors.length) {
    const directorNames = data.directors
      .filter(d => d && d.name)
      .map(d => d.name)
      .join(' / ');
    if (directorNames) lines.push(`❁ Directors:　${directorNames}`);
  }
  
  if (data.producers && data.producers.length) {
    const producerNames = data.producers
      .filter(p => p && p.name)
      .map(p => p.name)
      .join(' / ');
    if (producerNames) lines.push(`❁ Producers:　${producerNames}`);
  }
  
  if (data.cast && data.cast.length) {
    lines.push('', '❁ Cast');
    const castLines = data.cast
      .filter(a => a && a.name)
      .map(a => `  ${a.name}${a.character ? ' as ' + a.character : ''}`)
      .slice(0, 15); // 限制显示数量
    lines.push(...castLines);
  }
  
  if (data.overview) {
    lines.push('', '❁ Introduction', `　　${data.overview.replace(/\n/g, '\n  ')}`);
  }

  return lines.join('\n').trim();
};

/**
 * 根据Melon数据生成格式化文本
 * @param {Object} data - Melon专辑数据对象
 * @returns {string} 格式化后的文本内容
 */
export const generateMelonFormat = (data) => {
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]\n`);
  lines.push(`❁ 专辑名称:　${data.title || 'N/A'}`);
  lines.push(`❁ 歌　　手:　${data.artists && data.artists.length ? data.artists.join(' / ') : 'N/A'}`);
  lines.push(`❁ 发行日期:　${data.release_date || 'N/A'}`);
  lines.push(`❁ 专辑类型:　${data.album_type || 'N/A'}`);
  lines.push(`❁ 流　　派:　${data.genres && data.genres.length ? data.genres.join(' / ').trim() : 'N/A'}`);
  lines.push(`❁ 发 行 商:　${data.publisher || 'N/A'}`);
  lines.push(`❁ 制作公司:　${data.planning || 'N/A'}`);
  lines.push(`❁ 专辑链接:　${data.melon_link}`);

  if (data.description) {
    lines.push('');
    lines.push('❁ 专辑介绍\n');
    lines.push(`　　${data.description.replace(/\n/g, '\n　　')}`);
  }
  if (data.tracks && data.tracks.length) {
    lines.push('');
    lines.push('❁ 歌曲列表\n');
    data.tracks.forEach(t => {
      const artists = t.artists && t.artists.length ? ` (${t.artists.join(', ')})` : '';
      lines.push(`　　${t.number || '-'}. ${t.title}${artists}`);
    });
  }

  return lines.join('\n').trim();
};

/**
 * 根据Bangumi数据生成格式化文本
 * @param {Object} data - Bangumi动画/书籍等数据对象
 * @returns {string} 格式化后的文本内容
 */
export const generateBangumiFormat = (data) => {
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]`, '');
  
  lines.push(`❁ 片　　名:　${data.name}`);
  lines.push(`❁ 中 文 名:　${data.name_cn}`);
  lines.push(formatWrappedLine({
    label: '❁ 别　　名:　',
    content: data.aka.join(' / '),
    maxWidth: MAX_WIDTH,
  }));
  if (data.type) lines.push(`❁ 类　　型:　${data.type}`);
  if (data.eps) lines.push(`❁ 话　　数:　${data.eps}`);
  if (data.date) lines.push(`❁ 首　　播:　${data.date}`);
  if (data.year) lines.push(`❁ 年　　份:　${data.year}年`);
  if (data.bgm_rating) lines.push(`❁ 评　　分:　${data.bgm_rating}`);
  lines.push(`❁ 链　　接:　${data.link}`);
  if (data.platform) lines.push(`❁ 播放平台:　${data.platform}`);
  if (data.tags && data.tags.length) {
    lines.push(formatWrappedLine({
      label: '❁ 标　　签:　',
      content: data.tags.join(' / '),
      maxWidth: MAX_WIDTH,
    }));
  }

  if (data.director && data.director.length > 0) {
    let directorContent = '';
    
    if (Array.isArray(data.director)) {
      directorContent = data.director.join(' / ').trim();
    } else if (typeof data.director === 'string') {
      directorContent = data.director.split(/[、\/,]/).map(d => d.trim()).filter(d => d).join(' / ');
    }
    
    if (directorContent) {
      lines.push(formatWrappedLine({
        label: '❁ 导　　演:　',
        content: directorContent,
        maxWidth: MAX_WIDTH,
      }));
    }
  }

  if (data.writer && data.writer.length > 0) {
    let writerContent = '';

    if (Array.isArray(data.writer)) {
      writerContent = data.writer.join(' / ').trim();
    } else if (typeof data.writer === 'string') {
      writerContent = data.writer.split(/[、\/,]/).map(w => w.trim()).filter(w => w).join(' / ');
    }
    if (writerContent) {
      lines.push(formatWrappedLine({
        label: '❁ 脚　　本:　',
        content: writerContent,
        maxWidth: MAX_WIDTH,
      }));
    }
  }

  if (data.characters && data.characters.length > 0) {
    const content = data.characters.slice(0, 20).map(c =>`${c}`).join(' / ').trim();
    lines.push(formatWrappedLine({
      label: '❁ 角色信息:　',
      content: content,
      maxWidth: 125,
    }));
  }

  if (data.summary) {
    lines.push('', '❁ 简　　介', `  ${data.summary.replace(/\n/g, '\n  ')}`);
  }
  
  return lines.join('\n').trim();
};

/**
 * 根据Steam数据生成格式化文本
 * @param {Object} data - Steam游戏数据对象
 * @returns {string} 格式化后的文本内容
 */
export const generateSteamFormat = (data) => {
  const lines = [];
  if (data.header_image) lines.push(`[img]${data.header_image}[/img]\n`);

  lines.push(`❁ 游戏名称:　${data.name}`);
  lines.push(`❁ 游戏类型:　${data.type}`);
  lines.push(`❁ 发行日期:　${data.release_date}`);

  if (data.developers && data.developers.length) {
    lines.push(`❁ 开 发 商:　${data.developers.join(", ")}`);
  }
  if (data.publishers && data.publishers.length) {
    lines.push(`❁ 发 行 商:　${data.publishers.join(", ")}`);
  }
  if (data.genres && data.genres.length) {
    lines.push(`❁ 游戏类型:　${data.genres.join(", ")}`);
  }
  if (data.supported_languages) {
    const cleanedLanguages = cleanHtml(data.supported_languages)
      .replace(/\*具有完全音频支持的语言.*/g, '')
      .trim();
    lines.push(`❁ 支持语言:　${cleanedLanguages}`);
  }

  if (data.price) {
    if (data.price.discount > 0 && data.price.initial) {
      lines.push(`❁ 原　　价:　${data.price.initial} ${data.price.currency}`);
      lines.push(`❁ 现　　价:　${data.price.final} ${data.price.currency} (折扣${data.price.discount}%)`);
    } else if (data.price.final) {
      lines.push(`❁ 价　　格:　${data.price.final} ${data.price.currency}`);
    }
  }

  if (data.platforms) {
    const platforms = [];
    if (data.platforms.windows) platforms.push("Windows");
    if (data.platforms.mac) platforms.push("Mac");
    if (data.platforms.linux) platforms.push("Linux");
    if (platforms.length) lines.push(`❁ 支持平台:　${platforms.join(", ")}`);
  }

  if (data.categories && data.categories.length) {
    lines.push(
      formatWrappedLine({
        label: '❁ 分类标签:　',
        content: data.categories.join(" / "),
        maxWidth: MAX_WIDTH,
      })
    );
  }

  lines.push(`❁ 链　　接:　https://store.steampowered.com/app/${data.sid}/`);
  if (data.about_the_game) {
      const INDENT = '　　';
      const BULLET = '· ';

      const $ = page_parser(data.about_the_game);

      // 预处理部分保持不变
      $.root().find('h2, ul, p').before('<hr>');
      $.root().find('br').each(function() {
          const $this = $(this);
          let $next = $this.next();
          while($next[0] && $next[0].type === 'text' && !$next.text().trim()) {
              $next = $next.next();
          }
          if ($next.is('br')) {
              $this.replaceWith('<hr>');
              $next.remove();
          }
      });

      lines.push('', '❁ 简　　介');
      const blocksHTML = $.root().html().split(/<hr\s*\/?>/);
      blocksHTML.forEach(blockHtml => {
          const $block = page_parser(blockHtml); 
          const blockText = $block.root().text().trim();

          if (!blockText) return;
          if ($block('h2').length > 0) {
              lines.push('');
              lines.push(INDENT + blockText);
          } else if ($block('ul').length > 0) {
              $block('li').each((i, li) => {
                  const liText = $(li).text().trim(); 
                  if (liText) {
                      lines.push(wrapTextWithIndent(liText, MAX_WIDTH, INDENT + BULLET));
                  }
              });
          } else {
              lines.push(wrapTextWithIndent(blockText, MAX_WIDTH, INDENT));
          }
      });
      
      if(lines[lines.length - 1].trim() !== '❁ 简　　介') {
          lines.push('');
      }
  }

  if (data.pc_requirements && data.pc_requirements.minimum) {
    lines.push(processRequirements(data.pc_requirements.minimum, "最低配置"));
  }
  if (data.pc_requirements && data.pc_requirements.recommended) {
    lines.push(processRequirements(data.pc_requirements.recommended, "推荐配置"));
  }

  // screenshots
  if (data.screenshots && data.screenshots.length) {
    lines.push('❁ 游戏截图');
    for (const s of data.screenshots) {
      if (s.path_full) lines.push(`[img]${s.path_full}[/img]`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
};