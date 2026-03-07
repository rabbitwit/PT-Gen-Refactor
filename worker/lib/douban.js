import {
  NONE_EXIST_ERROR,
  ANTI_BOT_ERROR,
  NOT_FOUND_PATTERN,
  isAntiBot,
  page_parser,
  jsonp_parser,
  fetchWithTimeout,
  buildHeaders,
} from "./common.js";
import {
  getStaticMediaDataFromOurBits,
  parseDoubanAwards,
  safe,
  fetchAnchorText,
  parseJsonLd,
} from "./utils.js";

/**
 * 解析评分信息
 * @param {Object} $ - cheerio实例
 * @param {Object} ldJson - JSON-LD数据
 * @returns {Object} 包含评分和投票数的对象
 */
const parseRatingInfo = ($, ldJson) => {
  const ratingInfo = ldJson.aggregateRating || {};
  const pageRatingAverage = $("#interest_sectl .rating_num").text().trim();
  const pageVotes = $('#interest_sectl span[property="v:votes"]').text().trim();

  const average = safe(ratingInfo.ratingValue || pageRatingAverage || "0", "0");
  const votes = safe(ratingInfo.ratingCount || pageVotes || "0", "0");

  return {
    average,
    votes,
    formatted:
      parseFloat(average) > 0 && parseInt(votes) > 0
        ? `${average} / 10 from ${votes} users`
        : "0 / 10 from 0 users",
  };
};

/**
 * 清洗角色文本
 * @param {string} text - 原始文本
 * @param {boolean} clean - 是否清洗
 * @returns {string}
 */
const cleanRoleText = (text, clean) => {
  if (!clean || !text) return text || '';
  
  // 饰演
  if (text.includes('饰')) {
    const match = text.match(/饰\s*([^()]+)/);
    return match ? `饰 ${match[1].trim()}` : text;
  }
  
  // 配音
  if (text.includes('配')) {
    const match = text.match(/配\s*([^()]+)/);
    return match ? `配 ${match[1].trim()}` : text;
  }
  
  return text;
};

/**
 * 提取名人信息的通用函数
 * @param {Object} $ - cheerio实例
 * @param {string} section - 区块名称（导演/编剧/演员）
 * @param {boolean} extractRole - 是否提取角色信息
 * @returns {Array} 名人信息数组
 */
const extractCelebrities = ($, section, extractRole = false) => {
  if (!$ || !section) return [];
  
  const result = [];
  
  try {
    $(`.list-wrapper h2:contains("${section}")`)
      .closest(".list-wrapper")
      .find(".celebrity")
      .each((_, el) => {
        const $el = $(el);
        const $link = $el.find(".name a");
        const name = $link.text().trim();
        
        if (name) {
          const avatarStyle = $el.find(".avatar").attr("style") || "";
          const avatarUrl = avatarStyle.match(/url\(([^)]+)\)/)?.[1] || "";
          
          result.push({
            name,
            link: $link.attr("href") || "",
            role: cleanRoleText($el.find(".role").text().trim(), extractRole),
            avatar: avatarUrl
          });
        }
      });
  } catch (e) {
    console.warn(`Extract ${section} error:`, e.message);
  }
  
  return result;
};

/**
 * 获取名人信息（优化版）
 * @param {string} baseLink - 基础URL
 * @param {Object} headers - 请求头
 * @returns {Promise<Object>}
 */
const fetchCelebritiesInfo = async (baseLink, headers) => {
  const EMPTY = { director: [], writer: [], cast: [] };
  const MAX_RETRIES = 2;
  const TIMEOUT = 6000;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // 发起请求
      const response = await fetchWithTimeout(
        `${baseLink}celebrities`,
        { headers },
        TIMEOUT
      );
      
      // 检查状态
      if (!response.ok) {
        // 4xx 错误直接返回，不重试
        if (response.status >= 400 && response.status < 500) {
          console.warn(`HTTP ${response.status}, returning empty result`);
          return EMPTY;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      // 解析页面
      const html = await response.text();
      const $ = page_parser(html);
      
      return {
        director: extractCelebrities($, "导演"),
        writer: extractCelebrities($, "编剧"),
        cast: extractCelebrities($, "演员", true)
      };
      
    } catch (error) {
      // 最后一次尝试失败
      if (attempt === MAX_RETRIES - 1) {
        console.error('Celebrities fetch failed:', error.message);
        return EMPTY;
      }
      
      // 超时或网络错误，等待后重试
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        console.warn(`Attempt ${attempt + 1} timeout, retrying...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      
      // 其他错误直接返回
      console.error('Non-retryable error:', error.message);
      return EMPTY;
    }
  }
  
  return EMPTY;
};

/**
 * 获取奖项信息（优化版）
 * @param {string} baseLink - 基础URL
 * @param {Object} headers - 请求头
 * @returns {Promise<Array>} 奖项信息数组
 */
const fetchAwardsInfo = async (baseLink, headers) => {
  const MAX_ATTEMPTS = 2;
  const TIMEOUT = 8000;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`Fetching awards (${attempt + 1}/${MAX_ATTEMPTS})...`);
      
      const response = await fetchWithTimeout(
        `${baseLink}awards`,
        { headers },
        TIMEOUT
      );
      
      // 404 直接返回
      if (response.status === 404) {
        console.log('No awards page');
        return [];
      }
      
      // 非 200 状态
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      
      // 验证内容
      if (html.length < 1000 || !html.includes('class="awards')) {
        throw new Error('Invalid awards page');
      }
      
      // 解析奖项
      const $ = page_parser(html);
      const sections = [];
      
      $(".awards").each((_, el) => {
        const $section = $(el);
        const $h2 = $section.find(".hd h2");
        
        // 电影节名称
        const festival = $h2.find("a").text().trim();
        const year = $h2.find(".year").text().trim();
        const name = `${festival} ${year}`.trim();
        
        if (!name) return; // continue
        
        const awards = [name];
        
        // 奖项列表
        $section.find("ul.award").each((_, award) => {
          const $items = $(award).find("li");
          
          if ($items.length >= 2) {
            const category = $($items[0]).text().trim();
            const winners = $($items[1]).text().trim();
            awards.push(winners ? `${category} ${winners}` : category);
          }
        });
        
        if (awards.length > 1) {
          sections.push(awards.join("\n"));
        }
      });
      
      const text = sections.join("\n\n");
      return text ? parseDoubanAwards(text) : [];
      
    } catch (error) {
      console.warn(`Attempt ${attempt + 1} failed:`, error.message);
      
      // 最后一次尝试失败
      if (attempt === MAX_ATTEMPTS - 1) {
        console.error('All attempts failed');
        return [];
      }
      
      // 等待后重试
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  return [];
};

/**
 * 获取IMDb评分信息
 * @param {string} imdbId - IMDb ID
 * @param {Object} headers - 请求头
 * @returns {Promise<Object|null>} IMDb评分信息
 */
const fetchImdbRating = async (imdbId, headers) => {
  if (!imdbId || !/^tt\d+$/.test(imdbId)) {
    return null;
  }
  
  const url = `https://p.media-imdb.com/static-content/documents/v1/title/${imdbId}/ratings%3Fjsonp=imdb.rating.run:imdb.api.title.ratings/data.json`;
  
  // 尝试 2 次
  for (let i = 0; i < 2; i++) {
    try {
      console.log(`Fetching IMDb (attempt ${i + 1})...`);
      
      // 关键修改：增加超时到 12 秒
      const response = await fetchWithTimeout(url, { headers }, 12000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      const match = text.match(/imdb\.rating\.run\((.*)\)/);
      
      if (!match) {
        throw new Error('Invalid response format');
      }
      
      const data = JSON.parse(match[1]);
      const rating = data.resource?.rating;
      const votes = data.resource?.ratingCount || 0;
      
      if (rating) {
        return {
          average: rating.toFixed(1),
          votes: String(votes),
          formatted: `${rating.toFixed(1)} / 10 from ${votes.toLocaleString()} users`
        };
      }
      
      return {
        average: "0.0",
        votes: "0",
        formatted: "0.0 / 10 from 0 users"
      }
      
    } catch (error) {
      console.warn(`IMDb attempt ${i + 1} failed:`, error.message);
      
      if (i < 1) {
        // 第一次失败，等待 2 秒后重试
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  
  console.error('IMDb fetch failed');
  return null;
};

/**
 * 异步生成指定豆瓣ID对应的影视信息数据
 * @param {string|number} sid - 豆瓣电影的唯一标识符
 * @param {Object} env - 环境配置对象
 * @returns {Promise<Object>} 返回豆瓣数据对象
 */
export const gen_douban = async (sid, env) => {
  const data = { site: "douban", sid };

  if (!sid) {
    return { ...data, error: "Invalid Douban id" };
  }

  const headers = buildHeaders(env);
  const baseLink = `https://movie.douban.com/subject/${encodeURIComponent(sid)}/`;

  try {
    if (env.ENABLED_CACHE === "false") {
      // 尝试从PtGen Archive获取数据
      const cachedData = await getStaticMediaDataFromOurBits("douban", sid);
      if (cachedData) {
        console.log(`[Cache Hit] GitHub OurBits DB For Douban ${sid}`);
        return { ...data, ...cachedData, success: true };
      }
    }

    // 请求主页面
    let response = await fetchWithTimeout(
      baseLink,
      { headers }
    );

    if (!response) {
      return { ...data, error: "No response from Douban" };
    }

    if (response.status === 404) {
      return { ...data, error: NONE_EXIST_ERROR };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ...data,
        error: isAntiBot(text)
          ? ANTI_BOT_ERROR
          : `Failed to fetch: ${response.status} ${text.slice(0, 200)}`,
      };
    }

    const html = await response.text();

    if (!html || isAntiBot(html) || NOT_FOUND_PATTERN.test(html)) {
      const error = isAntiBot(html) ? ANTI_BOT_ERROR : NONE_EXIST_ERROR;
      return { ...data, error };
    }

    const isValidPage = html.includes('property="v:itemreviewed"') && html.length > 1000;
    if (!isValidPage) {
      return { ...data, error: "Invalid Douban page" };
    }
    // 解析页面
    const $ = page_parser(html);
    const imdbText = fetchAnchorText($('#info span.pl:contains("IMDb")'));
    const hasAwardsSection = $("div.mod").find("div.hd").length > 0;

    const detailedHeaders = { ...headers, Referer: baseLink };
    const concurrentPromises = [];
    let imdbPromiseIndex = -1;
    let celebrityPromiseIndex = -1;
    let awardsPromiseIndex = -1;

    // IMDb请求
    if (imdbText && /^tt\d+$/.test(imdbText)) {
      data.imdb_id = imdbText;
      data.imdb_link = `https://www.imdb.com/title/${imdbText}/`;
      imdbPromiseIndex = concurrentPromises.length;
      concurrentPromises.push(
        Promise.race([
          fetchImdbRating(imdbText, headers),
          new Promise((resolve) => setTimeout(() => resolve({}), 4000)),
        ]),
      );
    }

    // 名人信息请求
    celebrityPromiseIndex = concurrentPromises.length;
    concurrentPromises.push(
      Promise.race([
        fetchCelebritiesInfo(baseLink, detailedHeaders),
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ director: [], writer: [], cast: [] }),
            5000,
          ),
        ),
      ]),
    );

    // 奖项信息请求
    if (hasAwardsSection) {
      awardsPromiseIndex = concurrentPromises.length;
      concurrentPromises.push(
        Promise.race([
          fetchAwardsInfo(baseLink, detailedHeaders),
          new Promise((resolve) => setTimeout(() => resolve([]), 5000)),
        ]),
      );
    }

    // 页面解析和并发请求同时进行
    const [parsedData, ...asyncResults] = await Promise.all([
      Promise.resolve().then(() => {
        const ldJson = parseJsonLd($);
        const title = $("title").text().replace("(豆瓣)", "").trim();
        const foreignTitle = $('span[property="v:itemreviewed"]')
          .text()
          .replace(title, "")
          .trim();
        const yearMatch = $("#content > h1 > span.year").text().match(/\d{4}/);
        const year = yearMatch ? yearMatch[0] : "";

        const akaText = fetchAnchorText($('#info span.pl:contains("又名")'));
        const aka = akaText
          ? akaText
              .split(" / ")
              .map((s) => s.trim())
              .filter(Boolean)
              .sort()
          : [];

        const regionText = fetchAnchorText(
          $('#info span.pl:contains("制片国家/地区")'),
        );
        const region = regionText
          ? regionText
              .split(" / ")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        const languageText = fetchAnchorText(
          $('#info span.pl:contains("语言")'),
        );
        const language = languageText
          ? languageText
              .split(" / ")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        const genre = $('#info span[property="v:genre"]')
          .map(function () {
            return $(this).text().trim();
          })
          .get();

        const playdate = $('#info span[property="v:initialReleaseDate"]')
          .map(function () {
            return $(this).text().trim();
          })
          .get()
          .sort((a, b) => new Date(a) - new Date(b));

        const episodes = fetchAnchorText($('#info span.pl:contains("集数")'));
        const durationText = fetchAnchorText(
          $('#info span.pl:contains("单集片长")'),
        );
        const duration =
          durationText ||
          $('#info span[property="v:runtime"]').text().trim() ||
          "";

        const introSelector =
          '#link-report-intra > span.all.hidden, #link-report-intra > [property="v:summary"], #link-report > span.all.hidden, #link-report > [property="v:summary"]';
        const introduction = $(introSelector)
          .text()
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .join("\n");

        const tags = $('div.tags-body > a[href^="/tag"]')
          .map(function () {
            return $(this).text().trim();
          })
          .get();

        const poster = ldJson.image
          ? String(ldJson.image)
              .replace(/s(_ratio_poster|pic)/g, "l$1")
              .replace("img3", "img1")
              .replace(/\.webp$/, ".jpg")
          : "";

        const doubanRating = parseRatingInfo($, ldJson);

        return {
          douban_link: baseLink,
          chinese_title: title,
          foreign_title: foreignTitle,
          year,
          aka,
          region,
          genre,
          language,
          playdate,
          episodes,
          duration,
          introduction,
          poster,
          tags,
          douban_rating_average: doubanRating.average,
          douban_votes: doubanRating.votes,
          douban_rating: doubanRating.formatted,
        };
      }),
      ...concurrentPromises,
    ]);

    // 组装结果
    Object.assign(data, parsedData);

    if (imdbPromiseIndex >= 0) {
      const imdbInfo = asyncResults[imdbPromiseIndex] || {};
      if (imdbInfo.average) {
        data.imdb_rating_average = imdbInfo.average;
        data.imdb_votes = imdbInfo.votes;
        data.imdb_rating = imdbInfo.formatted;
      }
    }

    if (celebrityPromiseIndex >= 0) {
      const celebritiesInfo = asyncResults[celebrityPromiseIndex] || {};
      Object.assign(data, celebritiesInfo);
    }

    if (awardsPromiseIndex >= 0) {
      data.awards = asyncResults[awardsPromiseIndex] || [];
    }

    data.success = true;
    
    return data;
  } catch (error) {
    return { ...data, error: error?.message || String(error) };
  }
};