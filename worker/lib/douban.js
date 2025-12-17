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
 * 提取名人信息的通用函数
 * @param {Object} $ - cheerio实例
 * @param {string} section - 区块名称（导演/编剧/演员）
 * @param {boolean} extractRole - 是否提取角色信息
 * @returns {Array} 名人信息数组
 */
const extractCelebrities = ($, section, extractRole = false) => {
  const celebrities = [];
  $(`.list-wrapper h2:contains("${section}")`)
    .closest(".list-wrapper")
    .find(".celebrities-list .celebrity")
    .each(function () {
      const $el = $(this);
      const name = $el.find(".info .name a").text().trim();

      if (!name) return;

      const link = $el.find(".info .name a").attr("href") || "";
      const roleText = $el.find(".info .role").text().trim();

      let role = "";
      if (extractRole && roleText) {
        const roleMatch = roleText.match(/饰\s*([^()]+)/);
        role = roleMatch ? `饰 ${roleMatch[1].trim()}` : "";
      } else {
        role = roleText;
      }

      const avatarMatch = $el
        .find(".avatar")
        .attr("style")
        ?.match(/url\(([^)]+)\)/);
      const avatar = avatarMatch ? avatarMatch[1] : "";

      celebrities.push({ name, link, role, avatar });
    });

  return celebrities;
};

/**
 * 获取名人信息（导演、编剧、演员）
 * @param {string} baseLink - 基础URL
 * @param {Object} headers - 请求头
 * @returns {Promise<Object>} 包含导演、编剧、演员信息的对象
 */
const fetchCelebritiesInfo = async (baseLink, headers) => {
  try {
    // 添加重试逻辑，最多重试3次
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetchWithTimeout(
          `${baseLink}celebrities`,
          { headers }
        );

        if (!response?.ok) {
          lastError = new Error(
            `HTTP ${response?.status}: ${response?.statusText}`
          );
          // 如果是客户端错误(4xx)，不重试
          if (response?.status >= 400 && response?.status < 500) {
            break;
          }
          continue;
        }

        const html = await response.text();
        const $ = page_parser(html);

        return {
          director: extractCelebrities($, "导演"),
          writer: extractCelebrities($, "编剧"),
          cast: extractCelebrities($, "演员", true),
        };
      } catch (error) {
        lastError = error;
        // 如果是超时错误，继续重试
        if (error?.name === "AbortError" && i < 2) {
          console.warn(
            `Celebrities fetch attempt ${i + 1} failed, retrying...`,
            error.message
          );
          continue;
        }
        // 其他错误直接抛出
        break;
      }
    }

    console.error("Celebrities fetch failed after retries:", lastError);
    return {};
  } catch (error) {
    console.error("Celebrities fetch error:", error);
    return {};
  }
};

/**
 * 获取奖项信息
 * @param {string} baseLink - 基础URL
 * @param {Object} headers - 请求头
 * @returns {Promise<Array>} 奖项信息数组
 */
const fetchAwardsInfo = async (baseLink, headers) => {
  try {
    // 添加重试逻辑，最多重试3次
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetchWithTimeout(
          `${baseLink}awards`,
          { headers },
          8000
        );

        if (!response?.ok) {
          lastError = new Error(
            `HTTP ${response?.status}: ${response?.statusText}`
          );
          // 如果是客户端错误(4xx)，不重试
          if (response?.status >= 400 && response?.status < 500) {
            break;
          }
          continue;
        }

        const html = await response.text();
        const $ = page_parser(html);
        const awardSections = [];

        $(".awards").each(function () {
          const $awards = $(this);
          const $hd = $awards.find(".hd h2");
          const festival = $hd.find("a").text().trim();
          const year = $hd.find(".year").text().trim();
          const festivalFull = `${festival} ${year}`;
          const sectionLines = [festivalFull];

          $awards.find("ul.award").each(function () {
            const $ul = $(this);
            const items = $ul.find("li");

            if (items.length >= 2) {
              const category = $(items[0]).text().trim();
              const winners = $(items[1]).text().trim();
              const awardInfo = winners ? `${category} ${winners}` : category;
              sectionLines.push(awardInfo);
            }
          });

          if (sectionLines.length > 1) {
            awardSections.push(sectionLines.join("\n"));
          }
        });

        const awardsText = awardSections.join("\n\n");
        return parseDoubanAwards(awardsText);
      } catch (error) {
        lastError = error;
        // 如果是超时错误，继续重试
        if (error?.name === "AbortError" && i < 2) {
          console.warn(
            `Awards fetch attempt ${i + 1} failed, retrying...`,
            error.message
          );
          continue;
        }
        // 其他错误直接抛出
        break;
      }
    }

    console.error("Awards fetch failed after retries:", lastError);
    return [];
  } catch (error) {
    console.error("Awards fetch error:", error);
    return [];
  }
};

/**
 * 获取IMDb评分信息
 * @param {string} imdbId - IMDb ID
 * @param {Object} headers - 请求头
 * @returns {Promise<Object|null>} IMDb评分信息
 */
const fetchImdbRating = async (imdbId, headers) => {
  try {
    // 添加重试逻辑，最多重试3次
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        const url = `https://p.media-imdb.com/static-content/documents/v1/title/${imdbId}/ratings%3Fjsonp=imdb.rating.run:imdb.api.title.ratings/data.json`;
        const response = await fetchWithTimeout(url, { headers }, 8000);

        if (!response?.ok) {
          lastError = new Error(
            `HTTP ${response?.status}: ${response?.statusText}`
          );
          // 如果是客户端错误(4xx)，不重试
          if (response?.status >= 400 && response?.status < 500) {
            break;
          }
          continue;
        }

        const raw = await response.text();
        const json = jsonp_parser(raw);

        if (!json?.resource) {
          lastError = new Error("Invalid JSON response");
          continue;
        }

        const average = json.resource.rating || 0;
        const votes = json.resource.ratingCount || 0;

        return {
          average,
          votes,
          formatted: `${average} / 10 from ${votes} users`,
        };
      } catch (error) {
        lastError = error;
        // 如果是超时错误，继续重试
        if (error?.name === "AbortError" && i < 2) {
          console.warn(
            `IMDb rating fetch attempt ${i + 1} failed, retrying...`,
            error.message
          );
          continue;
        }
        // 其他错误直接抛出
        break;
      }
    }

    console.error("IMDb rating fetch failed after retries:", lastError);
    return null;
  } catch (error) {
    console.error("IMDb API error:", error);
    return null;
  }
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
  const baseLink = `https://movie.douban.com/subject/${encodeURIComponent(
    sid
  )}/`;
  const mobileLink = `https://m.douban.com/movie/subject/${encodeURIComponent(
    sid
  )}/`;

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

    // 如果主页面失败，尝试移动端
    const retryStatuses = new Set([204, 403, 521]);
    if (!response || retryStatuses.has(response.status)) {
      try {
        const mobileResponse = await fetchWithTimeout(
          mobileLink,
          { headers }
        );
        if (mobileResponse?.ok) {
          response = mobileResponse;
        }
      } catch (error) {
        console.warn(`Mobile page fallback failed for ${sid}:`, error);
      }
    }

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

    if (NOT_FOUND_PATTERN.test(html)) {
      return { ...data, error: NONE_EXIST_ERROR };
    }

    if (isAntiBot(html)) {
      return { ...data, error: ANTI_BOT_ERROR };
    }

    // 解析页面
    const $ = page_parser(html);
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
      $('#info span.pl:contains("制片国家/地区")')
    );
    const region = regionText
      ? regionText
          .split(" / ")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const languageText = fetchAnchorText($('#info span.pl:contains("语言")'));
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
      $('#info span.pl:contains("单集片长")')
    );
    const duration =
      durationText || $('#info span[property="v:runtime"]').text().trim() || "";

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
    const imdbText = fetchAnchorText($('#info span.pl:contains("IMDb")'));
    let imdbInfo = {};
    if (imdbText && /^tt\d+$/.test(imdbText)) {
      data.imdb_id = imdbText;
      data.imdb_link = `https://www.imdb.com/title/${imdbText}/`;
      imdbInfo = (await fetchImdbRating(imdbText, headers)) || {};
    }

    // 并发获取名人和奖项信息
    const [celebritiesInfo, awards] = await Promise.all([
      fetchCelebritiesInfo(baseLink, headers),
      fetchAwardsInfo(baseLink, headers),
    ]);

    Object.assign(data, {
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
      ...celebritiesInfo,
      awards,
    });

    if (imdbInfo.average) {
      data.imdb_rating_average = imdbInfo.average;
      data.imdb_votes = imdbInfo.votes;
      data.imdb_rating = imdbInfo.formatted;
    }

    data.success = true;

    return data;
  } catch (error) {
    return { ...data, error: error?.message || String(error) };
  }
};
