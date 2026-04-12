import logger from "../logger.js";

/**
 * @typedef {Object} Env
 * @property {any} [R2_BUCKET] - R2 bucket binding for caching (用于缓存的 R2 存储桶绑定)
 * @property {any} [DB] - D1 database binding for caching (用于缓存的 D1 数据库绑定)
 * @property {string} [ENABLED_CACHE] - Cache enable flag (缓存启用标志)
 */

/**
 * Fetches data with R2 and D1 cache support.
 * 使用 R2 和 D1 缓存支持获取数据。
 *
 * @param {string} resourceId - The resource identifier to cache (要缓存的资源标识符)
 * @param {Function} fetchFunction - Async function to fetch fresh data (获取新鲜数据的异步函数)
 * @param {Env} env - Environment object with R2_BUCKET and DB bindings (包含 R2_BUCKET 和 DB 绑定的环境对象)
 * @param {string} source - The source platform identifier (源平台标识符)
 * @param {string|null} [subType=null] - Optional subtype for nested resources (嵌套资源的可选子类型)
 * @returns {Promise<Object>} The cached or freshly fetched data (缓存的或新获取的数据)
 */
export const _withCache = async (
    resourceId,
    fetchFunction,
    env,
    source,
    subType = null,
) => {
    const isCacheEnabled = env.ENABLED_CACHE !== "false";
    const sourcesWithNoCache = ["douban", "imdb", "bangumi", "steam"];
    if (!isCacheEnabled && sourcesWithNoCache.includes(source)) {
        logger.info(`[Cache Disabled] Fetching data for resource: ${resourceId}`);
        return await fetchFunction();
    }

    /**
     * Generates R2 cache key based on source and resource ID.
     * 根据源和资源 ID 生成 R2 缓存键。
     *
     * @returns {string} The R2 cache key (R2 缓存键)
     */
    const getR2Key = () => {
        if (!source) return resourceId;
        if ((source === "tmdb" || source === "trakt") && subType)
            return `${source}/${subType}/${resourceId}`;
        return `${source}/${resourceId}`;
    };

    /**
     * Generates D1 cache key based on source and resource ID.
     * 根据源和资源 ID 生成 D1 缓存键。
     *
     * @returns {string} The D1 cache key (D1 缓存键)
     */
    const getD1Key = () => {
        if (!source) return resourceId;
        if ((source === "tmdb" || source === "trakt") && subType)
            return `${source}_${subType}_${resourceId}`;
        return `${source}_${resourceId}`;
    };

    const r2Key = getR2Key();
    const d1Key = getD1Key();
    const promises = [];

    if (env.R2_BUCKET) {
        promises.push(
            env.R2_BUCKET.get(r2Key).then((cached) => {
                if (cached) {
                    logger.info(`[Cache Hit] R2 for: ${r2Key}`);
                    return cached.json();
                }
                return null;
            })
        );
    }

    if (env.DB) {
        promises.push(
            env.DB.prepare("SELECT data FROM cache WHERE key = ?")
                .bind(d1Key)
                .first()
                .then((row) => {
                    if (row) {
                        logger.info(`[Cache Hit] D1 for: ${d1Key}`);
                        return JSON.parse(row.data);
                    }
                    return null;
                })
        );
    }

    let cachedData = null;
    if (promises.length > 0) {
        const results = await Promise.all(promises);
        cachedData = results.find((result) => result != null) || null;
    }

    if (cachedData) return cachedData;

    logger.info(`[Cache Miss] Fetching for R2: ${r2Key}, D1: ${d1Key}`);
    const freshData = await fetchFunction();

    if (!freshData || typeof freshData !== "object" || freshData.success !== true)
        return freshData;

    const cacheData = {...freshData};
    delete cacheData.format;
    const cacheDataStr = JSON.stringify(cacheData);
    const writePromises = [];

    if (env.R2_BUCKET) {
        writePromises.push(
            env.R2_BUCKET.put(r2Key, cacheDataStr).then(() => {
                logger.info(`[Cache Write] R2 for: ${r2Key}`);
            }).catch((e) => logger.error("R2 cache write error:", e))
        );
    }

    if (env.DB) {
        writePromises.push(
            env.DB.prepare(
                "INSERT OR REPLACE INTO cache (key, data, timestamp) VALUES (?, ?, ?)",
            )
                .bind(d1Key, cacheDataStr, Date.now())
                .run()
                .then(() => {
                    logger.info(`[Cache Write] D1 for: ${d1Key}`);
                })
                .catch((e) => logger.error("D1 cache write error:", e))
        );
    }

    if (writePromises.length > 0) {
        Promise.all(writePromises).catch((e) =>
            logger.error("Cache write error:", e),
        );
    }

    return freshData;
};
