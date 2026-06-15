import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
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

  assert.equal(runtimeSample.portal.framework, 'Vue 3 + Nuxt 4 + Vite')
  assert.equal(runtimeSample.portal.repository, 'https://github.com/PaulKov/de-mentor-portal')
  assert.equal(runtimeSample.portal.app_path, 'de-mentor-portal')
  assert.equal(runtimeSample.portal.session_env, 'MENTOR_LAB_SESSION')

  assert.equal(runtimeSample.control_plane.version, 'academy-control-plane/v1')
  assert.equal(runtimeSample.control_plane.mentor_mode.default_route, 'simple')
  assert.equal(
    runtimeSample.control_plane.mentor_mode.google_slides,
    'https://docs.google.com/presentation/d/17Ae88PoniaFU34egsFPwC0PndAOoXMze4qV1pIKQkaI/edit?usp=sharing'
  )
  assert.ok(runtimeSample.control_plane.portal_actions.export_command.includes('mentor-lab.py portal greenplum export'))
  assert.equal(runtimeSample.control_plane.next_lesson.code, '02-greenplum-partitioning')

  const currentGuide = runtimeSample.control_plane.mentor_mode.stage_guides.find(
    guide => guide.stage_code === runtimeSample.current_stage.code
  )
  assert.ok(currentGuide)
  assert.ok(currentGuide.mentor_script)
  assert.ok(currentGuide.expected_answer)
})

test('validation CLI accepts the sample and rejects broken payloads', async () => {
  const sampleResult = await execFileAsync('node', [
    'scripts/validate-session-contract.mjs',
    'public/session.sample.json'
  ])

  assert.match(sampleResult.stdout, /valid academy-session\/v1/)

  const tempDir = await mkdtemp(join(tmpdir(), 'academy-session-'))
  const brokenPath = join(tempDir, 'broken-session.json')
  await writeFile(
    brokenPath,
    JSON.stringify(
      {
        contract_version: 'academy-session/v1',
        academy_version: 'Academy Experience v5',
        lab_name: 'greenplum',
        student_name: 'Broken Demo',
        created_at: '2026-06-14T10:00:00',
        current_stage: { code: 'missing-from-stages' },
        stages: [],
        skill_graph: [],
        commands: [],
        events: [],
        control_plane: {
          version: 'broken-control-plane/v1',
          mentor_mode: {},
          student_mode: {},
          portal_actions: {},
          artifacts: [],
          next_lesson: {}
        },
        portal: {
          framework: 'Vue 3 + Nuxt 4 + Vite',
          repository: 'https://github.com/PaulKov/de-mentor-portal',
          app_path: 'de-mentor-portal',
          session_env: 'MENTOR_LAB_SESSION',
          dev_command: 'npm run dev'
        }
      },
      null,
      2
    )
  )

  await assert.rejects(
    execFileAsync('node', ['scripts/validate-session-contract.mjs', brokenPath]),
    error => {
      assert.match(error.stderr, /stages should contain at least one stage/)
      assert.match(error.stderr, /current_stage should be present in stages/)
      assert.match(error.stderr, /control_plane.version should be academy-control-plane\/v1/)
      return true
    }
  )
})

test('validation CLI rejects malformed optional control plane payloads', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'academy-control-plane-'))
  const brokenControlPlanePath = join(tempDir, 'broken-control-plane-session.json')
  const sample = await readJson('public/session.sample.json')
  const broken = {
    ...sample,
    control_plane: {
      ...sample.control_plane,
      mentor_mode: {
        ...sample.control_plane.mentor_mode,
        stage_guides: [
          {
            stage_code: sample.current_stage.code,
            slides: '1-2'
          }
        ]
      }
    }
  }

  await writeFile(brokenControlPlanePath, JSON.stringify(broken, null, 2))

  await assert.rejects(
    execFileAsync('node', ['scripts/validate-session-contract.mjs', brokenControlPlanePath]),
    error => {
      assert.match(error.stderr, /control_plane\.mentor_mode\.stage_guides\[0\]\.mentor_script/)
      assert.match(error.stderr, /control_plane\.mentor_mode\.stage_guides\[0\]\.expected_answer/)
      return true
    }
  )
})
