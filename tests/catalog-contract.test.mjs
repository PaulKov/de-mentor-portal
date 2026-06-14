import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadCatalogSample = async () =>
  JSON.parse(await readFile('public/catalog.sample.json', 'utf-8'))

test('sample catalog follows academy-catalog/v1 contract markers', async () => {
  const catalog = await loadCatalogSample()

  assert.equal(catalog.contract_version, 'academy-catalog/v1')
  assert.equal(catalog.default_track, 'greenplum')
  assert.ok(catalog.tracks.some(track => track.code === 'greenplum'))
  assert.ok(catalog.tracks.some(track => track.code === 'spark'))
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
