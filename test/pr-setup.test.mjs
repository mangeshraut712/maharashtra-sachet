import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const read = (path) => readFileSync(join(root, path), 'utf8')

test('pull request template uses the shared section order', () => {
  const template = read('.github/PULL_REQUEST_TEMPLATE.md')
  const headings = [...template.matchAll(/^## (.+)$/gm)].map((match) => match[1])
  assert.deepEqual(headings, ['Why', 'Scope', 'Tradeoffs', 'Blast Radius', 'Verification'])
  assert.match(template, /36 Maharashtra districts/)
  assert.match(template, /cell broadcast/)
})

test('Grok Bot and Cursor share one pull request skill', () => {
  const skill = read('.cursor/skills/pr-setup/SKILL.md')
  const agents = read('AGENTS.md')
  const rules = read('.cursor/rules/pr-setup.mdc')
  const settings = JSON.parse(read('.cursor/settings.json'))
  assert.match(skill, /Grok Bot/)
  assert.match(skill, /does not edit the product patch/)
  assert.match(skill, /explicitly asks to ship, land, or merge/)
  assert.match(agents, /\.cursor\/skills\/pr-setup\/SKILL\.md/)
  assert.match(rules, /\.cursor\/skills\/pr-setup\/SKILL\.md/)
  assert.equal(settings.plugins.pstack.enabled, true)
})

test('Bugbot rules cover authority, Goa, and the district inventory', () => {
  const bugbot = read('.cursor/BUGBOT.md')
  assert.match(bugbot, /cell broadcast/)
  assert.match(bugbot, /551, 552, 585, 586/)
  assert.match(bugbot, /36 Maharashtra districts/)
  assert.match(bugbot, /rendered as an all-clear/)
})
