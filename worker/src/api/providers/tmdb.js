import {fetchWithTimeout} from "../../utils/request.js";
import {DEFAULT_TIMEOUT, NONE_EXIST_ERROR} from "../../core/constants.js";
import {safe, safeExecuteProvider} from "../../utils/helpers.js";
import logger from "../../logger.js";

const TMDB_API_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

/**
 * Parse TMDB session ID or media identifier
 * 解析 TMDB 会话ID或媒体标识符
 * @param {string} sid - Session ID or media identifier (format: "type/id" or just "id")
 *                      会话ID或媒体标识符(格式:"type/id" 或仅 "id")
 * @returns {{media_type: string, media_id: string}|null} Parsed media type and ID, or null if invalid
 *                                                       解析后的媒体类型和ID,如果无效则返回 null
 */
const parseSid = sid => {
    if (!sid) return null;
    const s = String(sid).trim();
    if (!s) return null;
    if (s.includes('/')) {
        const [type, id] = s.split('/').map(x => x.trim());
        if (!id) return null;
        return {media_type: type || 'movie', media_id: id};
    }

    return {media_type: 'movie', media_id: s};
};

/**
 * Build result object from TMDB data
 * 从 TMDB 数据构建结果对象
 * @param {Object} tmdb_data - Raw TMDB API response data
 *                            TMDB API 原始响应数据
 * @param {string} media_type - Media type: 'movie' or 'tv'
 *                             媒体类型: 'movie'(电影) 或 'tv'(电视剧)
 * @returns {Object} Processed media information object
 *                  处理后的媒体信息对象
 */
const buildResult = (tmdb_data, media_type) => {
    const data = {};
    data.tmdb_id = tmdb_data.id;

    const getTitleField = (fieldMovie, fieldTv) =>
        media_type === 'movie' ? safe(tmdb_data[fieldMovie]) : safe(tmdb_data[fieldTv]);

    data.title = getTitleField('title', 'name');
    data.original_title = getTitleField('original_title', 'original_name');
    /** @namespace tmdb_data.poster_path **/
    /** @namespace tmdb_data.backdrop_path **/
    data.overview = safe(tmdb_data.overview);
    data.poster = tmdb_data.poster_path ? `${TMDB_IMAGE_BASE_URL}${tmdb_data.poster_path}` : '';
    data.backdrop = tmdb_data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${tmdb_data.backdrop_path}` : '';

    if (media_type === 'movie') {
        data.release_date = safe(tmdb_data.release_date);
        data.year = data.release_date ? data.release_date.slice(0, 4) : '';
        data.runtime = tmdb_data.runtime ? `${tmdb_data.runtime} minutes` : '';
    } else {
        data.first_air_date = safe(tmdb_data.first_air_date);
        data.last_air_date = safe(tmdb_data.last_air_date);
        data.year = data.first_air_date ? data.first_air_date.slice(0, 4) : '';
        data.episode_run_time = (tmdb_data.episode_run_time && tmdb_data.episode_run_time.length > 0)
            ? `${tmdb_data.episode_run_time[0]} minutes`
            : '';
        data.number_of_episodes = tmdb_data.number_of_episodes || '';
        data.number_of_seasons = tmdb_data.number_of_seasons || '';
    }
    /** @namespace tmdb_data.vote_count **/
    /** @namespace tmdb_data.spoken_languages **/
    /** @namespace tmdb_data.production_countries **/
    /** @namespace l.english_name **/
    data.tmdb_rating_average = safe(tmdb_data.vote_average);
    data.tmdb_votes = safe(tmdb_data.vote_count);
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
        /** @namespace credits.crew **/
        if (Array.isArray(credits.crew)) {
            for (const person of credits.crew) {
                if (!person) continue;
                if (person.job === 'Director') {
                    data.directors.push({name: person.name, id: person.id});
                } else if (person.job === 'Producer') {
                    data.producers.push({name: person.name, id: person.id});
                }
            }
        }

        if (Array.isArray(credits.cast)) {
            /** @namespace actor.profile_path **/
            /** @namespace actor.roles **/
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
    /** @namespace tmdb_data.external_ids **/
    data.imdb_id = tmdb_data.external_ids?.imdb_id || '';
    data.imdb_link = data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}/` : '';
    data.success = true;

    return data;
};

/**
 * Generate TMDB media information for a given session ID or media identifier
 * 为给定的会话ID或媒体标识符生成 TMDB 媒体信息
 * @param {string} sid - Session ID or media identifier (format: "type/id" or just "id")
 *                      会话ID或媒体标识符(格式:"type/id" 或仅 "id")
 * @param {Object} env - Environment configuration object containing API keys
 *                     包含 API 密钥的环境配置对象
 * @returns {Promise<Object>} Processed TMDB media data or error object
 *                           处理后的 TMDB 媒体数据或错误对象
 */
export const gen_tmdb = async (sid, env) => {
    const base = {site: "tmdb", sid};

    return await safeExecuteProvider(async () => {
        const TMDB_API_KEY = env?.TMDB_API_KEY;
        if (!TMDB_API_KEY) {
            throw new Error("TMDB API key not configured");
        }

        const parsed = parseSid(sid);
        if (!parsed) {
            throw new Error("Invalid TMDB ID format. Expected 'movie/12345', 'tv/12345' or numeric ID");
        }

        let {media_type, media_id} = parsed;
        if (!media_type || !media_id) {
            throw new Error("Invalid TMDB ID format");
        }

        base.sid = media_id;

        const params = `api_key=${encodeURIComponent(TMDB_API_KEY)}&language=zh-CN&append_to_response=credits,release_dates,external_ids`;
        const url = `${TMDB_API_URL}/${encodeURIComponent(media_type)}/${encodeURIComponent(media_id)}?${params}`;

        let resp;
        try {
            resp = await fetchWithTimeout(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/json',
                    'Accept-Language': 'zh-CN,zh;q=0.9'
                }
            }, DEFAULT_TIMEOUT);
        } catch (error) {
            logger.error("TMDB fetch error:", error);
            throw new Error(`TMDB API fetch error: ${error.name === 'AbortError' ? 'Request timeout' : error.message}`);
        }

        if (!resp.ok) {
            const status = resp.status;
            let text = '';
            try {
                text = await resp.text();
            } catch (e) {
                logger.warn("TMDB API text error:", e);
            }

            logger.warn("TMDB API non-ok response:", status, text && text.slice(0, 200));

            if (status === 404) throw new Error(NONE_EXIST_ERROR);
            if (status === 401) throw new Error("TMDB API key invalid");
            if (status === 429) throw new Error("TMDB API rate limit exceeded");
            throw new Error(`TMDB API request failed with status ${status}`);
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
                        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8'
                    }
                }, DEFAULT_TIMEOUT);

                if (translationsResp.ok) {
                    const translationsData = await translationsResp.json();

                    // Priority order: CN > HK > TW > US (based on iso_3166_1)
                    // 优先级顺序: CN > HK > TW > US (基于 iso_3166_1)
                    const priorityOrder = ['CN', 'HK', 'TW', 'US'];
                    let translationToUse = null;

                    // First, search for Chinese translations by region priority
                    // 首先按地区优先级查找中文翻译
                    /** @namespace translationsData.translations **/
                    /** @namespace t.iso_3166_1 **/
                    /** @namespace t.iso_639_1 **/
                    for (const region of priorityOrder) {
                        const translation = translationsData.translations.find(t => {
                            if (!t.iso_3166_1 || !t.iso_639_1 || !t.data || !t.data.overview) {
                                return false;
                            }
                            return String(t.iso_3166_1) === region &&
                                String(t.iso_639_1) === 'zh';
                        });

                        if (translation) {
                            translationToUse = translation;
                            break;
                        }
                    }

                    if (!translationToUse) {
                        translationToUse = translationsData.translations.find(t =>
                            t.iso_639_1 && String(t.iso_639_1) === 'zh' &&
                            t.data &&
                            t.data.overview
                        );
                    }

                    if (!translationToUse) {
                        translationToUse = translationsData.translations.find(t =>
                            t.data &&
                            t.data.overview
                        );
                    }

                    if (translationToUse) {
                        tmdb_data.overview = translationToUse.data.overview;
                    }
                }
            }
        } catch (error) {
            logger.error("TMDB JSON parse error:", error.message);
            throw new Error("TMDB API response parsing failed");
        }

        return buildResult(tmdb_data, media_type);
    }, "tmdb", sid);
};
