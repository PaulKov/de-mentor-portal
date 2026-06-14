import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import test from 'node:test'

const SOURCE_ROOTS = [
  'app.vue',
  'components',
  'composables',
  'core',
  'features',
  'scripts',
  'server',
  'shared'
]

const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.vue'])
const MAX_MODULE_SLOC = 400
const MAX_AVG_CLUSTERING = 0.180

const listSourceFiles = async () => {
  const files = []

  for (const root of SOURCE_ROOTS) {
    await collectSourceFiles(root, files)
  }

  return files.sort()
}

const collectSourceFiles = async (path, files) => {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    for (const entry of entries) {
      const child = join(path, entry.name)
      if (entry.isDirectory()) {
        if (!['.nuxt', '.output', 'node_modules'].includes(entry.name)) {
          await collectSourceFiles(child, files)
        }
      } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
        files.push(child)
      }
    }
  } catch {
    if (SOURCE_EXTENSIONS.has(extname(path))) {
      files.push(path)
    }
  }
}

const sourceLineCount = source =>
  source
    .split('\n')
    .filter(line => {
      const trimmed = line.trim()
      return trimmed && !trimmed.startsWith('//')
    })
    .length

const moduleName = path => relative('.', path).replaceAll('\\', '/')

const importTargets = source => {
  const targets = []
  const importPattern = /from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  let match

  while ((match = importPattern.exec(source)) !== null) {
    targets.push(match[1] ?? match[2])
  }

  return targets
}

const resolveInternalImport = (fromPath, target, modules) => {
  if (target.startsWith('@/') || target.startsWith('~/')) {
    return nearestModule(`${target.slice(2)}.ts`, modules)
  }

  if (!target.startsWith('.')) {
    return null
  }

  const base = fromPath.split('/').slice(0, -1).join('/')
  return nearestModule(`${base}/${target}`.replaceAll('/./', '/'), modules)
}

const nearestModule = (candidate, modules) => {
  const normalized = candidate.replaceAll('\\', '/')
  const candidates = [
    normalized,
    `${normalized}.ts`,
    `${normalized}.js`,
    `${normalized}.mjs`,
    `${normalized}.vue`,
    `${normalized}/index.ts`,
    `${normalized}/index.js`
  ]

  return candidates.find(path => modules.has(path)) ?? null
}

const buildImportGraph = async files => {
  const modules = new Set(files.map(moduleName))
  const graph = Object.fromEntries([...modules].map(module => [module, new Set()]))

  for (const file of files) {
    const source = await readFile(file, 'utf-8')
    const fromModule = moduleName(file)
    for (const target of importTargets(source)) {
      const resolved = resolveInternalImport(fromModule, target, modules)
      if (resolved) {
        graph[fromModule].add(resolved)
      }
    }
  }

  return graph
}

const averageClustering = graph => {
  const coefficients = Object.entries(graph)
    .map(([, neighbors]) => [...neighbors])
    .map(neighbors => {
      if (neighbors.length < 2) {
        return 0
      }
      let links = 0
      for (let leftIndex = 0; leftIndex < neighbors.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < neighbors.length; rightIndex += 1) {
          if (
            graph[neighbors[leftIndex]]?.has(neighbors[rightIndex]) ||
            graph[neighbors[rightIndex]]?.has(neighbors[leftIndex])
          ) {
            links += 1
          }
        }
      }
      return links / (neighbors.length * (neighbors.length - 1) / 2)
    })

  if (coefficients.length === 0) {
    return 0
  }

  return coefficients.reduce((sum, coefficient) => sum + coefficient, 0) / coefficients.length
}

test('all portal modules stay under 400 SLOC', async () => {
  const offenders = []

  for (const file of await listSourceFiles()) {
    const source = await readFile(file, 'utf-8')
    const sloc = sourceLineCount(source)
    if (sloc > MAX_MODULE_SLOC) {
      offenders.push(`${moduleName(file)}: ${sloc} SLOC`)
    }
  }

  assert.deepEqual(offenders, [])
})

test('portal dependency graph stays below avg clustering guard', async () => {
  const graph = await buildImportGraph(await listSourceFiles())
  const clustering = averageClustering(graph)

  assert.ok(
    clustering <= MAX_AVG_CLUSTERING,
    `expected avg clustering <= ${MAX_AVG_CLUSTERING}, got ${clustering.toFixed(3)}`
  )
})
