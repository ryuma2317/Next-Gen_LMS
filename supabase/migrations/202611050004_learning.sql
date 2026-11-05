begin;
alter table public.edition_capabilities drop constraint edition_capabilities_capability_check;
alter table public.edition_capabilities add constraint edition_capabilities_capability_check check(capability in ('review_admissions','manage_recruitment','manage_selection','review_attendance','manage_schedule','review_learning'));
create table public.section_learning_permissions (
 section_id uuid not null references public.sections(id),user_id uuid not null references auth.users(id),
 capability text not null check(capability in ('edit_learning','grade_work')),primary key(section_id,user_id,capability)
);
create function private.learning_permission(p_section uuid,p_capability text) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_section_trainer(p_section) and exists(select 1 from public.section_learning_permissions where section_id=p_section and user_id=auth.uid() and capability=p_capability);
$$;
create function private.learning_write(p_section uuid,p_capability text) returns boolean language sql stable security definer set search_path='' as $$
 select private.learning_permission(p_section,p_capability) and coalesce(auth.jwt()->>'aal','')='aal2';
$$;
create function private.learning_student(p_section uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.enrollments e join public.edition_members m on m.edition_id=e.edition_id and m.user_id=e.user_id and m.role='trainee' and m.active where e.section_id=p_section and e.user_id=auth.uid());
$$;
create function private.learning_reader(p_section uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_section_trainer(p_section) or private.learning_student(p_section) or exists(select 1 from public.sections s where s.id=p_section and private.can_operate(s.edition_id,'review_learning'));
$$;
create function private.learning_staff(p_section uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_section_trainer(p_section) or exists(select 1 from public.sections s where s.id=p_section and private.can_operate(s.edition_id,'review_learning'));
$$;
create function private.learning_url(p_url text) returns boolean language sql immutable set search_path='' as $$
 select p_url is null or (length(p_url)<=2048 and p_url ~ '^https://[[:alnum:]]([[:alnum:].-]*[[:alnum:]])?(:[0-9]{1,5})?([/?#][^[:space:][:cntrl:]]*)?$');
$$;
revoke all on function private.learning_permission(uuid,text),private.learning_write(uuid,text),private.learning_student(uuid),private.learning_reader(uuid),private.learning_staff(uuid),private.learning_url(text) from public;

create table public.class_lessons (
 id uuid primary key,section_id uuid not null references public.sections(id),title text not null check(length(trim(title)) between 1 and 160),
 body_text text not null check(length(body_text)<=10000 and octet_length(body_text)<=12000),resource_url text check(private.learning_url(resource_url)),
 state text not null default 'draft' check(state in ('draft','published')),version integer not null default 1,created_at timestamptz not null default now()
);
create table public.class_assignments (
 id uuid primary key,section_id uuid not null references public.sections(id),title text not null check(length(trim(title)) between 1 and 160),
 instructions text not null check(length(instructions)<=8000 and octet_length(instructions)<=12000),
 submission_mode text check(submission_mode='individual'),response_format text check(response_format in ('text','link','text_and_link','text_or_link')),
 opens_at timestamptz,deadline_mode text check(deadline_mode in ('none','at')),due_at timestamptz,late_mode text check(late_mode in ('not_applicable','reject','accept_flagged')),
 max_attempts integer check(max_attempts between 1 and 20),max_score_units integer check(max_score_units between 1 and 1000000),
 state text not null default 'draft' check(state in ('draft','published','closed')),version integer not null default 1,created_at timestamptz not null default now()
);
create table public.work_submissions (
 id uuid primary key,assignment_id uuid not null references public.class_assignments(id),user_id uuid not null references auth.users(id),
 attempt integer not null check(attempt>0),body_text text not null check(length(body_text)<=10000 and octet_length(body_text)<=12000),
 resource_url text check(private.learning_url(resource_url)),submitted_at timestamptz not null default now(),is_late boolean not null,
 assignment_snapshot jsonb not null,unique(assignment_id,user_id,attempt)
);
create index on public.class_lessons(section_id,created_at,id);
create index on public.class_assignments(section_id,created_at,id);
create table public.work_grades (
 submission_id uuid primary key references public.work_submissions(id),score_units integer not null check(score_units>=0),
 feedback text not null check(length(feedback)<=6000),version integer not null default 1,draft_revision integer not null default 1,
 published_score_units integer,published_feedback text,published_revision integer
);
create table public.learning_events (
 id uuid primary key default gen_random_uuid(),edition_id uuid not null references public.editions(id),actor_id uuid not null references auth.users(id),
 resource_id uuid not null,action text not null,reason text not null check(length(trim(reason)) between 1 and 1000),
 before_data jsonb,after_data jsonb,created_at timestamptz not null default now()
);
alter table public.section_learning_permissions enable row level security;
alter table public.class_lessons enable row level security;
alter table public.class_assignments enable row level security;
alter table public.work_submissions enable row level security;
alter table public.work_grades enable row level security;
alter table public.learning_events enable row level security;
revoke all on public.section_learning_permissions,public.class_lessons,public.class_assignments,public.work_submissions,public.work_grades,public.learning_events from anon,authenticated;
-- No table grants: every read uses a projection RPC, keeping unpublished grading fields private.

create function public.learning_classes(p_edition uuid)
returns table(id uuid,title text,room text,can_edit boolean,can_grade boolean,is_trainer boolean,is_student boolean,mfa_ready boolean)
language sql stable security definer set search_path='' as $$
 select s.id,o.title,s.room,private.learning_permission(s.id,'edit_learning'),private.learning_permission(s.id,'grade_work'),private.is_section_trainer(s.id),private.learning_student(s.id),coalesce(auth.jwt()->>'aal','')='aal2'
 from public.sections s join public.offerings o on o.id=s.offering_id where s.edition_id=p_edition and private.learning_reader(s.id) order by o.title,s.id;
$$;
create function public.learning_lessons(p_section uuid) returns setof public.class_lessons
language sql stable security definer set search_path='' as $$ select l.* from public.class_lessons l where l.section_id=p_section and private.learning_reader(p_section) and (l.state='published' or private.learning_staff(p_section)) order by l.created_at,l.id limit 100; $$;
create function public.learning_assignments(p_section uuid) returns setof public.class_assignments
language sql stable security definer set search_path='' as $$ select a.* from public.class_assignments a where a.section_id=p_section and private.learning_reader(p_section) and (private.learning_staff(p_section) or (a.state in ('published','closed') and a.opens_at<=now())) order by a.created_at,a.id limit 100; $$;

create function public.save_class_lesson(p_id uuid,p_section uuid,p_version integer,p_title text,p_text text,p_url text) returns uuid
language plpgsql security definer set search_path='' as $$
declare l public.class_lessons; v_edition uuid;
begin
 if not private.learning_write(p_section,'edit_learning') or p_version is null or p_version<0 then raise exception 'Lesson editing unavailable'; end if;
 select * into l from public.class_lessons where id=p_id for update;
 if found then
  if l.section_id<>p_section or l.state<>'draft' then raise exception 'Lesson editing unavailable'; end if;
  if p_version=0 and l.version=1 and l.title=p_title and l.body_text=p_text and l.resource_url is not distinct from p_url then return l.id; end if;
  if l.version is distinct from p_version then raise exception 'Stale lesson'; end if;
  update public.class_lessons set title=p_title,body_text=p_text,resource_url=p_url,version=version+1 where id=l.id;
 else
  if p_version<>0 then raise exception 'Stale lesson'; end if;
  insert into public.class_lessons(id,section_id,title,body_text,resource_url) values(p_id,p_section,p_title,p_text,p_url);
 end if;
 select edition_id into v_edition from public.sections where id=p_section;
 insert into public.learning_events(edition_id,actor_id,resource_id,action,reason) values(v_edition,auth.uid(),p_id,'lesson.saved','Saved a draft lesson');
 return p_id;
end; $$;
create function public.publish_class_lesson(p_id uuid,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare l public.class_lessons; v_edition uuid;
begin
 select * into l from public.class_lessons where id=p_id for update;
 if not found or not private.learning_write(l.section_id,'edit_learning') or l.version is distinct from p_version or l.state<>'draft' or (length(trim(l.body_text))=0 and l.resource_url is null) then raise exception 'Lesson publication unavailable'; end if;
 update public.class_lessons set state='published',version=version+1 where id=l.id;
 select edition_id into v_edition from public.sections where id=l.section_id;
 insert into public.learning_events(edition_id,actor_id,resource_id,action,reason) values(v_edition,auth.uid(),l.id,'lesson.published','Published reviewed lesson');
end; $$;

create function public.save_class_assignment(p_id uuid,p_section uuid,p_version integer,p_fields jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.class_assignments; v_edition uuid; fields text[]:=array['title','instructions','submission_mode','response_format','opens_at','deadline_mode','due_at','late_mode','max_attempts','max_score_units'];
begin
 if not private.learning_write(p_section,'edit_learning') or p_version is null or p_version<0 or jsonb_typeof(p_fields) is distinct from 'object' then raise exception 'Assignment editing unavailable'; end if;
 if not(p_fields ?& fields) or p_fields-fields<>'{}'::jsonb or jsonb_typeof(p_fields->'title')<>'string' or jsonb_typeof(p_fields->'instructions')<>'string' then raise exception 'Invalid assignment fields'; end if;
 select * into a from public.class_assignments where id=p_id for update;
 if found then
  if a.section_id<>p_section or a.state<>'draft' then raise exception 'Assignment editing unavailable'; end if;
  if p_version=0 and a.version=1 and (to_jsonb(a)-array['id','section_id','state','version','created_at'])=(to_jsonb(jsonb_populate_record(null::public.class_assignments,p_fields))-array['id','section_id','state','version','created_at']) then return a.id; end if;
  if a.version is distinct from p_version then raise exception 'Stale assignment'; end if;
  update public.class_assignments set title=p_fields->>'title',instructions=p_fields->>'instructions',submission_mode=p_fields->>'submission_mode',response_format=p_fields->>'response_format',opens_at=(p_fields->>'opens_at')::timestamptz,deadline_mode=p_fields->>'deadline_mode',due_at=(p_fields->>'due_at')::timestamptz,late_mode=p_fields->>'late_mode',max_attempts=(p_fields->>'max_attempts')::integer,max_score_units=(p_fields->>'max_score_units')::integer,version=version+1 where id=a.id;
 else
  if p_version<>0 then raise exception 'Stale assignment'; end if;
  insert into public.class_assignments(id,section_id,title,instructions,submission_mode,response_format,opens_at,deadline_mode,due_at,late_mode,max_attempts,max_score_units)
  values(p_id,p_section,p_fields->>'title',p_fields->>'instructions',p_fields->>'submission_mode',p_fields->>'response_format',(p_fields->>'opens_at')::timestamptz,p_fields->>'deadline_mode',(p_fields->>'due_at')::timestamptz,p_fields->>'late_mode',(p_fields->>'max_attempts')::integer,(p_fields->>'max_score_units')::integer);
 end if;
 select edition_id into v_edition from public.sections where id=p_section;
 insert into public.learning_events(edition_id,actor_id,resource_id,action,reason) values(v_edition,auth.uid(),p_id,'assignment.saved','Saved draft assignment configuration');
 return p_id;
end; $$;
create function public.publish_class_assignment(p_id uuid,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare a public.class_assignments; v_edition uuid;
begin
 select * into a from public.class_assignments where id=p_id for update;
 if not found or not private.learning_write(a.section_id,'edit_learning') or a.version is distinct from p_version or a.state<>'draft' then raise exception 'Assignment publication unavailable'; end if;
 if a.submission_mode is distinct from 'individual' or a.response_format is null or a.opens_at is null or a.deadline_mode is null or a.max_attempts is null or a.max_score_units is null or length(trim(a.instructions))=0 then raise exception 'Complete assignment policy before publishing'; end if;
 if (a.deadline_mode='at' and (a.due_at is null or a.due_at<=greatest(a.opens_at,now()) or a.late_mode is null or a.late_mode not in ('reject','accept_flagged'))) or (a.deadline_mode='none' and (a.due_at is not null or a.late_mode is distinct from 'not_applicable')) then raise exception 'Complete deadline and late policy'; end if;
 update public.class_assignments set state='published',version=version+1 where id=a.id;
 select edition_id into v_edition from public.sections where id=a.section_id;
 insert into public.learning_events(edition_id,actor_id,resource_id,action,reason,after_data) values(v_edition,auth.uid(),a.id,'assignment.published','Published reviewed assignment rules',to_jsonb(a)-array['instructions','title']);
end; $$;
create function public.close_class_assignment(p_id uuid,p_version integer,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare a public.class_assignments; v_edition uuid;
begin
 select * into a from public.class_assignments where id=p_id for update;
 if not found or not private.learning_write(a.section_id,'edit_learning') or a.version is distinct from p_version or a.state<>'published' or coalesce(length(trim(p_reason)),0) not between 1 and 1000 then raise exception 'Assignment closing unavailable'; end if;
 update public.class_assignments set state='closed',version=version+1 where id=a.id;
 select edition_id into v_edition from public.sections where id=a.section_id;
 insert into public.learning_events(edition_id,actor_id,resource_id,action,reason) values(v_edition,auth.uid(),a.id,'assignment.closed',trim(p_reason));
end; $$;

create function public.submit_class_work(p_id uuid,p_assignment uuid,p_version integer,p_text text,p_url text) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.class_assignments; previous public.work_submissions; v_attempt integer; v_late boolean; v_edition uuid; has_text boolean; has_link boolean; received_at timestamptz;
begin
 select * into a from public.class_assignments where id=p_assignment for share;
 if not found or not private.learning_student(a.section_id) then raise exception 'Submission unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||a.id::text,4));
 select * into previous from public.work_submissions where id=p_id;
 if found then
  if previous.user_id=auth.uid() and previous.assignment_id=a.id and previous.body_text=p_text and previous.resource_url is not distinct from p_url then return previous.id; end if;
  raise exception 'Submission reference conflict';
 end if;
 received_at:=clock_timestamp();
 if a.state<>'published' or a.version is distinct from p_version or a.opens_at is null or a.opens_at>received_at or a.max_attempts is null or a.max_score_units is null or a.deadline_mode is null or a.submission_mode is distinct from 'individual' or p_text is null or not private.learning_url(p_url) then raise exception 'Submission unavailable'; end if;
 has_text:=length(trim(p_text))>0;has_link:=p_url is not null;
 if (a.response_format='text' and (not has_text or has_link)) or (a.response_format='link' and (not has_link or has_text)) or (a.response_format='text_and_link' and (not has_text or not has_link)) or (a.response_format='text_or_link' and not has_text and not has_link) or a.response_format is null then raise exception 'Response format mismatch'; end if;
 v_late:=a.deadline_mode='at' and received_at>=a.due_at;
 if v_late and a.late_mode<>'accept_flagged' then raise exception 'Submission deadline passed'; end if;
 select coalesce(max(attempt),0)+1 into v_attempt from public.work_submissions where assignment_id=a.id and user_id=auth.uid();
 if v_attempt>a.max_attempts then raise exception 'Submission version limit reached'; end if;
 insert into public.work_submissions(id,assignment_id,user_id,attempt,body_text,resource_url,submitted_at,is_late,assignment_snapshot) values(p_id,a.id,auth.uid(),v_attempt,p_text,p_url,received_at,v_late,to_jsonb(a));
 select edition_id into v_edition from public.sections where id=a.section_id;
 insert into public.learning_events(edition_id,actor_id,resource_id,action,reason,after_data) values(v_edition,auth.uid(),p_id,'work.submitted','Submitted individual assignment work',jsonb_build_object('assignment',a.id,'attempt',v_attempt,'is_late',v_late));
 return p_id;
end; $$;

create function public.grade_class_work(p_submission uuid,p_version integer,p_score integer,p_feedback text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare s public.work_submissions;a public.class_assignments;g public.work_grades;v_edition uuid;
begin
 select * into s from public.work_submissions where id=p_submission;
 select * into a from public.class_assignments where id=s.assignment_id for share;
 if s.id is null or a.id is null or a.state not in ('published','closed') or a.max_score_units is null or not private.learning_write(a.section_id,'grade_work') or s.user_id=auth.uid() or p_score is null or p_score<0 or p_score>a.max_score_units or p_feedback is null or length(p_feedback)>6000 or coalesce(length(trim(p_reason)),0) not between 1 and 1000 then raise exception 'Grading unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(s.user_id::text||a.id::text,4));
 if s.attempt<>(select max(attempt) from public.work_submissions where assignment_id=a.id and user_id=s.user_id) then raise exception 'Grade the latest submitted version'; end if;
 select * into g from public.work_grades where submission_id=s.id for update;
 if coalesce(g.version,0) is distinct from p_version then raise exception 'Stale grade'; end if;
 insert into public.work_grades(submission_id,score_units,feedback) values(s.id,p_score,p_feedback)
 on conflict(submission_id) do update set score_units=p_score,feedback=p_feedback,version=public.work_grades.version+1,draft_revision=public.work_grades.draft_revision+1;
 select edition_id into v_edition from public.sections where id=a.section_id;
 insert into public.learning_events(edition_id,actor_id,resource_id,action,reason,before_data,after_data) values(v_edition,auth.uid(),s.id,'grade.drafted',trim(p_reason),jsonb_build_object('score_units',g.score_units,'version',g.version),jsonb_build_object('score_units',p_score));
end; $$;
create function public.release_class_grade(p_submission uuid,p_version integer,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare s public.work_submissions;a public.class_assignments;g public.work_grades;v_edition uuid;
begin
 select * into s from public.work_submissions where id=p_submission;
 select * into a from public.class_assignments where id=s.assignment_id for share;
 if s.id is null or a.id is null or a.state not in ('published','closed') or a.max_score_units is null or not private.learning_write(a.section_id,'grade_work') or s.user_id=auth.uid() or coalesce(length(trim(p_reason)),0) not between 1 and 1000 then raise exception 'Grade release unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(s.user_id::text||a.id::text,4));
 if s.attempt<>(select max(attempt) from public.work_submissions where assignment_id=a.id and user_id=s.user_id) then raise exception 'Release only the latest submitted version'; end if;
 select * into g from public.work_grades where submission_id=s.id for update;
 if not found or g.version is distinct from p_version then raise exception 'Stale grade'; end if;
 update public.work_grades set published_score_units=score_units,published_feedback=feedback,published_revision=draft_revision,version=version+1 where submission_id=s.id;
 select edition_id into v_edition from public.sections where id=a.section_id;
 insert into public.learning_events(edition_id,actor_id,resource_id,action,reason,before_data,after_data) values(v_edition,auth.uid(),s.id,'grade.released',trim(p_reason),jsonb_build_object('score_units',g.published_score_units,'revision',g.published_revision),jsonb_build_object('score_units',g.score_units,'revision',g.draft_revision));
end; $$;
create function public.learning_work(p_assignment uuid,p_offset integer default 0)
returns table(id uuid,user_id uuid,display_name text,body_text text,resource_url text,attempt integer,submitted_at timestamptz,is_late boolean,score_units integer,feedback text,grade_version integer,has_unpublished_changes boolean,grade_is_published boolean,is_latest boolean)
language sql stable security definer set search_path='' as $$
 select s.id,s.user_id,case when s.user_id=auth.uid() then 'Your work' else coalesce((select x.full_name from public.applications x where x.activated_user_id=s.user_id and x.edition_id=c.edition_id order by x.created_at desc limit 1),'Participant '||left(s.user_id::text,8)) end,
 s.body_text,s.resource_url,s.attempt,s.submitted_at,s.is_late,
 case when private.learning_write(a.section_id,'grade_work') and s.user_id<>auth.uid() then g.score_units else g.published_score_units end,
 case when private.learning_write(a.section_id,'grade_work') and s.user_id<>auth.uid() then g.feedback else g.published_feedback end,
 case when private.learning_write(a.section_id,'grade_work') and s.user_id<>auth.uid() then coalesce(g.version,0) else coalesce(g.published_revision,0) end,
 case when private.learning_write(a.section_id,'grade_work') and s.user_id<>auth.uid() then g.draft_revision is distinct from g.published_revision else false end,g.published_revision is not null,
 s.attempt=(select max(w.attempt) from public.work_submissions w where w.assignment_id=s.assignment_id and w.user_id=s.user_id)
 from public.work_submissions s join public.class_assignments a on a.id=s.assignment_id join public.sections c on c.id=a.section_id left join public.work_grades g on g.submission_id=s.id
 where a.id=p_assignment and private.learning_reader(a.section_id) and ((s.user_id=auth.uid() and a.state in ('published','closed')) or private.learning_write(a.section_id,'grade_work')) order by s.user_id,s.attempt desc,s.id limit 50 offset least(greatest(coalesce(p_offset,0),0),10000);
$$;

revoke all on function public.learning_classes(uuid),public.learning_lessons(uuid),public.learning_assignments(uuid),public.save_class_lesson(uuid,uuid,integer,text,text,text),public.publish_class_lesson(uuid,integer),public.save_class_assignment(uuid,uuid,integer,jsonb),public.publish_class_assignment(uuid,integer),public.close_class_assignment(uuid,integer,text),public.submit_class_work(uuid,uuid,integer,text,text),public.grade_class_work(uuid,integer,integer,text,text),public.release_class_grade(uuid,integer,text),public.learning_work(uuid,integer) from public;
grant execute on function public.learning_classes(uuid),public.learning_lessons(uuid),public.learning_assignments(uuid),public.save_class_lesson(uuid,uuid,integer,text,text,text),public.publish_class_lesson(uuid,integer),public.save_class_assignment(uuid,uuid,integer,jsonb),public.publish_class_assignment(uuid,integer),public.close_class_assignment(uuid,integer,text),public.submit_class_work(uuid,uuid,integer,text,text),public.grade_class_work(uuid,integer,integer,text,text),public.release_class_grade(uuid,integer,text),public.learning_work(uuid,integer) to authenticated;

-- A verified QR may expire while the write waits for a row lock. Check wall time
-- again under the lock, using the expiry derived by the Worker, not a client field.
revoke all on function public.record_session_checkin(uuid,uuid,uuid) from service_role;
create function public.record_session_checkin(p_session uuid,p_actor uuid,p_generation uuid,p_expires_at timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare t public.teaching_sessions;a public.session_attendance;v_edition uuid;received_at timestamptz;
begin
 select * into t from public.teaching_sessions where id=p_session for update;
 received_at:=clock_timestamp();
 select edition_id into v_edition from public.sections where id=t.section_id;
 if t.id is null or p_expires_at is null or received_at>=p_expires_at or p_expires_at>received_at+interval '12 seconds' or t.status<>'open' or t.generation is distinct from p_generation or received_at<t.starts_at or received_at>=t.starts_at+interval '15 minutes' or received_at>=t.ends_at or not exists(select 1 from public.edition_members where edition_id=v_edition and user_id=p_actor and role='trainee' and active) then raise exception 'Check-in unavailable'; end if;
 select * into a from public.session_attendance where session_id=t.id and user_id=p_actor for update;
 if not found then raise exception 'Check-in unavailable'; end if;
 if a.status='present' then return; end if;
 update public.session_attendance set status='present',checked_in_at=received_at,late=received_at>t.starts_at,version=version+1 where session_id=t.id and user_id=p_actor;
 update public.session_leave_requests set status='superseded',version=version+1 where session_id=t.id and user_id=p_actor and status in ('pending','approved');
 insert into public.attendance_events(edition_id,actor_id,resource_id,action,reason,before_data,after_data) values(v_edition,p_actor,t.id,'attendance.checkin','Verified current rotating code at database write',jsonb_build_object('status',a.status,'user_id',p_actor),jsonb_build_object('status','present','user_id',p_actor));
end; $$;
revoke all on function public.record_session_checkin(uuid,uuid,uuid,timestamptz) from public;
grant execute on function public.record_session_checkin(uuid,uuid,uuid,timestamptz) to service_role;
commit;
