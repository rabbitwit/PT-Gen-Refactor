import type {ExecutionContext} from 'hono'
import {app} from './app'
import type {Bindings} from './types'

export {app}

/** Wrangler 需要带 `fetch` 的 default export，否则线上会 1101 / 本地请求挂起 */
export default {
    fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
        return app.fetch(request, env, ctx)
    },
}

/**
 * 入口说明 / Entry points:
 *
 * | 平台                  | 入口文件       | 命令                     |
 * | --------------------- | -------------- | ------------------------ |
 * | Cloudflare Workers    | `src/index.ts` | `npm run deploy:workers` |
 * | Vercel (Node Function)| `api/index.js` | `npm run deploy:vercel`  |
 * | Node.js               | `src/node.ts`  | `npm run build && npm start` |
 * | Bun                   | `src/bun.ts`   | `bun run src/bun.ts`     |
 * | EdgeOne Makers        | `node-functions/api/[[default]].ts` | `npm run deploy:edgeone` |
 */
