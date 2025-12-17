import { fetchWithTimeout, page_parser } from "./common.js";

const BASE_URL = "https://novelquickapp.com";
export async function gen_hongguo(sid) {
  if (typeof sid !== "string") {
    return { success: false, error: "Invalid input: sid must be a string" };
  }

  let url;

  // 判断 sid 是短链接还是长链接ID
  if (sid.startsWith("http")) {
    url = sid;
  } else if (sid.length > 15) {
    // 假设 series_id 比较长
    url = `${BASE_URL}/detail?series_id=${sid}`;
  } else {
    // 可能是短链的后缀，或者其他情况，这里假设是短链后缀
    url = `${BASE_URL}/s/${sid}/`;
  }

  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const $ = page_parser(html);

    let routerDataText = null;

    $("script").each((i, el) => {
      const text = $(el).html();
      if (text && text.includes("window._ROUTER_DATA =")) {
        routerDataText = text;
        return false;
      }
    });

    let routerData;

    if (routerDataText) {
      const jsonStr = routerDataText
        .split("window._ROUTER_DATA =")[1]
        ?.trim()
        .replace(/;$/, "");
      if (jsonStr) {
        try {
          routerData = JSON.parse(jsonStr);
        } catch (e) {
          console.error(
            "Failed to parse extracted JSON, trying regex fallback"
          );
        }
      }
    }

    if (!routerData) {
      const match = html.match(/window\._ROUTER_DATA\s*=\s*({.*?});/s);
      if (match && match[1]) {
        try {
          routerData = JSON.parse(match[1]);
        } catch (e) {
          console.error("Failed to parse regex matched JSON");
        }
      }
    }

    if (!routerData) {
      throw new Error("Failed to extract _ROUTER_DATA from Hongguo page");
    }

    const videoDetailData =
      routerData?.loaderData?.["video-detail-share_page"]?.pageData
        ?.video_detail_data;
    const seriesDetail = routerData?.loaderData?.detail_page?.seriesDetail;

    let title, episodes, actors, genres, synopsis, poster_url;

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
  } catch (error) {
    console.error("Error fetching Hongguo data:", error);
    return { success: false, error: error.message };
  }
}