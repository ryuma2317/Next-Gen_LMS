begin;
alter table public.edition_capabilities drop constraint edition_capabilities_capability_check;
alter table public.edition_capabilities add constraint edition_capabilities_capability_check check(capability in ('review_admissions','manage_recruitment','manage_selection','review_attendance','manage_schedule'));

create table public.section_trainers (
 section_id uuid not null references public.sections(id),user_id uuid not null references auth.users(id),primary key(section_id,user_id)
);
create table public.attendance_policies (
 edition_id uuid primary key references public.editions(id),version integer not null default 1,
 failure_units integer not null default 12,warning_one integer not null default 4,warning_two integer not null default 8,
 published boolean not null default false,frozen boolean not null default false,
 check(warning_one>0 and warning_two>warning_one and failure_units>warning_two and failure_units<=200)
);
create table public.teaching_sessions (
 id uuid primary key default gen_random_uuid(),section_id uuid not null references public.sections(id),
 title text not null check(length(trim(title)) between 1 and 160),kind text not null check(kind in ('theory','lab')),
 starts_at timestamptz not null,ends_at timestamptz not null,check(ends_at>starts_at and ends_at<=starts_at+interval '8 hours'),
 absence_units integer not null default 2 check(absence_units between 2 and 48 and absence_units%2=0),
 status text not null default 'scheduled' check(status in ('scheduled','open','finalized','cancelled')),
 generation uuid not null default gen_random_uuid(),version integer not null default 1
);
create index on public.teaching_sessions(section_id,starts_at);
create table public.session_attendance (
 session_id uuid not null references public.teaching_sessions(id),user_id uuid not null references auth.users(id),
 status text not null default 'unverified' check(status in ('unverified','present','absent','approved_leave','pending_review')),
 checked_in_at timestamptz,late boolean not null default false,version integer not null default 1,
 primary key(session_id,user_id)
);
create table public.session_leave_requests (
 id uuid primary key default gen_random_uuid(),session_id uuid not null references public.teaching_sessions(id),user_id uuid not null references auth.users(id),
 note text not null check(length(trim(note)) between 1 and 240),
 status text not null default 'pending' check(status in ('pending','approved','rejected','superseded')),version integer not null default 1,
 created_at timestamptz not null default now(),unique(session_id,user_id)
);
create table public.attendance_events (
 id uuid primary key default gen_random_uuid(),edition_id uuid not null references public.editions(id),actor_id uuid not null references auth.users(id),
 resource_id uuid not null,action text not null,reason text not null check(length(reason) between 1 and 1000),
 before_data jsonb,after_data jsonb,created_at timestamptz not null default now()
);
create function private.is_section_trainer(p_section uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.section_trainers t join public.sections s on s.id=t.section_id join public.offerings o on o.id=s.offering_id join public.edition_members m on m.edition_id=s.edition_id and m.user_id=t.user_id and m.role='trainer' and m.active and m.department=o.department where t.section_id=p_section and t.user_id=auth.uid());
$$;
create function private.can_view_session(p_session uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.teaching_sessions t join public.sections s on s.id=t.section_id where t.id=p_session and private.is_member(s.edition_id) and
 (private.is_section_trainer(s.id) or private.can_operate(s.edition_id,'review_attendance') or private.can_operate(s.edition_id,'manage_schedule') or
 exists(select 1 from public.session_attendance a where a.session_id=t.id and a.user_id=auth.uid()) or
 exists(select 1 from public.enrollments e where e.section_id=t.section_id and e.user_id=auth.uid() and e.created_at<=t.starts_at)));
$$;
revoke all on function private.is_section_trainer(uuid),private.can_view_session(uuid) from public;
grant execute on function private.is_section_trainer(uuid),private.can_view_session(uuid) to authenticated;
alter table public.section_trainers enable row level security;
alter table public.attendance_policies enable row level security;
alter table public.teaching_sessions enable row level security;
alter table public.session_attendance enable row level security;
alter table public.session_leave_requests enable row level security;
alter table public.attendance_events enable row level security;
revoke all on public.section_trainers,public.attendance_policies,public.teaching_sessions,public.session_attendance,public.session_leave_requests,public.attendance_events from anon,authenticated;
grant select on public.attendance_policies,public.session_leave_requests to authenticated;
create policy policy_read on public.attendance_policies for select to authenticated using(private.is_member(edition_id));
create policy leave_read on public.session_leave_requests for select to authenticated using(
 exists(select 1 from public.teaching_sessions t join public.sections s on s.id=t.section_id where t.id=session_id and private.is_member(s.edition_id) and (user_id=auth.uid() or private.can_operate(s.edition_id,'review_attendance'))));
-- No direct browser writes or roster reads. Audits/reasons remain restricted to approved reviewers.

create function public.configure_attendance_policy(p_edition uuid,p_failure integer,p_warning_one integer,p_warning_two integer,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare old_policy public.attendance_policies;
begin
 if not private.can_operate(p_edition,'manage_schedule') or coalesce(length(trim(p_reason)),0) not between 1 and 1000 then raise exception 'Policy unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_edition::text,3));
 select * into old_policy from public.attendance_policies where edition_id=p_edition for update;
 if old_policy.frozen then raise exception 'Policy is frozen'; end if;
 insert into public.attendance_policies(edition_id,failure_units,warning_one,warning_two,published) values(p_edition,p_failure,p_warning_one,p_warning_two,true)
 on conflict(edition_id) do update set failure_units=p_failure,warning_one=p_warning_one,warning_two=p_warning_two,published=true,version=public.attendance_policies.version+1;
 insert into public.attendance_events(edition_id,actor_id,resource_id,action,reason,before_data,after_data) values(p_edition,auth.uid(),p_edition,'policy.configured',p_reason,to_jsonb(old_policy),jsonb_build_object('failure_units',p_failure,'warning_one',p_warning_one,'warning_two',p_warning_two));
end; $$;

create function public.create_teaching_session(p_section uuid,p_title text,p_kind text,p_starts timestamptz,p_ends timestamptz,p_units integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_edition uuid; v_id uuid;
begin
 select edition_id into v_edition from public.sections where id=p_section;
 if not private.can_operate(v_edition,'manage_schedule') then raise exception 'Scheduling unavailable'; end if;
 insert into public.teaching_sessions(section_id,title,kind,starts_at,ends_at,absence_units) values(p_section,p_title,p_kind,p_starts,p_ends,p_units) returning id into v_id;
 insert into public.attendance_events(edition_id,actor_id,resource_id,action,reason,after_data) values(v_edition,auth.uid(),v_id,'session.created','Scheduled teaching session',jsonb_build_object('section',p_section,'starts_at',p_starts,'kind',p_kind,'absence_units',p_units));
 return v_id;
end; $$;

create function public.attendance_catalog(p_edition uuid)
returns table(id uuid,section_id uuid,title text,kind text,starts_at timestamptz,ends_at timestamptz,status text,absence_units integer,version integer,is_trainer boolean,attendance_status text,record_version integer)
language sql stable security definer set search_path='' as $$
 select t.id,t.section_id,t.title,t.kind,t.starts_at,t.ends_at,t.status,t.absence_units,t.version,private.is_section_trainer(t.section_id),a.status,a.version
 from public.teaching_sessions t join public.sections s on s.id=t.section_id left join public.session_attendance a on a.session_id=t.id and a.user_id=auth.uid()
 where s.edition_id=p_edition and private.can_view_session(t.id) order by t.starts_at,t.id;
$$;

create function public.start_teaching_session(p_session uuid,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare t public.teaching_sessions; v_edition uuid;
begin
 -- Consistent order: edition-policy advisory lock, session row, attendance/leave rows.
 select s.edition_id into v_edition from public.teaching_sessions x join public.sections s on s.id=x.section_id where x.id=p_session;
 perform pg_advisory_xact_lock(hashtextextended(v_edition::text,3));
 select * into t from public.teaching_sessions where id=p_session for update;
 if not found or not private.is_section_trainer(t.section_id) then raise exception 'Session unavailable'; end if;
 if t.status='open' then return; end if;
 if t.version is distinct from p_version or t.status<>'scheduled' or now()<t.starts_at-interval '15 minutes' or now()>=t.ends_at then raise exception 'Session unavailable'; end if;
 perform 1 from public.attendance_policies where edition_id=v_edition and published for update;
 if not found then raise exception 'Publish attendance policy first'; end if;
 insert into public.session_attendance(session_id,user_id,status)
 select t.id,e.user_id,case when l.status='approved' then 'approved_leave' when l.status='pending' then 'pending_review' else 'unverified' end
 from public.enrollments e join public.edition_members m on m.user_id=e.user_id and m.edition_id=e.edition_id and m.role='trainee' and m.active
 left join public.session_leave_requests l on l.session_id=t.id and l.user_id=e.user_id where e.section_id=t.section_id and e.created_at<=t.starts_at
 on conflict(session_id,user_id) do nothing;
 if not exists(select 1 from public.session_attendance where session_id=t.id) then raise exception 'No enrolled trainees to start'; end if;
 update public.attendance_policies set frozen=true where edition_id=v_edition;
 update public.teaching_sessions set status='open',generation=gen_random_uuid(),version=version+1 where id=t.id;
 insert into public.attendance_events(edition_id,actor_id,resource_id,action,reason,before_data,after_data) values(v_edition,auth.uid(),t.id,'session.started','Trainer opened session',jsonb_build_object('status',t.status),jsonb_build_object('status','open'));
end; $$;

create function public.attendance_display_context(p_session uuid)
returns table(generation uuid,starts_at timestamptz,ends_at timestamptz,status text)
language sql stable security definer set search_path='' as $$
 select t.generation,t.starts_at,t.ends_at,t.status from public.teaching_sessions t where t.id=p_session and private.is_section_trainer(t.section_id);
$$;
create function public.attendance_checkin_context(p_session uuid)
returns table(generation uuid,starts_at timestamptz,status text)
language sql stable security definer set search_path='' as $$
 select t.generation,t.starts_at,t.status from public.teaching_sessions t join public.session_attendance a on a.session_id=t.id and a.user_id=auth.uid()
 join public.sections s on s.id=t.section_id join public.edition_members m on m.edition_id=s.edition_id and m.user_id=auth.uid() and m.role='trainee' and m.active where t.id=p_session;
$$;

-- Only Worker service context can invoke this after verifying the rotating code.
create function public.record_session_checkin(p_session uuid,p_actor uuid,p_generation uuid) returns void
language plpgsql security definer set search_path='' as $$
declare t public.teaching_sessions; a public.session_attendance; v_edition uuid;
begin
 select * into t from public.teaching_sessions where id=p_session for update;
 select edition_id into v_edition from public.sections where id=t.section_id;
 if t.id is null or t.status<>'open' or t.generation is distinct from p_generation or now()<t.starts_at or now()>=t.starts_at+interval '15 minutes' or now()>=t.ends_at or not exists(select 1 from public.edition_members where edition_id=v_edition and user_id=p_actor and role='trainee' and active) then raise exception 'Check-in unavailable'; end if;
 select * into a from public.session_attendance where session_id=t.id and user_id=p_actor for update;
 if not found then raise exception 'Check-in unavailable'; end if;
 if a.status='present' then return; end if;
 update public.session_attendance set status='present',checked_in_at=now(),late=now()>t.starts_at,version=version+1 where session_id=t.id and user_id=p_actor;
 update public.session_leave_requests set status='superseded',version=version+1 where session_id=t.id and user_id=p_actor and status in ('pending','approved');
 insert into public.attendance_events(edition_id,actor_id,resource_id,action,reason,before_data,after_data) values(v_edition,p_actor,t.id,'attendance.checkin','Verified rotating session code',jsonb_build_object('status',a.status,'user_id',p_actor),jsonb_build_object('status','present','user_id',p_actor));
end; $$;

create function public.finalize_teaching_session(p_session uuid,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare t public.teaching_sessions; v_edition uuid;
begin
 select * into t from public.teaching_sessions where id=p_session for update;
 if not found or not private.is_section_trainer(t.section_id) then raise exception 'Finalization unavailable'; end if;
 if t.status='finalized' then return; end if;
 if t.status<>'open' or t.version is distinct from p_version or now()<t.ends_at then raise exception 'Finalization unavailable'; end if;
 select edition_id into v_edition from public.sections where id=t.section_id;
 update public.session_attendance a set status=case when exists(select 1 from public.session_leave_requests l where l.session_id=t.id and l.user_id=a.user_id and l.status='pending') then 'pending_review' else 'absent' end,version=version+1 where session_id=t.id and status='unverified';
 update public.teaching_sessions set status='finalized',generation=gen_random_uuid(),version=version+1 where id=t.id;
 insert into public.attendance_events(edition_id,actor_id,resource_id,action,reason) values(v_edition,auth.uid(),t.id,'session.finalized','Trainer finalized delivered session');
end; $$;

create function public.request_session_leave(p_session uuid,p_note text) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.teaching_sessions; v_edition uuid; l public.session_leave_requests; v_id uuid;
begin
 select * into t from public.teaching_sessions where id=p_session for update;
 select edition_id into v_edition from public.sections where id=t.section_id;
 if t.id is null or t.status='cancelled' or not private.can_view_session(t.id) or not (exists(select 1 from public.session_attendance a where a.session_id=t.id and a.user_id=auth.uid()) or exists(select 1 from public.enrollments e where e.section_id=t.section_id and e.user_id=auth.uid() and e.created_at<=t.starts_at)) or coalesce(length(trim(p_note)),0) not between 1 and 240 or not exists(select 1 from public.edition_members where edition_id=v_edition and user_id=auth.uid() and role='trainee' and active) then raise exception 'Leave request unavailable'; end if;
 if exists(select 1 from public.session_attendance where session_id=t.id and user_id=auth.uid() and status='present') then raise exception 'Already marked present'; end if;
 select * into l from public.session_leave_requests where session_id=t.id and user_id=auth.uid();
 if found then
  if l.note=trim(p_note) then return l.id; end if;
  raise exception 'Contact organizer to revise an existing request';
 end if;
 insert into public.session_leave_requests(session_id,user_id,note) values(t.id,auth.uid(),trim(p_note)) returning id into v_id;
 update public.session_attendance set status='pending_review',version=version+1 where session_id=t.id and user_id=auth.uid();
 insert into public.attendance_events(edition_id,actor_id,resource_id,action,reason) values(v_edition,auth.uid(),v_id,'leave.requested','Participant requested leave');
 return v_id;
end; $$;

create function public.review_session_leave(p_request uuid,p_version integer,p_approved boolean,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare t public.teaching_sessions; l public.session_leave_requests; v_session uuid; v_edition uuid;
begin
 select session_id into v_session from public.session_leave_requests where id=p_request;
 select * into t from public.teaching_sessions where id=v_session for update;
 select * into l from public.session_leave_requests where id=p_request for update;
 select edition_id into v_edition from public.sections where id=t.section_id;
 if l.id is null or t.status='cancelled' or not private.can_operate(v_edition,'review_attendance') or p_approved is null or l.user_id=auth.uid() or l.status<>'pending' or l.version is distinct from p_version or coalesce(length(trim(p_reason)),0) not between 1 and 1000 then raise exception 'Leave review unavailable'; end if;
 update public.session_leave_requests set status=case when p_approved then 'approved' else 'rejected' end,version=version+1 where id=l.id;
 update public.session_attendance set status=case when p_approved then 'approved_leave' when t.status='finalized' then 'absent' else 'unverified' end,version=version+1 where session_id=t.id and user_id=l.user_id;
 insert into public.attendance_events(edition_id,actor_id,resource_id,action,reason,before_data,after_data) values(v_edition,auth.uid(),l.id,'leave.reviewed',trim(p_reason),jsonb_build_object('status',l.status,'user_id',l.user_id),jsonb_build_object('approved',p_approved,'user_id',l.user_id));
end; $$;

create function public.correct_session_attendance(p_session uuid,p_user uuid,p_version integer,p_status text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare t public.teaching_sessions; a public.session_attendance; v_edition uuid;
begin
 select * into t from public.teaching_sessions where id=p_session for update;
 select edition_id into v_edition from public.sections where id=t.section_id;
 if t.id is null or t.status not in ('open','finalized') or p_user=auth.uid() or not (private.is_section_trainer(t.section_id) or private.can_operate(v_edition,'review_attendance')) or p_status not in ('present','absent','pending_review') or coalesce(length(trim(p_reason)),0) not between 1 and 1000 then raise exception 'Correction unavailable'; end if;
 select * into a from public.session_attendance where session_id=t.id and user_id=p_user for update;
 if not found or a.version is distinct from p_version then raise exception 'Correction unavailable'; end if;
 if p_status<>'present' and exists(select 1 from public.session_leave_requests where session_id=t.id and user_id=p_user and status in ('pending','approved')) then raise exception 'Resolve leave request before correction'; end if;
 update public.session_attendance set status=p_status,late=case when p_status='present' and a.status='present' then a.late else false end,version=version+1 where session_id=t.id and user_id=p_user;
 if p_status='present' then update public.session_leave_requests set status='superseded',version=version+1 where session_id=t.id and user_id=p_user and status in ('pending','approved'); end if;
 insert into public.attendance_events(edition_id,actor_id,resource_id,action,reason,before_data,after_data) values(v_edition,auth.uid(),t.id,'attendance.corrected',trim(p_reason),jsonb_build_object('status',a.status,'user_id',p_user,'version',a.version),jsonb_build_object('status',p_status,'user_id',p_user,'version',a.version+1));
end; $$;

create function public.cancel_teaching_session(p_session uuid,p_version integer,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare t public.teaching_sessions; v_edition uuid;
begin
 select * into t from public.teaching_sessions where id=p_session for update;
 select edition_id into v_edition from public.sections where id=t.section_id;
 if t.id is null or not private.can_operate(v_edition,'manage_schedule') or t.status not in ('scheduled','open') or t.version is distinct from p_version or coalesce(length(trim(p_reason)),0) not between 1 and 1000 then raise exception 'Cancellation unavailable'; end if;
 update public.teaching_sessions set status='cancelled',generation=gen_random_uuid(),version=version+1 where id=t.id;
 update public.session_leave_requests set status='superseded',version=version+1 where session_id=t.id and status='pending';
 insert into public.attendance_events(edition_id,actor_id,resource_id,action,reason) values(v_edition,auth.uid(),t.id,'session.cancelled',trim(p_reason));
end; $$;

create function public.attendance_roster(p_session uuid)
returns table(user_id uuid,display_name text,status text,late boolean,version integer,pending_leave boolean)
language sql stable security definer set search_path='' as $$
 select a.user_id,coalesce((select x.full_name from public.applications x where x.activated_user_id=a.user_id and x.edition_id=s.edition_id order by x.created_at desc limit 1),'Participant '||left(a.user_id::text,8)),a.status,a.late,a.version,
 exists(select 1 from public.session_leave_requests l where l.session_id=a.session_id and l.user_id=a.user_id and l.status='pending')
 from public.session_attendance a join public.teaching_sessions t on t.id=a.session_id join public.sections s on s.id=t.section_id
 where t.id=p_session and (private.is_section_trainer(t.section_id) or private.can_operate(s.edition_id,'review_attendance')) order by a.user_id;
$$;
create function public.my_attendance_summary(p_edition uuid)
returns table(units bigint,pending bigint,failure_units integer,policy_version integer,warning integer)
language sql stable security definer set search_path='' as $$
 with required as (
 select t.*,a.status as record_status from public.teaching_sessions t join public.sections s on s.id=t.section_id
 left join public.session_attendance a on a.session_id=t.id and a.user_id=auth.uid()
 where s.edition_id=p_edition and t.status<>'cancelled' and (a.user_id is not null or exists(select 1 from public.enrollments e where e.section_id=t.section_id and e.user_id=auth.uid() and e.created_at<=t.starts_at))
 ), totals as (
 select coalesce(sum(case when status='finalized' and record_status='absent' then absence_units when status='finalized' and record_status='approved_leave' then absence_units/2 else 0 end),0)::bigint as total_units,
 count(*) filter(where status<>'finalized' or record_status is null or record_status in ('unverified','pending_review')) as pending_count from required
 )
 select x.total_units,x.pending_count,p.failure_units,case when p.published then p.version else null end,
 case when x.total_units>=p.warning_two then 2 when x.total_units>=p.warning_one then 1 else 0 end
 from totals x join public.attendance_policies p on p.edition_id=p_edition where exists(select 1 from public.edition_members m where m.edition_id=p_edition and m.user_id=auth.uid() and m.role='trainee' and m.active);
$$;
create function public.attendance_leave_queue(p_edition uuid)
returns table(id uuid,session_id uuid,user_id uuid,title text,starts_at timestamptz,note text,status text,version integer)
language sql stable security definer set search_path='' as $$
 select l.id,l.session_id,l.user_id,t.title,t.starts_at,l.note,l.status,l.version from public.session_leave_requests l join public.teaching_sessions t on t.id=l.session_id join public.sections s on s.id=t.section_id
 where s.edition_id=p_edition and private.is_member(p_edition) and (l.user_id=auth.uid() or private.can_operate(p_edition,'review_attendance')) order by l.created_at desc limit 300;
$$;

revoke all on function public.configure_attendance_policy(uuid,integer,integer,integer,text),public.create_teaching_session(uuid,text,text,timestamptz,timestamptz,integer),public.attendance_catalog(uuid),public.start_teaching_session(uuid,integer),public.attendance_display_context(uuid),public.attendance_checkin_context(uuid),public.record_session_checkin(uuid,uuid,uuid),public.finalize_teaching_session(uuid,integer),public.request_session_leave(uuid,text),public.review_session_leave(uuid,integer,boolean,text),public.correct_session_attendance(uuid,uuid,integer,text,text),public.cancel_teaching_session(uuid,integer,text),public.attendance_roster(uuid),public.my_attendance_summary(uuid),public.attendance_leave_queue(uuid) from public;
grant execute on function public.configure_attendance_policy(uuid,integer,integer,integer,text),public.create_teaching_session(uuid,text,text,timestamptz,timestamptz,integer),public.attendance_catalog(uuid),public.start_teaching_session(uuid,integer),public.attendance_display_context(uuid),public.attendance_checkin_context(uuid),public.finalize_teaching_session(uuid,integer),public.request_session_leave(uuid,text),public.review_session_leave(uuid,integer,boolean,text),public.correct_session_attendance(uuid,uuid,integer,text,text),public.cancel_teaching_session(uuid,integer,text),public.attendance_roster(uuid),public.my_attendance_summary(uuid),public.attendance_leave_queue(uuid) to authenticated;
grant execute on function public.record_session_checkin(uuid,uuid,uuid) to service_role;

-- Also harden the prior review RPC against a direct caller supplying a NULL revision.
-- API input validation alone cannot protect a separately exposed PostgREST RPC.
create or replace function public.review_application(p_id uuid,p_version integer,p_state text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare a public.applications;
begin
 select * into a from public.applications where id=p_id for update;
 if not found or not private.can_operate(a.edition_id,'review_admissions') then raise exception 'Review unavailable'; end if;
 if a.version is distinct from p_version or coalesce(length(trim(p_reason)),0) not between 1 and 1000 or p_state is null or not ((a.status='submitted' and p_state='under_review') or (a.status='under_review' and p_state in ('passed','failed'))) then raise exception 'Review unavailable'; end if;
 update public.applications set status=p_state,version=version+1 where id=p_id;
 insert into public.application_reviews(application_id,actor_id,from_state,to_state,reason) values(p_id,auth.uid(),a.status,p_state,trim(p_reason));
 insert into public.audit_events(actor_id,edition_id,action,resource_id) values(auth.uid(),a.edition_id,'application.'||p_state,p_id);
 if p_state='passed' then insert into private.invitation_jobs(application_id) values(p_id) on conflict do nothing; end if;
end; $$;
commit;
