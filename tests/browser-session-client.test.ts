import {beforeEach,afterEach,it,expect,vi} from 'vitest'
const state=(id:string)=>({configured:true,session:{user:{id},csrfToken:id.repeat(43)}})
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})
beforeEach(()=>{vi.resetModules()})
afterEach(()=>{vi.unstubAllGlobals()})
it('an older bootstrap response cannot clear a newer successful login',async()=>{
 let resolveBootstrap!:(value:Response)=>void
 vi.stubGlobal('fetch',vi.fn(async(path:string)=>path.endsWith('/session')?new Promise<Response>(resolve=>{resolveBootstrap=resolve}):json(state('a'))))
 const client=await import('../src/lib'),seen:unknown[]=[]
 client.onSessionChange(s=>seen.push(s))
 const bootstrap=client.loadSession();await client.signIn('synthetic@example.test','synthetic-password')
 resolveBootstrap(json({configured:true,session:null}));await bootstrap
 expect(seen.at(-1)).toEqual(state('a').session)
})
it('a delayed account response cannot restore UI identity after logout',async()=>{
 let resolveAccount!:(value:Response)=>void
 vi.stubGlobal('fetch',vi.fn(async(path:string)=>path.includes('/account/')?new Promise<Response>(resolve=>{resolveAccount=resolve}):path.endsWith('/logout')?json({status:'signed_out'}):json(state('a'))))
 const client=await import('../src/lib'),seen:unknown[]=[]
 client.onSessionChange(s=>seen.push(s));await client.signIn('synthetic@example.test','synthetic-password')
 const account=client.accountAction('verify',{factorId:'synthetic',code:'123456'})
 await client.signOut();resolveAccount(json({status:'saved',session:state('b').session}))
 await expect(account).rejects.toThrow('Session changed');expect(seen.at(-1)).toBe(null)
})
it('a prior session request returning 401 does not clear a newly authenticated identity',async()=>{
 let resolveOld!:(value:Response)=>void
 vi.stubGlobal('fetch',vi.fn(async(path:string)=>path.endsWith('/old')?new Promise<Response>(resolve=>{resolveOld=resolve}):json(state('b'))))
 const client=await import('../src/lib'),seen:unknown[]=[]
 client.onSessionChange(s=>seen.push(s))
 const old=client.api('/old','a'.repeat(43));await client.signIn('synthetic@example.test','synthetic-password')
 resolveOld(json({error:'Old session expired'},401));await expect(old).rejects.toThrow('Old session expired')
 expect(seen.at(-1)).toEqual(state('b').session)
})
