const encoder=new TextEncoder(),decoder=new TextDecoder()
export const randomSecret=()=>base64url(crypto.getRandomValues(new Uint8Array(32)))
export function base64url(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
export function decode64(value:string){if(!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Invalid encoding');return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0))}
export async function sessionHash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),b=>b.toString(16).padStart(2,'0')).join('')}
export type Credentials={access_token:string;refresh_token:string;expires_at:number;csrfToken:string}
async function key(value:string){const raw=decode64(value);if(raw.length!==32)throw new Error('Invalid session key');return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function sealSession(value:Credentials,secret:string,binding:string){
 const iv=crypto.getRandomValues(new Uint8Array(12))
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(binding)},await key(secret),encoder.encode(JSON.stringify(value)))
 return 'v1.'+base64url(iv)+'.'+base64url(new Uint8Array(ciphertext))
}
export async function openSession(value:string,secret:string,binding:string):Promise<Credentials>{
 const [version,iv,body,...extra]=value.split('.')
 if(version!=='v1'||extra.length||!iv||!body||value.length>24000)throw new Error('Invalid session envelope')
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode64(iv),additionalData:encoder.encode(binding)},await key(secret),decode64(body))
 const result=JSON.parse(decoder.decode(plain)) as Credentials
 if(!result||typeof result.access_token!=='string'||!result.access_token||typeof result.refresh_token!=='string'||!result.refresh_token||!Number.isSafeInteger(result.expires_at)||!/^[A-Za-z0-9_-]{43}$/.test(result.csrfToken))throw new Error('Invalid session data')
 return result
}
export function equalSecret(a:string,b:string){const left=encoder.encode(a),right=encoder.encode(b);let difference=left.length^right.length;for(let i=0;i<Math.max(left.length,right.length);i++)difference|=(left[i]??0)^(right[i]??0);return difference===0}
