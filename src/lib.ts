import { createClient } from '@supabase/supabase-js'
const url=import.meta.env.VITE_SUPABASE_URL
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
// Participant session is in memory; no service key and no browser-persisted refresh token.
export const auth = url && key ? createClient(url,key,{auth:{persistSession:false,detectSessionInUrl:false}}) : null
export async function api<T>(path:string, token:string, body?:unknown):Promise<T> {
  const response=await fetch(`/api${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const data=await response.json()
  if(!response.ok) throw new Error(data.error??'The request could not be completed')
  return data as T
}
