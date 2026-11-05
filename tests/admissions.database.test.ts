import {beforeAll,afterAll,it,expect} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {readFile} from 'node:fs/promises'
const db=new PGlite()
const edition='10000000-0000-0000-0000-000000000001',staff='20000000-0000-0000-0000-000000000001',applicant='20000000-0000-0000-0000-000000000002',other='20000000-0000-0000-0000-000000000003',form='50000000-0000-0000-0000-000000000001',application='60000000-0000-0000-0000-000000000001',hash='a'.repeat(64)
async function asRole(role:string,user:string,sql:string){await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub','${user}',false);`);try{return await db.exec(sql)}finally{await db.exec('reset role')}}
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',coalesce(current_setting('request.jwt.claim.aal',true),'aal1'))$$;grant usage on schema auth to authenticated;grant execute on function auth.uid(),auth.jwt() to authenticated;`)
  await db.exec('alter default privileges grant execute on functions to anon,authenticated,service_role')
 for(const file of ['202611050001_foundation.sql','202611050002_admissions.sql','202611050003_attendance.sql','202611050004_learning.sql','202611050005_function_grants.sql','202611050006_runtime_database.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
 await db.exec(`insert into auth.users values('${staff}','staff@example.test',now()),('${applicant}','applicant@example.test',null),('${other}','other@example.test',now());insert into public.editions(id,name) values('${edition}','Test edition');insert into public.edition_members values('${edition}','${staff}','organizer','CS',true);insert into public.edition_capabilities values('${edition}','${staff}','review_admissions'),('${edition}','${staff}','manage_recruitment');insert into public.recruitment_forms(id,edition_id,title,purpose,version,questions,published) values('${form}','${edition}','Trainee intake','trainee',1,'[{"id":"goal","label":"Original goal question","type":"text","required":true}]',true);`)
})
afterAll(async()=>{await db.close()})
const submit=`select public.submit_application('${form}','${application}','${hash}','Synthetic Applicant','applicant@example.test','CS','Software Engineering','{"goal":"Learn"}');`
it('anonymous/public-key callers cannot bypass the Worker bridge or read applicants',async()=>{
 await expect(asRole('anon','',submit)).rejects.toThrow()
 await expect(asRole('authenticated',other,submit)).rejects.toThrow()
 const rows=await asRole('authenticated',other,'select * from public.applications');expect(rows[0].rows).toHaveLength(0)
})
it('service bridge preserves versioned answers and retries only an identical private receipt',async()=>{
 await asRole('service_role','',submit);await asRole('service_role','',submit)
 expect((await db.query('select * from public.applications')).rows).toHaveLength(1)
 await expect(asRole('service_role','',submit.replace(hash,'b'.repeat(64)))).rejects.toThrow()
 const wrong=await asRole('service_role','',`select * from public.application_receipt('${application}','${'b'.repeat(64)}')`);expect(wrong[0].rows).toHaveLength(0)
 const right=await asRole('service_role','',`select * from public.application_receipt('${application}','${hash}')`);expect(right[0].rows).toEqual([expect.objectContaining({status:'submitted',purpose:'trainee'})])
 await db.exec(`update public.recruitment_forms set questions='[]' where id='${form}'`)
 const snapshot=await db.query<{questions:{label:string}[]}>('select questions from public.applications');expect(snapshot.rows[0].questions[0].label).toBe('Original goal question')
})
it('review requires an assigned capability plus MFA; stale or skipped transitions fail',async()=>{
 await expect(asRole('authenticated',staff,`select public.review_application('${application}',1,'passed','Orientation verified')`)).rejects.toThrow()
 await db.exec(`select set_config('request.jwt.claim.aal','aal2',false)`)
 await expect(asRole('authenticated',other,`select public.review_application('${application}',1,'under_review','Review')`)).rejects.toThrow()
 await asRole('authenticated',staff,`select public.review_application('${application}',1,'under_review','Checking orientation outcome')`)
 await expect(asRole('authenticated',staff,`select public.review_application('${application}',null,'passed','Orientation verified')`)).rejects.toThrow()
 await expect(asRole('authenticated',staff,`select public.review_application('${application}',1,'passed','Orientation verified')`)).rejects.toThrow()
 await expect(asRole('authenticated',applicant,`select public.activate_application('${application}')`)).rejects.toThrow()
 await asRole('authenticated',staff,`select public.review_application('${application}',2,'passed','Orientation pass verified by organizer')`)
 expect((await db.query('select * from private.invitation_jobs')).rows).toHaveLength(1)
 expect((await db.query('select * from public.application_reviews')).rows).toHaveLength(2)
})
it('activation requires verified matching email and repeated activation creates one membership',async()=>{
 await expect(asRole('authenticated',applicant,`select public.activate_application('${application}')`)).rejects.toThrow()
 await db.exec(`update auth.users set email_confirmed_at=now() where id='${applicant}'`)
 await expect(asRole('authenticated',other,`select public.activate_application('${application}')`)).rejects.toThrow()
 await asRole('authenticated',applicant,`select public.activate_application('${application}');select public.activate_application('${application}');`)
 expect((await db.query(`select * from public.edition_members where user_id='${applicant}'`)).rows).toHaveLength(1)
 await db.exec(`update public.edition_members set active=false where user_id='${applicant}'`)
 await asRole('authenticated',applicant,`select public.activate_application('${application}')`)
 const membership=await db.query<{active:boolean}>(`select active from public.edition_members where user_id='${applicant}'`);expect(membership.rows[0].active).toBe(false)
})
