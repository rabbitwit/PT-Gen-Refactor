import {readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = String(rootPkg.version || '0.0.0')

writeFileSync(
    join(root, 'src/version.ts'),
    `/** 由 \`npm run sync-version\` 从根目录 package.json 生成，请勿手改 */\n` +
    `export const VERSION = '${version}'\n` +
    `export const API_VERSION = VERSION\n`,
)

const fePkgPath = join(root, 'frontend', 'package.json')
const fePkg = JSON.parse(readFileSync(fePkgPath, 'utf8'))
if (fePkg.version !== version) {
    fePkg.version = version
    writeFileSync(fePkgPath, `${JSON.stringify(fePkg, null, 2)}\n`)
}

console.log(`version ${version}`)
