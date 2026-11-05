import {beforeEach,it,expect,vi} from 'vitest'
const mocked=vi.hoisted(()=>({rpc:vi.fn(),getUser:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{getUser:mocked.getUser},rpc:mocked.rpc})}))
import {app} from '../server/index'
const id='90000000-0000-0000-0000-000000000001'
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic'}
const headers={Authorization:'Bearer synthetic','Content-Type':'application/json'}
beforeEach(()=>{vi.clearAllMocks();mocked.getUser.mockResolvedValue({data:{user:{id:'verified'}},error:null});mocked.rpc.mockResolvedValue({data:[],error:null})})
it('protects quiz routes and answer keys before any RPC',async()=>{
 expect((await app.request('/api/quizzes/'+id+'/definition',{},env)).status).toBe(401);expect(mocked.rpc).not.toHaveBeenCalled()
})
it('rejects client score/identity fields and NULL write revisions',async()=>{
 for(const body of [{version:null,answers:{},submit:true},{version:1,answers:{},submit:true,score:100}])
 expect((await app.request('/api/quiz-attempts/'+id+'/save',{method:'POST',headers,body:JSON.stringify(body)},env)).status).toBe(400)
 expect((await app.request('/api/quiz-games/'+id+'/join',{method:'POST',headers,body:JSON.stringify({userId:id})},env)).status).toBe(400);expect(mocked.rpc).not.toHaveBeenCalled()
})
it('rejects arbitrary monitoring payloads and invalid game question indexes',async()=>{
 expect((await app.request('/api/quiz-attempts/'+id+'/signals',{method:'POST',headers,body:JSON.stringify({id,kind:'browser_history'})},env)).status).toBe(400)
 expect((await app.request('/api/quiz-games/'+id+'/answer',{method:'POST',headers,body:JSON.stringify({questionIndex:-1,selected:['a']})},env)).status).toBe(400)
 expect(mocked.rpc).not.toHaveBeenCalled()
})
it('forwards only selected options and the current attempt revision',async()=>{
 mocked.rpc.mockResolvedValue({data:{status:'submitted',score_units:1000},error:null})
 const result=await app.request('/api/quiz-attempts/'+id+'/save',{method:'POST',headers,body:JSON.stringify({version:2,answers:{question_one:['a']},submit:true})},env)
 expect(result.status).toBe(200);expect(mocked.rpc).toHaveBeenCalledWith('save_quiz_attempt',{p_attempt:id,p_version:2,p_answers:{question_one:['a']},p_submit:true})
})
it('rejects unknown/prototype resources and unbounded report pages',async()=>{
 for(const path of ['/quizzes/'+id+'/constructor','/quizzes/'+id+'/report?offset=10001','/quizzes/'+id+'/definition?offset=0'])
 expect((await app.request('/api'+path,{headers},env)).status).toBeGreaterThanOrEqual(400)
 expect(mocked.rpc).not.toHaveBeenCalled()
})
