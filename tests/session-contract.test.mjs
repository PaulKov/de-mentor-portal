import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readJson = async path => JSON.parse(await readFile(path, 'utf-8'))

test('sample session follows academy-session/v1 contract markers', async () => {
  const schema = await readJson('contracts/academy-session/v1/session.schema.json')
  const contractSample = await readJson('contracts/academy-session/v1/session.sample.json')
  const runtimeSample = await readJson('public/session.sample.json')

  assert.equal(schema.properties.contract_version.const, 'academy-session/v1')
  assert.equal(contractSample.contract_version, 'academy-session/v1')
  assert.equal(runtimeSample.contract_version, 'academy-session/v1')

  for (const requiredKey of schema.required) {
    assert.ok(requiredKey in runtimeSample, `runtime sample is missing ${requiredKey}`)
  }

  assert.equal(runtimeSample.portal.framework, 'Vue 3 + Nuxt 3 + Vite')
  assert.equal(runtimeSample.portal.repository, 'https://github.com/PaulKov/de-mentor-portal')
  assert.equal(runtimeSample.portal.app_path, 'de-mentor-portal')
  assert.equal(runtimeSample.portal.session_env, 'MENTOR_LAB_SESSION')
})
