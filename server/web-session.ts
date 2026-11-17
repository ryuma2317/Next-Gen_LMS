import { createClient, type Session, type User } from '@supabase/supabase-js'
import { getCookie, setCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { Bindings, Env } from './types'
import { decode64, equalSecret, openSession, randomSecret, sealSession, sessionHash, type Credentials } from './session-crypto'
export const SESSION_COOKIE='__Host-lms_session'
export class SessionFault extends Error{constructor(public status:401|403|409|415|429|503,message:string){super(message)}}
export type WebSession={hash:string;userId:string;version:number;expiresAt:string;credentials:Credentials;user?:User}
export function sessionConfig(env:Bindings){
 try{
  const origin=new URL(env.PUBLIC_APP_ORIGIN??'')
  const absolute=Number(env.SESSION_ABSOLUTE_SECONDS),idle=Number(env.SESSION_IDLE_SECONDS)
  if(origin.protocol!=='https:'||origin.origin!==env.PUBLIC_APP_ORIGIN||!env.SUPABASE_URL?.startsWith('https://')||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SECRET_KEY||!env.AUTH_LIMITER||!env.SESSION_ENCRYPTION_KEY||decode64(env.SESSION_ENCRYPTION_KEY).length!==32||!Number.isInteger(absolute)||!Number.isInteger(idle)||absolute<300||absolute>604800||idle<300||idle>absolute)return null
  return {origin:origin.origin,absolute,idle,key:env.SESSION_ENCRYPTION_KEY}
 }catch{return null}
}
export function requiredConfig(env:Bindings){const config=sessionConfig(env);if(!config)throw new SessionFault(503,'Browser sign-in is not configured');return config}
export const provider=(env:Bindings)=>createClient(env.SUPABASE_URL!,env.SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const vault=(env:Bindings)=>createClient(env.SUPABASE_URL!,env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
async function rpc(env:Bindings,name:string,args:Record<string,unknown>){const r=await vault(env).rpc(name,args);if(r.error)throw new SessionFault(503,'Session service unavailable');return r.data}
export function clearSessionCookie(c:Context<Env>){setCookie(c,SESSION_COOKIE,'',{path:'/',secure:true,httpOnly:true,sameSite:'Lax',maxAge:0})}
export function requireBrowserOrigin(c:Context<Env>){
 const config=requiredConfig(c.env)
 if(new URL(c.req.url).origin!==config.origin||c.req.header('Origin')!==config.origin||c.req.header('Sec-Fetch-Site')&&c.req.header('Sec-Fetch-Site')!=='same-origin')throw new SessionFault(403,'Same-origin request required')
 if(!c.req.header('Content-Type')?.match(/^application\/json(?:\s*;|$)/i))throw new SessionFault(415,'JSON required')
 if(c.req.header('X-LMS-Request')!=='1')throw new SessionFault(403,'Application request required')
}
export function requireCsrf(c:Context<Env>,session:WebSession){requireBrowserOrigin(c);if(!equalSecret(c.req.header('X-LMS-CSRF')??'',session.credentials.csrfToken))throw new SessionFault(403,'Refresh your session before retrying this action')}
export async function authLimit(c:Context<Env>,kind:string){
 requiredConfig(c.env)
 const result=await c.env.AUTH_LIMITER!.limit({key:'auth:'+kind+':'+(c.req.header('CF-Connecting-IP')??'unavailable')})
 if(!result.success){c.header('Retry-After','60');throw new SessionFault(429,'Too many attempts. Try again shortly.')}
}
export async function revokeWebSession(env:Bindings,hash:string){await rpc(env,'web_session_revoke',{p_hash:hash})}
export async function leaseWebSession(env:Bindings,session:WebSession){const lease=crypto.randomUUID();if(await rpc(env,'web_session_lease',{p_hash:session.hash,p_version:session.version,p_lease:lease})!==true)throw new SessionFault(409,'Another session update is in progress. Retry shortly.');return lease}
export async function saveWebSession(env:Bindings,session:WebSession,lease:string,credentials:Credentials){
 const sealed=await sealSession(credentials,requiredConfig(env).key,session.hash+':'+session.userId)
 if(await rpc(env,'web_session_save',{p_hash:session.hash,p_version:session.version,p_lease:lease,p_sealed:sealed})!==true)throw new SessionFault(409,'Session changed. Sign in again if retrying does not recover access.')
 session.credentials=credentials;session.version++
}
export async function rotateWebSession(c:Context<Env>,session:WebSession,lease:string,credentials:Credentials){
 const handle=randomSecret(),hash=await sessionHash(handle),sealed=await sealSession(credentials,requiredConfig(c.env).key,hash+':'+session.userId)
 if(await rpc(c.env,'web_session_rotate',{p_hash:session.hash,p_version:session.version,p_lease:lease,p_new_hash:hash,p_sealed:sealed})!==true)throw new SessionFault(409,'Session changed. Sign in again before continuing.')
 session.hash=hash;session.credentials=credentials;session.version++
 setCookie(c,SESSION_COOKIE,handle,{path:'/',secure:true,httpOnly:true,sameSite:'Lax',maxAge:Math.max(0,Math.floor((Date.parse(session.expiresAt)-Date.now())/1000))})
}
export function providerCredentials(value:Session|null,csrfToken:string,expectedUserId?:string):Credentials{
 if(!value?.access_token||!value.refresh_token||!Number.isSafeInteger(value.expires_at)||expectedUserId&&value.user?.id!==expectedUserId)throw new SessionFault(503,'Provider session unavailable')
 return {access_token:value.access_token,refresh_token:value.refresh_token,expires_at:value.expires_at!,csrfToken}
}
export async function startWebSession(c:Context<Env>,value:Session,user:User){
 const config=requiredConfig(c.env),handle=randomSecret(),hash=await sessionHash(handle),credentials=providerCredentials(value,randomSecret(),user.id)
 const sealed=await sealSession(credentials,config.key,hash+':'+user.id)
 await rpc(c.env,'web_session_create',{p_hash:hash,p_user:user.id,p_sealed:sealed,p_absolute:config.absolute,p_idle:config.idle})
 setCookie(c,SESSION_COOKIE,handle,{path:'/',secure:true,httpOnly:true,sameSite:'Lax',maxAge:config.absolute})
 return {user:{id:user.id},csrfToken:credentials.csrfToken}
}
export async function readWebSession(c:Context<Env>,verify=true):Promise<WebSession|null>{
 const handle=getCookie(c,SESSION_COOKIE)
 if(!handle)return null
 requiredConfig(c.env)
 if(new URL(c.req.url).origin!==c.env.PUBLIC_APP_ORIGIN)throw new SessionFault(403,'Application origin required')
 if(c.req.header('Sec-Fetch-Site')&& !['same-origin','none'].includes(c.req.header('Sec-Fetch-Site')!))throw new SessionFault(403,'Same-origin request required')
 if(!/^[A-Za-z0-9_-]{43}$/.test(handle)){clearSessionCookie(c);throw new SessionFault(401,'Sign in required')}
 const hash=await sessionHash(handle),row=await rpc(c.env,'web_session_load',{p_hash:hash})
 if(!row){clearSessionCookie(c);throw new SessionFault(401,'Session expired. Sign in again.')}
 if(verify&&row.lease_active)throw new SessionFault(409,'Another session update is in progress. Retry shortly.')
 let credentials:Credentials
 try{credentials=await openSession(row.sealed_credentials,c.env.SESSION_ENCRYPTION_KEY!,hash+':'+row.user_id)}catch{await revokeWebSession(c.env,hash);clearSessionCookie(c);throw new SessionFault(401,'Session unavailable. Sign in again.')}
 const session:WebSession={hash,userId:row.user_id,version:row.version,expiresAt:row.expires_at,credentials}
 if(!verify)return session
 if(credentials.expires_at<=Math.floor(Date.now()/1000)+45){
  const lease=await leaseWebSession(c.env,session)
  try{
   const result=await provider(c.env).auth.refreshSession({refresh_token:credentials.refresh_token})
   if(result.error||!result.data.session)throw new SessionFault(401,'Session refresh failed. Sign in again.')
   const next=providerCredentials(result.data.session,credentials.csrfToken,session.userId)
   // Persist rotating credentials before allowing any caller operation.
   await saveWebSession(c.env,session,lease,next)
  }catch(error){await revokeWebSession(c.env,hash);clearSessionCookie(c);throw error instanceof SessionFault?error:new SessionFault(503,'Session refresh unavailable. Sign in again.')}
 }
 const result=await provider(c.env).auth.getUser(session.credentials.access_token)
 if(result.error||!result.data.user){
  if(result.error?.status&&result.error.status>=500)throw new SessionFault(503,'Identity service unavailable')
  await revokeWebSession(c.env,hash);clearSessionCookie(c);throw new SessionFault(401,'Session is invalid or expired')
 }
 if(result.data.user.id!==session.userId){await revokeWebSession(c.env,hash);clearSessionCookie(c);throw new SessionFault(401,'Session identity changed')}
 session.user=result.data.user;return session
}
