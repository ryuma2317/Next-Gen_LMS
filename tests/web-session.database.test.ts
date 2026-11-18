import {beforeAll,afterAll,it,expect} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {readFile,readdir} from 'node:fs/promises'
const db=new PGlite(),user='ef000000-0000-4000-8000-000000000001',hash='a'.repeat(64),other='b'.repeat(64),sealed='v1.'+'c'.repeat(80),lease='ef000000-0000-4000-8000-000000000002'
async function service(sql:string,args:unknown[]=[]){await db.exec('set role service_role');try{return await db.query<Record<string,any>>(sql,args)}finally{await db.exec('reset role')}}
beforeAll(async()=>{
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;alter default privileges grant execute on functions to anon,authenticated,service_role;")
 for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
 await db.query('insert into auth.users(id) values($1)',[user])
})
afterAll(async()=>{await db.close()})
it('permits only service RPCs and no role direct access to the private vault',async()=>{
 for(const role of ['anon','authenticated','service_role']){
  await db.exec('set role '+role)
  try{await expect(db.query('select * from private.web_sessions')).rejects.toThrow()}finally{await db.exec('reset role')}
  if(role!=='service_role'){
   const row=(await db.query<{allowed:boolean}>("select has_function_privilege($1,'public.web_session_load(text)','execute') allowed",[role])).rows[0]
   expect(row.allowed).toBe(false)
  }
 }
 const all=(await db.query<{count:number}>("select count(*)::int count from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'web_session_%' and has_function_privilege('authenticated',p.oid,'execute')")).rows[0]
 expect(all.count).toBe(0)
})
it('requires explicit bounded lifetimes and supports equal idle/absolute boundaries',async()=>{
 for(const [absolute,idle] of [[null,300],[100,300],[600,700],[604801,300]])await expect(service('select public.web_session_create($1,$2,$3,$4,$5)',[hash,user,sealed,absolute,idle])).rejects.toThrow()
 await service('select public.web_session_create($1,$2,$3,600,600)',[hash,user,sealed])
 const row=(await service('select public.web_session_load($1) result',[hash])).rows[0].result
 expect(row.user_id).toBe(user);expect(row.version).toBe(1);expect(row.lease_active).toBe(false)
 expect(JSON.stringify(row)).not.toContain('refresh_token')
})
it('serializes rotating-token updates with NULL/stale revision and lease fencing',async()=>{
 expect((await service('select public.web_session_lease($1,null,$2) ok',[hash,lease])).rows[0].ok).toBe(false)
 expect((await service('select public.web_session_lease($1,1,$2) ok',[hash,lease])).rows[0].ok).toBe(true)
 expect((await service('select public.web_session_load($1) result',[hash])).rows[0].result.lease_active).toBe(true)
 expect((await service('select public.web_session_lease($1,1,$2) ok',[hash,lease])).rows[0].ok).toBe(false)
 expect((await service('select public.web_session_save($1,null,$2,$3) ok',[hash,lease,sealed])).rows[0].ok).toBe(false)
 expect((await service('select public.web_session_save($1,1,$2,$3) ok',[hash,user,sealed])).rows[0].ok).toBe(false)
 expect((await service('select public.web_session_save($1,1,$2,$3) ok',[hash,lease,sealed+'new'])).rows[0].ok).toBe(true)
 expect((await service('select public.web_session_save($1,1,$2,$3) ok',[hash,lease,sealed+'old'])).rows[0].ok).toBe(false)
 const row=(await service('select public.web_session_load($1) result',[hash])).rows[0].result
 expect(row.sealed_credentials).toBe(sealed+'new');expect(row.version).toBe(2);expect(row.lease_active).toBe(false)
})
it('rejects expired leases and cannot resurrect revoked sessions with an old completion',async()=>{
 await service('select public.web_session_lease($1,2,$2)',[hash,lease])
 await db.query("update private.web_sessions set lease_until=clock_timestamp()-interval '1 second' where handle_hash=$1",[hash])
 expect((await service('select public.web_session_save($1,2,$2,$3) ok',[hash,lease,sealed])).rows[0].ok).toBe(false)
 await service('select public.web_session_revoke($1)',[hash])
 expect((await service('select public.web_session_save($1,2,$2,$3) ok',[hash,lease,sealed])).rows[0].ok).toBe(false)
 expect((await service('select public.web_session_load($1) result',[hash])).rows[0].result).toBe(null)
})
it('rotates under a fenced lease, invalidates old handles and preserves absolute/idle deadlines',async()=>{
 const original='c'.repeat(64),rotated='d'.repeat(64),proof='e'.repeat(64)
 await service('select public.web_session_create($1,$2,$3,600,300)',[original,user,sealed])
 await service('select public.web_session_register($1,$2)',[original,proof])
 const before=(await db.query('select expires_at,idle_expires_at from private.web_sessions where handle_hash=$1',[original])).rows[0]
 await service('select public.web_session_lease($1,1,$2)',[original,lease])
 for(const version of [null,0])expect((await service('select public.web_session_rotate($1,$2,$3,$4,$5,$6) ok',[original,version,lease,rotated,sealed,proof])).rows[0].ok).toBe(false)
 await expect(service('select public.web_session_rotate($1,1,$2,$3,$4)',[original,lease,rotated,sealed])).rejects.toThrow()
 expect((await service('select public.web_session_rotate($1,1,$2,$3,$4,$5) ok',[original,lease,rotated,sealed+'rotated',proof])).rows[0].ok).toBe(true)
 expect((await service('select public.web_session_load($1) result',[original])).rows[0].result).toBe(null)
 const after=(await db.query('select expires_at,idle_expires_at from private.web_sessions where handle_hash=$1',[rotated])).rows[0]
 expect(after).toEqual(before)
 expect((await service('select public.web_session_rotate($1,1,$2,$3,$4,$5) ok',[original,lease,rotated,sealed,proof])).rows[0].ok).toBe(false)
 expect((await service('select public.web_session_logout($1,$2) result',[original,'f'.repeat(64)])).rows[0].result.status).toBe('denied')
 expect((await service('select public.web_session_logout($1,$2) result',[original,proof])).rows[0].result.status).toBe('revoked')
 expect((await service('select public.web_session_load($1) result',[rotated])).rows[0].result).toBe(null)
 expect((await db.query('select * from private.web_session_handles')).rows).toHaveLength(0)
})
it('logout before rotation fences the later completion and revokes aliases atomically',async()=>{
 const original='8'.repeat(64),rotated='9'.repeat(64),proof='7'.repeat(64)
 await service('select public.web_session_create($1,$2,$3,600,300)',[original,user,sealed])
 await service('select public.web_session_register($1,$2)',[original,proof])
 await service('select public.web_session_lease($1,1,$2)',[original,lease])
 expect((await service('select public.web_session_logout($1,$2) result',[original,proof])).rows[0].result.status).toBe('revoked')
 expect((await service('select public.web_session_rotate($1,1,$2,$3,$4,$5) ok',[original,lease,rotated,sealed,proof])).rows[0].ok).toBe(false)
 expect((await service('select public.web_session_load($1) result',[rotated])).rows[0].result).toBe(null)
 await db.exec('set role service_role');try{await expect(db.query('select * from private.web_session_handles')).rejects.toThrow()}finally{await db.exec('reset role')}
})
it('expires idle/absolute credentials without deleting program history',async()=>{
 await service('select public.web_session_create($1,$2,$3,600,300)',[other,user,sealed])
 await db.query("update private.web_sessions set idle_expires_at=clock_timestamp()-interval '1 second' where handle_hash=$1",[other])
 expect((await service('select public.web_session_load($1) result',[other])).rows[0].result).toBe(null)
 expect((await service('select public.web_session_lease($1,1,$2) ok',[other,lease])).rows[0].ok).toBe(false)
 await service('select public.web_session_create($1,$2,$3,600,300)',[hash,user,sealed])
 expect((await db.query('select * from private.web_sessions where handle_hash=$1',[other])).rows).toHaveLength(0)
 expect((await db.query('select * from auth.users')).rows).toHaveLength(1)
})
