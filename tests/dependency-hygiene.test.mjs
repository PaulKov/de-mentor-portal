import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const lockfilePath = 'package-lock.json'
const nuxtConfigPath = 'nuxt.config.ts'

const readLockfile = async () => JSON.parse(await readFile(lockfilePath, 'utf-8'))

const getPackageEntries = lockfile =>
  Object.entries(lockfile.packages ?? {}).filter(([path]) => path.startsWith('node_modules/'))

test('dependency lock avoids known npm deprecated install warnings', async () => {
  const lockfile = await readLockfile()
  const packages = getPackageEntries(lockfile)

  const deprecatedRouterPackages = packages.filter(([path]) => path.endsWith('/unplugin-vue-router'))
  const deprecatedGlobPackages = packages.filter(([path, manifest]) => {
    if (!path.endsWith('/glob')) return false

    const major = Number.parseInt(String(manifest.version ?? '').split('.')[0] ?? '0', 10)
    return Number.isFinite(major) && major < 12
  })

  assert.deepEqual(
    deprecatedRouterPackages.map(([path, manifest]) => `${path}@${manifest.version}`),
    [],
    'Nuxt should not install deprecated unplugin-vue-router'
  )
  assert.deepEqual(
    deprecatedGlobPackages.map(([path, manifest]) => `${path}@${manifest.version}`),
    [],
    'lockfile should not install deprecated glob majors that emit npm warnings'
  )
})

test('Nuxt build keeps sourcemaps disabled for clean production logs', async () => {
  const nuxtConfig = await readFile(nuxtConfigPath, 'utf-8')

  assert.match(
    nuxtConfig,
    /sourcemap:\s*\{\s*server:\s*false,\s*client:\s*false\s*\}/s,
    'Nuxt config should disable server and client sourcemaps to avoid module-preload sourcemap warnings'
  )
  assert.match(
    nuxtConfig,
    /modulePreload:\s*\{\s*polyfill:\s*false\s*\}/s,
    'Vite modulepreload polyfill should be disabled because modern browser targets do not need it and Nuxt 4 logs sourcemap warnings for it'
  )
})
