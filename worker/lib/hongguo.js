import { fetchWithTimeout, page_parser } from "./common.js";

export async function gen_hongguo(sid) {
  const ua = "Mozilla/5.0 (Linux; Android 6.0.1; OPPO A57 Build/MMB29M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/63.0.3239.83 Mobile Safari/537.36 T7/10.13 baiduboxapp/10.13.0.10 (Baidu; P1 6.0.1)";
  let url;

  // 判断 sid 是短链接还是长链接ID
  if (sid.startsWith('http')) {
    url = sid;
  } else if (sid.length > 15) { // 假设 series_id 比较长
    url = `https://novelquickapp.com/detail?series_id=${sid}`;
  } else {
    // 可能是短链的后缀，或者其他情况，这里假设是短链后缀
    url = `https://novelquickapp.com/s/${sid}/`;
  }

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": ua
      }
    });

    const html = await response.text();
    const $ = page_parser(html);
    let routerDataText = null;

    $('script').each((i, el) => {
      const text = $(el).html();
      if (text && text.includes('window._ROUTER_DATA =')) {
        routerDataText = text;
        return false; // break
      }
    });

    let routerData;
    if (routerDataText) {
      // 提取 JSON 部分
      // 假设格式为 window._ROUTER_DATA = {...}; 或 window._ROUTER_DATA = {...}
      const jsonStr = routerDataText.split('window._ROUTER_DATA =')[1].trim().replace(/;$/, '');
      try {
        routerData = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse extracted JSON, trying regex fallback");
      }
    }

    if (!routerData) {
      // Fallback to regex
      const match = html.match(/window\._ROUTER_DATA\s*=\s*({.*?});/s);
      if (match) {
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

    let title, episodes, actors, genres, synopsis, poster_url;

    // 尝试从短链接结构获取数据
    const videoDetailData = routerData?.loaderData?.["video-detail-share_page"]?.pageData?.video_detail_data;
    
    if (videoDetailData) {
      title = videoDetailData.title;
      episodes = videoDetailData.series_episode_info?.episode_cnt;
      actors = videoDetailData.actors?.map(actor => actor.nickname) || [];
      genres = videoDetailData.categories || [];
      synopsis = videoDetailData.series_intro;
      poster_url = videoDetailData.cover_url;
    } else {
      // 尝试从长链接结构获取数据
      const seriesDetail = routerData?.loaderData?.detail_page?.seriesDetail;
      if (seriesDetail) {
        title = seriesDetail.series_name;
        episodes = seriesDetail.episode_cnt;
        actors = seriesDetail.celebrities?.map(actor => actor.nickname) || [];
        genres = seriesDetail.tags || [];
        synopsis = seriesDetail.series_intro;
        poster_url = seriesDetail.series_cover;
      } else {
        throw new Error("Failed to find video data in Hongguo page data (checked both formats)");
      }
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
      poster_url: poster_url
    };

  } catch (error) {
    console.error("Error fetching Hongguo data:", error);
    throw error;
  }
}
