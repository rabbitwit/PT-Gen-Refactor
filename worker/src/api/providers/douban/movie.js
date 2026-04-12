import {NONE_EXIST_ERROR, ANTI_BOT_ERROR, NOT_FOUND_PATTERN} from "../../../core/constants.js";
import {isAntiBot, getDouBanHeaders} from "../../../core/config.js";
import {
    page_parser,
    getStaticMediaDataFromOurBits,
    parseDoubanAwards,
    safe,
    fetchAnchorText,
    parseJsonLd,
    safeExecuteProvider
} from "../../../utils/helpers.js";
import {fetchWithTimeout} from "../../../utils/request.js";
import logger from "../../../logger.js";

/**
 * Parses rating information from both JSON-LD data and page DOM elements.
 * Combines structured data with fallback values from the page to ensure accuracy.
 * 从 JSON-LD 数据和页面 DOM 元素中解析评分信息。
 * 结合结构化数据和页面回退值以确保准确性。
 *
 * @param {Cheerio} $ - Cheerio instance for DOM manipulation (用于 DOM 操作的 Cheerio 实例)
 * @param {Object} ldJson - JSON-LD data object containing aggregate rating metadata (包含综合评分元数据的 JSON-LD 数据对象)
 * @returns {Object} Object containing parsed rating details (包含解析后评分详情的对象)
 * @property {string} average - The average rating value (平均评分值)
 * @property {string} votes - The total number of votes/ratings (总投票/评分数)
 * @property {string} formatted - Human-readable rating string (e.g., "8.5 / 10 from 1000 users") (人类可读的评分字符串，如 "8.5 / 10 from 1000 users")
 */
const parseRatingInfo = ($, ldJson) => {
    /** @namespace ldJson.aggregateRating **/
    /** @namespace ratingInfo.ratingValue **/
    /** @namespace ratingInfo.ratingCount **/
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
 * Cleans and extracts role information from actor/voice actor text.
 * Handles both acting roles (饰) and voice acting roles (配), extracting the character name.
 * 清理并提取演员/配音演员文本中的角色信息。
 * 处理表演角色（饰）和配音角色（配），提取角色名称。
 *
 * @param {string} text - The raw role text containing role indicator and character name (包含角色指示符和角色名称的原始角色文本)
 * @param {boolean} clean - Flag indicating whether to perform cleaning operation (指示是否执行清理操作的标志)
 * @returns {string} Cleaned role text with extracted character name, or original text if cleaning is disabled (提取角色名称后的清理后角色文本，如果禁用清理则返回原始文本)
 */
const cleanRoleText = (text, clean) => {
    if (!clean || !text) {
        return text || "";
    }

    if (text.includes("饰")) {
        const match = text.match(/饰\s*([^()]+)/);
        return match ? `饰 ${match[1].trim()}` : text;
    }

    if (text.includes("配")) {
        const match = text.match(/配\s*([^()]+)/);
        return match ? `配 ${match[1].trim()}` : text;
    }

    return text;
};

/**
 * Extracts celebrity information (directors, actors, etc.) from a specific section of the page.
 * Parses name, link, role, and avatar URL for each celebrity entry.
 * 从页面的特定部分中提取名人信息（导演、演员等）。
 * 解析每个名人条目的姓名、链接、角色和头像 URL。
 *
 * @param {cheerio} $ - Cheerio instance for DOM manipulation (用于 DOM 操作的 Cheerio 实例)
 * @param {string} section - The section title to search for (e.g., "导演", "主演") (要搜索的部分标题，如 "导演"、"主演")
 * @param {boolean} [extractRole=false] - Flag indicating whether to extract and clean role information (指示是否提取和清理角色信息的标志)
 * @returns {Array<Object>} Array of celebrity objects with name, link, role, and avatar properties (包含姓名、链接、角色和头像属性的名人对象数组)
 */
const extractCelebrities = ($, section, extractRole = false) => {
    if (!$ || !section || typeof section !== 'string') {
        return [];
    }

    const result = [];

    try {
        $('.list-wrapper').each((_, wrapperEl) => {
            const $wrapper = $(wrapperEl);
            const $h2 = $wrapper.find('h2').first();

            if ($h2.length &&
                $h2.text().trim().toLowerCase().includes(section.toLowerCase())) {

                $wrapper.find('.celebrity').each((_, el) => {
                    const $el = $(el);
                    const $nameLink = $el.find('.name a');
                    const name = $nameLink.text().trim();

                    if (name) {
                        const avatarNode = $el.find('.avatar').get(0);
                        const avatarStyle = avatarNode?.attribs?.style || '';
                        const avatarMatch = avatarStyle.match(/url\(['"]?([^'")]+)['"]?\)/i);
                        const avatar = avatarMatch ? avatarMatch[1].trim() : '';
                        const linkNode = $nameLink.get(0);
                        const link = linkNode?.attribs?.href || '';

                        result.push({
                            name,
                            link,
                            role: cleanRoleText($el.find('.role').text().trim(), extractRole),
                            avatar,
                        });
                    }
                });

                return false;
            }
        });
    } catch (e) {
        logger.warn(`Extract ${section} error:`, e.message);
    }

    return result;
};

/**
 * Fetches celebrity information (directors, writers, cast) from Douban celebrities page with retry logic.
 * Implements exponential backoff for timeout errors and handles HTTP errors appropriately.
 * 从豆瓣名人页面获取名人信息（导演、编剧、演员），带有重试逻辑。
 * 对超时错误实施指数退避，并适当处理 HTTP 错误。
 *
 * @param {string} baseLink - The base URL for the Douban movie page (豆瓣电影页面的基础 URL)
 * @param {Object} headers - HTTP headers for the request (请求的 HTTP 头)
 * @returns {Promise<Object>} Object containing director, writer, and cast arrays, or empty arrays on failure (包含导演、编剧和演员数组的对象，失败时返回空数组)
 */
const fetchCelebritiesInfo = async (baseLink, headers) => {
    const EMPTY = {director: [], writer: [], cast: []};
    const MAX_RETRIES = 2;
    const TIMEOUT = 6000;
    let lastError;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const response = await fetchWithTimeout(`${baseLink}celebrities`, {headers}, TIMEOUT);

        if (!response.ok) {
            if (response.status >= 400 && response.status < 500) {
                logger.warn(`HTTP ${response.status}, returning empty result`);
                return EMPTY;
            }

            lastError = new Error(`HTTP ${response.status}`);
            logger.warn(`Attempt ${attempt + 1} failed:`, lastError.message);

            if (attempt < MAX_RETRIES - 1) {
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
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
    }

    throw lastError || new Error("Failed to fetch celebrities info");
};

/**
 * Fetches awards information from Douban awards page with retry logic.
 * Parses award categories and winners, returning structured award data.
 * 从豆瓣奖项页面获取奖项信息，带有重试逻辑。
 * 解析奖项类别和获奖者，返回结构化的奖项数据。
 *
 * @param {string} baseLink - The base URL for the Douban movie page (豆瓣电影页面的基础 URL)
 * @param {Object} headers - HTTP headers for the request (请求的 HTTP 头)
 * @returns {Promise<Array>} Array of formatted award strings, or empty array on failure (格式化的奖项字符串数组，失败时返回空数组)
 */
const fetchAwardsInfo = async (baseLink, headers) => {
    const MAX_ATTEMPTS = 2;
    const TIMEOUT = 8000;

    let lastError;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        logger.info(`Fetching awards (${attempt + 1}/${MAX_ATTEMPTS})...`);

        const response = await fetchWithTimeout(
            `${baseLink}awards`,
            {headers},
            TIMEOUT,
        );

        if (response.status === 404) {
            logger.info("No awards page");
            return [];
        }

        if (!response.ok) {
            lastError = new Error(`HTTP ${response.status}`);
            logger.warn(`Attempt ${attempt + 1} failed:`, lastError.message);
            if (attempt < MAX_ATTEMPTS - 1) {
                await new Promise((r) => setTimeout(r, 1000));
            }
            continue;
        }

        const html = await response.text();

        if (html.length < 1000 || !html.includes('class="awards')) {
            lastError = new Error("Invalid awards page");
            logger.warn(`Attempt ${attempt + 1} failed:`, lastError.message);
            if (attempt < MAX_ATTEMPTS - 1) {
                await new Promise((r) => setTimeout(r, 1000));
            }
            continue;
        }

        const $ = page_parser(html);
        const sections = [];

        $(".awards").each(function () {
            const $section = $(this);
            const $h2 = $section.find(".hd h2");
            const festival = $h2.find("a").text().trim();
            const year = $h2.find(".year").text().trim();
            const name = `${festival} ${year}`.trim();

            if (!name) return;

            const awards = [name];

            $section.find("ul.award").each(function () {
                const $award = $(this);
                const $items = $award.find("li");

                if ($items.length >= 2) {
                    const category = $items.eq(0).text().trim();
                    const winners = $items.eq(1).text().trim();
                    awards.push(winners ? `${category} ${winners}` : category);
                }
            });

            if (awards.length > 1) {
                sections.push(awards.join("\n"));
            }
        });

        const text = sections.join("\n\n");
        return text ? parseDoubanAwards(text) : [];
    }

    throw lastError || new Error("Failed to fetch awards");
};

/**
 * Fetches IMDb rating information with retry logic.
 * Parses JSONP response to extract rating and vote count.
 * 获取 IMDb 评分信息，带有重试逻辑。
 * 解析 JSONP 响应以提取评分和投票数。
 *
 * @param {string} imdbId - The IMDb ID (e.g., "tt1234567") (IMDb ID，如 "tt1234567")
 * @param {Object} headers - HTTP headers for the request (请求的 HTTP 头)
 * @returns {Promise<Object|null>} Object containing rating details, or null if invalid ID (包含评分详情的对象，如果 ID 无效则返回 null)
 */
const fetchImdbRating = async (imdbId, headers) => {
    if (!imdbId || !/^tt\d+$/.test(imdbId)) {
        return null;
    }

    return await safeExecuteProvider(async () => {
        const url = `https://p.media-imdb.com/static-content/documents/v1/title/${imdbId}/ratings%3Fjsonp=imdb.rating.run:imdb.api.title.ratings/data.json`;
        const MAX_ATTEMPTS = 2;
        let lastError;

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            logger.info(`Fetching IMDb (attempt ${i + 1})...`);

            const response = await fetchWithTimeout(url, {headers}, 12000);

            if (!response.ok) {
                lastError = new Error(`HTTP ${response.status}`);
                logger.warn(`IMDb attempt ${i + 1} failed:`, lastError.message);
                if (i < MAX_ATTEMPTS - 1) {
                    await new Promise((r) => setTimeout(r, 2000));
                }
                continue;
            }

            const text = await response.text();
            const match = text.match(/imdb\.rating\.run\((.*)\)/);

            if (!match) {
                lastError = new Error("Invalid response format");
                logger.warn(`IMDb attempt ${i + 1} failed:`, lastError.message);
                if (i < MAX_ATTEMPTS - 1) {
                    await new Promise((r) => setTimeout(r, 2000));
                }
                continue;
            }

            const data = JSON.parse(match[1]);
            const rating = data.resource?.rating;
            const votes = data.resource?.ratingCount || 0;

            if (rating) {
                return {
                    average: rating.toFixed(1),
                    votes: String(votes),
                    formatted: `${rating.toFixed(1)} / 10 from ${votes.toLocaleString()} users`,
                };
            }

            return {
                average: "0.0",
                votes: "0",
                formatted: "0.0 / 10 from 0 users",
            };
        }

        throw lastError || new Error("Failed to fetch IMDb rating");
    }, "douban", `imdb_${imdbId}`);
};

/**
 * Asynchronously generates Douban movie/TV information for a given subject ID.
 * Fetches main page data, IMDb ratings, celebrity info, and awards concurrently with timeout protection.
 * Uses safeExecuteProvider for unified error handling.
 * 异步生成给定主题 ID 的豆瓣电影/电视信息。
 * 并发获取主页面数据、IMDb 评分、名人信息和奖项，并带有超时保护。
 * 使用 safeExecuteProvider 进行统一的错误处理。
 *
 * @param {string|number} sid - The unique identifier for the Douban movie/TV (豆瓣电影/电视的唯一标识符)
 * @param {Object} env - Environment configuration object (环境配置对象)
 * @returns {Promise<Object>} Object containing Douban media data or error details (包含豆瓣媒体数据或错误详情的对象)
 */
export const gen_douban = async (sid, env) => {
    const data = {site: "douban", sid};

    if (!sid) {
        return {...data, error: "Invalid Douban id"};
    }

    if (env.ENABLED_CACHE === "false") {
        const cachedData = await getStaticMediaDataFromOurBits("douban", sid);
        if (cachedData) {
            logger.info(`[Cache Hit] GitHub OurBits DB For Douban ${sid}`);
            return {...data, ...cachedData, success: true};
        }
    }

    return await safeExecuteProvider(async () => {
        const headers = getDouBanHeaders(env);
        const baseLink = `https://movie.douban.com/subject/${encodeURIComponent(sid)}/`;
        let response = await fetchWithTimeout(baseLink, {headers});
        if (!response) {
            throw new Error("No response from Douban");
        }

        if (response.status === 404) {
            throw new Error(NONE_EXIST_ERROR);
        }

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            if (isAntiBot(text)) {
                throw new Error(ANTI_BOT_ERROR);
            }
            throw new Error(`Failed to fetch: ${response.status} ${text.slice(0, 200)}`);
        }

        const html = await response.text();

        if (!html || isAntiBot(html) || NOT_FOUND_PATTERN.test(html)) {
            throw new Error(isAntiBot(html) ? ANTI_BOT_ERROR : NONE_EXIST_ERROR);
        }

        const hasItemReviewed = html.includes('property="v:itemreviewed"');
        const hasSubjectMeta = html.includes('subject_') || html.includes('"@type"');
        const hasContent = html.length > 500;
        const isValidPage = (hasItemReviewed || hasSubjectMeta) && hasContent;

        if (!isValidPage) {
            logger.warn("⚠️ Invalid Douban page detected", {
                sid,
                hasItemReviewed,
                hasSubjectMeta,
                contentLength: html.length,
                sampleHtml: html.slice(0, 1000)
            });
            throw new Error("Invalid Douban page");
        }

        const $ = page_parser(html);
        const imdbText = fetchAnchorText($('#info span.pl:contains("IMDb")'));
        const hasAwardsSection = $("div.mod").find("div.hd").length > 0;
        const detailedHeaders = {...headers, Referer: baseLink};
        const concurrentPromises = [];
        let imdbPromiseIndex = -1;
        let celebrityPromiseIndex;
        let awardsPromiseIndex = -1;

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

        celebrityPromiseIndex = concurrentPromises.length;
        concurrentPromises.push(
            Promise.race([
                fetchCelebritiesInfo(baseLink, detailedHeaders),
                new Promise((resolve) =>
                    setTimeout(
                        () => resolve({director: [], writer: [], cast: []}),
                        5000,
                    ),
                ),
            ]),
        );

        if (hasAwardsSection) {
            awardsPromiseIndex = concurrentPromises.length;
            concurrentPromises.push(
                Promise.race([
                    fetchAwardsInfo(baseLink, detailedHeaders),
                    new Promise((resolve) => setTimeout(() => resolve([]), 5000)),
                ]),
            );
        }

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

                const playdate = [];

                $('#info span[property="v:initialReleaseDate"]').each(function () {
                    const text = $(this).text().trim();   // 使用 this，不声明 el
                    if (text) {
                        playdate.push(text);
                    }
                });

                playdate.sort((a, b) => {
                    return new Date(a).getTime() - new Date(b).getTime();
                });

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
    }, "douban", sid);
};
