import {fetchWithTimeout} from "../../utils/request.js";
import {safeExecuteProvider} from "../../utils/helpers.js";
import logger from "../../logger.js";

const TRAKT_API_URL = "https://api.trakt.tv";

/**
 * Get Trakt API request headers
 * 获取 Trakt API 请求头
 * @param {Object} env - Environment configuration object containing API credentials
 *                     包含 API 凭证的环境配置对象
 * @returns {Object} Headers object for Trakt API requests
 *                  Trakt API 请求的头对象
 */
const getTraktHeaders = (env) => ({
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": env.TRAKT_API_CLIENT_ID || "",
    "User-Agent": env.TRAKT_APP_NAME || "Trakt-Worker",
});

/**
 * Build complete image URL from path string
 * 从路径字符串构建完整的图片 URL
 * @param {string} path - Image path or URL (may be incomplete or invalid)
 *                       图片路径或 URL(可能不完整或无效)
 * @returns {string} Complete image URL starting with https://, or empty string if invalid
 *                  以 https:// 开头的完整图片 URL,如果无效则返回空字符串
 */
const buildImageUrl = (path) => (path && typeof path === "string" && path.length > 0 && path !== "undefined" ? `https://${path}` : "");

/**
 * Normalize person data from Trakt API response
 * 标准化 Trakt API 响应中的人员数据
 * @param {Object} item - Person data object from Trakt API
 *                         返回的人员数据对象
 * @param {boolean} isCrew - Whether this person is crew member (true) or cast member (false)
 *                          该人员是否为剧组成员(true)或演员(false)
 * @returns {Object} Normalized person object with name, image, links, and role information
 *                  标准化的人员对象,包含姓名、图片、链接和角色信息
 */
const normalizePerson = (item, isCrew = false) => {
    /** @namespace item.person **/
    /** @namespace images.headshot **/
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
        ? {...base, job: item.job || ""}
        : {...base, character: item.character || ""};
};

/**
 * Process and filter season data from Trakt API response
 * 处理并过滤 Trakt API 响应中的季数据
 * @param {Array} seasonsJson - Array of season objects from Trakt API
 *                             Trakt API 返回的季对象数组
 * @returns {Array|null} Filtered and normalized season array, or null if input is invalid
 *                      过滤和标准化后的季数组,如果输入无效则返回 null
 */
const processSeasons = (seasonsJson) => {
    if (!Array.isArray(seasonsJson)) return null;
    /** @namespace season.episode_count **/
    return seasonsJson
        .filter((season) => season.number === 0 || season.images?.poster?.[0] || (season.episode_count || 0) > 0)
        .map((season) => ({
            title: season.title || `Season ${season.number}`,
            poster: buildImageUrl(season.images?.poster?.[0]),
            episodeCount: season.episode_count || 0,
            number: season.number || 0,
        }));
};

/**
 * Parse Trakt slug or object to extract type and slug information
 * 解析 Trakt slug或对象以提取类型和slug信息
 * @param {string|Object} slug - Trakt slug string (e.g., "shows/breaking-bad") or object with sid and type
 *                              Trakt slug字符串(如 "shows/breaking-bad")或包含sid和type的对象
 * @returns {{type: string, traktSlug: string}} Object containing media type and slug
 *                                             包含媒体类型和slug的对象
 * @throws {Error} Throws error if slug format is invalid
 *                如果slug格式无效则抛出错误
 */
const parseSlug = (slug) => {
    if (typeof slug === "object" && slug.sid && slug.type) {
        const type = slug.type === "tv" ? "shows" : slug.type;
        return {type, traktSlug: slug.sid};
    }

    if (typeof slug === "string" && slug.includes("/")) {
        const [type, rawSlug] = slug.split("/");
        return {type, traktSlug: rawSlug.split("?")[0]};
    }
    logger.debug(`parseSlug: ${slug}`);
    throw new Error("Invalid slug format");
};

/**
 * Generate Trakt media information for a given slug
 * 为给定的slug生成 Trakt 媒体信息
 * @param {string|Object} slug - Trakt slug string or object with sid and type
 *                              Trakt slug字符串或包含sid和type的对象
 * @param {Object} env - Environment configuration object containing API credentials
 *                     包含 API 凭证的环境配置对象
 * @returns {Promise<Object>} Processed Trakt media data or error object
 *                           处理后的 Trakt 媒体数据或错误对象
 */
export const gen_trakt = async (slug, env) => {
    return await safeExecuteProvider(async () => {
        if (!slug) {
            throw new Error("请提供 slug 参数");
        }

        if (!env.TRAKT_API_CLIENT_ID) {
            throw new Error("TraktTV API Client ID 未配置。请在 wrangler.toml 中设置 TRAKT_API_CLIENT_ID 环境变量");
        }

        const {type, traktSlug} = parseSlug(slug);
        const isShow = type === "shows";
        const endpoint = isShow ? "shows" : "movies";
        const tmdbType = isShow ? "tv" : "movie";
        const headers = getTraktHeaders(env);
        const basicUrl = `${TRAKT_API_URL}/${endpoint}/${encodeURIComponent(traktSlug)}?extended=full`;
        const peopleUrl = `${TRAKT_API_URL}/${endpoint}/${encodeURIComponent(traktSlug)}/people?extended=full,images`;
        const seasonsUrl = isShow ? `${TRAKT_API_URL}/${endpoint}/${encodeURIComponent(traktSlug)}/seasons?extended=full` : null;
        const [basicRes, peopleRes, seasonsRes] = await Promise.all([
            fetchWithTimeout(basicUrl, {headers}),
            fetchWithTimeout(peopleUrl, {headers}),
            seasonsUrl ? fetchWithTimeout(seasonsUrl, {headers}) : Promise.resolve(null),
        ]);

        if (!basicRes.ok) {
            logger.warn("Trakt API basic info non-ok response:", basicRes.status, await basicRes);
            throw new Error(`Basic info 请求失败: ${basicRes.status}`);
        }

        const basicData = await basicRes.json();
        const ids = basicData.ids || {};
        /** @namespace peopleJson.crew.directing **/
        /** @namespace peopleJson.crew.writing **/
        let peopleData = {cast: [], directors: [], writers: []};
        if (peopleRes.ok) {
            const peopleJson = await peopleRes.json();
            peopleData = {
                cast: (peopleJson.cast || []).map((item) => normalizePerson(item)),
                directors: (peopleJson.crew?.directing || []).map((item) => normalizePerson(item, true)),
                writers: (peopleJson.crew?.writing || []).map((item) => normalizePerson(item, true)),
            };
        }

        // Process season data
        // 处理季数据
        const seasonsData = seasonsRes && seasonsRes.ok ? processSeasons(await seasonsRes.json()) : null;

        return {
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

            /** @namespace ids.tvdb **/
            imdb_link: ids.imdb ? `https://www.imdb.com/title/${ids.imdb}` : "",
            trakt_link: ids.slug ? `https://trakt.tv/${endpoint}/${ids.slug}` : "",
            tmdb_link: ids.tmdb ? `https://www.themoviedb.org/${tmdbType}/${ids.tmdb}` : "",
            tvdb_link: ids.tvdb ? `https://thetvdb.com/${isShow ? "series" : "movies"}/${ids.slug}` : "",

            people: peopleData,
            seasons: seasonsData,
        };
    }, "trakt", typeof slug === "object" ? slug.sid : slug);
};
