import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadCatalogSample = async () =>
  JSON.parse(await readFile('public/catalog.sample.json', 'utf-8'))

const greenplumFoundationLesson = catalog =>
  catalog.tracks
    .find(track => track.code === 'greenplum')
    ?.lessons.find(lesson => lesson.code === '01-greenplum-foundations')

test('sample catalog follows academy-catalog/v1 contract markers', async () => {
  const catalog = await loadCatalogSample()

  assert.equal(catalog.contract_version, 'academy-catalog/v1')
  assert.equal(catalog.default_track, 'greenplum')
  assert.ok(catalog.tracks.some(track => track.code === 'greenplum'))
  assert.ok(catalog.tracks.some(track => track.code === 'spark'))

  const greenplumLesson = greenplumFoundationLesson(catalog)
  assert.ok(greenplumLesson.launcher, 'ready Greenplum lesson should expose launcher metadata')
  assert.equal(greenplumLesson.launcher.lab, 'greenplum')
  assert.ok(greenplumLesson.launcher.routes.some(route => route.code === 'simple'))
  assert.ok(greenplumLesson.launcher.platforms.some(platform => platform.code === 'windows-wsl2'))
})

test('catalog validator accepts the sample and rejects broken payloads', async () => {
  const {
    AcademyCatalogContractValidator
  } = await import('../core/catalog/application/catalog-contract.ts')
  const catalog = await loadCatalogSample()
  const validator = new AcademyCatalogContractValidator()

  const valid = validator.validate(catalog)
  assert.equal(valid.valid, true)
  assert.equal(valid.catalog.tracks.length >= 5, true)

  const broken = validator.validate({ ...catalog, tracks: [] })
  assert.equal(broken.valid, false)
  assert.ok(broken.issues.some(issue => issue.path === 'tracks'))

  const brokenLauncherCatalog = structuredClone(catalog)
  greenplumFoundationLesson(brokenLauncherCatalog).launcher.routes = []
  const brokenLauncher = validator.validate(brokenLauncherCatalog)
  assert.equal(brokenLauncher.valid, false)
  assert.ok(brokenLauncher.issues.some(issue => issue.path.includes('launcher.routes')))
})

test('catalog loader returns the first valid source with dependency injection', async () => {
  const {
    CatalogLoader
  } = await import('../core/catalog/application/catalog-loader.ts')
  const catalog = await loadCatalogSample()
  const loader = new CatalogLoader([
    {
      label: 'broken',
      load: async () => ({ contract_version: 'wrong' })
    },
    {
      label: 'sample',
      load: async () => catalog
    }
  ])

  const result = await loader.load()

  assert.equal(result.ok, true)
  assert.equal(result.source, 'sample')
  assert.equal(result.catalog.default_track, 'greenplum')
})
