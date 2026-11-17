import type { BrowserSession, SessionState, AuthFactor } from '../shared/session'
type Listener=(session:BrowserSession|null)=>void
const listeners=new Set<Listener>()
let current:BrowserSession|null=null
function publish(session:BrowserSession|null){const previous=current;current=session;if(!session&&!previous)return;listeners.forEach(listener=>listener(session))}
export const onSessionChange=(listener:Listener)=>{listeners.add(listener);return()=>{listeners.delete(listener)}}
async function request<T>(path:string,body?:unknown,csrfToken=current?.csrfToken):Promise<T>{
 const response=await fetch('/api'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{...(body===undefined?{}:{'Content-Type':'application/json','X-LMS-Request':'1'}),...(csrfToken?{'X-LMS-CSRF':csrfToken}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const data=await response.json()
 if(!response.ok){if(response.status===401)publish(null);throw new Error(data.error??'The request could not be completed')}
 return data as T
}
export async function api<T>(path:string,csrfToken:string,body?:unknown):Promise<T>{return request<T>(path,body,csrfToken)}
export async function loadSession(){const state=await request<SessionState>('/auth/session');publish(state.session);return state}
export async function signIn(email:string,password:string){const state=await request<SessionState>('/auth/login',{email,password});publish(state.session)}
export async function redeemInvitation(tokenHash:string){const state=await request<SessionState>('/auth/invite',{tokenHash});publish(state.session)}
export async function signOut(){await request('/auth/logout',{});publish(null)}
export async function accountAction<T=Record<string,unknown>>(action:'password'|'enroll'|'verify',body:unknown){const result=await request<T&{session:BrowserSession}>('/auth/account/'+action,body);publish(result.session);return result}
export async function authFactors(){return (await request<{factors:AuthFactor[]}>('/auth/mfa')).factors}
