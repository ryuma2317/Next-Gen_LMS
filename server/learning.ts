import { Hono } from 'hono'
import type { Env } from './types'
import { uuidPattern } from '../shared/admissions'
import { plainText, validateAssignment, validateLesson, safeResourceUrl } from '../shared/learning'

export const learning = new Hono<Env>()
const shape = (v: unknown, keys: string[]): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === keys.sort().join(',')
const revision = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
learning.use('*', async (c, next) => {
  if (c.req.method === 'POST' && !c.req.header('Content-Type')?.startsWith('application/json')) return c.json({ error: 'JSON required' }, 415)
  await next()
})
learning.get('/editions/:id/learning', async c => {
  const id = c.req.param('id')
  if (!uuidPattern.test(id)) return c.json({ error: 'Invalid edition' }, 400)
  const { data, error } = await c.get('db').rpc('learning_classes', { p_edition: id })
  return error ? c.json({ error: 'Unable to load learning classes' }, 503) : c.json(data)
})
learning.get('/sections/:id/learning', async c => {
  const id = c.req.param('id')
  if (!uuidPattern.test(id)) return c.json({ error: 'Invalid class' }, 400)
  const [lessons, assignments] = await Promise.all([
    c.get('db').rpc('learning_lessons', { p_section: id }),
    c.get('db').rpc('learning_assignments', { p_section: id }),
  ])
  if (lessons.error || assignments.error) return c.json({ error: 'Unable to load class material' }, 503)
  // Stable DTOs: new database columns must not silently become client fields.
  const project = (row: Record<string, unknown>, keys: string[]) => {
    const result: Record<string, string | number | boolean | null> = {}
    for (const key of keys) {
      const value = row[key]
      if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') result[key] = value
      else if (value !== undefined) throw new Error('Unexpected class data shape')
    }
    return result
  }
  return c.json({
    lessons: (lessons.data ?? []).map((row: Record<string, unknown>) => project(row, ['id', 'section_id', 'title', 'body_text', 'resource_url', 'state', 'version'])),
    assignments: (assignments.data ?? []).map((row: Record<string, unknown>) => project(row, ['id', 'section_id', 'title', 'instructions', 'submission_mode', 'response_format', 'opens_at', 'deadline_mode', 'due_at', 'late_mode', 'max_attempts', 'max_score_units', 'state', 'version'])),
  })
})
learning.get('/assignments/:id/work', async c => {
  const id = c.req.param('id')
  const offset = c.req.query('offset') ?? '0'
  if (!uuidPattern.test(id) || !/^\d{1,5}$/.test(offset) || Number(offset) > 10000 || Object.keys(c.req.query()).some(key => key !== 'offset')) return c.json({ error: 'Invalid assignment or page offset' }, 400)
  const { data, error } = await c.get('db').rpc('learning_work', { p_assignment: id, p_offset: Number(offset) })
  return error ? c.json({ error: 'Unable to load permitted submissions' }, 503) : c.json(data)
})
learning.post('/sections/:id/lessons', async c => {
  const id = c.req.param('id'), body: unknown = await c.req.json().catch(() => null)
  if (!uuidPattern.test(id) || !shape(body, ['id', 'version', 'lesson']) || typeof body.id !== 'string' || !uuidPattern.test(body.id) || !revision(body.version)) return c.json({ error: 'Valid lesson reference and revision required' }, 400)
  let fields
  try { fields = validateLesson(body.lesson) } catch (e) { return c.json({ error: (e as Error).message }, 400) }
  const { data, error } = await c.get('db').rpc('save_class_lesson', { p_id: body.id, p_section: id, p_version: body.version, p_title: fields.title, p_text: fields.body_text, p_url: fields.resource_url })
  return error ? c.json({ error: 'Draft save unavailable. Check assigned editing permission, MFA and the current revision.' }, 409) : c.json({ id: data })
})
learning.post('/sections/:id/assignments', async c => {
  const id = c.req.param('id'), body: unknown = await c.req.json().catch(() => null)
  if (!uuidPattern.test(id) || !shape(body, ['id', 'version', 'assignment']) || typeof body.id !== 'string' || !uuidPattern.test(body.id) || !revision(body.version)) return c.json({ error: 'Valid assignment reference and revision required' }, 400)
  let fields
  try { fields = validateAssignment(body.assignment) } catch (e) { return c.json({ error: (e as Error).message }, 400) }
  const { data, error } = await c.get('db').rpc('save_class_assignment', { p_id: body.id, p_section: id, p_version: body.version, p_fields: fields })
  return error ? c.json({ error: 'Draft save unavailable. Check assigned editing permission, MFA and the current revision.' }, 409) : c.json({ id: data })
})
learning.post('/lessons/:id/publish', async c => {
  const id = c.req.param('id'), body: unknown = await c.req.json().catch(() => null)
  if (!uuidPattern.test(id) || !shape(body, ['version']) || !revision(body.version) || body.version === 0) return c.json({ error: 'Current saved lesson revision required' }, 400)
  const { error } = await c.get('db').rpc('publish_class_lesson', { p_id: id, p_version: body.version })
  return error ? c.json({ error: 'Publication unavailable. Check permission, MFA, revision and lesson content.' }, 409) : c.json({ status: 'published' })
})
learning.post('/assignments/:id/:action', async c => {
  const id = c.req.param('id'), action = c.req.param('action'), b: unknown = await c.req.json().catch(() => null)
  if (!uuidPattern.test(id)) return c.json({ error: 'Invalid assignment' }, 400)
  let rpc: string, args: Record<string, unknown>
  if (action === 'publish') {
    if (!shape(b, ['version']) || !revision(b.version) || b.version === 0) return c.json({ error: 'Current saved assignment revision required' }, 400)
    rpc = 'publish_class_assignment'; args = { p_id: id, p_version: b.version }
  } else if (action === 'close') {
    if (!shape(b, ['version', 'reason']) || !revision(b.version) || !plainText(b.reason, 1000) || !b.reason.trim()) return c.json({ error: 'Current revision and closing reason required' }, 400)
    rpc = 'close_class_assignment'; args = { p_id: id, p_version: b.version, p_reason: b.reason }
  } else if (action === 'submit') {
    if (!shape(b, ['id', 'version', 'body_text', 'resource_url']) || typeof b.id !== 'string' || !uuidPattern.test(b.id) || !revision(b.version) || !plainText(b.body_text)) return c.json({ error: 'Valid submission reference, revision and response required' }, 400)
    let url
    try { url = safeResourceUrl(b.resource_url) } catch (e) { return c.json({ error: (e as Error).message }, 400) }
    rpc = 'submit_class_work'; args = { p_id: b.id, p_assignment: id, p_version: b.version, p_text: b.body_text, p_url: url }
  } else return c.json({ error: 'Unknown assignment action' }, 404)
  const { data, error } = await c.get('db').rpc(rpc, args)
  return error ? c.json({ error: 'Action unavailable. Check access, revision, opening/closing times and configured assignment rules.' }, 409) : c.json({ status: 'saved', id: data })
})
learning.post('/work/:id/:action', async c => {
  const id = c.req.param('id'), action = c.req.param('action'), b: unknown = await c.req.json().catch(() => null)
  if (!uuidPattern.test(id)) return c.json({ error: 'Invalid work reference' }, 400)
  let rpc: string, args: Record<string, unknown>
  if (action === 'grade') {
    if (!shape(b, ['version', 'scoreUnits', 'feedback', 'reason']) || !revision(b.version) || !revision(b.scoreUnits) || b.scoreUnits > 1000000 || !plainText(b.feedback, 6000) || !plainText(b.reason, 1000) || !b.reason.trim()) return c.json({ error: 'Valid revision, score, feedback and grading reason required' }, 400)
    rpc = 'grade_class_work'; args = { p_submission: id, p_version: b.version, p_score: b.scoreUnits, p_feedback: b.feedback, p_reason: b.reason }
  } else if (action === 'release') {
    if (!shape(b, ['version', 'reason']) || !revision(b.version) || b.version === 0 || !plainText(b.reason, 1000) || !b.reason.trim()) return c.json({ error: 'Current grade revision and release reason required' }, 400)
    rpc = 'release_class_grade'; args = { p_submission: id, p_version: b.version, p_reason: b.reason }
  } else return c.json({ error: 'Unknown grading action' }, 404)
  const { error } = await c.get('db').rpc(rpc, args)
  return error ? c.json({ error: 'Grading unavailable. Check assigned permission, MFA, score range, latest attempt and current revision. Self-grading is not allowed.' }, 409) : c.json({ status: 'saved' })
})
