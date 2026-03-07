import {
  NONE_EXIST_ERROR,
  DEFAULT_TIMEOUT,
  page_parser,
  fetchWithTimeout,
} from "./common.js";
import { getStaticMediaDataFromOurBits } from "./utils.js";

const DATA_SELECTOR = "script#__NEXT_DATA__";
const NEWLINE_CLEAN_RE = /[\r\n]/g;

const getHeaders = (() => {
  let cachedHeaders = null;
  return () => {
    if (cachedHeaders) return { ...cachedHeaders };

    cachedHeaders = {
      "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "sec-ch-ua":
        '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Cache-Control": "max-age=0",
      Priority: "u=0, i",
      referer: "https://www.google.com/",
    };

    return { ...cachedHeaders };
  };
})();

const setIfDefined = (obj, key, val) => {
  if (val !== undefined && val !== null) obj[key] = val;
};

const tryParseJson = (text) => {
  if (!text) return null;
  const cleaned = text.replace(NEWLINE_CLEAN_RE, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

const parsePageData = (htmlContent, dataType = "page") => {
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
        console.warn(
          `Failed to parse __NEXT_DATA__ for ${dataType}: invalid JSON format`
        );
      }
    }
  } catch (e) {
    console.warn(`Error parsing __NEXT_DATA__ for ${dataType}:`, e);
  }

  return { info: $, data };
};

const extractReleaseAndAkaInfo = (nextData) => {
  const result = { releases: [], akas: [] };

  try {
    const categories =
      nextData?.props?.pageProps?.contentData?.categories || [];

    for (const category of categories) {
      const sectionItems = category?.section?.items || [];

      switch (category.id) {
        case "releases":
          result.releases = sectionItems.map((item) => ({
            country: item.rowTitle || null,
            date: item.listContent?.[0]?.text || null,
            event: item.listContent?.[0]?.subText || null,
          }));
          break;
        case "akas":
          result.akas = sectionItems.map((item) => ({
            country: item.rowTitle || "(original title)",
            title: item.listContent?.[0]?.text || null,
            note: item.listContent?.[0]?.subText || null,
          }));
          break;
      }
    }
  } catch (e) {
    console.warn("Error extracting release and AKA info:", e);
  }

  return result;
};

const extractCertificates = (nextData) => {
  const certificatesData =
    nextData?.props?.pageProps?.contentData?.certificates || [];

  if (!Array.isArray(certificatesData) || certificatesData.length === 0) {
    return [];
  }

  return certificatesData.map((cert) => ({
    country: cert.country ?? null,
    ratings: Array.isArray(cert.ratings)
      ? cert.ratings.map((rating) => ({
          rating: rating.rating ?? null,
          extraInformation: rating.extraInformation ?? null,
        }))
      : [],
  }));
};

const normalizeImdbId = (sid) => {
  const raw = String(sid ?? "").trim();
  const num = raw.replace(/^tt/, "");
  if (!num || !/^\d+$/.test(num)) return null;

  const padded = num.padStart(7, "0");
  return {
    raw,
    padded,
    imdbId: `tt${padded}`,
  };
};

const fetchAndParseNextData = async (url, headers, dataType) => {
  try {
    const resp = await fetchWithTimeout(url, { headers }, DEFAULT_TIMEOUT);
    if (!resp || !resp.ok) {
      return {
        ok: false,
        status: resp?.status ?? "no response",
        data: {},
        response: resp,
      };
    }

    const html = await resp.text();
    const parsed = parsePageData(html, dataType);
    return {
      ok: true,
      status: resp.status,
      data: parsed.data || {},
      response: resp,
    };
  } catch (error) {
    return {
      ok: false,
      status: "fetch_error",
      data: {},
      error,
    };
  }
};

const extractCast = (castV2Data) => {
  if (!Array.isArray(castV2Data) || castV2Data.length === 0) return [];

  const topCastGroup = castV2Data[0];
  if (!topCastGroup?.credits) return [];

  return topCastGroup.credits
    .map((credit) => ({
      name: credit.name?.nameText?.text || "",
      image: credit.name?.primaryImage?.url || null,
      character:
        credit.creditedRoles?.edges?.[0]?.node?.characters?.edges?.[0]?.node
          ?.name || null,
    }))
    .filter((c) => c.name);
};

const extractCrew = (crewV2Data) => {
  const directors = [];
  const writers = [];

  if (!Array.isArray(crewV2Data)) return { directors, writers };

  for (const group of crewV2Data) {
    const groupType = group.grouping?.text?.toLowerCase();
    const credits = group.credits || [];
    const names = credits
      .map((credit) => credit.name?.nameText?.text)
      .filter(Boolean);

    if (groupType === "director" || groupType === "directors") {
      directors.push(...names);
    } else if (groupType === "writer" || groupType === "writers") {
      writers.push(...names);
    }
  }

  return { directors, writers };
};

const buildMainData = (data, props, imdbUrl) => {
  const aboveTheFoldData = props.aboveTheFoldData || {};
  const mainColumnData = props.mainColumnData || {};

  const releaseDateData = aboveTheFoldData.releaseDate;
  const countriesOfOrigin = mainColumnData.countriesDetails?.countries || [];

  setIfDefined(data, "image", aboveTheFoldData.primaryImage?.url);
  setIfDefined(
    data,
    "original_title",
    aboveTheFoldData.originalTitleText?.text
  );
  setIfDefined(data, "year", aboveTheFoldData.releaseYear?.year);

  data.languages =
    mainColumnData.spokenLanguages?.spokenLanguages?.map((lang) => lang.text) ||
    [];

  if (releaseDateData) {
    data.release_date = {
      year: releaseDateData.year,
      month: releaseDateData.month,
      day: releaseDateData.day,
      country: releaseDateData.country?.text || "",
    };
  }

  setIfDefined(
    data,
    "runtime",
    aboveTheFoldData.runtime?.displayableProperty?.value?.plainText
  );
  setIfDefined(
    data,
    "rating",
    aboveTheFoldData.ratingsSummary?.aggregateRating || 0
  );
  setIfDefined(data, "vote_count", aboveTheFoldData.ratingsSummary?.voteCount || 0);

  data.type =
    aboveTheFoldData.titleType?.categories?.map((c) => c.value)[0] || "";
  data.genres = aboveTheFoldData.genres?.genres?.map((g) => g.text) || [];

  setIfDefined(data, "plot", aboveTheFoldData.plot?.plotText?.plainText);

  data.link = imdbUrl;
  data.origin_country =
    countriesOfOrigin.length > 0
      ? countriesOfOrigin.map((country) => country.text)
      : null;

  if (mainColumnData.episodes) {
    setIfDefined(data, "episodes", mainColumnData.episodes.episodes?.total);
    data.seasons =
      mainColumnData.episodes.seasons?.map((season) => season.number) || [];
  }

  if (aboveTheFoldData?.keywords?.edges) {
    data.keywords = aboveTheFoldData.keywords.edges
      .map((edge) => edge.node?.text)
      .filter(Boolean);
  }

  const cast = extractCast(mainColumnData.castV2);
  if (cast.length > 0) data.cast = cast;

  const { directors, writers } = extractCrew(mainColumnData.crewV2);
  if (directors.length > 0) data.directors = directors;
  if (writers.length > 0) data.writers = writers;
};

export const gen_imdb = async (sid, env = {}) => {
  const normalized = normalizeImdbId(sid);
  if (!normalized) return { site: "imdb", sid, error: "Invalid IMDB id" };

  const { padded, imdbId } = normalized;
  const data = { site: "imdb", sid: padded };

  const readArchiveCache = async () => {
    try {
      const cachedData = await getStaticMediaDataFromOurBits("imdb", imdbId);
      if (cachedData) {
        console.log(`[Cache Hit] GitHub OurBits DB For IMDB ${imdbId}`);
        return { ...data, ...cachedData, success: true, _from_ourbits: true };
      }
      return null;
    } catch (e) {
      console.warn("Archive cache read failed:", e);
      return null;
    }
  };

  try {
    // 规则1：仅当 ENABLED_CACHE === "false" 时先读缓存；不走网络
    if (env.ENABLED_CACHE === "false") {
      const cached = await readArchiveCache();
      if (cached) return cached;
      return {
        ...data,
        error: "Cache-only mode enabled, but no cache found.",
      };
    }

    const imdbUrl = `https://www.imdb.com/title/${imdbId}/`;
    const releaseUrl = `https://www.imdb.com/title/${imdbId}/releaseinfo`;
    const parentalUrl = `https://www.imdb.com/title/${imdbId}/parentalguide`;
    const headers = getHeaders();

    const [mainRes, releaseRes, parentalRes] = await Promise.all([
      fetchAndParseNextData(imdbUrl, headers, "main page"),
      fetchAndParseNextData(releaseUrl, headers, "release info"),
      fetchAndParseNextData(parentalUrl, headers, "parental guide"),
    ]);

    // 规则2：主页面失败时兜底缓存
    if (!mainRes.ok) {
      if (mainRes.status === 404) {
        return { ...data, error: NONE_EXIST_ERROR };
      }

      const cached = await readArchiveCache();
      if (cached) return cached;

      return {
        ...data,
        error: `Failed to fetch IMDb page (status: ${mainRes.status}).`,
        originalError: mainRes.error || mainRes.response || null,
      };
    }

    // 规则2：主页面解析为空时兜底缓存
    if (!mainRes.data || Object.keys(mainRes.data).length === 0) {
      const cached = await readArchiveCache();
      if (cached) return cached;
      return { ...data, error: "IMDb page is empty after parsing." };
    }

    const props = mainRes.data?.props?.pageProps;
    if (!props) {
      const cached = await readArchiveCache();
      if (cached) return cached;
      return { ...data, error: "IMDb page parsed but pageProps is empty." };
    }

    buildMainData(data, props, imdbUrl);

    // 可选：release info
    if (releaseRes.ok) {
      const { releases, akas } = extractReleaseAndAkaInfo(releaseRes.data);
      data.aka = akas;
      data.release = releases;
    } else if (releaseRes.error) {
      console.warn("Release info fetch failed:", releaseRes.error);
    }

    // 可选：parental guide
    if (parentalRes.ok) {
      const certs = extractCertificates(parentalRes.data);
      if (certs.length > 0) data.certificates = certs;
    } else if (parentalRes.error) {
      console.warn("Parental guide fetch failed:", parentalRes.error);
    }

    data.success = true;
    return data;
  } catch (error) {
    console.error("IMDb processing error:", error);
    return {
      site: "imdb",
      sid: padded,
      error: `IMDb processing error: ${error?.message || error}`,
      originalError: error,
    };
  }
};