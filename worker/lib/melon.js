import { NONE_EXIST_ERROR, page_parser, fetchWithTimeout, generateMelonFormat } from "./common.js";

const MELOON_ALBUM_INFO_URL = "https://www.melon.com/album/detail.htm";
const translations = {
  '발라드': 'Ballad',
  '댄스': 'Dance',
  '랩/힙합': 'Rap / Hip-Hop',
  'R&B/Soul': 'R&B / Soul',
  '인디음악': 'Indie',
  '록/메탈': 'Rock / Metal',
  '트로트': 'Trot',
  '포크/블루스': 'Folk / Blues',
  '재즈': 'Jazz',
  '애시드/퓨전/팝': 'Acid / Fusion / Pop',
};
/**
 * 安全获取元素文本内容
 * @param {Object} $el - Cheerio元素对象
 * @returns {string} 元素的文本内容，如果元素不存在则返回空字符串
 */
const safeText = ($el) => {
  try {
    return $el && $el.length ? $el.text().trim() : "";
  } catch {
    return "";
  }
};

/**
 * 处理海报 URL（去除额外参数、提高分辨率、补全域名）
 * @param {string} src - 原始图片 URL
 * @returns {string|null} 处理后的高质量图片 URL，如果输入为空则返回 null
 */
const normalizePoster = (src) => {
  const HTTP_REGEX = /^https?:\/\//i;
  if (!src) return null;
  let url = String(src).split('?')[0];
  const jpgIndex = url.indexOf('.jpg');
  if (jpgIndex !== -1) url = url.substring(0, jpgIndex + 4);
  url = url.replace(/500\.jpg$/, '1000.jpg');

  if (!HTTP_REGEX.test(url)) {
    url = `https://www.melon.com${url.startsWith('/') ? '' : '/'}${url}`;
  }
  
  return url;
};

/**
 * 翻译流派数组中的每个元素
 * @param {Array} genres - 需要翻译的流派数组
 * @returns {Array} 翻译后的流派数组，如果输入不是数组则返回空数组
 */
const translateGenres = (genres) => {
  if (!Array.isArray(genres)) {
    return [];
  }
  
  return genres.map(genre => {
    // 处理 undefined 或 null 的情况
    if (genre == null) {
      return genre;
    }
    return translations[genre] || genre;
  });
};

/**
 * 获取随机 User-Agent 字符串，用于模拟不同浏览器的请求头
 * @returns {string} 随机选择的一个 User-Agent 字符串
 */
const getRandomUserAgent = () => {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
  ];
  return browsers[Math.floor(Math.random() * browsers.length)];
};

/**
 * 获取专辑信息
 * @param {string} albumId - 专辑ID
 * @returns {Promise<object>} 专辑信息对象
 */
const fetchAlbumInfo = async (albumId) => {
  const encodedAlbumId = encodeURIComponent(albumId);
  const data = { site: "melon", sid: albumId };

  try {
    const melon_url = `${MELOON_ALBUM_INFO_URL}?albumId=${encodedAlbumId}`;
    const resp = await fetchWithTimeout(melon_url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      }
    });

    if (!resp.ok) {
      if (resp.status === 404) return Object.assign(data, { error: NONE_EXIST_ERROR });
      throw new Error(`请求失败，状态码 ${resp.status}`);
    }

    const html = await resp.text();
    const $ = typeof page_parser === 'function' ? page_parser(html) : null;
    if (!$) throw new Error("缺少 HTML 解析器");

    const $info = $('.wrap_info');
    if (!$info || $info.length === 0) {
      return Object.assign(data, { error: "未找到专辑信息容器" });
    }

    data.melon_id = encodedAlbumId;
    data.melon_link = melon_url;

    const typeElem = $info.find('.gubun').first();
    let koreanType = safeText(typeElem);
    const typeMatch = koreanType.match(/\[(.*?)\]/);
    if (typeMatch) {
      const rawType = typeMatch[1];
      const typeTranslations = {
        '정규': '正规专辑',
        '싱글': '单曲',
        'EP': '迷你专辑',
        'OST': '原声带',
      };
      data.album_type = typeTranslations[rawType] || rawType;
    } else {
      const cleanType = koreanType.replace(/[[\]]/g, '').trim();
      if (cleanType) {
        data.album_type = cleanType;
      }
    }

    const titleElem = $info.find('.song_name').first();
    let title = safeText(titleElem).replace(/^앨범명\s*/i, '').trim();
    if (title) data.title = title;

    const artistElems = $info.find('.artist a[href*="goArtistDetail"]');
    if (artistElems && artistElems.length) {
      const artists = [...new Set(artistElems.map((_, el) => $(el).text().trim()))].filter(Boolean);
      if (artists.length) data.artists = artists;
    }

    const $infoWrapper = $info;
    const date_elem = $infoWrapper.find('.meta dl:nth-child(1) dd').first();
    if (date_elem && date_elem.length > 0) {
      data.release_date = date_elem.text().trim();
    }

    const genre_elem = $infoWrapper.find('.meta dl:nth-child(2) dd').first();
    if (genre_elem && genre_elem.length > 0) {
      const rawGenres = genre_elem.text().trim()
        .split(',')
        .map(g => g.trim())
        .filter(Boolean);
      data.genres = translateGenres(rawGenres);
    }

    const publisher_elem = $infoWrapper.find('.meta dl:nth-child(3) dd').first();
    if (publisher_elem && publisher_elem.length > 0) {
      data.publisher = publisher_elem.text().trim();
    }

    let meta_items = $infoWrapper.find('.meta dl.list dt');
    if (!meta_items || meta_items.length === 0) {
      meta_items = $infoWrapper.find('.meta dl dt');
    }
    meta_items.each(function () {
      const $dt = $(this);
      const label = $dt.text().trim();
      const $dd = $dt.next('dd');
      const value = $dd.text().trim();

      switch (label) {
        case '발매일':
          if (value) data.release_date = value;
          break;
        case '장르':
          if (value) {
            const rawGenres = value.split(',').map(g => g.trim()).filter(Boolean);
            data.genres = translateGenres(rawGenres);
          }
          break;
        case '발매사':
          if (value) data.publisher = value;
          break;
        case '기획사':
          if (value) data.planning = value;
          break;
        case '유형':
          if (value) data.album_type = value;
          break;
      }
    });

    const posterElem = $info.find('.thumb img').first();
    if (posterElem && posterElem.length) {
      const src = posterElem.attr('src') || posterElem.attr('data-src') || '';
      const poster = normalizePoster(src);
      if (poster) data.poster = poster;
    }

    const albumInfo = $('.dtl_albuminfo').first();
    if (albumInfo && albumInfo.length) {
      const raw = albumInfo.html() || "";
      data.description = raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    }

    let rows = $('#frm .tbl_song_list tbody tr');
    if (!rows || rows.length === 0) rows = $('.tbl_song_list tbody tr');
    if (!rows || rows.length === 0) rows = $('table:has(caption:contains("곡 리스트")) tbody tr');

    if (rows && rows.length) {
      const tracks = [];
      rows.each(function () {
        const $row = $(this);
        const number = safeText($row.find('.rank')).replace(/\D+/g, '') || safeText($row.find('.no'));

        let t = extractTrackTitle($row);

        if (!t) return;

        const artLinks = $row.find('a[href*="goArtistDetail"]');
        const trackArtists = [...new Set(artLinks.map((_, el) => $(el).text().trim()))].filter(Boolean);

        tracks.push({ number: number || '', title: t, artists: trackArtists });
      });

      if (tracks.length) data.tracks = tracks;
    }

    data.format = generateMelonFormat(data);
    data.success = true;
    return data;
  } catch (err) {
    console.error("Melon 专辑处理错误:", err);
    return Object.assign(data, { error: `Melon 专辑处理错误: ${err && err.message ? err.message : String(err)}` });
  }
};

/**
 * 提取歌曲标题
 * @param {Object} $row - 表格行的jQuery/Cheerio对象
 * @returns {string} 提取到的歌曲标题，如果未找到则返回空字符串
 */
const extractTrackTitle = ($row) => {
  let t = '';

  const aPlay = $row.find('a[title*="재생"]').first();
  if (aPlay && aPlay.length) t = safeText(aPlay);

  if (!t) {
    const aInfo = $row.find('a[title*="곡정보"]').first();
    if (aInfo && aInfo.length) {
      const titleAttr = aInfo.attr('title') || '';
      const m = titleAttr.match(/^(.*?)\s+(재생|곡정보)/);
      if (m && m[1]) t = m[1].trim();
      else {
        const candidate = aInfo.closest('.ellipsis').find('a').first();
        t = safeText(candidate);
      }
    }
  }

  if (!t) {
    t = safeText($row.find('.ellipsis a').first()) || safeText($row.find('.song_name').first());
  }

  return t;
};

/**
 * 生成Melon专辑信息
 * @param {string} sid - 专辑ID (格式如 "album/123456")
 * @returns {Promise<object>} 专辑信息对象
 */
export const gen_melon = async (sid) => {
  const data = { site: "melon", sid };

  try {
    console.log("Melon request for sid:", sid);

    const parts = String(sid || "").split("/");
    const media_type = parts[0];
    const media_id = parts[1];

    if (media_type !== "album" || !/^\d+$/.test(media_id)) {
      return Object.assign(data, { error: "Invalid Melon ID format. Expected 'album/<digits>'" });
    }

    return await fetchAlbumInfo(media_id);
  } catch (err) {
    console.error("Melon processing error:", err);
    return Object.assign(data, { error: `Melon processing error: ${err && err.message ? err.message : String(err)}` });
  }
};