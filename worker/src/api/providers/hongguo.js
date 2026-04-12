import {fetchWithTimeout} from "../../utils/request.js";
import {page_parser, safeExecuteProvider} from "../../utils/helpers.js";
import logger from "../../logger.js";

const BASE_URL = "https://novelquickapp.com";

/**
 * Asynchronously fetches Hongguo short drama information and returns structured data.
 * Supports both full URLs and short link IDs, extracting data from window._ROUTER_DATA.
 * Uses safeExecuteProvider for unified error handling.
 * 异步获取红果短剧信息并返回结构化数据。
 * 支持完整 URL 和短链接 ID，从 window._ROUTER_DATA 提取数据。
 * 使用 safeExecuteProvider 进行统一的错误处理。
 *
 * @param {string} sid - The Hongguo series ID or URL (红果剧集 ID 或 URL)
 * @returns {Promise<Object>} Promise resolving to structured Hongguo media data or error details (解析为结构化的红果媒体数据或错误详情的 Promise)
 */
export async function gen_hongguo(sid) {
    if (typeof sid !== "string") {
        return {success: false, error: "Invalid input: sid must be a string"};
    }

    return await safeExecuteProvider(async () => {
        let url;

        if (sid.startsWith("http")) {
            url = sid;
        } else if (sid.length > 15) {
            url = `${BASE_URL}/detail?series_id=${sid}`;
        } else {
            url = `${BASE_URL}/s/${sid}/`;
        }

        const response = await fetchWithTimeout(url);
        const html = await response.text();
        const getters = page_parser(html);

        let routerDataText = null;

        const scripts = getters("script").get();
        scripts.some((el) => {
            const text = getters(el).html();
            if (text && text.includes("window._ROUTER_DATA =")) {
                routerDataText = text;
                return true;
            }
            return false;
        });

        let routerData;

        if (routerDataText) {
            const jsonStr = routerDataText
                .split("window._ROUTER_DATA =")[1]
                ?.trim()
                .replace(/;$/, "");
            if (jsonStr) {
                routerData = JSON.parse(jsonStr);
            }
        }

        if (!routerData) {
            const match = html.match(/window\._ROUTER_DATA\s*=\s*({.*?});/s);
            if (match && match[1]) {
                routerData = JSON.parse(match[1]);
            }
        }

        if (!routerData) {
            logger.warn("Failed to extract _ROUTER_DATA from Hongguo page");
            throw new Error("Failed to extract _ROUTER_DATA from Hongguo page");
        }

        /** @namespace routerData.loaderData **/
        /** @namespace routerData.loaderData.detail_page **/
        /** @namespace routerData.loaderData.detail_page.seriesDetail **/
        /** @namespace routerData.loaderData.video-detail-share_page.pageData **/
        /** @namespace routerData.loaderData.video-detail-share_page.pageData.video_detail_data **/
        const videoDetailData =
            routerData?.loaderData?.["video-detail-share_page"]?.pageData
                ?.video_detail_data;
        const seriesDetail = routerData?.loaderData?.detail_page?.seriesDetail;

        let title, episodes, actors, genres, synopsis, poster_url;

        /** @namespace videoDetailData.series_episode_info **/
        if (videoDetailData) {
            ({
                title,
                episodes,
                actors = [],
                genres = [],
                synopsis,
                poster_url,
            } = videoDetailData);
            episodes = videoDetailData.series_episode_info?.episode_cnt ?? episodes;
        } else if (seriesDetail) {
            ({
                series_name: title,
                episode_cnt: episodes,
                celebrities: actors = [],
                tags: genres = [],
                series_intro: synopsis,
                series_cover: poster_url,
            } = seriesDetail);
        } else {
            logger.warn("Failed to find video data in Hongguo page data");
            throw new Error(
                "Failed to find video data in Hongguo page data (checked both formats)"
            );
        }

        return {
            success: true,
            site: "hongguo",
            sid: sid,
            chinese_title: title,
            episodes: episodes,
            actors: actors,
            genres: genres,
            synopsis: synopsis,
            poster_url: poster_url,
        };
    }, "hongguo", sid);
}