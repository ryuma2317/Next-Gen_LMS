import { beforeEach, afterEach, it, expect, vi } from 'vitest'
const mocked = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: mocked.getUser }, rpc: mocked.rpc }) }))
import { app } from '../server/index'
import { attendanceChallenge } from '../server/challenges'
const id = '70000000-0000-0000-0000-000000000001', actor = '20000000-0000-0000-0000-000000000001', generation = '90000000-0000-0000-0000-000000000001'
const now = 600000
const environment = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'synthetic', SUPABASE_SECRET_KEY: 'synthetic', ATTENDANCE_SIGNING_KEY: 'A'.repeat(43), ATTENDANCE_LIMITER: { limit: vi.fn(async () => ({ success: true })) } }
const headers = { Authorization: 'Bearer synthetic', 'Content-Type': 'application/json' }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.clearAllMocks()
  mocked.getUser.mockResolvedValue({ data: { user: { id: actor } }, error: null })
  environment.ATTENDANCE_LIMITER.limit.mockResolvedValue({ success: true })
  mocked.rpc.mockImplementation(async name => name === 'attendance_checkin_context' ? { data: [{ generation, starts_at: new Date(now).toISOString(), status: 'open' }], error: null } : { data: null, error: null })
})
afterEach(() => { vi.useRealTimers() })
it('does not let an unauthenticated participant reach attendance', async () => {
  expect((await app.request(`/api/attendance/${id}/check-in`, { method: 'POST', body: '{}' }, environment)).status).toBe(401)
  expect(mocked.rpc).not.toHaveBeenCalled()
})
it('requires server configuration and an account-scoped limiter before code verification', async () => {
  expect((await app.request(`/api/attendance/${id}/check-in`, { method: 'POST', headers, body: '{}' }, { ...environment, ATTENDANCE_SIGNING_KEY: undefined })).status).toBe(503)
  environment.ATTENDANCE_LIMITER.limit.mockResolvedValue({ success: false })
  const response = await app.request(`/api/attendance/${id}/check-in`, { method: 'POST', headers, body: '{}' }, environment)
  expect(response.status).toBe(429)
  expect(environment.ATTENDANCE_LIMITER.limit).toHaveBeenCalledWith({ key: `checkin:${actor}` })
  expect(mocked.rpc).not.toHaveBeenCalled()
})
it('rejects actor injection and expired/wrong-session codes before privileged recording', async () => {
  const code = (await attendanceChallenge(environment.ATTENDANCE_SIGNING_KEY, id, generation, now)).code
  const injected = await app.request(`/api/attendance/${id}/check-in`, { method: 'POST', headers, body: JSON.stringify({ code, userId: 'other' }) }, environment)
  expect(injected.status).toBe(400)
  const wrong = (await attendanceChallenge(environment.ATTENDANCE_SIGNING_KEY, 'another-session', generation, now)).code
  expect((await app.request(`/api/attendance/${id}/check-in`, { method: 'POST', headers, body: JSON.stringify({ code: wrong }) }, environment)).status).toBe(409)
  const expired = (await attendanceChallenge(environment.ATTENDANCE_SIGNING_KEY, id, generation, now - 12000)).code
  expect((await app.request(`/api/attendance/${id}/check-in`, { method: 'POST', headers, body: JSON.stringify({ code: expired }) }, environment)).status).toBe(409)
  expect(mocked.rpc.mock.calls.some(call => call[0] === 'record_session_checkin')).toBe(false)
})
it('uses the verified actor and current database generation for a valid check-in', async () => {
  const code = (await attendanceChallenge(environment.ATTENDANCE_SIGNING_KEY, id, generation, now)).code
  const response = await app.request(`/api/attendance/${id}/check-in`, { method: 'POST', headers, body: JSON.stringify({ code }) }, environment)
  expect(response.status).toBe(200)
  expect(mocked.rpc).toHaveBeenCalledWith('record_session_checkin', { p_session: id, p_actor: actor, p_generation: generation })
})
