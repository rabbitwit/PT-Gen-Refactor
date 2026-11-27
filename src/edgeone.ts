import {getRequestListener} from '@hono/node-server'
import {app} from './app'
import {registerEoCacheStore} from './lib/persistent-cache'
import type {Bindings, ObjectStoreLike} from './types'

const DEFAULT_EO_BLOB_STORE = 'pt-gen-cache'

/**
 * 由 `node-functions/` 入口传入官方 `getStore`。
 * 必须在函数文件里静态 import `@edgeone/pages-blob`，部署打包才会注入凭证。
 */
type EdgeOneGetStore = typeof import('@edgeone/pages-blob').getStore

let getStoreImpl: EdgeOneGetStore | undefined
let edgeOneBlobRegistered = false

function readString(env: unknown, key: string): string | undefined {
    if (env && typeof env === 'object') {
        const value = (env as Record<string, unknown>)[key]
        if (typeof value === 'string' && value.trim()) return value.trim()
    }
    const fromProcess = globalThis.process?.env?.[key]?.trim()
    return fromProcess || undefined
}

function edgeOneBlobStoreName(env?: unknown): string {
    return readString(env, 'EO_BLOB_STORE') || DEFAULT_EO_BLOB_STORE
}

function tryRegisterEdgeOneBlob(env?: unknown): void {
    if (edgeOneBlobRegistered || !getStoreImpl) return
    try {
        const name = edgeOneBlobStoreName(env)
        const token = readString(env, 'PAGES_BLOB_DEPLOY_CREDENTIAL') || readString(env, 'EO_BLOB_TOKEN')
        const projectId = readString(env, 'PAGES_PROJECT_ID') || readString(env, 'EO_PROJECT_ID')
        const blob =
            token && projectId
                ? getStoreImpl({name, projectId, token, consistency: 'strong'})
                : getStoreImpl(name)
        const store: ObjectStoreLike = {
            get: (key) => blob.get(key, {type: 'text', consistency: 'strong'}),
            put: (key, value) => blob.set(key, value),
        }
        registerEoCacheStore(store)
        edgeOneBlobRegistered = true
        void blob.set('_ok.json', JSON.stringify({v: 1, ts: Date.now()})).then(
            () => console.info('[Cache Write] EO Blob warmup _ok.json'),
            (error) => {
                const message = error instanceof Error ? error.message : String(error)
                console.warn('[Cache] EO Blob warmup failed:', message)
            },
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn('[Cache] EdgeOne Blob unavailable:', message)
    }
}

/** 函数入口把打包后的 `getStore` 传进来，才能带上注入的部署凭证 */
export function bindEdgeOneBlob(getStore: EdgeOneGetStore, env?: unknown): void {
    getStoreImpl = getStore
    tryRegisterEdgeOneBlob(env)
}

type Mount = 'health' | 'docs' | 'callback' | 'api'

/**
 * EdgeOne 按 `node-functions/` 文件路径挂载函数时，常把前缀从 pathname 里裁掉：
 * - `health.ts` 收到的可能是 `/` 而不是 `/health`
 * - `api/[[default]].ts` 收到的可能是 `/v1/resolve` 而不是 `/api/v1/resolve`
 *
 * 路径不对就会落到 `/api` 鉴权或 404。浏览器直接打开 `/health` 看到 401，多半是这个原因。
 */
function restorePath(pathname: string, mount: Mount): string {
    const path = pathname.startsWith('/') ? pathname : `/${pathname}`
    const intact =
        path === '/health' ||
        path.startsWith('/health/') ||
        path === '/docs' ||
        path.startsWith('/docs/') ||
        path === '/callback' ||
        path.startsWith('/callback/') ||
        path === '/api' ||
        path.startsWith('/api/')
    if (intact) return path

    if (mount === 'health') return '/health'
    if (mount === 'docs') return '/docs'
    if (mount === 'callback') return '/callback'
    if (path === '/' || path === '') return '/api/'
    return `/api${path}`
}

function rewriteFetchRequest(request: Request, mount: Mount): Request {
    const url = new URL(request.url)
    const restored = restorePath(url.pathname, mount)
    if (restored === url.pathname) return request
    url.pathname = restored
    return new Request(url, request)
}

function rewriteNodeUrl(raw: string, mount: Mount): string {
    const absolute = /^https?:\/\//i.test(raw)
    const url = new URL(absolute ? raw : `http://localhost${raw.startsWith('/') ? raw : `/${raw}`}`)
    const restored = restorePath(url.pathname, mount)
    if (restored === url.pathname) return raw
    url.pathname = restored
    return absolute ? url.toString() : `${url.pathname}${url.search}`
}

export function createEdgeOneHandler(mount: Mount) {
    const fetchHandler = (request: Request, env?: unknown) => {
        tryRegisterEdgeOneBlob(env)
        return app.fetch(rewriteFetchRequest(request, mount), env as Bindings | undefined)
    }

    const nodeListener = getRequestListener(fetchHandler)

    function handler(req: Request | { url?: string }, res?: unknown) {
        if (typeof Request !== 'undefined' && req instanceof Request) {
            return fetchHandler(req, res)
        }

        if (req && typeof req.url === 'string') {
            ;(req as { url: string }).url = rewriteNodeUrl(req.url, mount)
        }

        return nodeListener(
            req as Parameters<typeof nodeListener>[0],
            res as Parameters<typeof nodeListener>[1],
        )
    }

    handler.fetch = fetchHandler
    return handler
}
