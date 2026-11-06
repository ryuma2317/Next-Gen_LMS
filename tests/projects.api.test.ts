import {beforeEach,it,expect,vi} from 'vitest'
import document from '../public/openapi.json'
import {assertSchema} from './helpers/schema-match.mjs'
const mocked=vi.hoisted(()=>({rpc:vi.fn(),getUser:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{getUser:mocked.getUser},rpc:mocked.rpc})}))
import {app} from '../server/index'
const id='a0000000-0000-4000-8000-000000000001',env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic'},headers={Authorization:'Bearer synthetic','Content-Type':'application/json'}
const fields={title:'Task',description:'Plain text',column_id:'todo',assignee_id:null,sprint_id:null}
beforeEach(()=>{vi.clearAllMocks();mocked.getUser.mockResolvedValue({data:{user:{id}},error:null});mocked.rpc.mockResolvedValue({data:null,error:null})})
it('protects project routes before calling any database RPC',async()=>{
 expect((await app.request('/api/projects/'+id,{},env)).status).toBe(401);expect(mocked.rpc).not.toHaveBeenCalled()
})
it('rejects actor/authority injection and NULL revisions at the HTTP boundary',async()=>{
 for(const body of [{id,version:null,task:fields},{id,version:0,task:{...fields,actor_id:id}},{id,version:0,task:fields,can_manage:true}])
  expect((await app.request('/api/projects/'+id+'/tasks',{method:'POST',headers,body:JSON.stringify(body)},env)).status).toBe(400)
 expect(mocked.rpc).not.toHaveBeenCalled()
})
it('forwards only permitted task fields and validates the documented response',async()=>{
 mocked.rpc.mockResolvedValue({data:id,error:null})
 const result=await app.request('/api/projects/'+id+'/tasks',{method:'POST',headers,body:JSON.stringify({id,version:0,task:fields})},env)
 expect(result.status).toBe(200)
 const body=await result.json();assertSchema(document.paths['/api/projects/{id}/tasks'].post.responses['200'].content['application/json'].schema,body,document)
 expect(mocked.rpc).toHaveBeenCalledWith('save_project_task',{p_id:id,p_project:id,p_version:0,p_fields:fields})
})
it('rejects unbounded/unknown paging and does not disclose database error details',async()=>{
 for(const suffix of ['?offset=10001','?offset=-1','?other=1'])
  expect((await app.request('/api/projects/'+id+'/tasks'+suffix,{headers},env)).status).toBe(400)
 expect(mocked.rpc).not.toHaveBeenCalled()
 mocked.rpc.mockResolvedValue({data:null,error:{message:'PRIVATE DATA'}})
 const result=await app.request('/api/projects/'+id,{headers},env)
 expect(result.status).toBe(403);expect(await result.text()).not.toContain('PRIVATE DATA')
})
it('requires a reason and every explicit access flag; preview role headers grant no authority',async()=>{
 const body={userId:id,version:0,role:'mentor',active:true,canTasks:false,canComment:true,reason:'Approved'}
 expect((await app.request('/api/projects/'+id+'/members',{method:'POST',headers,body:JSON.stringify(body)},env)).status).toBe(400)
 expect((await app.request('/api/projects/'+id+'/members',{method:'POST',headers:{'Content-Type':'application/json','X-Role':'super_admin'},body:JSON.stringify({...body,canSprints:false})},env)).status).toBe(401)
 expect(mocked.rpc).not.toHaveBeenCalled()
})
it('attributes comments in database context, forwards stable UUIDs and validates sprint actions',async()=>{
 const result=await app.request('/api/project-tasks/'+id+'/comments',{method:'POST',headers,body:JSON.stringify({id,body:'Synthetic comment'})},env)
 expect(result.status).toBe(200);expect(mocked.rpc).toHaveBeenCalledWith('comment_project_task',{p_id:id,p_task:id,p_body:'Synthetic comment'})
 mocked.rpc.mockClear()
 expect((await app.request('/api/project-sprints/'+id+'/reopen',{method:'POST',headers,body:JSON.stringify({version:1,reason:'Test'})},env)).status).toBe(404)
 expect(mocked.rpc).not.toHaveBeenCalled()
})
