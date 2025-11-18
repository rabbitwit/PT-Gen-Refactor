import { NONE_EXIST_ERROR, DEFAULT_TIMEOUT, page_parser, jsonp_parser, fetchWithTimeout, generateDoubanFormat } from "./common.js";

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
const safe = (v, fallback = '') => (v === undefined || v === null ? fallback : v);

/**
 * 构建请求头对象
 * @param {Object} env - 环境变量对象，可选
 * @param {string} env.DOUBAN_COOKIE - 豆瓣Cookie值
 * @returns {Object} 包含基础请求头和可选Cookie的请求头对象
 */
const buildHeaders = (env = {}) => {
  const h = { ...REQUEST_HEADERS_BASE };
  if (env?.DOUBAN_COOKIE) h['Cookie'] = env.DOUBAN_COOKIE;
  return h;
};

const fetch_anchor = anchor => {
  try {
    if (!anchor || !anchor[0]) return '';
      const ns = anchor[0].nextSibling;
      if (ns && ns.nodeValue) return ns.nodeValue.trim();
      const parent = anchor.parent();
      if (parent && parent.length) {
        const txt = parent.text().replace(anchor.text(), '').trim();
        return txt;
      }
  } catch (e) { /* ignore */ }
  return '';
};

/**
 * 异步生成指定豆瓣ID对应的影视信息数据
 * @param {string|number} sid - 豆瓣电影的唯一标识符
 * @param {object} env - 环境配置对象，用于获取DOUBAN_COOKIE等配置
 * @returns {Promise<object>} 返回一个包含豆瓣数据的对象，包括基础信息、演员表、评分等，
 *                           若发生错误则返回带有error字段的失败信息
 */
export const gen_douban = async (sid, env) => {
  const data = { site: "douban", sid };
  if (!sid) return Object.assign(data, { error: "Invalid Douban id" });

  const headers = buildHeaders(env);
  const baseLink = `https://movie.douban.com/subject/${encodeURIComponent(sid)}/`;
  const mobileLink = `https://m.douban.com/movie/subject/${encodeURIComponent(sid)}/`;

  try {
    // 请求主页面，遇到非 200 自动尝试移动端回退
    let resp = await fetchWithTimeout(baseLink, { headers }, DEFAULT_TIMEOUT);
    if (!resp || (resp.status === 204 || resp.status === 403 || resp.status === 521 || resp.status === 521)) {
      // 尝试移动端页面回退
      try {
        const mresp = await fetchWithTimeout(mobileLink, { headers }, DEFAULT_TIMEOUT);
        if (mresp && mresp.ok) resp = mresp;
      } catch (e) { 
        console.warn(`Failed to fetch mobile page for ${sid}:`, e);
      }
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

    const $ = page_parser(raw);
    let ld_json = {};
    try {
      const script = $('head > script[type="application/ld+json"]').html();
      if (script) {
        const cleaned = script.replace(/(\r\n|\n|\r|\t)/g, '');
        ld_json = JSON.parse(cleaned);
      }
    } catch (e) {
      ld_json = {};
    }

    const title = $("title").text().replace("(豆瓣)", "").trim();
    const aka_anchor = $('#info span.pl:contains("又名")');
    const regions_anchor = $('#info span.pl:contains("制片国家/地区")');
    const language_anchor = $('#info span.pl:contains("语言")');
    const playdate_nodes = $("#info span[property=\"v:initialReleaseDate\"]");
    const episodes_anchor = $('#info span.pl:contains("集数")');
    const duration_anchor = $('#info span.pl:contains("单集片长")');
    const intro_selector = '#link-report-intra > span.all.hidden, #link-report-intra > [property="v:summary"], #link-report > span.all.hidden, #link-report > [property="v:summary"]';
    const intro_el = $(intro_selector);
    const tag_another = $('div.tags-body > a[href^="/tag"]');
    const rating_info = ld_json.aggregateRating || {};
    const page_rating_average = $('#interest_sectl .rating_num').text().trim();
    const page_votes = $('#interest_sectl span[property="v:votes"]').text().trim();
    const douban_avg = safe(rating_info.ratingValue || page_rating_average || '0', '0');
    const douban_votes = safe(rating_info.ratingCount || page_votes || '0', '0');
    const imdb_anchor = $('#info span.pl:contains("IMDb")');
    const awardsReq = fetchWithTimeout(`${baseLink}awards`, { headers }, 8000).catch(() => null);

    if (tag_another.length > 0) {
      data.tags = tag_another.map(function () { return $(this).text().trim(); }).get();
    } 

    if (aka_anchor.length > 0) {
      const aka_text = fetch_anchor(aka_anchor);
      if (aka_text) {
        const parts = aka_text.split(" / ").map(s => s.trim()).filter(Boolean).sort((a,b) => a.localeCompare(b));
        data.aka = parts;
      }
    }

    data.douban_link = baseLink;
    data.chinese_title = safe(title, '');
    data.foreign_title = safe($('span[property="v:itemreviewed"]').text().replace(data.chinese_title, "").trim(), '');
    data.year = safe($("#content > h1 > span.year").text().match(/\d{4}/)?.[0] || "", "");
    data.region = regions_anchor.length ? fetch_anchor(regions_anchor).split(" / ").map(s => s.trim()).filter(Boolean) : [];
    data.genre = $("#info span[property=\"v:genre\"]").map(function () { return $(this).text().trim(); }).get();
    data.language = language_anchor.length ? fetch_anchor(language_anchor).split(" / ").map(s => s.trim()).filter(Boolean) : [];
    data.playdate = playdate_nodes.length ? playdate_nodes.map(function(){ return $(this).text().trim(); }).get().sort((a,b)=>new Date(a)-new Date(b)) : [];
    data.episodes = episodes_anchor.length ? fetch_anchor(episodes_anchor) : "";
    data.duration = duration_anchor.length ? fetch_anchor(duration_anchor) : ($("#info span[property=\"v:runtime\"]").text().trim() || "");
    data.introduction = intro_el.length ? intro_el.text().split('\n').map(s=>s.trim()).filter(Boolean).join('\n') : '';
    data.poster = ld_json.image ? String(ld_json.image).replace(/s(_ratio_poster|pic)/g, "l$1").replace("img3", "img1").replace(/\.webp$/, ".jpg") : '';
    data.director = ld_json.director ? (Array.isArray(ld_json.director) ? ld_json.director : [ld_json.director]) : [];
    data.writer = ld_json.author ? (Array.isArray(ld_json.author) ? ld_json.author : [ld_json.author]) : [];
    data.cast = ld_json.actor ? (Array.isArray(ld_json.actor) ? ld_json.actor : [ld_json.actor]) : [];
    data.douban_rating_average = douban_avg;
    data.douban_votes = douban_votes;
    data.douban_rating = (parseFloat(douban_avg) > 0 && parseInt(douban_votes) > 0) ? `${douban_avg} / 10 from ${douban_votes} users` : '0 / 10 from 0 users';

    const celebrities = [];
    $('#celebrities .celebrities-list li.celebrity').each(function() {
      const $celebrity = $(this);
      const name = $celebrity.find('.info .name a').text().trim();
      const link = $celebrity.find('.info .name a').attr('href');
      const role = $celebrity.find('.info .role').text().trim();
      const avatarStyle = $celebrity.find('.avatar').attr('style');
      let avatar = '';
      
      if (avatarStyle) {
        const match = avatarStyle.match(/url\(["']?(.*?)["']?\)/);
        if (match && match[1]) {
          avatar = match[1];
        }
      }
      
      celebrities.push({
        name,
        link,
        role,
        avatar
      });
    });

    const celebrityMap = new Map();
    celebrities.forEach(celebrity => {
      celebrityMap.set(celebrity.name, celebrity);

      const chineseName = celebrity.name.split(' ')[0];
      if (chineseName !== celebrity.name) {
        celebrityMap.set(chineseName, celebrity);
      }
    });

    if (data.director && data.director.length > 0) {
      data.director = data.director.map(director => {
        let originalName = '';
        if (typeof director === 'string') {
          originalName = director;
          director = { name: director };
        } else if (director.name) {
          originalName = director.name;
        }

        let detailedInfo = celebrityMap.get(originalName);

        if (!detailedInfo) {
          const chineseName = originalName.split(' ')[0];
          detailedInfo = celebrityMap.get(chineseName);
        }
        
        if (detailedInfo) {
          return { ...director, link: detailedInfo.link, role: detailedInfo.role, avatar: detailedInfo.avatar };
        }
        return director;
      });
    }

    if (data.cast && data.cast.length > 0) {
      data.cast = data.cast.map(actor => {
        let originalName = '';
        if (typeof actor === 'string') {
          originalName = actor;
          actor = { name: actor };
        } else if (actor.name) {
          originalName = actor.name;
        }
        
        let detailedInfo = celebrityMap.get(originalName);
        
        if (!detailedInfo) {
          const chineseName = originalName.split(' ')[0];
          detailedInfo = celebrityMap.get(chineseName);
        }
        
        if (detailedInfo) {
          return { ...actor, link: detailedInfo.link, role: detailedInfo.role, avatar: detailedInfo.avatar };
        }
        return actor;
      });
    }

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

    try {
      let awards = '';
      const awardsResp = await awardsReq;
      if (awardsResp && awardsResp.ok) {
        const awardsRaw = await awardsResp.text();
        const $aw = page_parser(awardsRaw);
        const awardItems = [];

        $aw('.awards').each(function() {
          const $awards = $aw(this);
          const $hd = $awards.find('.hd h2');
          const festival = $hd.find('a').text().trim();
          const year = $hd.find('.year').text().trim();
          const festivalFull = `${festival} ${year}`;
          
          $awards.find('ul.award').each(function() {
            const $ul = $aw(this);
            const items = $ul.find('li');
            if (items.length >= 2) {
              const category = $aw(items[0]).text().trim();
              const winners = $aw(items[1]).text().trim();
              
              let fullInfo = `${festivalFull} ${category}`;
              if (winners) {
                fullInfo += ` ${winners}`;
              }
              awardItems.push(fullInfo);
            }
          });
        });
        
        data.awards = awardItems;
        awards = awardItems.join('\n');
      }
    } catch (e) { 
      console.error('Awards parsing error:', e);
    }

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
            data.imdb_rating = `${avg} / 10 from ${votes} users`;
          }
        }
      } catch (e) {
        console.error('IMDB API request error:', e);
      }
    }

    data.format = generateDoubanFormat(data);
    data.success = true;
    return data;
  } catch (error) {
    return Object.assign(data, { error: error?.message || String(error) });
  }
};