import {getRequestListener} from '@hono/node-server'
import {app} from './app'

/**
 * Vercel Serverless Function 的入口实现，由 tsup 打包成自包含的 `dist/vercel.js`。
 *
 * 真正的 `api/index.js` 只转导出这个 bundle，原因见该文件的注释。
 *
 * Vercel 的 Node.js runtime 以 Node 的 `(req, res)` 调用函数，
 * 而 `hono/vercel` 只接受 Fetch `Request`（那是 Edge runtime 的形态），
 * 所以这里用 `@hono/node-server` 的适配器做 Node → Fetch 转换。
 */
export default getRequestListener(app.fetch)
