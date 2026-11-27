import {mkdir, readFile, rename, unlink, writeFile} from 'node:fs/promises'
import {dirname, resolve, sep} from 'node:path'
import type {FsCacheBackend} from '../types'

const DEFAULT_CACHE_DIR = 'data/cache'

function envCacheDir(): string | undefined {
    const value = globalThis.process?.env?.CACHE_DIR?.trim()
    return value || undefined
}

/**
 * 把缓存键落到 `root` 下的相对路径，拒绝 `..` 与绝对路径。
 *
 * 键格式与 R2 一致：`douban/1292052.json`、`tmdb/movie/27205.json`。
 */
function resolveSafePath(root: string, key: string): string | undefined {
    const relative = key.replace(/\\/g, '/').replace(/^\/+/u, '').trim()
    if (!relative || relative.includes('\0') || relative.split('/').some((part) => part === '' || part === '.' || part === '..')) {
        return undefined
    }

    const full = resolve(root, ...relative.split('/'))
    if (full !== root && !full.startsWith(`${root}${sep}`)) return undefined
    return full
}

/**
 * 本地目录缓存。只由 Node / Bun 入口注册，Workers / Vercel / EdgeOne
 * 不要引用本文件，否则会把 `node:fs` 打进边缘运行时。
 */
export function createFsCacheBackend(root = envCacheDir() ?? DEFAULT_CACHE_DIR): FsCacheBackend {
    const base = resolve(root)

    return {
        async read(key) {
            const path = resolveSafePath(base, key)
            if (!path) return undefined
            try {
                return await readFile(path, 'utf8')
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
                throw error
            }
        },

        async write(key, json) {
            const path = resolveSafePath(base, key)
            if (!path) return
            await mkdir(dirname(path), {recursive: true})
            const tmp = `${path}.${globalThis.process?.pid ?? '0'}.${Date.now()}.tmp`
            await writeFile(tmp, json, 'utf8')
            try {
                await rename(tmp, path)
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code
                // Windows 上目标已存在时 rename 可能失败，先删再替
                if (code === 'EEXIST' || code === 'EPERM' || code === 'EACCES') {
                    await unlink(path).catch(() => undefined)
                    await rename(tmp, path)
                    return
                }
                await unlink(tmp).catch(() => undefined)
                throw error
            }
        },
    }
}

export function resolveFsCacheDir(root = envCacheDir() ?? DEFAULT_CACHE_DIR): string {
    return resolve(root)
}
