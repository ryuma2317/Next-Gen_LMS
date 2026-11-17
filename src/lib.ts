import type { BrowserSession, SessionState, AuthFactor } from '../shared/session'
type Listener=(session:BrowserSession|null)=>void
const listeners=new Set<Listener>()
let current:BrowserSession|null=null
let revision=0
let authRevision=0
function publish(session:BrowserSession|null){revision++;const previous=current;current=session;if(!session&&!previous)return;listeners.forEach(listener=>listener(session))}
export const onSessionChange=(listener:Listener)=>{listeners.add(listener);return()=>{listeners.delete(listener)}}
async function request<T>(path:string,body?:unknown,csrfToken=current?.csrfToken):Promise<T>{
 const started=revision
 const authStarted=authRevision
 const response=await fetch('/api'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{...(body===undefined?{}:{'Content-Type':'application/json','X-LMS-Request':'1'}),...(csrfToken?{'X-LMS-CSRF':csrfToken}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const data=await response.json()
 if(!response.ok){if(response.status===401&&started===revision&&authStarted===authRevision)publish(null);throw new Error(data.error??'The request could not be completed')}
 return data as T
}
export async function api<T>(path:string,csrfToken:string,body?:unknown):Promise<T>{return request<T>(path,body,csrfToken)}
export async function loadSession(){const started=revision,authStarted=authRevision,state=await request<SessionState>('/auth/session');if(started===revision&&authStarted===authRevision)publish(state.session);return {...state,session:current}}
export async function signIn(email:string,password:string){const operation=++authRevision,state=await request<SessionState>('/auth/login',{email,password});if(operation===authRevision)publish(state.session)}
export async function redeemInvitation(tokenHash:string){const operation=++authRevision,state=await request<SessionState>('/auth/invite',{tokenHash});if(operation===authRevision)publish(state.session)}
export async function signOut(){const operation=++authRevision;await request('/auth/logout',{});if(operation===authRevision)publish(null)}
export async function accountAction<T=Record<string,unknown>>(action:'password'|'enroll'|'verify',body:unknown){const operation=++authRevision,result=await request<T&{session:BrowserSession}>('/auth/account/'+action,body);if(operation!==authRevision)throw new Error('Session changed. Reload permitted account settings.');publish(result.session);return result}
export async function authFactors(){return (await request<{factors:AuthFactor[]}>('/auth/mfa')).factors}
