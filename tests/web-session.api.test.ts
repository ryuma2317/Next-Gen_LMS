import {beforeEach,it,expect,vi} from 'vitest'
import {sealSession,openSession} from '../server/session-crypto'
import document from '../public/openapi.json'
import {assertSchema} from './helpers/schema-match.mjs'
const mocked=vi.hoisted(()=>({rpc:vi.fn(),getUser:vi.fn(),signIn:vi.fn(),verifyOtp:vi.fn(),refresh:vi.fn(),setSession:vi.fn(),signOut:vi.fn(),updateUser:vi.fn(),enroll:vi.fn(),verify:vi.fn(),getSession:vi.fn(),clients:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({createClient:(url:string,key:string,options:unknown)=>{
 mocked.clients(url,key,options)
 return {rpc:mocked.rpc,auth:{getUser:mocked.getUser,signInWithPassword:mocked.signIn,verifyOtp:mocked.verifyOtp,refreshSession:mocked.refresh,setSession:mocked.setSession,signOut:mocked.signOut,updateUser:mocked.updateUser,getSession:mocked.getSession,mfa:{enroll:mocked.enroll,challengeAndVerify:mocked.verify}}}
}}))
import {app} from '../server/index'
const origin='https://app.example.test',id='ef000000-0000-4000-8000-000000000001',factor='ef000000-0000-4000-8000-000000000002'
const env={PUBLIC_APP_ORIGIN:origin,SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic-public',SUPABASE_SECRET_KEY:'synthetic-private',SESSION_ENCRYPTION_KEY:'a'.repeat(43),SESSION_IDLE_SECONDS:'1800',SESSION_ABSOLUTE_SECONDS:'7200',AUTH_LIMITER:{limit:vi.fn(async()=>({success:true}))}}
const providerSession={access_token:'private synthetic access credential',refresh_token:'private synthetic refresh credential',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id}}
const rows=new Map<string,any>(),handles=new Map<string,{family:string;csrfHash:string}>()
const base={'Content-Type':'application/json','X-LMS-Request':'1',Origin:origin,'Sec-Fetch-Site':'same-origin'}
async function request(path:string,body?:unknown,headers:Record<string,string>={}){return app.request(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{...base,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})},env)}
async function login(){const response=await request('/auth/login',{email:'synthetic@example.test',password:'synthetic-password'});expect(response.status).toBe(200);const data=await response.json();return {cookie:response.headers.get('Set-Cookie')!.split(';')[0],csrf:data.session.csrfToken as string,response,data}}
const cookieHeaders=(cookie:string,csrf:string)=>({Cookie:cookie,'X-LMS-CSRF':csrf})
beforeEach(()=>{
 vi.clearAllMocks();rows.clear();handles.clear();env.AUTH_LIMITER.limit.mockResolvedValue({success:true})
 mocked.getUser.mockResolvedValue({data:{user:{id,email:'private@example.test',factors:[{id:factor,factor_type:'totp',status:'verified'}]}},error:null})
 mocked.signIn.mockResolvedValue({data:{session:providerSession},error:null});mocked.verifyOtp.mockResolvedValue({data:{session:providerSession},error:null})
 mocked.refresh.mockResolvedValue({data:{session:{...providerSession,access_token:'rotated private access',refresh_token:'rotated private refresh'}},error:null})
 mocked.setSession.mockResolvedValue({data:{session:providerSession},error:null});mocked.signOut.mockResolvedValue({error:null});mocked.updateUser.mockResolvedValue({error:null})
 mocked.enroll.mockResolvedValue({data:{id:factor,totp:{uri:'otpauth://totp/Synthetic?secret=SYNTHETIC'}},error:null});mocked.verify.mockResolvedValue({data:{...providerSession},error:null});mocked.getSession.mockResolvedValue({data:{session:{...providerSession,access_token:'mfa private access',refresh_token:'mfa private refresh'}},error:null})
 mocked.rpc.mockImplementation(async(name:string,args:Record<string,any>)=>{
  if(name==='web_session_create'){rows.set(args.p_hash,{family:crypto.randomUUID(),registered:false,user_id:args.p_user,sealed_credentials:args.p_sealed,version:1,expires_at:new Date(Date.now()+7200000).toISOString(),lease_active:false});return {data:null,error:null}}
  const row=rows.get(args?.p_hash)
  if(name==='web_session_register'){if(!row)return {data:false,error:null};handles.set(args.p_hash,{family:row.family,csrfHash:args.p_csrf_hash});row.registered=true;return {data:true,error:null}}
  if(name==='web_session_load')return {data:row?{...row}:null,error:null}
  if(name==='web_session_lease'){const ok=!!row&&row.version===args.p_version&&!row.lease_active;if(ok){row.lease_active=true;row.lease=args.p_lease}return {data:ok,error:null}}
  if(name==='web_session_save'){const ok=!!row&&row.version===args.p_version&&row.lease===args.p_lease;if(ok){row.sealed_credentials=args.p_sealed;row.version++;row.lease_active=false}return {data:ok,error:null}}
  if(name==='web_session_rotate'){const ok=!!row&&row.version===args.p_version&&row.lease===args.p_lease;if(ok){rows.delete(args.p_hash);rows.set(args.p_new_hash,{...row,sealed_credentials:args.p_sealed,version:row.version+1,lease_active:false});handles.set(args.p_new_hash,{family:row.family,csrfHash:args.p_csrf_hash})}return {data:ok,error:null}}
  if(name==='web_session_logout'||name==='web_session_revoke'){
   const alias=handles.get(args.p_hash),entry=[...rows.entries()].find(([hash,value])=>hash===args.p_hash||value.family===alias?.family)
   if(!entry)return {data:{status:'missing'},error:null}
   if(name==='web_session_logout'&&alias?.csrfHash!==args.p_csrf_hash)return {data:{status:'denied'},error:null}
   const [hash,value]=entry;rows.delete(hash);for(const [key,h] of handles)if(h.family===value.family)handles.delete(key)
   return {data:{status:'revoked',user_id:value.user_id,handle_hash:hash,sealed_credentials:value.sealed_credentials},error:null}
  }
  return {data:null,error:null}
 })
})
it('fails closed for absent/insecure origin, missing expiry/key and disabled limiter configuration',async()=>{
 for(const change of [{PUBLIC_APP_ORIGIN:'http://app.example.test'},{SESSION_ABSOLUTE_SECONDS:''},{SESSION_ENCRYPTION_KEY:'bad'},{AUTH_LIMITER:undefined}]){
  const result=await app.request(origin+'/api/auth/login',{method:'POST',headers:base,body:JSON.stringify({email:'a@example.test',password:'pass'})},{...env,...change})
  expect(result.status).toBe(503)
 }
 expect(mocked.signIn).not.toHaveBeenCalled()
 const state=await app.request('/api/auth/session',{},{});expect(await state.json()).toEqual({configured:false,session:null})
})
it('login issues only a hardened random opaque cookie, metadata and encrypted service-only storage',async()=>{
 const {response,data,cookie}=await login(),header=response.headers.get('Set-Cookie')!
 expect(header).toContain('HttpOnly');expect(header).toContain('Secure');expect(header).toContain('SameSite=Lax');expect(header).toContain('Path=/');expect(header).not.toContain('Domain=')
 expect(cookie).toMatch(/^__Host-lms_session=[A-Za-z0-9_-]{43}$/)
 assertSchema({$ref:'#/components/schemas/BrowserSessionState'},data,document)
 const browser=JSON.stringify(data)+header
 for(const secret of [providerSession.access_token,providerSession.refresh_token,env.SUPABASE_SECRET_KEY,env.SESSION_ENCRYPTION_KEY,'private@example.test'])expect(browser).not.toContain(secret)
 const [hash,row]=[...rows.entries()][0]
 expect(hash).toMatch(/^[0-9a-f]{64}$/);expect(hash).not.toContain(cookie.split('=')[1]);expect(row.sealed_credentials).not.toContain(providerSession.refresh_token)
 expect(response.headers.get('Cache-Control')).toBe('no-store')
})
it('rejects cross-origin, missing Origin, cross-site metadata, form encoding and provider-token injection before sign-in',async()=>{
 const deniedHeaders:Record<string,string>[]=[{Origin:'https://evil.example.test'},{Origin:''},{'Sec-Fetch-Site':'cross-site'},{'X-LMS-Request':''},{'Content-Type':'application/x-www-form-urlencoded'}]
 for(const headers of deniedHeaders)expect((await request('/auth/login',{email:'a@example.test',password:'pass'},headers)).status).toBeGreaterThanOrEqual(400)
 expect((await request('/auth/login',{email:'a@example.test',password:'pass',access_token:'injected'})).status).toBe(400)
 expect(mocked.signIn).not.toHaveBeenCalled()
})
it('uses generic login errors and applies limiter without returning provider details',async()=>{
 mocked.signIn.mockResolvedValue({error:{message:'PRIVATE provider reason'},data:{session:null}})
 const result=await request('/auth/login',{email:'a@example.test',password:'pass'});expect(result.status).toBe(401);expect(JSON.stringify(await result.json())).not.toContain('PRIVATE')
 env.AUTH_LIMITER.limit.mockResolvedValue({success:false})
 const limited=await request('/auth/login',{email:'a@example.test',password:'pass'});expect(limited.status).toBe(429);expect(limited.headers.get('Retry-After')).toBe('60')
})
it('uses caller-context API authorization and blocks cookie writes without bound CSRF before business RPCs',async()=>{
 const {cookie,csrf}=await login()
 const deniedHeaders:Record<string,string>[]=[{Cookie:cookie},{Cookie:cookie,'X-LMS-CSRF':'wrong'},{...cookieHeaders(cookie,csrf),Origin:'https://evil.example.test'}]
 for(const headers of deniedHeaders)expect((await request('/enrollments',{sectionId:id},headers)).status).toBe(403)
 expect(mocked.rpc.mock.calls.filter(([name])=>name==='claim_section')).toHaveLength(0)
 const allowed=await request('/enrollments',{sectionId:id},cookieHeaders(cookie,csrf));expect(allowed.status).toBe(201)
 const client=mocked.clients.mock.calls.find(([,key,options])=>key===env.SUPABASE_PUBLISHABLE_KEY&&(options as any)?.global?.headers?.Authorization)
 expect((client?.[2] as any).global.headers.Authorization).toBe('Bearer '+providerSession.access_token)
 expect((await request('/editions',undefined,{...cookieHeaders(cookie,csrf),Authorization:'Bearer other'})).status).toBe(401)
})
it('returns no session for invalid handles, revoked records or mismatched verified provider identity',async()=>{
 const {cookie}=await login()
 mocked.getUser.mockResolvedValue({data:{user:{id:factor}},error:null})
 const result=await request('/auth/session',undefined,{Cookie:cookie});expect((await result.json()).session).toBe(null);expect(rows.size).toBe(0)
 const invalid=await request('/auth/session',undefined,{Cookie:'__Host-lms_session=bad'});expect((await invalid.json()).session).toBe(null)
})
it('refreshes credentials under a lease and never sends rotated tokens to the browser',async()=>{
 const {cookie,csrf}=await login(),[hash,row]=[...rows.entries()][0]
 row.sealed_credentials=await sealSession({...providerSession,expires_at:1,csrfToken:csrf},env.SESSION_ENCRYPTION_KEY,hash+':'+id)
 const result=await request('/auth/session',undefined,{Cookie:cookie});expect(result.status).toBe(200)
 const body=await result.json();expect(body.session.csrfToken).toBe(csrf);expect(JSON.stringify(body)).not.toContain('rotated private')
 expect(mocked.refresh).toHaveBeenCalledTimes(1);expect(row.version).toBe(2)
 expect((await openSession(row.sealed_credentials,env.SESSION_ENCRYPTION_KEY,hash+':'+id)).refresh_token).toBe('rotated private refresh')
})
it('denies a concurrent active lease without replaying the refresh credential',async()=>{
 const {cookie}=await login(),row=[...rows.values()][0];row.lease_active=true
 const result=await request('/auth/session',undefined,{Cookie:cookie});expect(result.status).toBe(409);expect(mocked.refresh).not.toHaveBeenCalled()
})
it('revokes on failed refreshed-credential persistence instead of accepting a stale token',async()=>{
 const {cookie,csrf}=await login(),[hash,row]=[...rows.entries()][0]
 row.sealed_credentials=await sealSession({...providerSession,expires_at:1,csrfToken:csrf},env.SESSION_ENCRYPTION_KEY,hash+':'+id)
 const implementation=mocked.rpc.getMockImplementation()!
 mocked.rpc.mockImplementation(async(name,args)=>name==='web_session_save'?{data:false,error:null}:implementation(name,args))
 expect((await request('/auth/session',undefined,{Cookie:cookie})).status).toBe(409);expect(rows.size).toBe(0)
})
it('logout revokes the server record even during an active lease and tolerates provider outage',async()=>{
 const {cookie,csrf}=await login();[...rows.values()][0].lease_active=true;mocked.setSession.mockRejectedValue(new Error('private provider outage'))
 const result=await request('/auth/logout',{},cookieHeaders(cookie,csrf));expect(result.status).toBe(200);expect(rows.size).toBe(0);expect(result.headers.get('Set-Cookie')).toContain('Max-Age=0')
 expect((await request('/enrollments',{sectionId:id},cookieHeaders(cookie,csrf))).status).toBe(401)
})
it('redemption is explicit POST, validates shape and never returns provider invitation credentials',async()=>{
 expect((await request('/auth/invite')).status).toBe(401);expect(mocked.verifyOtp).not.toHaveBeenCalled()
 const result=await request('/auth/invite',{tokenHash:'synthetic-invitation-proof'});expect(result.status).toBe(200)
 expect(JSON.stringify(await result.json())).not.toContain(providerSession.access_token)
 expect(mocked.verifyOtp).toHaveBeenCalledWith({token_hash:'synthetic-invitation-proof',type:'invite'})
})
it('lists only TOTP status and rotates handle/CSRF after MFA and password updates',async()=>{
 const {cookie,csrf}=await login(),factors=await request('/auth/mfa',undefined,{Cookie:cookie})
 expect(await factors.json()).toEqual({factors:[{id:factor,status:'verified'}]})
 const result=await request('/auth/account/verify',{factorId:factor,code:'123456'},cookieHeaders(cookie,csrf));expect(result.status).toBe(200)
 const data=await result.json();expect(data.session.csrfToken).not.toBe(csrf);expect(JSON.stringify(data)).not.toContain('mfa private')
 const nextCookie=result.headers.get('Set-Cookie')!.split(';')[0];expect(nextCookie).not.toBe(cookie)
 expect((await request('/enrollments',{sectionId:id},cookieHeaders(cookie,csrf))).status).toBe(401)
 expect((await request('/auth/account/password',{password:'new-synthetic-password'},cookieHeaders(nextCookie,csrf))).status).toBe(403)
 const password=await request('/auth/account/password',{password:'new-synthetic-password'},cookieHeaders(nextCookie,data.session.csrfToken));expect(password.status).toBe(200)
 expect(password.headers.get('Set-Cookie')!.split(';')[0]).not.toBe(nextCookie)
 expect((await request('/enrollments',{sectionId:id},cookieHeaders(nextCookie,data.session.csrfToken))).status).toBe(401)
})
it('revokes rather than saving old credentials if security-level handle rotation fails',async()=>{
 const {cookie,csrf}=await login(),implementation=mocked.rpc.getMockImplementation()!
 mocked.rpc.mockImplementation(async(name,args)=>name==='web_session_rotate'?{data:false,error:null}:implementation(name,args))
 const result=await request('/auth/account/verify',{factorId:factor,code:'123456'},cookieHeaders(cookie,csrf))
 expect(result.status).toBe(409);expect(rows.size).toBe(0)
})
it('a historical logout proof revokes the rotated family even if its Set-Cookie arrives later',async()=>{
 const {cookie,csrf}=await login()
 const verified=await request('/auth/account/verify',{factorId:factor,code:'123456'},cookieHeaders(cookie,csrf))
 expect(verified.status).toBe(200)
 const nextCookie=verified.headers.get('Set-Cookie')!.split(';')[0],next=await verified.json()
 expect((await request('/auth/logout',{},cookieHeaders(cookie,'z'.repeat(43)))).status).toBe(403);expect(rows.size).toBe(1)
 expect((await request('/auth/logout',{},cookieHeaders(cookie,csrf))).status).toBe(200);expect(rows.size).toBe(0);expect(handles.size).toBe(0)
 expect((await request('/enrollments',{sectionId:id},cookieHeaders(nextCookie,next.session.csrfToken))).status).toBe(401)
})
it('rejects foreign MFA factors and repeated enrollment without removing any verified factor',async()=>{
 const {cookie,csrf}=await login()
 expect((await request('/auth/account/verify',{factorId:id,code:'123456'},cookieHeaders(cookie,csrf))).status).toBe(403)
 expect((await request('/auth/account/enroll',{},cookieHeaders(cookie,csrf))).status).toBe(409)
 expect(mocked.verify).not.toHaveBeenCalled();expect(mocked.enroll).not.toHaveBeenCalled()
})
it('returns private enrollment material only to the authenticated setup request',async()=>{
 const {cookie,csrf}=await login();mocked.getUser.mockResolvedValue({data:{user:{id,factors:[]}},error:null})
 const result=await request('/auth/account/enroll',{},cookieHeaders(cookie,csrf));expect(result.status).toBe(200)
 const body=await result.json();assertSchema({$ref:'#/components/schemas/BrowserEnrollment'},body,document)
 expect(body.uri).toMatch(/^otpauth:/);expect(JSON.stringify(body)).not.toContain(providerSession.refresh_token)
})
