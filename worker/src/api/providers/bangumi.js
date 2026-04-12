import {fetchWithTimeout} from "../../utils/request.js";
import {getStaticMediaDataFromOurBits, safe, safeExecuteProvider} from "../../utils/helpers.js";
import {createProviderError} from "../../core/errors.js";
import logger from "../../logger.js";

const BGM_API_BASE = "https://api.bgm.tv/v0";
const BGM_API_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    Referer: "https://bgm.tv/",
};

const TYPE_MAP = new Map([
    ["anime", "动画"],
    ["book", "书籍"],
    ["game", "游戏"],
    ["music", "音乐"],
    ["real", "三次元"],
    ["tv", "电视"],
    ["movie", "电影"],
    [1, "书籍"],
    [2, "动画"],
    [3, "音乐"],
    [4, "游戏"],
    [6, "三次元"],
]);

/**
 * Normalizes the subject type from Bangumi API response into a human-readable string.
 * Checks readable fields first (type_name, type_cn), then falls back to type ID mapping.
 * 将 Bangumi API 响应中的主题类型标准化为人类可读的字符串。
 * 首先检查可读字段（type_name、type_cn），然后回退到类型 ID 映射。
 *
 * @param {Object} subject - The subject object from Bangumi API (来自 Bangumi API 的主题对象)
 * @returns {string} Normalized type name in Chinese or original type value, empty string if unavailable (标准化的中文类型名称或原始类型值，如果不可用则返回空字符串)
 */
const normalizeType = (subject) => {
    if (!subject || typeof subject !== "object") {
        return "";
    }

    const readableFields = ["type_name", "type_cn"];
    for (const field of readableFields) {
        const value = subject[field];
        if (value && typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    const typeKey = subject.type;
    if (typeKey != null) {
        const normalizedKey = typeof typeKey === "string"
            ? typeKey.trim().toLowerCase()
            : String(typeKey);
        return TYPE_MAP.get(normalizedKey) ?? String(typeKey);
    }

    return "";
};

/**
 * Retrieves a specific value from the Bangumi infobox array by key.
 * Searches through the infobox items and returns the value for the matching key.
 * 通过键从 Bangumi 信息框数组中检索特定值。
 * 遍历信息框项目并返回匹配键的值。
 *
 * @param {Array<Object>} infobox - The infobox array from Bangumi API response (来自 Bangumi API 响应的信息框数组)
 * @param {string} key - The key to search for in the infobox (要在信息框中搜索的键)
 * @returns {*} The value associated with the key, or undefined if not found (与键关联的值，如果未找到则返回 undefined)
 */
const getInfoboxValue = (infobox, key) => {
    const item = infobox?.find((i) => i.key === key);
    return item?.value;
};

/**
 * Retrieves array values from the Bangumi infobox by key and extracts individual values.
 * If the value is an array, maps each item to its 'v' property; otherwise returns a safe string.
 * 通过键从 Bangumi 信息框中检索数组值并提取单个值。
 * 如果值是数组，则将每个项目映射到其 'v' 属性；否则返回安全的字符串。
 *
 * @param {Array<Object>} infobox - The infobox array from Bangumi API response (来自 Bangumi API 响应的信息框数组)
 * @param {string} key - The key to search for in the infobox (要在信息框中搜索的键)
 * @returns {string|string[]} Array of extracted values if the field is an array, or a safe string otherwise (如果字段是数组则返回提取的值数组，否则返回安全字符串)
 */
const getInfoboxArrayValues = (infobox, key) => {
    const value = getInfoboxValue(infobox, key);
    if (Array.isArray(value)) {
        return value.map((a) => a.v).filter((v) => v != null);
    }
    return safe(value);
};

/**
 * Extracts staff information (director and writer) from Bangumi infobox or staff data.
 * Handles both array and single value formats, ensuring consistent array output.
 * 从 Bangumi 信息框或工作人员数据中提取工作人员信息（导演和编剧）。
 * 处理数组和单值格式，确保一致的数组输出。
 *
 * @param {Object|Array} infoboxOrStaff - The infobox array or staff object from Bangumi API (来自 Bangumi API 的信息框数组或工作人员对象)
 * @returns {Object} Object containing director and writer arrays (包含导演和编剧数组的对象)
 * @property {string[]} director - Array of director names (导演姓名数组)
 * @property {string[]} writer - Array of writer/script author names (编剧/脚本作者姓名数组)
 */
const extractStaffInfo = (infoboxOrStaff) => {
    if (typeof infoboxOrStaff !== "object" || infoboxOrStaff === null) {
        return {director: [], writer: []};
    }

    const director = getInfoboxArrayValues(infoboxOrStaff, "导演");
    const writer = getInfoboxArrayValues(infoboxOrStaff, "脚本");

    return {
        director: Array.isArray(director) ? director : (director ? [String(director)] : []),
        writer: Array.isArray(writer) ? writer : (writer ? [String(writer)] : [])
    };
};

/**
 * Processes and structures Bangumi subject data into a standardized format.
 * Extracts basic info, staff, ratings, and metadata from the subject object.
 * 处理并将 Bangumi 主题数据结构化为标准格式。
 * 从主题对象中提取基本信息、工作人员、评分和元数据。
 *
 * @param {Object} subject - The subject object from Bangumi API (来自 Bangumi API 的主题对象)
 * @param {Array<Object>} characters - Array of character information (角色信息数组)
 * @param {string|number} sid - The subject ID (主题 ID)
 * @returns {Object} Structured Bangumi media data object (结构化的 Bangumi 媒体数据对象)
 */
const processSubjectData = (subject, characters, sid) => {
    const data = {
        site: "bangumi",
        sid,
        bgm_id: subject.id ?? sid,
        name: safe(subject.name),
        name_cn: safe(
            getInfoboxValue(subject?.["infobox"], "中文名"),
            subject.name_cn
        ),
        link: `https://bangumi.tv/subject/${subject.id}`,
        summary: safe(subject.summary),
        poster: subject.images?.medium || subject.images?.["common"] || "",
        platform: safe(subject.platform),
        type: normalizeType(subject) || "",
        eps: subject.eps || subject?.["total_episodes"] || "",
        tags: Array.isArray(subject?.["meta_tags"]) ? subject?.["meta_tags"] : [],
        characters: characters || [],
        success: true
    };

    if (typeof subject?.["infobox"] === "object" && subject?.["infobox"] !== null) {
        data.aka = getInfoboxArrayValues(subject?.["infobox"], "别名");
        Object.assign(data, extractStaffInfo(subject?.["infobox"]));
    } else {
        data.aka = [];
        data.director = [];
        data.writer = [];
    }

    const score = subject.rating?.["score"];
    const total = subject.rating?.total || 0;
    data.bgm_rating_average = score || 0;
    data.bgm_votes = total;
    data.bgm_rating = score ? `${score} / 10 from ${total} users` : "";
    data.date = safe(subject.date);
    if (data.date && !isNaN(new Date(data.date).getTime())) {
        data.year = String(data.date).slice(0, 4);
    } else {
        data.year = "";
    }

    return data;
};

/**
 * Fetches character information for a Bangumi subject from the API.
 * Returns an empty array if the request fails or encounters an error.
 * 从 API 获取 Bangumi 主题的角色信息。
 * 如果请求失败或遇到错误，则返回空数组。
 *
 * @param {string|number} sid - The subject ID to fetch characters for (要获取角色的主题 ID)
 * @returns {Promise<Array<Object>>} Promise resolving to an array of character objects, or empty array on failure (解析为角色对象数组的 Promise，失败时返回空数组)
 */
const fetchCharacters = async (sid) => {
    const charactersUrl = `${BGM_API_BASE}/subjects/${encodeURIComponent(sid)}/characters`;

    try {
        const charResp = await fetchWithTimeout(charactersUrl, {
            headers: BGM_API_HEADERS,
            timeout: 15000,
        });

        if (charResp?.ok) {
            return await charResp.json().catch(() => []);
        }

        logger.warn(`[bgm] characters fetch failed for ${sid}`);
        return [];
    } catch (err) {
        logger.warn(`[bgm] unexpected error fetching characters for ${sid}`, err.message);
        return [];
    }
};

/**
 * Asynchronously fetches Bangumi subject information and returns structured media data.
 * Checks cache first if enabled, then fetches from Bangumi API with proper error handling.
 * Uses safeExecuteProvider for unified error management.
 * 异步获取 Bangumi 主题信息并返回结构化的媒体数据。
 * 如果启用则首先检查缓存，然后从 Bangumi API 获取数据并进行适当的错误处理。
 * 使用 safeExecuteProvider 进行统一的错误管理。
 *
 * @param {string|number} sid - The unique identifier for the Bangumi subject (Bangumi 主题的唯一标识符)
 * @param {Object} env - Environment configuration object (环境配置对象)
 * @returns {Promise<Object>} Promise resolving to structured Bangumi media data or error details (解析为结构化的 Bangumi 媒体数据或错误详情的 Promise)
 */
export async function gen_bangumi(sid, env) {
    const baseData = {site: "bangumi", sid};

    if (!sid) {
        return createProviderError("bangumi", sid, "Invalid Bangumi subject id");
    }

    if (env.ENABLED_CACHE === "false") {
        try {
            const cachedData = await getStaticMediaDataFromOurBits("bangumi", sid);
            if (cachedData) {
                logger.info(`[Cache Hit] GitHub OurBits DB For Bangumi ${sid}`);
                const staffInfo = extractStaffInfo(cachedData?.["staff"]);
                return {
                    ...baseData,
                    ...cachedData,
                    ...staffInfo,
                    success: true
                };
            }
        } catch (err) {
            logger.warn(`[bgm] cache fetch failed for ${sid}, falling back to API`, err.message);
        }
    }

    return await safeExecuteProvider(
        async () => {
            const subjectUrl = `${BGM_API_BASE}/subjects/${encodeURIComponent(sid)}`;

            const subjResp = await fetchWithTimeout(subjectUrl, {
                headers: BGM_API_HEADERS,
                timeout: 20000,
            });

            if (!subjResp) {
                throw new Error("No response from Bangumi API");
            }

            if (subjResp.status === 404) {
                throw new Error("Subject not found on Bangumi");
            }

            if (!subjResp.ok) {
                const txt = await subjResp.text().catch(() => "");
                throw new Error(`Bangumi subject request failed ${subjResp.status}: ${txt}`);
            }

            const subject = await subjResp.json().catch(() => null);
            if (!subject) {
                throw new Error("Failed to parse Bangumi subject response");
            }

            const characters = await fetchCharacters(sid);

            return processSubjectData(subject, characters, sid);
        },
        "bangumi",
        sid
    );
}