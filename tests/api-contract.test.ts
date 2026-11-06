import { beforeEach, it, expect, vi } from 'vitest'
import document from '../public/openapi.json'
import { assertSchema } from './helpers/schema-match.mjs'
const mocked=vi.hoisted(()=>({rpc:vi.fn(),getUser:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{getUser:mocked.getUser},rpc:mocked.rpc})}))
import { app } from '../server/index'
const id='00000000-0000-4000-8000-000000000001'
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic'}
const headers={Authorization:'Bearer synthetic','Content-Type':'application/json'}
const timestamp='2027-04-01T03:00:00Z'
const paths=document.paths as Record<string,Record<string,{responses:Record<string,{content:Record<string,{schema:Record<string,unknown>}>}>}>>
async function contract(response:Response,path:string,method='get') {
 const schema=paths[path][method].responses[String(response.status)]?.content['application/json'].schema
 expect(schema,'Undocumented response status '+response.status).toBeDefined()
 expect(response.headers.get('Cache-Control')).toBe('no-store')
 const body:unknown=await response.json()
 assertSchema(schema,body,document)
 return body
}
beforeEach(()=>{
 vi.clearAllMocks()
 mocked.getUser.mockResolvedValue({data:{user:{id}},error:null})
 mocked.rpc.mockResolvedValue({data:null,error:null})
})
it('health returns the documented safe response without provider configuration',async()=>{
 const result=await app.request('/api/health')
 expect(result.status).toBe(200)
 await contract(result,'/api/health')
})
it('auth, configuration and oversized-body failures match the documented error contract',async()=>{
 const missing=await app.request('/api/me')
 expect(missing.status).toBe(401);await contract(missing,'/api/me')
 const unconfigured=await app.request('/api/me',{headers},{})
 expect(unconfigured.status).toBe(503);await contract(unconfigured,'/api/me')
 const large=await app.request('/api/enrollments',{method:'POST',headers:{'Content-Length':'40000'},body:'x'.repeat(40000)})
 expect(large.status).toBe(413);await contract(large,'/api/enrollments','post')
})
it('the public form contract includes the actual snapshot creation timestamp',async()=>{
 mocked.rpc.mockResolvedValue({data:[{id,edition_id:id,title:'Synthetic form',purpose:'trainee',version:1,questions:[],published:true,closes_at:null,created_at:timestamp}],error:null})
 const result=await app.request('/api/public/forms/'+id,{},env)
 expect(result.status).toBe(200);await contract(result,'/api/public/forms/{id}')
 expect(mocked.getUser).not.toHaveBeenCalled()
})
it('enrollment uses the documented 201 response and UUID-only request',async()=>{
 const result=await app.request('/api/enrollments',{method:'POST',headers,body:JSON.stringify({sectionId:id})},env)
 expect(result.status).toBe(201);await contract(result,'/api/enrollments','post')
 expect(mocked.rpc).toHaveBeenCalledWith('claim_section',{p_section:id})
})
it('lesson HTTP projection matches the schema and excludes future private columns',async()=>{
 mocked.rpc.mockImplementation(async(name:string)=>({data:name==='learning_lessons'?[{id,section_id:id,title:'Synthetic lesson',body_text:'Text',resource_url:null,state:'published',version:1,created_by:id,private_note:'DO NOT RETURN'}]:[],error:null}))
 const result=await app.request('/api/sections/'+id+'/learning',{headers},env)
 expect(result.status).toBe(200)
 const body=await contract(result,'/api/sections/{id}/learning')
 expect(JSON.stringify(body)).not.toContain('private_note')
})
it('exam start returns an owner attempt with nullable score and no answer key',async()=>{
 mocked.rpc.mockResolvedValue({data:{id,status:'active',version:1,deadline:timestamp,server_now:timestamp,answers:{},questions:[{id:'q_one',kind:'single',prompt:'Choose',points:10,options:[{id:'a',text:'A'},{id:'b',text:'B'}]}],score_units:null,max_units:1000,flags:0},error:null})
 const result=await app.request('/api/quizzes/'+id+'/start',{method:'POST',headers,body:JSON.stringify({id})},env)
 expect(result.status).toBe(200);await contract(result,'/api/quizzes/{id}/start','post')
})
it('game creation returns the documented JSON UUID scalar, not an invented object envelope',async()=>{
 mocked.rpc.mockResolvedValue({data:id,error:null})
 const result=await app.request('/api/quizzes/'+id+'/runs',{method:'POST',headers,body:JSON.stringify({id})},env)
 expect(result.status).toBe(200)
 expect(await contract(result,'/api/quizzes/{id}/runs','post')).toBe(id)
})
it('a denied/stale write returns the existing generic 409 contract without database details',async()=>{
 mocked.rpc.mockResolvedValue({data:null,error:{message:'PRIVATE DATABASE DETAIL',code:'P0001'}})
 const result=await app.request('/api/quiz-attempts/'+id+'/save',{method:'POST',headers,body:JSON.stringify({version:1,answers:{},submit:true})},env)
 expect(result.status).toBe(409)
 const body=await contract(result,'/api/quiz-attempts/{id}/save','post')
 expect(JSON.stringify(body)).not.toContain('PRIVATE DATABASE DETAIL')
})
