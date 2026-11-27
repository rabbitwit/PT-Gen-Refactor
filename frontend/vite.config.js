import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {VERSION} from '../src/version.ts'

// 默认代理到 `npm run dev:workers`（8787）；用 Node 开发时设置
// VITE_PROXY_TARGET=http://127.0.0.1:3000
const backend = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8787'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(VERSION),
    },
    build: {
        outDir: '../public',
        emptyOutDir: true,
    },
    server: {
        proxy: {
            '/api': {
                target: backend,
                changeOrigin: true,
                secure: false,
            },
            '/health': {
                target: backend,
                changeOrigin: true,
                secure: false,
            },
            '/docs': {
                target: backend,
                changeOrigin: true,
                secure: false,
            },
        },
        fs: {
            allow: ['..']
        }
    }
})
