import {defineConfig} from 'tsup'

// tsup CLI 会加载此文件的默认导出；IDE 静态分析看不到引用
// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    // node：常规 Node.js 服务器；vercel：Vercel 函数的自包含 bundle
    entry: {node: 'src/node.ts', vercel: 'src/vercel.ts'},
    format: ['esm'],
    platform: 'node',
    target: 'node20',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    splitting: false,
    // 这些包只能在 Node 运行时按需动态加载，不能被打包进产物
    external: ['playwright-core', '@sparticuz/chromium'],
})
