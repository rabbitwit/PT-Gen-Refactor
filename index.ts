/**
 * 托管面板的默认启动文件入口（`bun run index.ts`）。
 *
 * Pterodactyl / Pelican / Bot-Hosting 这类面板的 `STARTUP_FILE` 默认就是 `index.ts`，
 * 这里直接转去 Bun 入口；Cloudflare Workers 的入口是 `src/index.ts`，两者互不影响。
 */
import './src/bun'
