import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const app = resolve('rk-cb75-source')
const vite = join(app, 'node_modules/vite/bin/vite.js')
if (!existsSync(vite)) {
  const npmCli = process.env.npm_execpath
  if (!npmCli) throw new Error('Install RK CB75 dependencies with npm ci --prefix rk-cb75-source')
  execFileSync(process.execPath, [npmCli, 'ci', '--prefix', app, '--no-audit', '--no-fund'], { stdio: 'inherit' })
}
execFileSync('node', [vite, 'build'], { cwd: app, stdio: 'inherit' })

const output = resolve('public/cb75')
const images = join(output, 'assets/images')
mkdirSync(images, { recursive: true })
cpSync(join(app, 'assets/images'), images, { recursive: true, force: true })

// RK CB75 uses absolute image URLs in key labels and device background data.
// Scope those URLs to its own app so the other Anxiu devices keep their assets.
for (const name of readdirSync(join(output, 'assets'))) {
  if (!name.endsWith('.js') && !name.endsWith('.css')) continue
  const file = join(output, 'assets', name)
  const source = readFileSync(file, 'utf8')
  if (source.includes('/src/assets/')) writeFileSync(file, source.replaceAll('/src/assets/', '/cb75/assets/'))
}
