import { describe,it,expect } from 'vitest'
import { app } from '../server/index'
describe('API boundary',()=>{
 it('health reports no private configuration and is not cached',async()=>{
  const response=await app.request('/api/health');expect(response.status).toBe(200)
  expect(await response.json()).toEqual({status:'ok',version:'0.2.0'})
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
 })
 it.each(['/api/me','/api/editions','/api/editions/demo/classes'])('denies unauthenticated %s',async path=>{
  expect((await app.request(path)).status).toBe(401)
 })
 it('does not permit a preview role header to authenticate a write',async()=>{
  const response=await app.request('/api/enrollments',{method:'POST',headers:{'Content-Type':'application/json','X-Role':'super_admin'},body:JSON.stringify({sectionId:'demo-web'})})
  expect(response.status).toBe(401)
 })
 it('fails closed when live configuration is missing',async()=>{
  const response=await app.request('/api/me',{headers:{Authorization:'Bearer synthetic'}},{})
  expect(response.status).toBe(503)
 })
 it('rejects oversized input before processing it',async()=>{
  const response=await app.request('/api/enrollments',{method:'POST',body:'x'.repeat(20000),headers:{'Content-Length':'20000'}})
  expect(response.status).toBe(413)
 })
 it('public intake fails closed without secret configuration and a limiter',async()=>{
  const response=await app.request('/api/public/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic'})
  expect(response.status).toBe(503)
 })
 it('public intake honors rejection by the configured coarse limiter',async()=>{
  const response=await app.request('/api/public/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic',SUPABASE_SECRET_KEY:'synthetic',ADMISSIONS_LIMITER:{limit:async()=>({success:false})}})
  expect(response.status).toBe(429);expect(response.headers.get('Retry-After')).toBe('60')
 })
})
