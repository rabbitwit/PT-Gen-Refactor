import { NONE_EXIST_ERROR, DEFAULT_TIMEOUT, fetchWithTimeout, generateTmdbFormat } from "./common.js";

const TMDB_API_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const safe = (v, fallback = '') => (v === undefined || v === null ? fallback : v);

/**
 * 解析媒体资源标识符SID
 * @param {string|number} sid - 媒体资源标识符，可以是字符串或数字
 * @returns {Object|null} 解析结果对象，包含media_type和media_id属性；如果解析失败则返回null
 */
const parseSid = sid => {
  if (!sid) return null;
  const s = String(sid).trim();
  if (!s) return null;
  if (s.includes('/')) {
    const [type, id] = s.split('/').map(x => x.trim());
    if (!id) return null;
    return { media_type: type || 'movie', media_id: id };
  }
  // 仅数字或字符串id，默认 movie
  return { media_type: 'movie', media_id: s };
};

/**
 * 构建统一格式的媒体数据对象，根据 TMDB 返回的数据和媒体类型（电影或电视剧）提取并处理关键信息。
 *
 * @param {Object} tmdb_data - 来自 TMDB API 的原始响应数据对象
 * @param {string} media_type - 媒体类型，'movie' 表示电影，其他值表示电视剧（如 'tv'）
 * @returns {Object} 格式化后的媒体数据对象，包含标题、年份、评分、演员等信息
 */
const buildResult = (tmdb_data, media_type) => {
  const data = {};
  data.tmdb_id = tmdb_data.id;

  const getTitleField = (fieldMovie, fieldTv) =>
    media_type === 'movie' ? safe(tmdb_data[fieldMovie]) : safe(tmdb_data[fieldTv]);

  data.title = getTitleField('title', 'name');
  data.original_title = getTitleField('original_title', 'original_name');

  data.overview = safe(tmdb_data.overview, '');
  data.poster = tmdb_data.poster_path ? `${TMDB_IMAGE_BASE_URL}${tmdb_data.poster_path}` : '';
  data.backdrop = tmdb_data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${tmdb_data.backdrop_path}` : '';

  if (media_type === 'movie') {
    data.release_date = safe(tmdb_data.release_date, '');
    data.year = data.release_date ? data.release_date.slice(0, 4) : '';
    data.runtime = tmdb_data.runtime ? `${tmdb_data.runtime} minutes` : '';
  } else {
    data.first_air_date = safe(tmdb_data.first_air_date, '');
    data.last_air_date = safe(tmdb_data.last_air_date, '');
    data.year = data.first_air_date ? data.first_air_date.slice(0, 4) : '';
    data.episode_run_time = (tmdb_data.episode_run_time && tmdb_data.episode_run_time.length > 0)
      ? `${tmdb_data.episode_run_time[0]} minutes`
      : '';
    data.number_of_episodes = tmdb_data.number_of_episodes || '';
    data.number_of_seasons = tmdb_data.number_of_seasons || '';
  }

  data.tmdb_rating_average = safe(tmdb_data.vote_average, 0);
  data.tmdb_votes = safe(tmdb_data.vote_count, 0);
  data.tmdb_rating = `${data.tmdb_rating_average || 0} / 10 from ${data.tmdb_votes || 0} users`;
  data.genres = Array.isArray(tmdb_data.genres) ? tmdb_data.genres.map(g => g.name) : [];
  data.languages = Array.isArray(tmdb_data.spoken_languages)
    ? tmdb_data.spoken_languages.map(l => l.english_name || l.name)
    : [];
  data.countries = Array.isArray(tmdb_data.production_countries)
    ? tmdb_data.production_countries.map(c => c.name)
    : [];
  data.production_companies = Array.isArray(tmdb_data.production_companies)
    ? tmdb_data.production_companies.map(c => c.name)
    : [];

  // credits 初始化
  data.directors = [];
  data.producers = [];
  data.cast = [];

  const credits = tmdb_data.credits;
  if (credits) {
    if (Array.isArray(credits.crew)) {
      for (const person of credits.crew) {
        if (!person) continue;
        if (person.job === 'Director') {
          data.directors.push({ name: person.name, id: person.id });
        } else if (person.job === 'Producer') {
          data.producers.push({ name: person.name, id: person.id });
        }
      }
    }

    if (Array.isArray(credits.cast)) {
      data.cast = credits.cast
        .map(actor => {
          const image = actor.profile_path ? `https://media.themoviedb.org/t/p/w300_and_h450_bestv2${actor.profile_path}` : '';
          let character = actor.character || '';

          if (
            !character &&
            Array.isArray(actor.roles) &&
            actor.roles.length > 0
          ) {
            character = actor.roles.map(r => r.character).filter(Boolean).join(' / ');
          }

          if (!character && (actor.role || actor.roles?.[0]?.role)) {
            character = actor.role || actor.roles[0].role;
          }

          return {
            id: actor.id || '',
            name: actor.name,
            original_name: actor.original_name,
            character: character || '',
            image,
          };
        })
        .slice(0, 15);
    }
  }

  data.imdb_id = tmdb_data.external_ids?.imdb_id || '';
  data.imdb_link = data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}/` : '';
  data.format = generateTmdbFormat(data);
  data.success = true;

  return data;
};

/**
 * 从 TMDB 获取媒体信息并生成标准化数据
 * @param {string|number} sid - TMDB 媒体标识符，支持格式: 'movie/12345', 'tv/12345' 或纯数字ID
 * @param {Object} env - 环境变量对象，必须包含 TMDB_API_KEY
 * @returns {Promise<Object>} 标准化后的媒体信息对象或错误信息
 */
export const gen_tmdb = async (sid, env) => {
  const base = { site: "tmdb", sid };

  try {
    const TMDB_API_KEY = env?.TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      return Object.assign(base, { error: "TMDB API key not configured" });
    }

    const parsed = parseSid(sid);
    if (!parsed) {
      return Object.assign(base, { error: "Invalid TMDB ID format. Expected 'movie/12345', 'tv/12345' or numeric ID" });
    }

    const { media_type, media_id } = parsed;
    if (!media_type || !media_id) {
      return Object.assign(base, { error: "Invalid TMDB ID format" });
    }

    const params = `api_key=${encodeURIComponent(TMDB_API_KEY)}&language=zh-CN&append_to_response=credits,release_dates,external_ids`;
    const url = `${TMDB_API_URL}/${encodeURIComponent(media_type)}/${encodeURIComponent(media_id)}?${params}`;
    console.log("TMDB request:", url);

    let resp;
    try {
      resp = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      }, DEFAULT_TIMEOUT);
    } catch (fetch_error) {
      console.error("TMDB fetch error:", fetch_error);
      return Object.assign(base, {
        error: `TMDB API fetch error: ${fetch_error.name === 'AbortError' ? 'Request timeout' : fetch_error.message}`
      });
    }

    if (!resp.ok) {
      const status = resp.status;
      let text = '';
      try { 
        text = await resp.text(); 
      } catch (_) { 
        /* ignore */ 
      }
      
      console.warn("TMDB API non-ok response:", status, text && text.slice(0, 200));

      if (status === 404) return Object.assign(base, { error: NONE_EXIST_ERROR });
      if (status === 401) return Object.assign(base, { error: "TMDB API key invalid" });
      if (status === 429) return Object.assign(base, { error: "TMDB API rate limit exceeded" });
      return Object.assign(base, { error: `TMDB API request failed with status ${status}` });
    }

    let tmdb_data;
    try {
      tmdb_data = await resp.json();
      if (tmdb_data.overview === '') {
        const translationsUrl = `${TMDB_API_URL}/${encodeURIComponent(media_type)}/${encodeURIComponent(media_id)}/translations?api_key=${encodeURIComponent(TMDB_API_KEY)}`;
        const translationsResp = await fetchWithTimeout(translationsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json',
            'Accept-Language': 'zh-CN,zh;q=0.9'
          }
        }, DEFAULT_TIMEOUT);

        if (translationsResp.ok) {
          const translationsData = await translationsResp.json();
          
          // 优先级顺序: CN > HK > TW > US (基于 iso_3166_1)
          const priorityOrder = ['CN', 'HK', 'TW', 'US'];
          let translationToUse = null;
          
          // 首先按地区优先级查找中文翻译
          for (const region of priorityOrder) {
            const translation = translationsData.translations.find(t => 
              t.iso_3166_1 === region && 
              t.iso_639_1 === 'zh' && 
              t.data && 
              t.data.overview
            );
            
            if (translation) {
              translationToUse = translation;
              break;
            }
          }
          
          // 如果没找到指定地区的中文翻译，查找任何中文翻译
          if (!translationToUse) {
            translationToUse = translationsData.translations.find(t => 
              t.iso_639_1 === 'zh' && 
              t.data && 
              t.data.overview
            );
          }
          
          // 如果还没找到，查找任何包含overview的翻译(包括英文)
          if (!translationToUse) {
            translationToUse = translationsData.translations.find(t => 
              t.data && 
              t.data.overview
            );
          }
          
          // 如果找到了翻译，则使用它
          if (translationToUse) {
            tmdb_data.overview = translationToUse.data.overview;
          }
        }
      }
    } catch (json_error) {
      console.error("TMDB JSON parse error:", json_error);
      return Object.assign(base, { error: "TMDB API response parsing failed" });
    }

    const result = buildResult(tmdb_data, media_type);
    console.log("TMDB data generated for:", result.title);

    return { ...base, ...result };
  } catch (error) {
    console.error("TMDB processing error:", error);
    return Object.assign(base, { error: `TMDB API processing error: ${error?.message || error}` });
  }
};