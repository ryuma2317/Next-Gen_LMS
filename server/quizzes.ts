import { Hono } from 'hono'
import type { Env } from './types'
import { uuidPattern } from '../shared/admissions'
import { quizSignals, quizText, shape, validateQuizDraft } from '../shared/quizzes'
export const quizzes = new Hono<Env>()
const revision = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 2147483647
const id = (v: unknown): v is string => typeof v === 'string' && uuidPattern.test(v)
const selections = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 6 && new Set(v).size === v.length && v.every(s => typeof s === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(s))
quizzes.use('*', async (c, next) => {
  if (c.req.method === 'POST' && !c.req.header('Content-Type')?.startsWith('application/json')) return c.json({ error: 'JSON required' }, 415)
  await next()
})
quizzes.get('/sections/:id/quizzes', async c => {
  if (!id(c.req.param('id'))) return c.json({ error: 'Invalid class' }, 400)
  const r = await c.get('db').rpc('quiz_list', { p_section: c.req.param('id') })
  return r.error || !Array.isArray(r.data) ? c.json({ error: 'Quiz list unavailable' }, 503) : c.json(r.data)
})
quizzes.post('/sections/:id/quizzes', async c => {
  const b: unknown = await c.req.json().catch(() => null)
  if (!id(c.req.param('id')) || !shape(b, ['id', 'version', 'quiz']) || !id(b.id) || !revision(b.version)) return c.json({ error: 'Valid quiz reference and revision required' }, 400)
  let fields
  try { fields = validateQuizDraft(b.quiz) } catch (e) { return c.json({ error: (e as Error).message }, 400) }
  const r = await c.get('db').rpc('save_quiz', { p_id: b.id, p_section: c.req.param('id'), p_version: b.version, p_fields: fields })
  return r.error ? c.json({ error: 'Draft save unavailable. Check class permission, MFA and revision.' }, 409) : c.json({ id: r.data })
})
quizzes.get('/quizzes/:id/:resource', async c => {
  const quiz = c.req.param('id'), resource = c.req.param('resource')
  if (!id(quiz)) return c.json({ error: 'Invalid quiz' }, 400)
  const offset = c.req.query('offset') ?? '0'
  if (!/^\d{1,5}$/.test(offset) || Number(offset) > 10000 || Object.keys(c.req.query()).some(k => k !== 'offset') || (resource !== 'report' && Object.keys(c.req.query()).length)) return c.json({ error: 'Invalid page' }, 400)
  const names: Record<string, string> = { definition: 'quiz_definition', attempts: 'my_quiz_attempts', report: 'quiz_report', runs: 'quiz_runs' }
  if (!Object.hasOwn(names, resource)) return c.json({ error: 'Unknown quiz resource' }, 404)
  const r = await c.get('db').rpc(names[resource], { p_quiz: quiz, ...(resource === 'report' ? { p_offset: Number(offset) } : {}) })
  return r.error ? c.json({ error: 'Quiz resource unavailable. Check class permission and MFA when required.' }, 403) : c.json(r.data)
})
quizzes.post('/quizzes/:id/:action', async c => {
  const quiz = c.req.param('id'), action = c.req.param('action'), b: unknown = await c.req.json().catch(() => null)
  if (!id(quiz)) return c.json({ error: 'Invalid quiz' }, 400)
  let name: string, args: Record<string, unknown>
  if (action === 'start' || action === 'runs') {
    if (!shape(b, ['id']) || !id(b.id)) return c.json({ error: 'A valid request reference is required' }, 400)
    name = action === 'start' ? 'start_quiz_attempt' : 'create_quiz_run'; args = { p_quiz: quiz, p_id: b.id }
  } else if (action === 'transition') {
    if (!shape(b, ['version', 'action', 'reason']) || !revision(b.version) || !['publish', 'close', 'release'].includes(String(b.action)) || !quizText(b.reason, 500) || !b.reason.trim()) return c.json({ error: 'Current revision, action and reason required' }, 400)
    name = 'quiz_transition'; args = { p_quiz: quiz, p_version: b.version, p_action: b.action, p_reason: b.reason }
  } else return c.json({ error: 'Unknown quiz action' }, 404)
  const r = await c.get('db').rpc(name, args)
  return r.error ? c.json({ error: 'Quiz action unavailable. Check permission, MFA, revision, published settings, time window and attempt limit.' }, 409) : c.json(r.data ?? { status: 'saved' })
})
quizzes.get('/quiz-attempts/:id/:resource?', async c => {
  const attempt = c.req.param('id'), resource = c.req.param('resource')
  if (!id(attempt) || (resource && resource !== 'events')) return c.json({ error: 'Invalid attempt resource' }, 400)
  const r = await c.get('db').rpc(resource === 'events' ? 'quiz_attempt_events' : 'quiz_attempt', { p_attempt: attempt })
  return r.error ? c.json({ error: 'Attempt unavailable' }, 403) : c.json(r.data)
})
quizzes.post('/quiz-attempts/:id/:action', async c => {
  const attempt = c.req.param('id'), action = c.req.param('action'), b: unknown = await c.req.json().catch(() => null)
  if (!id(attempt)) return c.json({ error: 'Invalid attempt' }, 400)
  let name: string, args: Record<string, unknown>
  if (action === 'save') {
    if (!shape(b, ['version', 'answers', 'submit']) || !revision(b.version) || typeof b.submit !== 'boolean' || !b.answers || typeof b.answers !== 'object' || Array.isArray(b.answers) || Object.keys(b.answers).length > 15 || Object.values(b.answers).some(v => !selections(v))) return c.json({ error: 'Valid revision and selected options required' }, 400)
    name = 'save_quiz_attempt'; args = { p_attempt: attempt, p_version: b.version, p_answers: b.answers, p_submit: b.submit }
  } else if (action === 'signals') {
    if (!shape(b, ['id', 'kind']) || !id(b.id) || !quizSignals.includes(b.kind as never)) return c.json({ error: 'Valid event reference and kind required' }, 400)
    name = 'record_quiz_signal'; args = { p_attempt: attempt, p_id: b.id, p_kind: b.kind }
  } else return c.json({ error: 'Unknown attempt action' }, 404)
  const r = await c.get('db').rpc(name, args)
  return r.error ? c.json({ error: 'Save unavailable. Keep your unsaved answers and check the current revision, connection and deadline.' }, 409) : c.json(r.data ?? { status: 'saved' })
})
quizzes.get('/quiz-games/:id', async c => {
  if (!id(c.req.param('id'))) return c.json({ error: 'Invalid game' }, 400)
  const r = await c.get('db').rpc('quiz_run_view', { p_run: c.req.param('id') })
  return r.error ? c.json({ error: 'Game unavailable' }, 403) : c.json(r.data)
})
quizzes.post('/quiz-games/:id/:action', async c => {
  const run = c.req.param('id'), action = c.req.param('action'), b: unknown = await c.req.json().catch(() => null)
  if (!id(run)) return c.json({ error: 'Invalid game' }, 400)
  let name: string, args: Record<string, unknown> = { p_run: run }
  if (action === 'join') {
    if (!shape(b, [])) return c.json({ error: 'No identity fields are accepted' }, 400)
    name = 'join_quiz_run'
  } else if (action === 'answer') {
    if (!shape(b, ['questionIndex', 'selected']) || !revision(b.questionIndex) || b.questionIndex > 14 || !selections(b.selected)) return c.json({ error: 'Valid question and selected options required' }, 400)
    name = 'answer_quiz_run'; args = { ...args, p_index: b.questionIndex, p_selected: b.selected }
  } else if (action === 'transition') {
    if (!shape(b, ['version', 'action', 'reason']) || !revision(b.version) || !['next', 'reveal', 'finish'].includes(String(b.action)) || !quizText(b.reason, 500) || !b.reason.trim()) return c.json({ error: 'Current game revision, action and reason required' }, 400)
    name = 'quiz_run_transition'; args = { ...args, p_version: b.version, p_action: b.action, p_reason: b.reason }
  } else return c.json({ error: 'Unknown game action' }, 404)
  const r = await c.get('db').rpc(name, args)
  return r.error ? c.json({ error: 'Game action unavailable. Check class eligibility, phase, revision and server deadline. Submitted answers are locked.' }, 409) : c.json({ status: 'saved' })
})
