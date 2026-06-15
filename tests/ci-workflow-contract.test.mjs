import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const workflowPath = '.github/workflows/ci.yml'

test('Portal CI is pinned to Node 24 compatible GitHub Actions runtime', async () => {
  const workflow = await readFile(workflowPath, 'utf-8')

  assert.match(
    workflow,
    /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24:\s*true/,
    'workflow should opt into the Node 24 JavaScript actions runtime before GitHub forces the migration'
  )
  assert.match(workflow, /uses:\s*actions\/checkout@v6/, 'checkout should use a Node 24 action runtime')
  assert.match(workflow, /uses:\s*actions\/setup-node@v6/, 'setup-node should use a Node 24 action runtime')
  assert.match(workflow, /node-version:\s*24/, 'project CI should execute npm scripts on Node 24')
})
