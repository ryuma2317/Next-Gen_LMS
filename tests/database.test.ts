import { beforeAll,afterAll,it,expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
// Actual PostgreSQL engine with an Auth shim. This is NOT a Supabase deployment or multi-connection load test.
const db=new PGlite()
const ids={edition:'10000000-0000-0000-0000-000000000001',other:'10000000-0000-0000-0000-000000000002',a:'20000000-0000-0000-0000-000000000001',b:'20000000-0000-0000-0000-000000000002',section:'30000000-0000-0000-0000-000000000001',offering:'40000000-0000-0000-0000-000000000001'}
async function asUser(user:string,sql:string){await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false);`);try{return await db.exec(sql)}finally{await db.exec('reset role')}}
beforeAll(async()=>{
 await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',coalesce(current_setting('request.jwt.claim.aal',true),'aal1')) $$; grant usage on schema auth to authenticated; grant execute on function auth.uid(),auth.jwt() to authenticated;`)
 await db.exec(await readFile(new URL('../supabase/migrations/202611050001_foundation.sql',import.meta.url),'utf8'))
 await db.exec(`insert into auth.users(id) values('${ids.a}'),('${ids.b}'); insert into public.editions(id,name,selection_open) values('${ids.edition}','Test',true),('${ids.other}','Private',false); insert into public.edition_members values('${ids.edition}','${ids.a}','trainee','CS',true),('${ids.edition}','${ids.b}','trainee','CS',true); insert into public.offerings values('${ids.offering}','${ids.edition}','Test subject','CS','core'); insert into public.sections values('${ids.section}','${ids.edition}','${ids.offering}',1,'Monday','Test room','Synthetic trainer');`)
})
afterAll(async()=>{await db.close()})
it('RLS hides unrelated editions and prevents self promotion',async()=>{
 const rows=await asUser(ids.a,'select name from public.editions');expect(rows[0].rows).toEqual([{name:'Test'}])
 await expect(asUser(ids.a,`update public.edition_members set role='admin'`)).rejects.toThrow()
 const catalog=await asUser(ids.a,`select * from public.class_catalog('${ids.other}')`);expect(catalog[0].rows).toHaveLength(0)
})
it('claims once, preserves capacity, denies direct writes and keeps roster private',async()=>{
 await asUser(ids.a,`select public.claim_section('${ids.section}'); select public.claim_section('${ids.section}');`)
 await expect(asUser(ids.b,`select public.claim_section('${ids.section}')`)).rejects.toThrow('Selection unavailable')
 const own=await asUser(ids.a,'select * from public.enrollments');expect(own[0].rows).toHaveLength(1)
 const other=await asUser(ids.b,'select * from public.enrollments');expect(other[0].rows).toHaveLength(0)
 await expect(asUser(ids.b,`insert into public.enrollments values('${ids.edition}','${ids.offering}','${ids.section}','${ids.b}',now())`)).rejects.toThrow()
 const audit=await db.query('select * from public.audit_events');expect(audit.rows).toHaveLength(1)
})
it('suspension revokes catalog and claim access with the same identity',async()=>{
 await db.exec(`update public.edition_members set active=false where user_id='${ids.b}'`)
 const rows=await asUser(ids.b,`select * from public.class_catalog('${ids.edition}')`);expect(rows[0].rows).toHaveLength(0)
 await expect(asUser(ids.b,`select public.claim_section('${ids.section}')`)).rejects.toThrow('Selection unavailable')
})
