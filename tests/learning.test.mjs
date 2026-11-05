import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatScore, plainText, publicationProblems, safeResourceUrl, scoreToUnits, validateAssignment, validateLesson, validateWork } from '../shared/learning.ts'
const fields = () => ({ title: 'Synthetic assignment', instructions: 'Explain your approach', submission_mode: 'individual', response_format: 'text', opens_at: '2030-01-01T09:00:00Z', deadline_mode: 'at', due_at: '2030-01-02T09:00:00Z', late_mode: 'reject', max_attempts: 2, max_score_units: 10000 })
const clock = Date.parse('2030-01-01T08:00:00Z')
test('scores use exact hundredths and reject ambiguous/exponential input', () => {
  assert.equal(scoreToUnits('12.30'), 1230); assert.equal(scoreToUnits('0.01'), 1); assert.equal(scoreToUnits('0'), 0)
  assert.equal(formatScore(1230), '12.30')
  for (const value of ['-1', '1e2', '1.001', '1,000', 'Infinity', '10000.01']) assert.throws(() => scoreToUnits(value))
})
test('resources accept only bounded HTTPS links without embedded credentials', () => {
  assert.equal(safeResourceUrl('https://example.test'), 'https://example.test/')
  assert.equal(safeResourceUrl(null), null)
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'http://example.test', '//example.test', 'https://user:password@example.test/', 'https://example.test/\nsecret', 'https://example.test/' + 'x'.repeat(2048)]) assert.throws(() => safeResourceUrl(url))
})
test('text preserves code as data while bounding Unicode bytes and control characters', () => {
  const body = '<script>never execute this</script>\nconst x = 1;'
  assert.equal(validateLesson({ title: 'Code', body_text: body, resource_url: null }).body_text, body)
  assert.equal(plainText('\u0000'), false); assert.equal(plainText('é'.repeat(6001)), false)
  assert.equal(plainText('normal text\n\twith a tab'), true)
})
test('lesson and assignment validation reject authority/state mass assignment', () => {
  assert.throws(() => validateLesson({ title: 'Title', body_text: 'Text', resource_url: null, state: 'published' }))
  assert.throws(() => validateAssignment({ ...fields(), role: 'admin' }))
  assert.throws(() => validateAssignment({ ...fields(), max_attempts: 1.5 }))
  assert.throws(() => validateAssignment({ ...fields(), submission_mode: 'group' }))
  assert.throws(() => validateAssignment({ ...fields(), opens_at: 'bad-date' }))
})
test('drafts may retain unresolved settings but cannot publish them', () => {
  const draft = validateAssignment({ ...fields(), submission_mode: null, response_format: null, deadline_mode: null, due_at: null, late_mode: null, max_attempts: null })
  assert.ok(publicationProblems(draft, clock).length >= 4)
  assert.deepEqual(publicationProblems(fields(), clock), [])
})
test('deadline/no-deadline settings and publication boundaries must be explicit', () => {
  assert.deepEqual(publicationProblems({ ...fields(), deadline_mode: 'none', due_at: null, late_mode: 'not_applicable' }, clock), [])
  assert.ok(publicationProblems({ ...fields(), deadline_mode: 'none' }, clock).length)
  assert.ok(publicationProblems({ ...fields(), due_at: new Date(clock).toISOString() }, clock).length)
  assert.ok(publicationProblems({ ...fields(), late_mode: null }, clock).length)
  assert.ok(publicationProblems({ ...fields(), opens_at: 'bad' }, clock).length)
})
test('response format rules reject missing or extra response kinds', () => {
  assert.deepEqual(validateWork('My response', null, 'text'), { body_text: 'My response', resource_url: null })
  assert.deepEqual(validateWork('', 'https://example.test/work', 'link'), { body_text: '', resource_url: 'https://example.test/work' })
  assert.throws(() => validateWork('', null, 'text_or_link'))
  assert.throws(() => validateWork('Text', null, 'text_and_link'))
  assert.throws(() => validateWork('Text', 'https://example.test', 'text'))
  assert.throws(() => validateWork('Text', 'https://example.test', 'link'))
  assert.throws(() => validateWork('Text', null, null))
})
