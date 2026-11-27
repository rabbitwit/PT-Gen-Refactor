/**
 * Vercel 入口。
 *
 * Vercel 的 Node 构建器不会打包代码，而是逐个文件转译后**保留原来的相对导入路径**。
 * 本项目是 `"type": "module"`，转译后的 JS 按 ESM 解析，而 `src/` 里的相对导入没有
 * 扩展名（`../src/app`），Node 运行时不会补全扩展名，于是报：
 *
 *   ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/src/app'
 *
 * 另一方面给导入补 `.js` 后缀也不行：Vercel 在构建时用 `@vercel/nft` 追踪依赖，
 * 它只会把 `../src/app` 解析到 `src/app.ts`，`../src/app.js` 反而追踪不到。
 *
 * 所以入口指向 `npm run build`（tsup）产出的自包含 bundle，里面没有相对导入。
 * `vercel.json` 的 `buildCommand` 保证部署时一定先生成 `dist/vercel.js`。
 *
 * 使用 Node.js runtime（而非 Edge）：
 * IMDb 的 HTML 路径需要 Playwright + @sparticuz/chromium，
 * 只有 Node runtime 能运行可执行文件。
 *
 * `vercel.json` 的 rewrites 把所有路径转发到这里。
 */
export {default} from '../dist/vercel.js'

export const config = {
    runtime: 'nodejs',
    maxDuration: 60,
}
