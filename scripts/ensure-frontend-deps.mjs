import {existsSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
if (existsSync(join(root, 'frontend', 'node_modules', 'vite'))) process.exit(0)

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const result = spawnSync(npm, ['--prefix', 'frontend', 'install', '--include=dev'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
})
process.exit(result.status ?? 1)
