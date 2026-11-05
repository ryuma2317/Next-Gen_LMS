import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import { createClient } from '@supabase/supabase-js'
import type { Env, Bindings } from './types'
import { publicAdmissions, admissions, runInvitationJobs } from './admissions'
import { attendance } from './attendance'
import { learning } from './learning'
export const app = new Hono<Env>()
app.use('/api/*', secureHeaders({ referrerPolicy: 'no-referrer', xFrameOptions: 'DENY', permissionsPolicy: { camera: ['self'], microphone: [] } }))
app.use('/api/*', async (c,next) => { c.header('Cache-Control','no-store'); await next() })
app.use('/api/*', bodyLimit({ maxSize: 32768, onError: c => c.json({ error: 'Request too large' },413) }))
app.get('/api/health', c => c.json({ status: 'ok', version: '0.4.0' }))
app.route('/api/public',publicAdmissions)
app.use('/api/*', async (c,next) => {
  const token = c.req.header('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1]
  if (!token) return c.json({ error: 'Sign in required' },401)
  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_PUBLISHABLE_KEY) return c.json({ error: 'Live service is not configured' },503)
  // Caller context only: no service-role bypass. getUser validates with Auth, not JWT decoding.
  const db = createClient(c.env.SUPABASE_URL,c.env.SUPABASE_PUBLISHABLE_KEY,{ global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return c.json({ error: 'Session is invalid or expired' },401)
  c.set('db',db); c.set('userId',data.user.id); await next()
})
app.get('/api/me', async c => {
  const { data,error } = await c.get('db').from('edition_members').select('edition_id,role,department,active').eq('user_id',c.get('userId')).eq('active',true)
  if (error) return c.json({ error: 'Unable to load membership' },503)
  return c.json({ userId: c.get('userId'), memberships: data })
})
app.get('/api/editions', async c => {
  const { data,error } = await c.get('db').from('editions').select('id,name,selection_open,core_limit,elective_limit').order('created_at',{ ascending: false })
  return error ? c.json({ error: 'Unable to load editions' },503) : c.json(data)
})
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
app.get('/api/editions/:id/classes', async c => {
  const id=c.req.param('id'); if (!uuid.test(id)) return c.json({ error: 'Invalid edition' },400)
  const { data,error } = await c.get('db').rpc('class_catalog',{ p_edition: id })
  return error ? c.json({ error: 'Unable to load classes' },503) : c.json(data)
})
app.get('/api/editions/:id/enrollments', async c => {
  const id=c.req.param('id'); if (!uuid.test(id)) return c.json({ error: 'Invalid edition' },400)
  const { data,error } = await c.get('db').from('enrollments').select('section_id').eq('edition_id',id).eq('user_id',c.get('userId'))
  return error ? c.json({ error: 'Unable to load enrollments' },503) : c.json(data.map(r=>r.section_id))
})
app.post('/api/enrollments', async c => {
  if (!c.req.header('Content-Type')?.startsWith('application/json')) return c.json({ error: 'JSON required' },415)
  let body: unknown; try { body=await c.req.json() } catch { return c.json({ error: 'Invalid JSON' },400) }
  if (!body || typeof body!=='object' || Object.keys(body).length!==1 || !('sectionId' in body) || typeof body.sectionId!=='string' || !uuid.test(body.sectionId)) return c.json({ error: 'Only a valid sectionId is accepted' },400)
  const { error } = await c.get('db').rpc('claim_section',{ p_section: body.sectionId })
  if (error) return c.json({ error: error.code==='P0001' ? 'Selection unavailable. Check eligibility, capacity and the selection window.' : 'Unable to save selection' },error.code==='P0001'?409:503)
  return c.json({ status: 'enrolled' },201)
})
app.route('/api',admissions)
app.route('/api',attendance)
app.route('/api',learning)
app.notFound(c => c.json({ error: 'Not found' },404))
app.onError((_error,c) => c.json({ error: 'Request failed' },500))
export default { fetch: app.fetch, scheduled: (_event:unknown,env:Bindings,ctx:{waitUntil(promise:Promise<unknown>):void})=>ctx.waitUntil(runInvitationJobs(env)) }
