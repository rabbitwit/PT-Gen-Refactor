import { NONE_EXIST_ERROR, DEFAULT_TIMEOUT, page_parser, fetchWithTimeout, generateImdbFormat } from "./common.js";

const DATA_SELECTOR = 'script#__NEXT_DATA__';
const NEWLINE_CLEAN_RE = /[\r\n]/g;

// 缓存 headers 避免重复构建
let cachedHeaders = null;

/**
 * 尝试解析JSON字符串
 * @param {string} text - 需要解析的JSON字符串
 * @returns {object|null} 解析成功的JSON对象，如果解析失败或输入为空则返回null
 */
const tryParseJson = text => {
  if (!text) return null;
  const cleaned = text.replace(NEWLINE_CLEAN_RE, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

/**
 * 获取HTTP请求头对象
 * 
 * @returns {Object} 返回包含浏览器请求头信息的对象副本
 * 
 * 该函数用于生成模拟浏览器请求的HTTP头信息，包含User-Agent、Accept、
 * Accept-Language等标准浏览器请求头。函数内部使用缓存机制，首次调用时
 * 创建请求头对象并缓存，后续调用直接返回缓存对象的副本，提高性能。
 */
const getHeaders = () => {
  if (cachedHeaders) return { ...cachedHeaders };
  cachedHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Cache-Control': 'max-age=0',
    'Priority': 'u=0, i'
  };
  return { ...cachedHeaders };
};

/**
 * 解析页面数据函数
 * @param {string} htmlContent - HTML内容字符串
 * @param {string} dataType - 数据类型，默认为'page'
 * @returns {Object} 包含解析信息和数据的对象
 */
const parsePageData = (htmlContent, dataType = 'page') => {
  const $ = page_parser(htmlContent);
  let data = {};

  try {
    const $dataElement = $(DATA_SELECTOR);
    if ($dataElement.length > 0) {
      const htmlStr = $dataElement.first().html();
      const parsed = tryParseJson(htmlStr);
      if (parsed) {
        data = parsed;
      } else {
        console.warn(`Failed to parse __NEXT_DATA__ for ${dataType}: invalid JSON format`);
      }
    }
  } catch (e) {
    console.warn(`Error parsing __NEXT_DATA__ for ${dataType}:`, e);
  }

  return {
    info: $,
    data: data
  };
};

/**
 * 提取发布信息和别名信息
 * @param {Object} nextData - 从页面中解析出的NEXT_DATA数据
 * @returns {Object} 包含releases和akas两个数组的对象
 */
const extractReleaseAndAkaInfo = (nextData) => {
  const result = {
    releases: [],
    akas: []
  };

  try {
    const categories = nextData?.props?.pageProps?.contentData?.categories || [];

    for (const category of categories) {
      const sectionItems = category?.section?.items || [];
      if (category.id === 'releases') {
        result.releases = sectionItems.map(item => ({
          country: item.rowTitle || null,
          date: item.listContent?.[0]?.text || null,
          event: item.listContent?.[0]?.subText || null
        }));
      } else if (category.id === 'akas') {
        result.akas = sectionItems.map(item => ({
          country: item.rowTitle || '(original title)',
          title: item.listContent?.[0]?.text || null,
          note: item.listContent?.[0]?.subText || null
        }));
      }
    }
  } catch (e) {
    console.warn("Error extracting release and AKA info:", e);
  }

  return result;
};

/**
 * 异步生成指定 IMDb ID 对应的影视信息数据。
 *
 * @param {string|number} sid - IMDb 的唯一标识符（可带或不带前缀 "tt"）。
 * @returns {Promise<object>} 返回一个包含 IMDb 数据的对象，包括基础信息、演员表、导演编剧、分级证书等，
 *                            若发生错误则返回带有 error 字段的失败信息。
 */
export const gen_imdb = async (sid) => {
  let raw = String(sid).trim();
  if (raw.startsWith('tt')) raw = raw.slice(2);
  const data = { site: "imdb", sid: raw.padStart(7, '0') };
  try {
    if (!sid) return Object.assign(data, { error: "Invalid IMDB id" });

    const imdb_id = 'tt' + raw.padStart(7, '0');
    const imdb_url = `https://www.imdb.com/title/${imdb_id}/`;
    const imdb_url_release_info = `https://www.imdb.com/title/${imdb_id}/releaseinfo`;
    const imdb_url_mpaa = `https://www.imdb.com/title/${imdb_id}/parentalguide`;

    const headers = getHeaders();

    const [pageResult, releaseInfoResult, mpaaResult] = await Promise.allSettled([
      fetchWithTimeout(imdb_url, { headers }, DEFAULT_TIMEOUT),
      fetchWithTimeout(imdb_url_release_info, { headers }, DEFAULT_TIMEOUT),
      fetchWithTimeout(imdb_url_mpaa, { headers }, DEFAULT_TIMEOUT),
    ]);

    if (pageResult.status === 'rejected') {
      console.error("IMDb fetch error:", pageResult.reason);
      return Object.assign(data, {
        error: "Failed to fetch IMDb page. This may be due to network issues or Cloudflare protection."
      });
    }

    const pageResp = pageResult.value;
    if (!pageResp || !pageResp.ok) {
      const status = pageResp ? pageResp.status : 'no response';
      if (pageResp && pageResp.status === 404) return Object.assign(data, { error: NONE_EXIST_ERROR });
      return Object.assign(data, {
        error: `IMDb page request failed with status ${status}. This may be due to Cloudflare protection.`
      });
    }

    const pageHtml = await pageResp.text();
    const pageData = parsePageData(pageHtml);
    const aboveTheFoldData = pageData.data.props?.pageProps?.aboveTheFoldData || {};
    const releaseDateData = aboveTheFoldData.releaseDate;
    const countriesOfOrigin = pageData.data.props?.pageProps?.mainColumnData?.countriesDetails?.countries || [];
    const castV2Data = pageData.data.props?.pageProps?.mainColumnData?.castV2;
    const crewV2Data = pageData.data.props?.pageProps?.mainColumnData?.crewV2;

    if (releaseInfoResult.status === 'fulfilled') {
      const releaseInfoResp = releaseInfoResult.value;
      if (releaseInfoResp && releaseInfoResp.ok) {
        const releaseInfoHtml = await releaseInfoResp.text();
        const releaseData = parsePageData(releaseInfoHtml, 'release info');
        const { releases, akas } = extractReleaseAndAkaInfo(releaseData.data);
        data.aka = akas;
        data.release = releases;
      }
    } else {
      console.warn("Release info fetch failed:", releaseInfoResult.reason);
    }

    if (mpaaResult.status === 'fulfilled') {
      const parentalGuideResp = mpaaResult.value;
      if (parentalGuideResp && parentalGuideResp.ok) {
        const parentalGuideHtml = await parentalGuideResp.text();
        const parentalGuideData = parsePageData(parentalGuideHtml, 'parental guide');
        const certificatesData = parentalGuideData.data.props?.pageProps?.contentData?.certificates || [];
        if (Array.isArray(certificatesData) && certificatesData.length > 0) {
          data.certificates = certificatesData.map(cert => ({
            country: cert.country,
            ratings: cert.ratings.map(rating => ({
              rating: rating.rating,
              extraInformation: rating.extraInformation
            }))
          }));
        }
      }
    } else {
      console.warn("Parental guide fetch failed:", mpaaResult.reason);
    }

    data.image = aboveTheFoldData.primaryImage?.url || null;
    data.original_title = aboveTheFoldData.originalTitleText?.text || '';
    const releaseYear = aboveTheFoldData.releaseYear?.year;
    data.year = releaseYear !== undefined ? releaseYear : null;
    data.languages = pageData.data.props?.pageProps?.mainColumnData.spokenLanguages?.spokenLanguages?.map(lang => lang.text) || [];

    if (releaseDateData) {
      data.release_date = {
        year: releaseDateData.year,
        month: releaseDateData.month,
        day: releaseDateData.day,
        country: releaseDateData.country?.text || ''
      };
    }
    data.runtime = aboveTheFoldData.runtime?.displayableProperty?.value?.plainText || null;
    data.rating = aboveTheFoldData.ratingsSummary?.aggregateRating || 0;
    data.vote_count = aboveTheFoldData.ratingsSummary?.voteCount || 0;
    data.type = aboveTheFoldData.titleType?.categories?.map(c => c.value) || [];
    data.genres = aboveTheFoldData.genres?.genres?.map(g => g.text) || [];
    data.plot = aboveTheFoldData.plot?.plotText?.plainText || null;
    data.link = imdb_url;
    data.origin_country = countriesOfOrigin.length > 0 ? countriesOfOrigin.map(country => country.text) : null;

    if (pageData.data.props?.pageProps?.mainColumnData?.episodes) {
      data.episodes = pageData.data.props?.pageProps?.mainColumnData?.episodes?.episodes.total;
      data.seasons = pageData.data.props?.pageProps?.mainColumnData?.episodes?.seasons.map(season => season.number) || [];
    }

    if (aboveTheFoldData?.keywords?.edges) {
      data.keywords = aboveTheFoldData.keywords.edges.map(edge => edge.node?.text).filter(Boolean);
    }

    if (Array.isArray(castV2Data) && castV2Data.length > 0) {
      const topCastGroup = castV2Data[0];
      if (topCastGroup?.credits) {
        data.cast = topCastGroup.credits
          .map(credit => ({
            name: credit.name?.nameText?.text || '',
            image: credit.name?.primaryImage?.url || null,
            character: credit.creditedRoles?.edges?.[0]?.node?.characters?.edges?.[0]?.node?.name || null
          }))
          .filter(c => c.name); // 过滤掉无名角色
      }
    }

    if (Array.isArray(crewV2Data)) {
      const directors = [];
      const writers = [];

      for (const group of crewV2Data) {
        const groupType = group.grouping?.text?.toLowerCase();
        const credits = group.credits || [];
        const names = credits.map(credit => credit.name?.nameText?.text).filter(Boolean);

        if (groupType === 'director') {
          directors.push(...names);
        } else if (groupType === 'writers') {
          writers.push(...names);
        }
      }

      if (directors.length > 0) data.directors = directors;
      if (writers.length > 0) data.writers = writers;
    }

    data.format = generateImdbFormat(data);
    data.success = true;
    console.log("IMDb data successfully generated");
    return data;
  } catch (error) {
    console.error("IMDb processing error:", error);
    return Object.assign({ site: "imdb", sid }, {
      error: `IMDb processing error: ${error?.message || error}`
    });
  }
};