import { beforeEach, it, expect, vi } from 'vitest'
const mocked = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: mocked.getUser }, rpc: mocked.rpc }) }))
import { app } from '../server/index'
const section = '30000000-0000-0000-0000-000000000001', id = '80000000-0000-0000-0000-000000000001'
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'synthetic' }
const headers = { Authorization: 'Bearer synthetic', 'Content-Type': 'application/json' }
beforeEach(() => {
  vi.clearAllMocks(); mocked.getUser.mockResolvedValue({ data: { user: { id: 'verified-actor' } }, error: null })
  mocked.rpc.mockResolvedValue({ data: [], error: null })
})
it('protects learning before performing any data request', async () => {
  expect((await app.request(`/api/sections/${section}/learning`, {}, env)).status).toBe(401)
  expect(mocked.rpc).not.toHaveBeenCalled()
})
it('rejects NULL revisions and client authority fields instead of forwarding them', async () => {
  for (const body of [
    { id, version: null, lesson: { title: 'Title', body_text: 'Text', resource_url: null } },
    { id, version: 0, lesson: { title: 'Title', body_text: 'Text', resource_url: null, state: 'published' } },
  ]) expect((await app.request(`/api/sections/${section}/lessons`, { method: 'POST', headers, body: JSON.stringify(body) }, env)).status).toBe(400)
  expect(mocked.rpc).not.toHaveBeenCalled()
})
it('does not let unexpected database columns expand the public lesson/assignment DTO', async () => {
  mocked.rpc.mockImplementation(async name => ({ error: null, data: name === 'learning_lessons' ? [{ id, title: 'Title', body_text: 'Text', private_notes: 'sentinel', created_at: 'hidden' }] : [{ id, title: 'Work', private_notes: 'sentinel', created_at: 'hidden' }] }))
  const response = await app.request(`/api/sections/${section}/learning`, { headers }, env)
  expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store')
  const text = await response.text(); expect(text).not.toContain('sentinel'); expect(text).not.toContain('created_at')
})
it('forwards only bounded paging and rejects arbitrary learner filters', async () => {
  expect((await app.request(`/api/assignments/${id}/work?offset=50`, { headers }, env)).status).toBe(200)
  expect(mocked.rpc).toHaveBeenCalledWith('learning_work', { p_assignment: id, p_offset: 50 })
  for (const query of ['offset=-1', 'offset=10001', 'userId=someone', 'offset=0&limit=100000']) expect((await app.request(`/api/assignments/${id}/work?${query}`, { headers }, env)).status).toBe(400)
})
it('rejects unsafe links and forged grading fields', async () => {
  expect((await app.request(`/api/assignments/${id}/submit`, { method: 'POST', headers, body: JSON.stringify({ id, version: 1, body_text: '', resource_url: 'javascript:alert(1)' }) }, env)).status).toBe(400)
  expect((await app.request(`/api/work/${id}/grade`, { method: 'POST', headers, body: JSON.stringify({ version: 0, scoreUnits: 1.5, feedback: 'Text', reason: 'Review' }) }, env)).status).toBe(400)
  expect((await app.request(`/api/work/${id}/grade`, { method: 'POST', headers, body: JSON.stringify({ version: 0, scoreUnits: 100, feedback: 'Text', reason: 'Review', userId: 'other' }) }, env)).status).toBe(400)
  expect(mocked.rpc).not.toHaveBeenCalled()
})
