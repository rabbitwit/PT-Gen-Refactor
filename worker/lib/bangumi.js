import { fetchWithTimeout, generateBangumiFormat } from "./common.js";

const BGM_API_BASE = "https://api.bgm.tv/v0";
const BGM_API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Referer': 'https://bgm.tv/'
};
const safe = (v, fallback = '') => v ?? fallback;
const ensureArray = v => Array.isArray(v) ? v : (v ? [v] : []);
const TYPE_MAP = new Map([
  ['anime', '动画'],
  ['book', '书籍'],
  ['game', '游戏'],
  ['music', '音乐'],
  ['real', '三次元'],
  ['tv', '电视'],
  ['movie', '电影'],
  [1, '书籍'],
  [2, '动画'],
  [3, '音乐'],
  [4, '游戏'],
  [6, '三次元']
]);

/**
 * 格式化角色信息数组，将角色数据转换为特定格式的字符串数组
 * @param {Array} chars - 角色对象数组，每个对象包含角色信息
 * @returns {Array<string>} 返回格式化后的角色信息字符串数组，格式为"角色名: 声优名"
 */
const formatCharacters = (chars = []) => {
  const results = [];
  for (const c of chars) {
    if (!c) continue;
    const name = safe(c.name);
    const nameCn = safe(c.name_cn);
    const actors = ensureArray(c.actors)
      .map(a => safe(a?.name_cn || a?.name))
      .filter(Boolean)
      .join('、') || '未知';
    const title = nameCn ? `${name} (${nameCn})` : name || nameCn;
    if (title) results.push(`${title}: ${actors}`);
  }
  return results;
};

/**
 * 标准化条目类型，根据传入的subject对象获取可读的类型名称
 * @param {Object} subject - 条目对象，包含类型相关信息
 * @returns {string} 返回标准化后的类型名称，如果无法识别则返回空字符串或原始值
 */
const normalizeType = (subject) => {
  if (!subject || typeof subject !== 'object') return '';

  const readableFields = ['type_name', 'type_cn'];
  for (const field of readableFields) {
    const value = subject[field];
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const typeKey = subject.type;
  if ((typeof typeKey === 'string' && typeKey.trim()) || typeof typeKey === 'number') {
    const normalizedKey = typeof typeKey === 'string' ? typeKey.trim().toLowerCase() : typeKey;
    return TYPE_MAP.get(normalizedKey) ?? String(typeKey);
  }

  return '';
};

/**
 * 从信息框数组中获取指定键对应的值
 * @param {Array} infobox - 信息框数组，每个元素应包含key和value属性
 * @param {string} key - 要查找的键名
 * @returns {*} 返回找到的值，如果未找到则返回undefined
 */
const getInfoboxValue = (infobox, key) => {
  const item = infobox?.find(i => i.key === key);
  return item?.value;
};

/**
 * 获取信息框中指定键的数组值
 * @param {Object} infobox - 信息框对象
 * @param {string} key - 要获取值的键名
 * @returns {Array} 返回处理后的数组值，如果原值为数组则提取其中的v属性并过滤空值，否则返回安全处理后的值
 */
const getInfoboxArrayValues = (infobox, key) => {
  const value = getInfoboxValue(infobox, key);
  if (Array.isArray(value)) {
    return value.map(a => a.v).filter(v => v != null);
  }
  return safe(value);
};

/**
 * 异步获取 Bangumi（番组计划）条目信息并格式化为统一数据结构。
 *
 * @param {string|number} sid - Bangumi 条目的唯一标识符（subject ID）
 * @returns {Promise<Object>} 返回一个包含 Bangumi 数据或错误信息的对象：
 *   - site: 固定值 "bangumi"
 *   - sid: 原始传入的 sid
 *   - success: 是否成功获取并处理了数据
 *   - 其他字段根据 Bangumi API 的响应进行映射与加工
 */
export async function gen_bangumi(sid) {
  const data = { site: "bangumi", sid };
  if (!sid) return Object.assign(data, { error: "Invalid Bangumi subject id" });

  const subjectUrl = `${BGM_API_BASE}/subjects/${encodeURIComponent(sid)}`;
  const charactersUrl = `${subjectUrl}/characters`;

  try {
    const subjResp = await fetchWithTimeout(subjectUrl, { headers: BGM_API_HEADERS, timeout: 20000 });
    if (!subjResp) return Object.assign(data, { error: "No response from Bangumi API" });

    if (subjResp.status === 404) {
      return Object.assign(data, { error: "Subject not found on Bangumi" });
    }

    if (!subjResp.ok) {
      const txt = await subjResp.text().catch(() => '');
      return Object.assign(data, { error: `Bangumi subject request failed ${subjResp.status}: ${txt}` });
    }

    const subject = await subjResp.json().catch(() => null);
    if (!subject) return Object.assign(data, { error: "Failed to parse Bangumi subject response" });

    // 获取角色列表
    let characters = [];
    try {
      const charResp = await fetchWithTimeout(charactersUrl, { headers: BGM_API_HEADERS, timeout: 15000 });
      if (charResp && charResp.ok) {
        characters = await charResp.json().catch(() => []);
      } else {
        console.warn(`[bgm] characters fetch failed for ${sid}`);
      }
    } catch (err) {
      console.warn(`[bgm] unexpected error fetching characters for ${sid}`, err.message);
    }

    const charList = formatCharacters(ensureArray(characters));
    data.bgm_id = subject.id ?? sid;
    data.name = safe(subject.name);
    data.name_cn = safe(getInfoboxValue(subject.infobox, '中文名'), subject.name_cn);
    data.link = `https://bangumi.tv/subject/${subject.id}`;

    if (typeof subject.infobox === 'object' && subject.infobox !== null) {
        data.aka = getInfoboxArrayValues(subject.infobox, '别名');
        data.director = getInfoboxArrayValues(subject.infobox, '导演');
        data.writer = getInfoboxArrayValues(subject.infobox, '脚本');
    } else {
        data.aka = [];
        data.director = [];
        data.writer = [];
    }

    data.summary = safe(subject.summary);
    data.poster = subject.images?.medium ?? subject.images?.common ?? '';

    const score = subject.rating?.score;
    const total = subject.rating?.total ?? 0;
    data.bgm_rating_average = score ?? 0;
    data.bgm_votes = total;
    data.bgm_rating = score ? `${score} / 10 from ${total} users` : '';

    data.date = safe(subject.date);
    if (data.date && !isNaN(new Date(data.date).getTime())) {
        data.year = String(data.date).slice(0, 4);
    } else {
        data.year = '';
    }

    data.platform = safe(subject.platform);
    data.type = normalizeType(subject) || '';
    data.eps = subject.eps ?? subject.total_episodes ?? '';
    data.tags = Array.isArray(subject.meta_tags) ? subject.meta_tags : [];
    data.characters = charList;
    data.format = generateBangumiFormat(data);
    data.success = true;

    return data;
  } catch (e) {
    const message = e?.message || String(e);
    return Object.assign(data, { error: `Bangumi processing error: ${message}` });
  }
}