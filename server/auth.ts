import { Hono } from 'hono'
import type { Env } from './types'
import { SessionFault, authLimit, clearSessionCookie, leaseWebSession, provider, providerCredentials, readWebSession, requiredConfig, requireBrowserOrigin, requireCsrf, revokeWebSession, saveWebSession, sessionConfig, startWebSession } from './web-session'
import { randomSecret } from './session-crypto'
export const browserAuth=new Hono<Env>()
const shape=(v:unknown,keys:string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',')
browserAuth.get('/session',async c=>{
 const configured=!!sessionConfig(c.env)
 if(!configured)return c.json({configured:false,session:null})
 try{const s=await readWebSession(c);return c.json({configured:true,session:s?{user:{id:s.userId},csrfToken:s.credentials.csrfToken}:null})}
 catch(error){if(error instanceof SessionFault&&error.status===401)return c.json({configured:true,session:null});throw error}
})
browserAuth.post('/login',async c=>{
 requireBrowserOrigin(c);await authLimit(c,'login')
 const body:unknown=await c.req.json().catch(()=>null)
 if(!shape(body,['email','password'])||typeof body.email!=='string'||body.email.length>254||!body.email.includes('@')||typeof body.password!=='string'||!body.password.length||body.password.length>128)return c.json({error:'Check your email and password'},400)
 // Reauthentication never accepts or links a browser-submitted provider token.
 const db=provider(c.env),result=await db.auth.signInWithPassword({email:body.email.trim(),password:body.password})
 if(result.error||!result.data.session)return c.json({error:'Unable to sign in. Check your credentials or contact the organizer.'},401)
 const verified=await db.auth.getUser(result.data.session.access_token)
 if(verified.error||!verified.data.user)return c.json({error:'Unable to verify sign-in'},401)
 const old=await readWebSession(c,false).catch(()=>null)
 if(old)await revokeWebSession(c.env,old.hash)
 return c.json({configured:true,session:await startWebSession(c,result.data.session,verified.data.user)})
})
browserAuth.post('/invite',async c=>{
 requireBrowserOrigin(c);await authLimit(c,'invite')
 const body:unknown=await c.req.json().catch(()=>null)
 if(!shape(body,['tokenHash'])||typeof body.tokenHash!=='string'||!body.tokenHash||body.tokenHash.length>2048)return c.json({error:'Invalid invitation'},400)
 const db=provider(c.env),result=await db.auth.verifyOtp({token_hash:body.tokenHash,type:'invite'})
 if(result.error||!result.data.session)return c.json({error:'Invitation unavailable. Ask the organizer for help.'},401)
 const verified=await db.auth.getUser(result.data.session.access_token)
 if(verified.error||!verified.data.user)return c.json({error:'Invitation unavailable'},401)
 const old=await readWebSession(c,false).catch(()=>null)
 if(old)await revokeWebSession(c.env,old.hash)
 return c.json({configured:true,session:await startWebSession(c,result.data.session,verified.data.user)})
})
browserAuth.post('/logout',async c=>{
 requireBrowserOrigin(c)
 const session=await readWebSession(c,false)
 if(!session){clearSessionCookie(c);return c.json({status:'signed_out'})}
 requireCsrf(c,session)
 await revokeWebSession(c.env,session.hash);clearSessionCookie(c)
 // LMS revocation succeeds even if the provider is unavailable; no token goes to the browser.
 try{const db=provider(c.env);await db.auth.setSession(session.credentials);await db.auth.signOut({scope:'local'})}catch{/* Provider revocation must be included in live acceptance. */}
 return c.json({status:'signed_out'})
})
browserAuth.get('/mfa',async c=>{
 requiredConfig(c.env);const session=await readWebSession(c)
 if(!session)return c.json({error:'Sign in required'},401)
 return c.json({factors:(session.user?.factors??[]).filter(f=>f.factor_type==='totp').map(f=>({id:f.id,status:f.status}))})
})
browserAuth.post('/account/:action',async c=>{
 requireBrowserOrigin(c);await authLimit(c,'account')
 const action=c.req.param('action')
 if(!['password','enroll','verify'].includes(action))return c.json({error:'Unknown account action'},404)
 const session=await readWebSession(c)
 if(!session)return c.json({error:'Sign in required'},401)
 requireCsrf(c,session)
 const body:unknown=await c.req.json().catch(()=>null)
 if(action==='password'&&(!shape(body,['password'])||typeof body.password!=='string'||body.password.length<12||body.password.length>128)||action==='enroll'&&!shape(body,[])||action==='verify'&&(!shape(body,['factorId','code'])||typeof body.factorId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.factorId)||typeof body.code!=='string'||!/^\d{6}$/.test(body.code)))return c.json({error:'Check the account action fields'},400)
 const lease=await leaseWebSession(c.env,session),db=provider(c.env)
 const restored=await db.auth.setSession(session.credentials)
 if(restored.error){await revokeWebSession(c.env,session.hash);clearSessionCookie(c);return c.json({error:'Sign in again before updating your account'},401)}
 let payload:Record<string,unknown>={status:'saved'},next=session.credentials,providerChanged=false
 try{
  if(action==='password'){
   const result=await db.auth.updateUser({password:(body as {password:string}).password})
   if(result.error)throw new SessionFault(409,'Password update unavailable. Check provider security requirements.')
  }else if(action==='enroll'){
   if(session.user?.factors?.some(f=>f.factor_type==='totp'))throw new SessionFault(409,'Authenticator setup already exists. Verify it or contact the platform owner.')
   const result=await db.auth.mfa.enroll({factorType:'totp',friendlyName:'Next-Gen authenticator'})
   if(result.error||!result.data)throw new SessionFault(409,'Authenticator setup unavailable')
   payload={id:result.data.id,uri:result.data.totp.uri}
  }else{
   const input=body as {factorId:string;code:string}
   if(!session.user?.factors?.some(f=>f.id===input.factorId&&f.factor_type==='totp'))throw new SessionFault(403,'Assigned authenticator required')
   const result=await db.auth.mfa.challengeAndVerify({factorId:input.factorId,code:input.code})
   if(result.error||!result.data)throw new SessionFault(409,'Check your current authenticator code')
   providerChanged=true
   const current=await db.auth.getSession()
   if(current.error)throw new SessionFault(503,'Unable to confirm verified session')
   next=providerCredentials(current.data.session,randomSecret())
  }
  await saveWebSession(c.env,session,lease,next)
 }catch(error){
  // Release a failed operation without letting stale completions overwrite newer state.
  try{if(providerChanged)throw error;await saveWebSession(c.env,session,lease,session.credentials)}catch{await revokeWebSession(c.env,session.hash);clearSessionCookie(c)}
  throw error
 }
 return c.json({...payload,session:{user:{id:session.userId},csrfToken:next.csrfToken}})
})
