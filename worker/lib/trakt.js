import { fetchWithTimeout } from "./common.js";

const TRAKT_API_URL = "https://api.trakt.tv";

/** 构建标准请求头 **/
const getTraktHeaders = (env) => ({
  "Content-Type": "application/json",
  "trakt-api-version": "2",
  "trakt-api-key": env.TRAKT_API_CLIENT_ID || "",
  "User-Agent": env.TRAKT_APP_NAME || "Trakt-Worker",
});

/** 图片 URL 安全处理（避免 https://undefined） **/
const buildImageUrl = (path) => (path && typeof path === "string" && path.length > 0 && path !== "undefined" ? `https://${path}` : "");

/** 统一处理人员数据（cast / crew） */
const normalizePerson = (item, isCrew = false) => {
  const person = item.person || {};
  const images = item.images || person.images || {};
  const headshotUrl = images.headshot?.[0];

  const base = {
    name: person.name || "",
    image: buildImageUrl(headshotUrl),
    links: {
      trakt: person.ids?.trakt ? `https://trakt.tv/people/${person.ids.trakt}` : "",
      slug: person.ids?.slug ? `https://trakt.tv/people/${person.ids.slug}` : "",
      imdb: person.ids?.imdb ? `https://www.imdb.com/name/${person.ids.imdb}` : "",
      tmdb: person.ids?.tmdb ? `https://www.themoviedb.org/person/${person.ids.tmdb}` : "",
    },
  };

  return isCrew
    ? { ...base, job: item.job || "" }
    : { ...base, character: item.character || "" };
};

/** 处理 seasons 数据（过滤无效季） **/
const processSeasons = (seasonsJson) => {
  if (!Array.isArray(seasonsJson)) return null;

  return seasonsJson
    .filter((season) => season.number === 0 || season.images?.poster?.[0] || (season.episode_count || 0) > 0)
    .map((season) => ({
      title: season.title || `Season ${season.number}`,
      poster: buildImageUrl(season.images?.poster?.[0]),
      episodeCount: season.episode_count || 0,
      number: season.number || 0,
    }));
};

/** 解析 slug **/
const parseSlug = (slug) => {
  if (typeof slug === "object" && slug.sid && slug.type) {
    // 支持 { sid: "...", type: "tv" } 或 "shows"/"movies"
    const type = slug.type === "tv" ? "shows" : slug.type;
    return { type, traktSlug: slug.sid };
  }

  if (typeof slug === "string" && slug.includes("/")) {
    const [type, rawSlug] = slug.split("/");
    return { type, traktSlug: rawSlug.split("?")[0] };
  }

  throw new Error("Invalid slug format");
};

export const gen_trakt = async (slug, env) => {
  if (!slug) return { error: "请提供 slug 参数" };
  if (!env.TRAKT_API_CLIENT_ID) {
    return { error: "TraktTV API Client ID 未配置。请在 wrangler.toml 中设置 TRAKT_API_CLIENT_ID 环境变量" };
  }

  try {
    const { type, traktSlug } = parseSlug(slug);
    const isShow = type === "shows";
    const endpoint = isShow ? "shows" : "movies";
    const tmdbType = isShow ? "tv" : "movie";

    const headers = getTraktHeaders(env);

    // === 核心优化：三路请求完全并行（原来是串行）===
    const basicUrl = `${TRAKT_API_URL}/${endpoint}/${encodeURIComponent(traktSlug)}?extended=full`;
    const peopleUrl = `${TRAKT_API_URL}/${endpoint}/${encodeURIComponent(traktSlug)}/people?extended=full,images`;
    const seasonsUrl = isShow ? `${TRAKT_API_URL}/${endpoint}/${encodeURIComponent(traktSlug)}/seasons?extended=full` : null;

    const [basicRes, peopleRes, seasonsRes] = await Promise.all([
      fetchWithTimeout(basicUrl, { headers }),
      fetchWithTimeout(peopleUrl, { headers }),
      seasonsUrl ? fetchWithTimeout(seasonsUrl, { headers }) : Promise.resolve(null),
    ]);

    if (!basicRes.ok) {
      return { error: `Basic info 请求失败: ${basicRes.status}` };
    }

    const basicData = await basicRes.json();
    const ids = basicData.ids || {};

    // 处理人员数据
    let peopleData = { cast: [], directors: [], writers: [] };
    if (peopleRes.ok) {
      const peopleJson = await peopleRes.json();
      peopleData = {
        cast: (peopleJson.cast || []).map((item) => normalizePerson(item)),
        directors: (peopleJson.crew?.directing || []).map((item) => normalizePerson(item, true)),
        writers: (peopleJson.crew?.writing || []).map((item) => normalizePerson(item, true)),
      };
    }

    // 处理季数据
    const seasonsData = seasonsRes && seasonsRes.ok ? processSeasons(await seasonsRes.json()) : null;

    return {
      success: true,
      site: "trakt",
      type: tmdbType,
      slug: ids.slug,
      sid: ids.trakt || "",

      title: basicData.title || basicData.original_title || "",
      year: basicData.year,
      overview: basicData.overview || "",
      poster: buildImageUrl(basicData.images?.poster?.[0]),

      rating: basicData.rating ? Number((basicData.rating * 10).toFixed(2)) : 0,
      votes: basicData.votes || 0,
      rating_format: basicData.rating
        ? `${basicData.rating.toFixed(2)} / 10 from ${basicData.votes} users`
        : "N/A",

      runtime: basicData.runtime || 0,
      released: basicData.released || basicData.first_aired?.split("T")[0] || "",
      country: basicData.country || "",
      genres: basicData.genres || [],
      languages: basicData.languages || [],
      certification: basicData.certification || "",

      // 外部链接
      imdb_link: ids.imdb ? `https://www.imdb.com/title/${ids.imdb}` : "",
      trakt_link: ids.slug ? `https://trakt.tv/${endpoint}/${ids.slug}` : "",
      tmdb_link: ids.tmdb ? `https://www.themoviedb.org/${tmdbType}/${ids.tmdb}` : "",
      tvdb_link: ids.tvdb ? `https://thetvdb.com/${isShow ? "series" : "movies"}/${ids.slug}` : "",

      people: peopleData,
      seasons: seasonsData,
    };
  } catch (error) {
    console.error("[Trakt] Error:", error);

    if (error.name === "AbortError") return { error: "Trakt API 请求超时" };
    if (error.message?.includes("fetch")) return { error: "无法连接到 Trakt API" };

    return { error: error.message || "Trakt 数据获取失败" };
  }
};