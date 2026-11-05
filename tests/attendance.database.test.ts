import { beforeAll, afterAll, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
const db = new PGlite()
const id = (prefix: string, suffix = '1') => `${prefix}0000000-0000-0000-0000-${suffix.padStart(12, '0')}`
const edition = id('1'), teacher = id('2'), trainee = id('2', '2'), leaveStudent = id('2', '3'), reviewer = id('2', '4'), outsider = id('2', '5')
const section = id('3'), offering = id('4'), session = id('7'), future = id('7', '2')
async function asUser(user: string, sql: string, role = 'authenticated') {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub','${user}',false);`)
  try { return await db.exec(sql) } finally { await db.exec('reset role') }
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',coalesce(current_setting('request.jwt.claim.aal',true),'aal1'))$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid(),auth.jwt() to authenticated;`)
  await db.exec('alter default privileges grant execute on functions to anon,authenticated,service_role')
  for (const file of ['202611050001_foundation.sql', '202611050002_admissions.sql', '202611050003_attendance.sql', '202611050004_learning.sql', '202611050005_function_grants.sql','202611050006_runtime_database.sql']) {
    await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'))
  }
  await db.exec(`insert into auth.users(id) values('${teacher}'),('${trainee}'),('${leaveStudent}'),('${reviewer}'),('${outsider}');
    insert into public.editions(id,name) values('${edition}','Synthetic attendance edition');
    insert into public.edition_members values('${edition}','${teacher}','trainer','CS',true),('${edition}','${trainee}','trainee','CS',true),('${edition}','${leaveStudent}','trainee','CS',true),('${edition}','${reviewer}','organizer','CS',true),('${edition}','${outsider}','trainee','DB',true);
    insert into public.edition_capabilities values('${edition}','${reviewer}','review_attendance'),('${edition}','${reviewer}','manage_schedule');
    insert into public.offerings values('${offering}','${edition}','Synthetic class','CS','core');
    insert into public.sections values('${section}','${edition}','${offering}',30,'Monday','Synthetic room','Synthetic trainer');
    insert into public.section_trainers values('${section}','${teacher}');
    insert into public.enrollments values('${edition}','${offering}','${section}','${trainee}',now()-interval '1 day'),('${edition}','${offering}','${section}','${leaveStudent}',now()-interval '1 day');
    insert into public.attendance_policies(edition_id,published) values('${edition}',true);
    insert into public.teaching_sessions(id,section_id,title,kind,starts_at,ends_at) values('${session}','${section}','Synthetic theory','theory',now()-interval '1 minute',now()+interval '89 minutes');`)
})
afterAll(async () => { await db.close() })

it('only assigned trainers start a roster; outsider sessions and private roster remain hidden', async () => {
  await expect(asUser(outsider, `select public.start_teaching_session('${session}',1)`)).rejects.toThrow()
  await expect(asUser(teacher, `select public.start_teaching_session('${session}',null)`)).rejects.toThrow()
  await asUser(teacher, `select public.start_teaching_session('${session}',1)`)
  expect((await db.query('select * from public.session_attendance')).rows).toHaveLength(2)
  const catalog = await asUser(outsider, `select * from public.attendance_catalog('${edition}')`)
  expect(catalog[0].rows).toHaveLength(0)
  const roster = await asUser(trainee, `select * from public.attendance_roster('${session}')`)
  expect(roster[0].rows).toHaveLength(0)
  await expect(asUser(trainee, 'update public.session_attendance set status=\'present\'')).rejects.toThrow()
})
it('browser callers cannot bypass code verification; service recording is scoped and idempotent', async () => {
  const result = await db.query<{ generation: string }>(`select generation from public.teaching_sessions where id='${session}'`)
  const generation = result.rows[0].generation
  await expect(asUser(trainee, `select public.record_session_checkin('${session}','${trainee}','${generation}',clock_timestamp()+interval '10 seconds')`)).rejects.toThrow()
  await expect(asUser('', `select public.record_session_checkin('${session}','${outsider}','${generation}',clock_timestamp()+interval '10 seconds')`, 'service_role')).rejects.toThrow()
  await expect(asUser('', `select public.record_session_checkin('${session}','${trainee}','${id('9')}',clock_timestamp()+interval '10 seconds')`, 'service_role')).rejects.toThrow()
  await expect(asUser('', `select public.record_session_checkin('${session}','${trainee}','${generation}',clock_timestamp()-interval '1 second')`, 'service_role')).rejects.toThrow()
  await expect(asUser('', `select public.record_session_checkin('${session}','${trainee}','${generation}',null)`, 'service_role')).rejects.toThrow()
  await expect(asUser('', `select public.record_session_checkin('${session}','${trainee}','${generation}')`, 'service_role')).rejects.toThrow()
  await asUser('', `select public.record_session_checkin('${session}','${trainee}','${generation}',clock_timestamp()+interval '10 seconds');select public.record_session_checkin('${session}','${trainee}','${generation}',clock_timestamp()+interval '10 seconds');`, 'service_role')
  const recorded = await db.query<{ status: string; version: number }>(`select status,version from public.session_attendance where user_id='${trainee}'`)
  expect(recorded.rows[0]).toEqual({ status: 'present', version: 2 })
  expect((await db.query("select * from public.attendance_events where action='attendance.checkin'")).rows).toHaveLength(1)
})
it('leave stays pending until an assigned MFA reviewer acts; notes are not disclosed to trainers', async () => {
  await asUser(leaveStudent, `select public.request_session_leave('${session}','Synthetic permission request')`)
  const notes = await asUser(teacher, 'select * from public.session_leave_requests')
  expect(notes[0].rows).toHaveLength(0)
  expect((await asUser(leaveStudent, 'select * from public.session_leave_requests'))[0].rows).toHaveLength(1)
  expect((await asUser(outsider, 'select * from public.session_leave_requests'))[0].rows).toHaveLength(0)
  expect((await asUser(reviewer, 'select * from public.session_leave_requests'))[0].rows).toHaveLength(0)
  const request = await db.query<{ id: string }>('select id from public.session_leave_requests')
  const requestId = request.rows[0].id
  await expect(asUser(reviewer, `select public.review_session_leave('${requestId}',1,true,'Reviewed')`)).rejects.toThrow()
  await db.exec("select set_config('request.jwt.claim.aal','aal2',false)")
  expect((await asUser(reviewer, 'select * from public.session_leave_requests'))[0].rows).toHaveLength(1)
  await expect(asUser(teacher, 'select * from public.teaching_sessions')).rejects.toThrow()
  await expect(asUser(teacher, `select public.review_session_leave('${requestId}',1,true,'Reviewed')`)).rejects.toThrow()
  await expect(asUser(reviewer, `select public.review_session_leave('${requestId}',null,true,'Reviewed')`)).rejects.toThrow()
  await asUser(reviewer, `select public.review_session_leave('${requestId}',1,true,'Permission verified')`)
  await expect(asUser(teacher, `select public.finalize_teaching_session('${session}',2)`)).rejects.toThrow()
})
it('finalization counts an approved half-session leave as one quarter-unit; policy is frozen', async () => {
  await expect(asUser(reviewer, `select public.configure_attendance_policy('${edition}',16,4,8,'Change after opening')`)).rejects.toThrow()
  // Trusted fixture clock advancement, not client control of production time.
  await db.exec(`update public.teaching_sessions set starts_at=now()-interval '91 minutes',ends_at=now()-interval '1 minute' where id='${session}'`)
  await expect(asUser(teacher, `select public.finalize_teaching_session('${session}',null)`)).rejects.toThrow()
  await asUser(teacher, `select public.finalize_teaching_session('${session}',2)`)
  const summary = await asUser(leaveStudent, `select * from public.my_attendance_summary('${edition}')`)
  expect(Number((summary[0].rows[0] as { units: number }).units)).toBe(1)
  expect(Number((summary[0].rows[0] as { pending: number }).pending)).toBe(0)
  const staffSummary = await asUser(teacher, `select * from public.my_attendance_summary('${edition}')`)
  expect(staffSummary[0].rows).toHaveLength(0)
})
it('supervised corrections replace leave, reject stale/null versions, and recompute totals', async () => {
  const row = await db.query<{ version: number }>(`select version from public.session_attendance where user_id='${leaveStudent}'`)
  const version = row.rows[0].version
  await expect(asUser(teacher, `select public.correct_session_attendance('${session}','${leaveStudent}',null,'present','Technical fallback')`)).rejects.toThrow()
  await asUser(teacher, `select public.correct_session_attendance('${session}','${leaveStudent}',${version},'present','Physical attendance verified after technical problem')`)
  await expect(asUser(teacher, `select public.correct_session_attendance('${session}','${leaveStudent}',${version},'absent','Stale tab')`)).rejects.toThrow()
  const summary = await asUser(leaveStudent, `select * from public.my_attendance_summary('${edition}')`)
  expect(Number((summary[0].rows[0] as { units: number }).units)).toBe(0)
  expect((await db.query<{ status: string }>('select status from public.session_leave_requests')).rows[0].status).toBe('superseded')
})
it('cancelled sessions create no obligation and cannot be used for check-in', async () => {
  await db.exec(`insert into public.teaching_sessions(id,section_id,title,kind,starts_at,ends_at) values('${future}','${section}','Cancelled lab','lab',now()+interval '1 day',now()+interval '1 day 90 minutes')`)
  await asUser(reviewer, `select public.cancel_teaching_session('${future}',1,'Holiday replacement will be scheduled separately')`)
  const summary = await asUser(trainee, `select * from public.my_attendance_summary('${edition}')`)
  expect(Number((summary[0].rows[0] as { pending: number }).pending)).toBe(0)
  await expect(asUser(teacher, `select public.start_teaching_session('${future}',2)`)).rejects.toThrow()
})
