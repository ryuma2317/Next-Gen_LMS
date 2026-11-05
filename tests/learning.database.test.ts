import { beforeAll, afterAll, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
const db = new PGlite()
let namedDefaultGrantsPresent = false
const id = (prefix: string, suffix = '1') => `${prefix}0000000-0000-0000-0000-${suffix.padStart(12, '0')}`
const edition = id('1'), teacher = id('2'), student = id('2', '2'), peer = id('2', '3'), outsider = id('2', '4')
const section = id('3'), offering = id('4'), lesson = id('8'), assignment = id('8', '2'), workId = id('9'), replacement = id('9', '2'), selfWork = id('9', '3')
async function run(user: string, sql: string, params: unknown[] = []) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false)`)
  try { return await db.query<Record<string, unknown>>(sql, params) } finally { await db.exec('reset role') }
}
const fields = () => ({ title: 'Test assignment', instructions: 'Explain your work', submission_mode: 'individual', response_format: 'text', opens_at: new Date(Date.now() - 3600000).toISOString(), deadline_mode: 'none', due_at: null, late_mode: 'not_applicable', max_attempts: 2, max_score_units: 10000 })
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',coalesce(current_setting('request.jwt.claim.aal',true),'aal1'))$$;
    grant usage on schema auth to authenticated;grant execute on function auth.uid(),auth.jwt() to authenticated;`)
  await db.exec('alter default privileges grant execute on functions to anon,authenticated,service_role')
  for (const name of ['202611050001_foundation.sql', '202611050002_admissions.sql', '202611050003_attendance.sql', '202611050004_learning.sql', '202611050005_function_grants.sql','202611050006_runtime_database.sql']) {
    if (name === '202611050005_function_grants.sql') {
      const before = await db.query<{ browser_checkin: boolean; public_submit: boolean }>("select has_function_privilege('authenticated','public.record_session_checkin(uuid,uuid,uuid,timestamptz)','EXECUTE') as browser_checkin,has_function_privilege('anon','public.submit_application(uuid,uuid,text,text,text,text,text,jsonb)','EXECUTE') as public_submit")
      namedDefaultGrantsPresent = before.rows[0].browser_checkin && before.rows[0].public_submit
    }
    await db.exec(await readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8'))
  }
  await db.exec(`insert into auth.users(id) values('${teacher}'),('${student}'),('${peer}'),('${outsider}');
    insert into public.editions(id,name) values('${edition}','Learning test');
    insert into public.edition_members values('${edition}','${teacher}','trainer','CS',true),('${edition}','${teacher}','trainee','CS',true),('${edition}','${student}','trainee','CS',true),('${edition}','${peer}','trainee','CS',true),('${edition}','${outsider}','trainee','DB',true);
    insert into public.offerings values('${offering}','${edition}','Test class','CS','core');
    insert into public.sections values('${section}','${edition}','${offering}',30,'Monday','Test room','Synthetic trainer');
    insert into public.section_trainers values('${section}','${teacher}');
    insert into public.section_learning_permissions values('${section}','${teacher}','edit_learning'),('${section}','${teacher}','grade_work');
    insert into public.enrollments values('${edition}','${offering}','${section}','${teacher}',now()),('${edition}','${offering}','${section}','${student}',now()),('${edition}','${offering}','${section}','${peer}',now());`)
})
afterAll(async () => { await db.close() })
it('explicit function ACLs override provider-style named default grants', async () => {
  expect(namedDefaultGrantsPresent).toBe(true)
  const privileges = await db.query<Record<string, boolean>>(`select
    has_function_privilege('anon','public.published_form(uuid)','EXECUTE') as published_read,
    has_function_privilege('anon','public.submit_application(uuid,uuid,text,text,text,text,text,jsonb)','EXECUTE') as public_submit,
    has_function_privilege('authenticated','public.record_session_checkin(uuid,uuid,uuid,timestamptz)','EXECUTE') as browser_checkin,
    has_function_privilege('service_role','public.record_session_checkin(uuid,uuid,uuid,timestamptz)','EXECUTE') as server_checkin,
    has_function_privilege('service_role','public.record_session_checkin(uuid,uuid,uuid)','EXECUTE') as legacy_checkin,
    has_function_privilege('authenticated','private.learning_url(text)','EXECUTE') as private_helper`)
  expect(privileges.rows[0]).toEqual({ published_read: true, public_submit: false, browser_checkin: false, server_checkin: true, legacy_checkin: false, private_helper: false })
})
it('lesson drafts require explicit teaching permission/MFA and remain hidden until published', async () => {
  await expect(run(teacher, 'select public.save_class_lesson($1,$2,0,$3,$4,null)', [lesson, section, 'Lesson', 'Draft sentinel'])).rejects.toThrow()
  await db.exec("select set_config('request.jwt.claim.aal','aal2',false)")
  await run(teacher, 'select public.save_class_lesson($1,$2,0,$3,$4,null)', [lesson, section, 'Lesson', 'Draft sentinel'])
  expect((await run(student, 'select * from public.learning_lessons($1)', [section])).rows).toHaveLength(0)
  expect((await run(outsider, 'select * from public.learning_classes($1)', [edition])).rows).toHaveLength(0)
  await expect(run(teacher, 'select public.publish_class_lesson($1,null)', [lesson])).rejects.toThrow()
  await run(teacher, 'select public.publish_class_lesson($1,1)', [lesson])
  expect((await run(student, 'select * from public.learning_lessons($1)', [section])).rows).toHaveLength(1)
  await expect(run(student, 'select * from public.class_lessons')).rejects.toThrow()
  await expect(run(teacher, 'select public.save_class_lesson($1,$2,2,$3,$4,null)', [lesson, section, 'Changed', 'Silent published edit'])).rejects.toThrow()
})
it('assignment publication requires complete policy and rejects direct extra fields/null revisions', async () => {
  await expect(run(teacher, 'select public.save_class_assignment($1,$2,0,$3)', [assignment, section, JSON.stringify({ ...fields(), role: 'admin' })])).rejects.toThrow()
  await run(teacher, 'select public.save_class_assignment($1,$2,0,$3)', [assignment, section, JSON.stringify({ ...fields(), max_attempts: null })])
  expect((await run(student, 'select * from public.learning_assignments($1)', [section])).rows).toHaveLength(0)
  await expect(run(teacher, 'select public.publish_class_assignment($1,1)', [assignment])).rejects.toThrow()
  await expect(run(teacher, 'select public.save_class_assignment($1,$2,null,$3)', [assignment, section, JSON.stringify(fields())])).rejects.toThrow()
  await run(teacher, 'select public.save_class_assignment($1,$2,1,$3)', [assignment, section, JSON.stringify(fields())])
  await run(teacher, 'select public.publish_class_assignment($1,2)', [assignment])
  expect((await run(student, 'select * from public.learning_assignments($1)', [section])).rows).toHaveLength(1)
})
it('submission retries cannot overwrite work, impersonate peers or consume duplicate attempts', async () => {
  await expect(run(outsider, 'select public.submit_class_work($1,$2,3,$3,null)', [id('9', '99'), assignment, 'Unauthorized'])).rejects.toThrow()
  const sql = 'select public.submit_class_work($1,$2,3,$3,null)'
  await run(student, sql, [workId, assignment, "Untrusted ' text <script> stays data"])
  await run(student, sql, [workId, assignment, "Untrusted ' text <script> stays data"])
  await expect(run(student, sql, [workId, assignment, 'Different payload'])).rejects.toThrow()
  await run(peer, sql, [id('9', '4'), assignment, 'Private peer work'])
  expect((await run(student, 'select * from public.learning_work($1)', [assignment])).rows).toHaveLength(1)
  await expect(run(student, 'update public.work_submissions set body_text=\'overwrite\'')).rejects.toThrow()
  await run(teacher, sql, [selfWork, assignment, 'Own trainee work'])
  await expect(run(teacher, 'select public.grade_class_work($1,0,100,$2,$3)', [selfWork, 'Feedback', 'No self grading'])).rejects.toThrow()
})
it('unreleased grades never appear to the learner, and editing drafts preserves the last published snapshot', async () => {
  await expect(run(teacher, 'select public.grade_class_work($1,null,7500,$2,$3)', [workId, 'Hidden draft', 'Review'])).rejects.toThrow()
  await expect(run(teacher, 'select public.grade_class_work($1,0,10001,$2,$3)', [workId, 'Over maximum', 'Review'])).rejects.toThrow()
  await run(teacher, 'select public.grade_class_work($1,0,7500,$2,$3)', [workId, 'First released feedback', 'Reviewed first draft'])
  const hidden = (await run(student, 'select * from public.learning_work($1)', [assignment])).rows[0]
  expect(hidden.score_units).toBeNull(); expect(hidden.feedback).toBeNull(); expect(hidden.grade_version).toBe(0); expect(hidden.has_unpublished_changes).toBe(false)
  await run(teacher, 'select public.release_class_grade($1,1,$2)', [workId, 'Release reviewed result'])
  await run(teacher, 'select public.grade_class_work($1,2,8100,$2,$3)', [workId, 'Private revised feedback', 'Recheck draft'])
  const stillPublished = (await run(student, 'select * from public.learning_work($1)', [assignment])).rows[0]
  expect(stillPublished.score_units).toBe(7500); expect(stillPublished.feedback).toBe('First released feedback'); expect(stillPublished.grade_version).toBe(1)
  await expect(run(teacher, 'select public.release_class_grade($1,2,$2)', [workId, 'Stale release'])).rejects.toThrow()
  await run(teacher, 'select public.release_class_grade($1,3,$2)', [workId, 'Release revised result'])
  expect((await run(student, 'select * from public.learning_work($1)', [assignment])).rows[0].score_units).toBe(8100)
})
it('latest-attempt grading, limits and closing preserve immutable earlier submissions', async () => {
  await run(student, 'select public.submit_class_work($1,$2,3,$3,null)', [replacement, assignment, 'Replacement version'])
  await expect(run(teacher, 'select public.grade_class_work($1,4,9000,$2,$3)', [workId, 'Old attempt', 'Must grade latest'])).rejects.toThrow()
  await expect(run(student, 'select public.submit_class_work($1,$2,3,$3,null)', [id('9', '5'), assignment, 'Third version'])).rejects.toThrow()
  await run(teacher, 'select public.close_class_assignment($1,3,$2)', [assignment, 'Teaching window complete'])
  await expect(run(student, 'select public.submit_class_work($1,$2,4,$3,null)', [id('9', '6'), assignment, 'Closed'])).rejects.toThrow()
  await run(student, 'select public.submit_class_work($1,$2,3,$3,null)', [replacement, assignment, 'Replacement version'])
  const history = (await run(student, 'select * from public.learning_work($1)', [assignment])).rows
  expect(history).toHaveLength(2); expect(history[0].is_latest).toBe(true); expect(history[1].is_latest).toBe(false)
  expect(history[1].body_text).toContain('stays data')
})
