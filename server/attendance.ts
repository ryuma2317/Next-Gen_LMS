import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import type { Env } from './types'
import { uuidPattern } from '../shared/admissions'
import { attendanceChallenge, verifyAttendanceCode } from './challenges'

export const attendance = new Hono<Env>()
const object = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys.sort().join(',')
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0
attendance.use('*', async (c, next) => {
  if (c.req.method === 'POST' && !c.req.header('Content-Type')?.startsWith('application/json')) return c.json({ error: 'JSON required' }, 415)
  await next()
})
attendance.get('/editions/:id/attendance', async c => {
  const id = c.req.param('id')
  if (!uuidPattern.test(id)) return c.json({ error: 'Invalid edition' }, 400)
  const db = c.get('db')
  const [sessions, summary, leave] = await Promise.all([
    db.rpc('attendance_catalog', { p_edition: id }),
    db.rpc('my_attendance_summary', { p_edition: id }),
    db.rpc('attendance_leave_queue', { p_edition: id }),
  ])
  if (sessions.error || summary.error || leave.error) return c.json({ error: 'Unable to load attendance' }, 503)
  return c.json({ sessions: sessions.data, summary: summary.data?.[0] ?? null, leave: leave.data })
})
attendance.get('/attendance/:id/roster', async c => {
  const id = c.req.param('id')
  if (!uuidPattern.test(id)) return c.json({ error: 'Invalid session' }, 400)
  const { data, error } = await c.get('db').rpc('attendance_roster', { p_session: id })
  return error ? c.json({ error: 'Unable to load roster' }, 503) : c.json(data)
})
attendance.get('/attendance/:id/challenge', async c => {
  const id = c.req.param('id')
  if (!uuidPattern.test(id)) return c.json({ error: 'Invalid session' }, 400)
  if (!c.env.ATTENDANCE_SIGNING_KEY) return c.json({ error: 'Attendance display is not configured' }, 503)
  const { data, error } = await c.get('db').rpc('attendance_display_context', { p_session: id })
  if (error) return c.json({ error: 'Unable to load display' }, 503)
  const row = data?.[0], now = Date.now()
  if (!row || row.status !== 'open') return c.json({ error: 'Assigned trainer and an open session are required' }, 403)
  const closesAt = Math.min(Date.parse(row.starts_at) + 15 * 60_000, Date.parse(row.ends_at))
  if (now >= closesAt) return c.json({ error: 'Self-check-in has closed. Use supervised roster correction.' }, 409)
  try {
    return c.json({ ...await attendanceChallenge(c.env.ATTENDANCE_SIGNING_KEY, id, row.generation, now), windowClosesAt: closesAt, startsAt: Date.parse(row.starts_at) })
  } catch { return c.json({ error: 'Attendance display is not configured' }, 503) }
})
attendance.post('/attendance/:id/check-in', async c => {
  const id = c.req.param('id')
  if (!uuidPattern.test(id)) return c.json({ error: 'Invalid session' }, 400)
  const env = c.env
  if (!env.ATTENDANCE_SIGNING_KEY || !env.SUPABASE_SECRET_KEY || !env.ATTENDANCE_LIMITER) return c.json({ error: 'Check-in is not configured' }, 503)
  const limit = await env.ATTENDANCE_LIMITER.limit({ key: `checkin:${c.get('userId')}` })
  if (!limit.success) { c.header('Retry-After', '60'); return c.json({ error: 'Too many attempts. Ask the trainer for help or try again shortly.' }, 429) }
  const body: unknown = await c.req.json().catch(() => null)
  if (!object(body, ['code']) || typeof body.code !== 'string' || !/^[0-9]{8}$/.test(body.code)) return c.json({ error: 'Enter the current eight-digit code' }, 400)
  const { data, error } = await c.get('db').rpc('attendance_checkin_context', { p_session: id })
  if (error) return c.json({ error: 'Unable to check attendance' }, 503)
  const context = data?.[0]
  if (!context || context.status !== 'open') return c.json({ error: 'Check-in is unavailable for this participant/session' }, 403)
  let valid: boolean
  try { valid = await verifyAttendanceCode(env.ATTENDANCE_SIGNING_KEY, id, context.generation, body.code) }
  catch { return c.json({ error: 'Check-in is not configured' }, 503) }
  if (!valid) return c.json({ error: 'Code expired or invalid. Scan the current display or enter its new code.' }, 409)
  const db = createClient(env.SUPABASE_URL!, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const saved = await db.rpc('record_session_checkin', { p_session: id, p_actor: c.get('userId'), p_generation: context.generation })
  return saved.error ? c.json({ error: 'Check-in closed or unavailable. Ask the trainer to verify attendance.' }, 409) : c.json({ status: 'present' })
})
attendance.post('/attendance/:id/:action', async c => {
  const id = c.req.param('id'), action = c.req.param('action')
  if (!uuidPattern.test(id)) return c.json({ error: 'Invalid session' }, 400)
  const body: unknown = await c.req.json().catch(() => null)
  let rpc: string, args: Record<string, unknown>
  if (['start', 'finalize'].includes(action)) {
    if (!object(body, ['version']) || !positive(body.version)) return c.json({ error: 'Current session version required' }, 400)
    rpc = action === 'start' ? 'start_teaching_session' : 'finalize_teaching_session'
    args = { p_session: id, p_version: body.version }
  } else if (action === 'leave') {
    if (!object(body, ['note']) || typeof body.note !== 'string' || !body.note.trim() || body.note.length > 240) return c.json({ error: 'A short leave explanation is required (maximum 240 characters)' }, 400)
    rpc = 'request_session_leave'; args = { p_session: id, p_note: body.note }
  } else if (action === 'cancel') {
    if (!object(body, ['version', 'reason']) || !positive(body.version) || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 1000) return c.json({ error: 'Current version and cancellation reason required' }, 400)
    rpc = 'cancel_teaching_session'; args = { p_session: id, p_version: body.version, p_reason: body.reason }
  } else if (action === 'correct') {
    if (!object(body, ['userId', 'version', 'status', 'reason']) || typeof body.userId !== 'string' || !uuidPattern.test(body.userId) || !positive(body.version) || !['present', 'absent', 'pending_review'].includes(String(body.status)) || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 1000) return c.json({ error: 'Participant, record version, status and correction reason required' }, 400)
    rpc = 'correct_session_attendance'; args = { p_session: id, p_user: body.userId, p_version: body.version, p_status: body.status, p_reason: body.reason }
  } else return c.json({ error: 'Unknown attendance action' }, 404)
  const { data, error } = await c.get('db').rpc(rpc, args)
  return error ? c.json({ error: 'Action unavailable. Check your assigned permission, the latest record and session state.' }, 409) : c.json({ status: 'saved', id: data })
})
attendance.post('/attendance-leave/:id/review', async c => {
  const id = c.req.param('id'), b: unknown = await c.req.json().catch(() => null)
  if (!uuidPattern.test(id) || !object(b, ['version', 'approved', 'reason']) || !positive(b.version) || typeof b.approved !== 'boolean' || typeof b.reason !== 'string' || !b.reason.trim() || b.reason.length > 1000) return c.json({ error: 'Current request version, outcome and reason required' }, 400)
  const { error } = await c.get('db').rpc('review_session_leave', { p_request: id, p_version: b.version, p_approved: b.approved, p_reason: b.reason })
  return error ? c.json({ error: 'Leave review unavailable. Assigned permission, MFA and an unchanged pending request are required.' }, 409) : c.json({ status: 'saved' })
})
attendance.post('/sections/:id/sessions', async c => {
  const id = c.req.param('id'), b: unknown = await c.req.json().catch(() => null)
  if (!uuidPattern.test(id) || !object(b, ['title', 'kind', 'startsAt', 'endsAt', 'absenceUnits']) || typeof b.title !== 'string' || !b.title.trim() || b.title.length > 160 || !['theory', 'lab'].includes(String(b.kind)) || typeof b.startsAt !== 'string' || typeof b.endsAt !== 'string' || !Number.isFinite(Date.parse(b.startsAt)) || !Number.isFinite(Date.parse(b.endsAt)) || !positive(b.absenceUnits) || b.absenceUnits > 48 || b.absenceUnits % 2 !== 0) return c.json({ error: 'Check the session title, kind, dates and even quarter-unit weight' }, 400)
  const { data, error } = await c.get('db').rpc('create_teaching_session', { p_section: id, p_title: b.title, p_kind: b.kind, p_starts: b.startsAt, p_ends: b.endsAt, p_units: b.absenceUnits })
  return error ? c.json({ error: 'Scheduling unavailable. Assigned schedule permission, MFA and valid times are required.' }, 409) : c.json({ id: data }, 201)
})
attendance.post('/editions/:id/attendance-policy', async c => {
  const id = c.req.param('id'), b: unknown = await c.req.json().catch(() => null)
  if (!uuidPattern.test(id) || !object(b, ['failureUnits', 'warningOne', 'warningTwo', 'reason']) || !positive(b.failureUnits) || !positive(b.warningOne) || !positive(b.warningTwo) || typeof b.reason !== 'string' || !b.reason.trim() || b.reason.length > 1000) return c.json({ error: 'Policy quarter-units and a reason are required' }, 400)
  const { error } = await c.get('db').rpc('configure_attendance_policy', { p_edition: id, p_failure: b.failureUnits, p_warning_one: b.warningOne, p_warning_two: b.warningTwo, p_reason: b.reason })
  return error ? c.json({ error: 'Policy unavailable. Assigned schedule permission and MFA are required; policy freezes at the first session start.' }, 409) : c.json({ status: 'saved' })
})
