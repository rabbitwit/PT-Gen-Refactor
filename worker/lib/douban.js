import { NONE_EXIST_ERROR, page_parser, jsonp_parser } from "./common.js";

const DEFAULT_TIMEOUT = 15000;
const REQUEST_HEADERS_BASE = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Cache-control': 'max-age=0',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"'
};

function buildHeaders(env = {}) {
  const h = { ...REQUEST_HEADERS_BASE };
  if (env?.DOUBAN_COOKIE) h['Cookie'] = env.DOUBAN_COOKIE;
  return h;
}

async function fetchWithTimeout(url, opts = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

const safe = (v, fallback = '') => (v === undefined || v === null ? fallback : v);

export async function gen_douban(sid, env) {
  const data = { site: "douban", sid };
  if (!sid) return Object.assign(data, { error: "Invalid Douban id" });

  const headers = buildHeaders(env);
  const baseLink = `https://movie.douban.com/subject/${encodeURIComponent(sid)}/`;
  const mobileLink = `https://m.douban.com/movie/subject/${encodeURIComponent(sid)}/`;

  try {
    // 1) 请求主页面，遇到非 200 自动尝试移动端回退
    let resp = await fetchWithTimeout(baseLink, { headers }, DEFAULT_TIMEOUT);
    if (!resp || (resp.status === 204 || resp.status === 403 || resp.status === 521 || resp.status === 521)) {
      // 尝试移动端页面回退
      try {
        const mresp = await fetchWithTimeout(mobileLink, { headers }, DEFAULT_TIMEOUT);
        if (mresp && mresp.ok) resp = mresp;
      } catch (e) { /* ignore */ }
    }

    if (!resp) return Object.assign(data, { error: "No response from Douban" });
    if (resp.status === 404) return Object.assign(data, { error: NONE_EXIST_ERROR });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      // 可能是反爬或验证码页面
      if (/验证码|检测到有异常请求|机器人程序|访问受限/i.test(txt)) {
        return Object.assign(data, { error: "Douban blocked request (captcha/anti-bot). Provide valid cookie or try later." });
      }
      return Object.assign(data, { error: `Failed to fetch Douban page: ${resp.status} ${txt ? txt.slice(0, 200) : ''}` });
    }

    const raw = await resp.text();

    // 快速 anti-bot 检测
    if (/你想访问的页面不存在/.test(raw)) return Object.assign(data, { error: NONE_EXIST_ERROR });
    if (/验证码|检测到有异常请求|机器人程序|请先登录|访问受限/i.test(raw)) {
      return Object.assign(data, { error: "Douban blocked request (captcha/anti-bot). Provide valid cookie or try later." });
    }

    // 解析 DOM
    const $ = page_parser(raw);

    // 解析 ld+json（更可靠）
    let ld_json = {};
    try {
      const script = $('head > script[type="application/ld+json"]').html();
      if (script) {
        // 去除换行并解析
        const cleaned = script.replace(/(\r\n|\n|\r|\t)/g, '');
        ld_json = JSON.parse(cleaned);
      }
    } catch (e) {
      // ignore parse errors
      ld_json = {};
    }

    // 常用字段初始化
    data.douban_link = baseLink;
    const title = $("title").text().replace("(豆瓣)", "").trim();
    data.chinese_title = safe(title, '');
    data.foreign_title = safe($('span[property="v:itemreviewed"]').text().replace(data.chinese_title, "").trim(), '');

    // helper 获取 info 行后的文本
    const fetch_anchor = anchor => {
      try {
        if (!anchor || !anchor[0]) return '';
        // nextSibling nodeValue contains the value in many cases
        const ns = anchor[0].nextSibling;
        if (ns && ns.nodeValue) return ns.nodeValue.trim();
        // fallback: anchor parent text after label
        const parent = anchor.parent();
        if (parent && parent.length) {
          const txt = parent.text().replace(anchor.text(), '').trim();
          return txt;
        }
      } catch (e) { /* ignore */ }
      return '';
    };

    // 又名
    const aka_anchor = $('#info span.pl:contains("又名")');
    if (aka_anchor.length > 0) {
      const aka_text = fetch_anchor(aka_anchor);
      if (aka_text) {
        const parts = aka_text.split(" / ").map(s => s.trim()).filter(Boolean).sort((a,b) => a.localeCompare(b));
        data.aka = parts;
      }
    }

    // 年份 / 地区 / 类型 / 语言 / 放映日 / 集数 / 单集片长
    data.year = safe($("#content > h1 > span.year").text().match(/\d{4}/)?.[0] || "", "");
    const regions_anchor = $('#info span.pl:contains("制片国家/地区")');
    data.region = regions_anchor.length ? fetch_anchor(regions_anchor).split(" / ").map(s => s.trim()).filter(Boolean) : [];
    data.genre = $("#info span[property=\"v:genre\"]").map(function () { return $(this).text().trim(); }).get();
    const language_anchor = $('#info span.pl:contains("语言")');
    data.language = language_anchor.length ? fetch_anchor(language_anchor).split(" / ").map(s => s.trim()).filter(Boolean) : [];
    const playdate_nodes = $("#info span[property=\"v:initialReleaseDate\"]");
    data.playdate = playdate_nodes.length ? playdate_nodes.map(function(){ return $(this).text().trim(); }).get().sort((a,b)=>new Date(a)-new Date(b)) : [];
    const episodes_anchor = $('#info span.pl:contains("集数")');
    data.episodes = episodes_anchor.length ? fetch_anchor(episodes_anchor) : "";
    const duration_anchor = $('#info span.pl:contains("单集片长")');
    data.duration = duration_anchor.length ? fetch_anchor(duration_anchor) : ($("#info span[property=\"v:runtime\"]").text().trim() || "");

    // 简介（优先隐藏展开内容）
    const intro_selector = '#link-report-intra > span.all.hidden, #link-report-intra > [property="v:summary"], #link-report > span.all.hidden, #link-report > [property="v:summary"]';
    const intro_el = $(intro_selector);
    data.introduction = intro_el.length ? intro_el.text().split('\n').map(s=>s.trim()).filter(Boolean).join('\n') : '';

    // poster / director / writer / cast via ld_json 回退到页面元素
    data.poster = ld_json.image ? String(ld_json.image).replace(/s(_ratio_poster|pic)/g, "l$1").replace("img3", "img1").replace(/\.webp$/, ".jpg") : '';
    data.director = ld_json.director ? (Array.isArray(ld_json.director) ? ld_json.director : [ld_json.director]) : [];
    data.writer = ld_json.author ? (Array.isArray(ld_json.author) ? ld_json.author : [ld_json.author]) : [];
    data.cast = ld_json.actor ? (Array.isArray(ld_json.actor) ? ld_json.actor : [ld_json.actor]) : [];

    // tags
    const tag_another = $('div.tags-body > a[href^="/tag"]');
    if (tag_another.length > 0) data.tags = tag_another.map(function () { return $(this).text().trim(); }).get();

    // 评分：优先 ld_json，再尝试页面元素
    const rating_info = ld_json.aggregateRating || {};
    const page_rating_average = $('#interest_sectl .rating_num').text().trim();
    const page_votes = $('#interest_sectl span[property="v:votes"]').text().trim();

    const douban_avg = safe(rating_info.ratingValue || page_rating_average || '0', '0');
    const douban_votes = safe(rating_info.ratingCount || page_votes || '0', '0');
    data.douban_rating_average = douban_avg;
    data.douban_votes = douban_votes;
    data.douban_rating = (parseFloat(douban_avg) > 0 && parseInt(douban_votes) > 0) ? `${douban_avg}/10 from ${douban_votes} users` : '0/10 from 0 users';

    // IMDb: 尝试从页面抓取 IMDb id，再请求 imdb JSONP
    const imdb_anchor = $('#info span.pl:contains("IMDb")');
    let imdb_api_req = null;
    if (imdb_anchor.length > 0) {
      const imdb_id = fetch_anchor(imdb_anchor).trim();
      if (imdb_id) {
        data.imdb_id = imdb_id;
        data.imdb_link = `https://www.imdb.com/title/${imdb_id}/`;
        // imdb jsonp endpoint (稳定性依赖第三方)
        const imdb_jsonp_url = `https://p.media-imdb.com/static-content/documents/v1/title/${imdb_id}/ratings%3Fjsonp=imdb.rating.run:imdb.api.title.ratings/data.json`;
        imdb_api_req = fetchWithTimeout(imdb_jsonp_url, { headers }, 8000).catch(() => null);
      }
    }

    // 异步请求 awards 页面与 IMDb（并行）
    const awardsReq = fetchWithTimeout(`${baseLink}awards`, { headers }, 8000).catch(() => null);
    let awards = '';
    try {
      const awardsResp = await awardsReq;
      if (awardsResp && awardsResp.ok) {
        const awardsRaw = await awardsResp.text();
        const $aw = page_parser(awardsRaw);
        awards = $aw("#content > div > div.article").html() || '';
        if (awards) {
          awards = awards.replace(/[\s\n]+/g, ' ').replace(/<\/li><li>/g, "</li> <li>").replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
          // 将awards字符串分割成数组
          data.awards = awards.split(/\s*[\/>\n]\s*/).filter(item => item.trim().length > 0).map(item => item.trim());
        }
      }
    } catch (e) { /* ignore */ }

    // 处理 IMDb JSONP 响应
    if (imdb_api_req) {
      try {
        const imdbResp = await imdb_api_req;
        if (imdbResp && imdbResp.ok) {
          const imdbRaw = await imdbResp.text();
          const imdb_json = jsonp_parser(imdbRaw);
          if (imdb_json?.resource) {
            const avg = imdb_json.resource.rating || 0;
            const votes = imdb_json.resource.ratingCount || 0;
            data.imdb_rating_average = avg;
            data.imdb_votes = votes;
            data.imdb_rating = `${avg}/10 from ${votes} users`;
          }
        }
      } catch (e) { /* ignore */ }
    }

    // 生成格式化描述（与原结构兼容）
    let descr = data.poster ? `[img]${data.poster}[/img]\n\n` : '';
    if (data.foreign_title) {
      descr += `❁ 片　　名:　${data.foreign_title}\n`;
    } else if (data.chinese_title) {
      descr += `❁ 片　　名:　${data.chinese_title}\n`;
    }
    if (data.aka && data.aka.length) descr += `❁ 译　　名:　${data.aka.join(" / ")}\n`;
    if (data.year) descr += `❁ 年　　代:　${data.year}\n`;
    if (data.region && data.region.length) descr += `❁ 产　　地:　${data.region.join(" / ")}\n`;
    if (data.genre && data.genre.length) descr += `❁ 类　　别:　${data.genre.join(" / ")}\n`;
    if (data.language && data.language.length) descr += `❁ 语　　言:　${data.language.join(" / ")}\n`;
    if (data.playdate && data.playdate.length) descr += `❁ 上映日期:　${data.playdate.join(" / ")}\n`;
    if (data.imdb_rating) descr += `❁ IMDb评分:　${data.imdb_rating}\n`;
    if (data.imdb_link) descr += `❁ IMDb链接:　${data.imdb_link}\n`;
    descr += `❁ 豆瓣评分:　${data.douban_rating}\n`;
    descr += `❁ 豆瓣链接:　${data.douban_link}\n`;
    if (data.episodes) descr += `❁ 集　　数:　${data.episodes}\n`;
    if (data.duration) descr += `❁ 片　　长:　${data.duration}\n`;
    if (data.director && data.director.length) descr += `❁ 导　　演:　${data.director.map(x => x.name).join(" / ")}\n`;
    if (data.writer && data.writer.length) descr += `❁ 编　　剧:　${data.writer.map(x => x.name).join(" / ")}\n`;

    if (data.cast && data.cast.length) {
      const castNames = data.cast.map(x => x.name).filter(Boolean);
      if (castNames.length) {
        descr += `❁ 主　　演:　${castNames[0]}\n`;
        for (let i = 1; i < castNames.length; i++) {
          descr += `　　　　　　　${castNames[i]}\n`;
        }
      }
    }

    if (data.tags && data.tags.length) descr += `\n❁ 标　　签:　${data.tags.join(" | ")}\n`;
    if (data.introduction) descr += `❁ 简　　介　　${data.introduction.replace(/\n/g, "\n　　")}`;
    if (awards) descr += `❁ 获奖情况　　${awards.replace(/\n/g, "\n　　")}`;

    data.format = descr.trim();
    data.success = true;
    return data;
  } catch (error) {
    return Object.assign(data, { error: error?.message || String(error) });
  }
}