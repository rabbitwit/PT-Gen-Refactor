import type {Bindings, CacheKeys, ProviderSite} from '../types'
import {TtlCache} from './cache'
import {readEnv} from './env'
import {fetchWithTimeout} from './timeout'
import {attachFormat} from '../format'

/**
 * 静态数据库回退。
 *
 * 持久层（R2 / D1 / Blob / EdgeOne / 本地目录）都没命中时，先去
 * [PT-Gen-Database](https://github.com/rabbitwit/PT-Gen-Database) 取现成的
 * JSON，只有静态库里也没有才真正抓取上游。
 *
 * 静态库的文件路径与持久层的对象键一致：`douban/1292052.json`、
 * `tmdb/movie/27205.json`。内容基本等于上游接口返回的裸数据，不含 `format`，
 * 因此命中后仍需走一遍 `attachFormat`。库里的数据是全量版本，`full=false`
 * 的 `_base` 变体会回退到全量文件。
 *
 * 静态库是 GitHub 仓库，网络不稳时宁可回源上游也不要拖慢请求：
 * 每层镜像单独超时，全部失败按未命中处理；未命中的键在进程内记 10 分钟，
 * 避免每次请求都先打一遍 GitHub。
 */

const DATABASE_MIRRORS = [
    'https://cdn.jsdelivr.net/gh/rabbitwit/PT-Gen-Database@main',
    'https://raw.githubusercontent.com/rabbitwit/PT-Gen-Database/main',
] as const

const DATABASE_TIMEOUT_MS = 6_000
const MISS_TTL_MS = 10 * 60 * 1000

const misses = new TtlCache<true>(MISS_TTL_MS, 2_000)
const inFlight = new Map<
    string,
    Promise<{ entry: Record<string, unknown>; path: string } | undefined>
>()

function databaseMirrors(env: Bindings | undefined): string[] {
    const custom = readEnv(env, 'DATABASE_BASE_URL')
    if (!custom) return [...DATABASE_MIRRORS]
    return custom
        .split(',')
        .map((item) => item.trim().replace(/\/+$/, ''))
        .filter(Boolean)
}

/**
 * 对象键 → 静态库候选路径。
 *
 * - `full=false` 的变体（`douban/base/<id>.json`、`tmdb/movie_base/<id>.json`）
 *   回退到全量文件。
 * - Trakt 静态库用 slug 命名（`trakt/3-idiots-2009.json`），数字 ID 无法定位；
 *   用 slug 请求时去掉类型目录再试一次。
 */
function candidatePaths(site: ProviderSite, keys: CacheKeys): string[] {
    const full = keys.r2
    const parts = full.split('/')
    const file = parts.pop() ?? ''
    const dirs = parts
    const paths: string[] = []

    const push = (path: string): void => {
        if (path && !paths.includes(path)) paths.push(path)
    }

    const baseStripped = dirs.map((dir) => {
        if (dir === 'base') return null
        if (dir.endsWith('_base')) return dir.slice(0, -'_base'.length)
        return dir
    })
    const isBaseVariant = baseStripped.some((dir, index) => dir !== dirs[index])

    // 静态库只有全量文件，`_base` 变体直接查全量路径，少发一次注定 404 的请求
    push(
        isBaseVariant
            ? [...baseStripped.filter((dir): dir is string => dir !== null), file].join('/')
            : full,
    )

    if (site === 'trakt') {
        const id = file.replace(/\.json$/, '')
        // 数字 ID 在静态库里查不到对应 slug，直接跳过这一步
        if (/^\d+$/.test(id)) return []
        push(['trakt', file].join('/'))
    }

    return paths
}

async function fetchEntry(
    mirrors: string[],
    path: string,
): Promise<Record<string, unknown> | undefined> {
    for (const base of mirrors) {
        try {
            const response = await fetchWithTimeout(
                `${base}/${path}`,
                {headers: {'user-agent': 'PT-Gen-Refactor'}},
                DATABASE_TIMEOUT_MS,
            )
            if (response.status === 404) continue
            if (!response.ok) {
                console.warn(`[Database] ${base} returned ${response.status} for ${path}`)
                continue
            }
            const parsed: unknown = await response.json()
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>
            }
            return undefined
        } catch (error) {
            console.warn(
                `[Database] ${base} failed for ${path}:`,
                error instanceof Error ? error.message : String(error),
            )
        }
    }
    return undefined
}

/**
 * 从静态数据库取一条数据并生成 `format`；没有命中返回 `undefined`。
 *
 * `ENABLED_DATABASE=false` 可整体关闭该回退（持久层与进程内缓存不受影响）。
 */
export async function loadStaticDatabase<T>(
    env: Bindings | undefined,
    site: ProviderSite,
    keys: CacheKeys,
): Promise<T | undefined> {
    if (readEnv(env, 'ENABLED_DATABASE')?.toLowerCase() === 'false') return undefined

    const paths = candidatePaths(site, keys)
    if (paths.length === 0) return undefined

    const missKey = paths[0]
    if (misses.get(missKey)) return undefined

    let task = inFlight.get(missKey)
    if (!task) {
        task = (async () => {
            const mirrors = databaseMirrors(env)
            for (const path of paths) {
                const entry = await fetchEntry(mirrors, path)
                if (entry) {
                    if (entry.success === false) return undefined
                    return {entry, path}
                }
            }
            return undefined
        })()
        inFlight.set(missKey, task)
    }

    try {
        const found = await task
        if (!found) {
            misses.set(missKey, true)
            return undefined
        }
        console.info(`[Database Hit] ${found.path}`)
        return attachFormat(site, found.entry) as unknown as T
    } finally {
        inFlight.delete(missKey)
    }
}
