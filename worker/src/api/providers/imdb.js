import {fetchWithTimeout} from "../../utils/request.js";
import {getImdbHeaders} from "../../core/config.js";
import {NONE_EXIST_ERROR, DEFAULT_TIMEOUT, DATA_SELECTOR} from "../../core/constants.js";
import {getStaticMediaDataFromOurBits, page_parser, tryParseJson, safeExecuteProvider} from "../../utils/helpers.js";
import logger from "../../logger.js";

/**
 * Sets a property on an object only if the value is defined (not undefined or null).
 * Utility function to avoid adding empty or null properties to data objects.
 * 仅在值已定义（非 undefined 或 null）时在对象上设置属性。
 * 用于避免向数据对象添加空值或 null 属性的工具函数。
 *
 * @param {Object} obj - The target object to set the property on (要设置属性的目标对象)
 * @param {string} key - The property key to set (要设置的属性键)
 * @param {*} val - The value to assign, skipped if undefined or null (要分配的值，如果为 undefined 或 null 则跳过)
 */
const setIfDefined = (obj, key, val) => {
    if (val !== undefined && val !== null) obj[key] = val;
};

/**
 * Parses IMDb page HTML to extract __NEXT_DATA__ JSON and returns Cheerio instance.
 * Attempts to find and parse the Next.js data script, handling errors gracefully.
 * 解析 IMDb 页面 HTML 以提取 __NEXT_DATA__ JSON 并返回 Cheerio 实例。
 * 尝试查找并解析 Next.js 数据脚本，优雅地处理错误。
 *
 * @param {string} htmlContent - The raw HTML content of the IMDb page (IMDb 页面的原始 HTML 内容)
 * @param {string} [dataType="page"] - Type identifier for logging purposes (用于日志记录的类型标识符)
 * @returns {Object} Object containing Cheerio instance and parsed data object (包含 Cheerio 实例和解析后数据对象的对象)
 * @property {Cheerio} info - Cheerio instance for DOM manipulation (用于 DOM 操作的 Cheerio 实例)
 * @property {Object} data - Parsed __NEXT_DATA__ JSON object, empty if parsing failed (解析后的 __NEXT_DATA__ JSON 对象，如果解析失败则为空)
 */
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
                logger.warn(`Failed to parse __NEXT_DATA__ for ${dataType}: invalid JSON format`);
            }
        }
    } catch (e) {
        logger.warn(`Error parsing __NEXT_DATA__ for ${dataType}:`, e);
    }

    return {info: $, data};
};

/**
 * Extracts release dates and alternative titles (AKAs) from IMDb Next.js data structure.
 * Iterates through content categories to find 'releases' and 'akas' sections.
 * 从 IMDb Next.js 数据结构中提取上映日期和别名（AKA）。
 * 遍历内容类别以查找 "releases" 和 "akas" 部分。
 *
 * @param {Object} nextData - The parsed __NEXT_DATA__ object from IMDb page (从 IMDb 页面解析的 __NEXT_DATA__ 对象)
 * @returns {Object} Object containing releases and akas arrays (包含上映日期和别名数组的对象)
 * @property {Array<Object>} releases - Array of release info with country, date, and event (包含国家、日期和事件的上映信息数组)
 * @property {Array<Object>} akas - Array of alternative titles with country, title, and note (包含国家、标题和备注的别称数组)
 */
const extractReleaseAndAkaInfo = (nextData) => {
    const result = {releases: [], akas: []};

    try {
        /** @namespace nextData.props.pageProps.contentData **/
        const categories =
            nextData?.props?.pageProps?.contentData?.categories || [];

        for (const category of categories) {
            const sectionItems = category?.section?.items || [];

            switch (category.id) {
                case "releases":
                    result.releases = sectionItems.map((item) => ({
                        /** @namespace item.rowTitle **/
                        /** @namespace item.listContent **/
                        /** @namespace item.listContent.subText **/
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
        logger.warn("Error extracting release and AKA info:", e);
    }

    return result;
};

/**
 * Extracts age certification/rating information from IMDb Next.js data structure.
 * Maps country-specific certificates and their associated rating details.
 * 从 IMDb Next.js 数据结构中提取年龄认证/分级信息。
 * 映射特定国家的证书及其相关的分级详情。
 *
 * @param {Object} nextData - The parsed __NEXT_DATA__ object from IMDb page (从 IMDb 页面解析的 __NEXT_DATA__ 对象)
 * @returns {Array<Object>} Array of certificate objects with country and ratings (包含国家和分级的证书对象数组)
 */
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

/**
 * Normalizes an IMDb ID by stripping the 'tt' prefix, validating digits, and padding to 7 digits.
 * Returns null if the input is invalid, otherwise returns an object with raw, padded, and formatted IDs.
 * 通过去除 'tt' 前缀、验证数字并填充至 7 位来标准化 IMDb ID。
 * 如果输入无效则返回 null，否则返回包含原始、填充和格式化 ID 的对象。
 *
 * @param {string|number} sid - The raw IMDb ID input (can include or exclude 'tt' prefix) (原始 IMDb ID 输入，可以包含或不包含 'tt' 前缀)
 * @returns {Object|null} Object containing raw, padded, and imdbId strings, or null if invalid (包含 raw、padded 和 imdbId 字符串的对象，如果无效则返回 null)
 * @property {string} raw - The original trimmed input string (原始修剪后的输入字符串)
 * @property {string} padded - The numeric part padded to 7 digits (填充至 7 位的数字部分)
 * @property {string} imdbId - The standardized IMDb ID with 'tt' prefix (带有 'tt' 前缀的标准 IMDb ID)
 */
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

/**
 * Fetches an IMDb page, parses its HTML to extract __NEXT_DATA__, and returns a structured result.
 * Handles network errors and HTTP failures gracefully by returning a standardized error object.
 * 获取 IMDb 页面，解析其 HTML 以提取 __NEXT_DATA__，并返回结构化结果。
 * 通过返回标准化错误对象来优雅地处理网络错误和 HTTP 故障。
 *
 * @param {string} url - The IMDb page URL to fetch (要获取的 IMDb 页面 URL)
 * @param {Object} headers - HTTP headers for the request (请求的 HTTP 头)
 * @param {string} dataType - Type identifier used for logging during parsing (解析期间用于日志记录的类型标识符)
 * @returns {Promise<Object>} Object containing fetch status, parsed data, and response/error details (包含获取状态、解析后数据和响应/错误详情的对象)
 * @property {boolean} ok - Indicates if the fetch and parse were successful (指示获取和解析是否成功)
 * @property {number|string} status - HTTP status code or error identifier (HTTP 状态码或错误标识符)
 * @property {Object} data - Parsed __NEXT_DATA__ object, empty on failure (解析后的 __NEXT_DATA__ 对象，失败时为空)
 * @property {Response} [response] - The original fetch response object if available (如果可用，则为原始获取响应对象)
 * @property {Error} [error] - The error object if a fetch exception occurred (如果发生获取异常，则为错误对象)
 */
const fetchAndParseNextData = async (url, headers, dataType) => {
    try {
        const resp = await fetchWithTimeout(url, {headers}, DEFAULT_TIMEOUT);
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

/**
 * Extracts top cast members from IMDb castV2 data structure.
 * Retrieves the first group of credits and maps each actor to a simplified object.
 * 从 IMDb castV2 数据结构中提取主要演员。
 * 获取第一组演职人员并将每个演员映射为简化的对象。
 *
 * @param {Array<Object>} castV2Data - The castV2 array from IMDb API response (来自 IMDb API 响应的 castV2 数组)
 * @returns {Array<Object>} Array of cast objects with name, image, and character properties (包含姓名、图片和角色属性的演员对象数组)
 */
const extractCast = (castV2Data) => {
    if (!Array.isArray(castV2Data) || castV2Data.length === 0) {
        return [];
    }

    /** @namespace topCastGroup.credits **/
    /** @namespace topCastGroup.credits.name.nameText **/
    /** @namespace topCastGroup.credits.name.primaryImage **/
    /** @namespace credit.creditedRoles.edges **/
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

/**
 * Extracts director and writer information from IMDb crewV2 data structure.
 * Iterates through crew groups and categorizes names based on their role type.
 * 从 IMDb crewV2 数据结构中提取导演和编剧信息。
 * 遍历演职人员组并根据角色类型对姓名进行分类。
 *
 * @param {Array<Object>} crewV2Data - The crewV2 array from IMDb API response (来自 IMDb API 响应的 crewV2 数组)
 * @returns {Object} Object containing directors and writers arrays (包含导演和编剧数组的对象)
 * @property {string[]} directors - Array of director names (导演姓名数组)
 * @property {string[]} writers - Array of writer names (编剧姓名数组)
 */
const extractCrew = (crewV2Data) => {
    const directors = [];
    const writers = [];

    if (!Array.isArray(crewV2Data)) return {directors, writers};

    for (const group of crewV2Data) {
        /** @namespace group.grouping **/
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

    return {directors, writers};
};

/**
 * Builds the main media data object by extracting and mapping fields from IMDb API response.
 * Populates the provided data object with titles, ratings, cast, crew, and metadata.
 * 通过从 IMDb API 响应中提取和映射字段来构建主要媒体数据对象。
 * 使用标题、评分、演员、工作人员和元数据填充提供的数据对象。
 *
 * @param {Object} data - The target object to populate with extracted data (要用提取的数据填充的目标对象)
 * @param {Object} props - The properties object containing aboveTheFoldData and mainColumnData (包含 aboveTheFoldData 和 mainColumnData 的属性对象)
 * @param {string} imdbUrl - The IMDb URL to assign to the link field (要分配给链接字段的 IMDb URL)
 */
const buildMainData = (data, props, imdbUrl) => {
    /** @namespace props.aboveTheFoldData **/
    /** @namespace props.mainColumnData **/
    /** @namespace aboveTheFoldData.releaseDate **/
    /** @namespace mainColumnData.countriesDetails **/
    /** @namespace aboveTheFoldData.originalTitleText **/
    /** @namespace aboveTheFoldData.releaseYear **/
    /** @namespace mainColumnData.spokenLanguages.spokenLanguage **/
    /** @namespace aboveTheFoldData.runtime.displayableProperty.value.plainText **/
    /** @namespace aboveTheFoldData.ratingsSummary.voteCount **/
    /** @namespace aboveTheFoldData.titleType **/
    /** @namespace aboveTheFoldData.plot.plotText **/
    const aboveTheFoldData = props.aboveTheFoldData || {};
    const mainColumnData = props.mainColumnData || {};

    const releaseDateData = aboveTheFoldData.releaseDate;
    const countriesOfOrigin = mainColumnData.countriesDetails?.countries || [];

    setIfDefined(data, "image", aboveTheFoldData.primaryImage?.url);
    setIfDefined(
        data,
        "original_title",
        aboveTheFoldData.originalTitleText?.text,
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
        aboveTheFoldData.runtime?.displayableProperty?.value?.plainText,
    );
    setIfDefined(
        data,
        "rating",
        aboveTheFoldData.ratingsSummary?.aggregateRating || 0,
    );
    setIfDefined(
        data,
        "vote_count",
        aboveTheFoldData.ratingsSummary?.voteCount || 0,
    );

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
    /** @namespace mainColumnData.castV2 **/
    /** @namespace mainColumnData.crewV2 **/
    const cast = extractCast(mainColumnData.castV2);
    if (cast.length > 0) data.cast = cast;

    const {directors, writers} = extractCrew(mainColumnData.crewV2);
    if (directors.length > 0) data.directors = directors;
    if (writers.length > 0) data.writers = writers;
};

// ... existing code ...

/**
 * Asynchronously fetches IMDb media information and returns structured data.
 * Fetches main page, release info, and parental guide concurrently with cache fallback.
 * Uses safeExecuteProvider for unified error handling.
 * 异步获取 IMDb 媒体信息并返回结构化数据。
 * 并发获取主页面、发布信息和家长指引，并带有缓存回退。
 * 使用 safeExecuteProvider 进行统一的错误处理。
 *
 * @param {string|number} sid - The IMDb ID (can include or exclude 'tt' prefix) (IMDb ID，可以包含或不包含 'tt' 前缀)
 * @param {Object} [env={}] - Environment configuration object (环境配置对象)
 * @returns {Promise<Object>} Promise resolving to structured IMDb media data or error details (解析为结构化的 IMDb 媒体数据或错误详情的 Promise)
 */
export const gen_imdb = async (sid, env = {}) => {
    const normalized = normalizeImdbId(sid);
    if (!normalized) return {site: "imdb", sid, error: "Invalid IMDB id"};

    const {padded, imdbId} = normalized;
    const data = {site: "imdb", sid: padded};

    const readArchiveCache = async () => {
        try {
            const cachedData = await getStaticMediaDataFromOurBits("imdb", imdbId);
            if (cachedData) {
                logger.info(`[Cache Hit] GitHub OurBits DB For IMDB ${imdbId}`);
                return {...data, ...cachedData, success: true, _from_ourbits: true};
            }
            return null;
        } catch (e) {
            logger.warn("Archive cache read failed:", e);
            return null;
        }
    };

    return await safeExecuteProvider(async () => {
        if (env.ENABLED_CACHE === "false") {
            const cached = await readArchiveCache();
            if (cached) return cached;
            throw new Error("Cache-only mode enabled, but no cache found.");
        }

        const imdbUrl = `https://www.imdb.com/title/${imdbId}/`;
        const releaseUrl = `https://www.imdb.com/title/${imdbId}/releaseinfo`;
        const parentalUrl = `https://www.imdb.com/title/${imdbId}/parentalguide`;
        const headers = getImdbHeaders();

        const [mainRes, releaseRes, parentalRes] = await Promise.all([
            fetchAndParseNextData(imdbUrl, headers, "main page"),
            fetchAndParseNextData(releaseUrl, headers, "release info"),
            fetchAndParseNextData(parentalUrl, headers, "parental guide"),
        ]);

        if (!mainRes.ok) {
            if (mainRes.status === 404) {
                throw new Error(NONE_EXIST_ERROR);
            }

            const cached = await readArchiveCache();
            if (cached) return cached;

            throw new Error(`Failed to fetch IMDb page (status: ${mainRes.status}).`);
        }

        if (!mainRes.data || Object.keys(mainRes.data).length === 0) {
            const cached = await readArchiveCache();
            if (cached) return cached;
            throw new Error("IMDb page is empty after parsing.");
        }

        const props = mainRes.data?.props?.pageProps;
        if (!props) {
            const cached = await readArchiveCache();
            if (cached) return cached;
            throw new Error("IMDb page parsed but pageProps is empty.");
        }

        buildMainData(data, props, imdbUrl);

        if (releaseRes.ok) {
            const {releases, akas} = extractReleaseAndAkaInfo(releaseRes.data);
            data.aka = akas;
            data.release = releases;
        } else if (releaseRes.error) {
            logger.warn("Release info fetch failed:", releaseRes.error);
        }

        if (parentalRes.ok) {
            const certs = extractCertificates(parentalRes.data);
            if (certs.length > 0) data.certificates = certs;
        } else if (parentalRes.error) {
            logger.warn("Parental guide fetch failed:", parentalRes.error);
        }

        data.success = true;
        return data;
    }, "imdb", padded);
};
