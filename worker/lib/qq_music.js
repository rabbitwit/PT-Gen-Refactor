import { fetchWithTimeout, page_parser } from "./common.js";

const HEADERS_BASE = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

const buildHeaders = (env = {}) => {
  const headers = { ...HEADERS_BASE };
  if (env?.QQ_COOKIE) {
    headers.Cookie = env.QQ_COOKIE;
  }
  return headers;
};

/**
 * 获取QQ音乐专辑信息
 * @param {string} sid - QQ音乐专辑ID
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 专辑信息对象
 */
export async function gen_qq_music(sid, env) {
  try {
    if (!env?.QQ_COOKIE) {
      return {
        success: false,
        error: "未提供QQ音乐Cookie,不能使用此功能！请联系管理员。",
      };
    }

    const headers = buildHeaders(env);
    const url = `https://y.qq.com/n/ryqq/albumDetail/${sid}`;

    const response = await fetchWithTimeout(url, { headers });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error! status: ${response.status}`,
      };
    }

    const html = await response.text();

    if (!html || typeof html !== "string") {
      return {
        success: false,
        error: "获取到的页面内容无效",
      };
    }

    const $ = page_parser(html);

    let initialDataScript = null;
    try {
      $("script").each((i, el) => {
        const text = $(el).html();
        if (text && text.includes("window.__INITIAL_DATA__")) {
          initialDataScript = text;
          return false;
        }
      });
    } catch (domError) {
      return {
        success: false,
        error: "解析页面DOM时出错: " + domError.message,
      };
    }

    if (!initialDataScript) {
      return {
        success: false,
        error:
          "使用的COOKIE可能已过期,请检查COOKIE是否正确或页面结构是否发生变化",
      };
    }

    let dataMatch;
    try {
      dataMatch = initialDataScript.match(
        /window\.(__INITIAL_DATA__)\s*=\s*(\{[^<]*\})/
      );
    } catch (regexError) {
      return {
        success: false,
        error: "正则表达式匹配出错: " + regexError.message,
      };
    }

    if (!dataMatch || !dataMatch[2]) {
      return {
        success: false,
        error: "无法从页面脚本中提取初始数据",
      };
    }

    let initData;
    try {
      let jsonString = dataMatch[2];
      jsonString = jsonString.replace(/:undefined/g, ":null");
      initData = JSON.parse(jsonString);
    } catch (parseError) {
      return {
        success: false,
        error: "解析页面初始数据失败: " + parseError.message,
      };
    }

    if (!initData.detail) {
      return {
        success: false,
        error: "返回数据中缺少详情信息",
      };
    }

    const detail = initData.detail || {};
    const songList = initData.songList || [];

    // 处理专辑封面URL，将任意尺寸替换为500x500
    let coverUrl = "";
    if (detail.picurl) {
      coverUrl = `https:${detail.picurl}`;
      coverUrl = coverUrl.replace(/T002R\d+x\d+M000/, "T002R500x500M000");
    }

    const data = {
      id: detail.id,
      mid: detail.albumMid,
      name: detail.title,
      cover: coverUrl,
      singer: detail.singer || [],
      albumName: detail.albumName,
      genre: detail.genre,
      language: detail.language,
      albumType: detail.albumType,
      company: detail.company,
      publishTime: detail.ctime,
      desc: detail.desc,
      songList: songList.map((song) => ({
        id: song.id,
        mid: song.mid,
        name: song.title,
        sub_name: song.subtitle || "",
        singer: song.singer || [],
        interval: song.interval,
        playTime: song.playTime,
      })),
    };

    return {
      success: true,
      site: "qq_music",
      sid: sid,
      ...data,
    };
  } catch (error) {
    console.error("获取QQ音乐专辑信息失败:", error);
    return {
      success: false,
      error: "获取QQ音乐专辑信息失败: " + error.message,
    };
  }
}