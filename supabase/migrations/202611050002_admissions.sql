begin;
create table public.edition_capabilities (
 edition_id uuid not null references public.editions(id),user_id uuid not null references auth.users(id),
 capability text not null check(capability in ('review_admissions','manage_recruitment','manage_selection')),
 primary key(edition_id,user_id,capability)
);
alter table public.edition_capabilities enable row level security;
revoke all on public.edition_capabilities from anon,authenticated;
grant select on public.edition_capabilities to authenticated;
create policy own_capabilities on public.edition_capabilities for select to authenticated using(user_id=auth.uid() and private.is_member(edition_id));
create function private.can_operate(p_edition uuid,p_capability text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_member(p_edition) and coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from public.edition_capabilities where edition_id=p_edition and user_id=auth.uid() and capability=p_capability);
$$;
revoke all on function private.can_operate(uuid,text) from public;
grant execute on function private.can_operate(uuid,text) to authenticated;
create function public.admissions_access(p_edition uuid) returns boolean language sql stable set search_path='' as $$ select private.can_operate(p_edition,'review_admissions'); $$;
revoke all on function public.admissions_access(uuid) from public;
grant execute on function public.admissions_access(uuid) to authenticated;

create table public.recruitment_forms (
 id uuid primary key default gen_random_uuid(),edition_id uuid not null references public.editions(id),
 title text not null check(length(title) between 1 and 160),purpose text not null check(purpose in ('trainer','trainee')),
 version integer not null check(version>0),questions jsonb not null default '[]' check(jsonb_typeof(questions)='array' and jsonb_array_length(questions)<=12),
 published boolean not null default false,closes_at timestamptz,created_at timestamptz not null default now(),
 unique(edition_id,purpose,version)
);
create table public.applications (
 id uuid primary key,edition_id uuid not null references public.editions(id),form_id uuid not null references public.recruitment_forms(id),
 form_version integer not null,purpose text not null check(purpose in ('trainer','trainee')),
 full_name text not null check(length(full_name) between 1 and 160),email text not null check(length(email)<=254),
 department text not null check(department in ('CS','DB','TN','EXTERNAL')),specialization text not null check(length(specialization)<=120),
 questions jsonb not null,answers jsonb not null,receipt_hash text not null check(receipt_hash ~ '^[0-9a-f]{64}$'),
 status text not null default 'submitted' check(status in ('submitted','under_review','passed','failed','activated')),
 version integer not null default 1,created_at timestamptz not null default now(),activated_user_id uuid references auth.users(id),
 unique(form_id,email)
);
create index on public.applications(edition_id,status,created_at);
create table public.application_reviews (
 id uuid primary key default gen_random_uuid(),application_id uuid not null references public.applications(id),
 actor_id uuid not null references auth.users(id),from_state text not null,to_state text not null,
 reason text not null check(length(reason) between 1 and 1000),created_at timestamptz not null default now()
);
create table private.invitation_jobs (
 application_id uuid primary key references public.applications(id),status text not null default 'pending' check(status in ('pending','leased','sent','existing_account','failed')),
 attempts integer not null default 0,lease_id uuid,lease_until timestamptz,last_error text,updated_at timestamptz not null default now()
);
alter table public.recruitment_forms enable row level security;
alter table public.applications enable row level security;
alter table public.application_reviews enable row level security;
revoke all on public.recruitment_forms,public.applications,public.application_reviews from anon,authenticated;
grant select on public.recruitment_forms,public.applications,public.application_reviews to authenticated;
create policy forms_staff_read on public.recruitment_forms for select to authenticated using(private.can_operate(edition_id,'manage_recruitment') or private.can_operate(edition_id,'review_admissions'));
create policy applications_staff_read on public.applications for select to authenticated using(private.can_operate(edition_id,'review_admissions'));
create policy reviews_staff_read on public.application_reviews for select to authenticated using(exists(select 1 from public.applications a where a.id=application_id and private.can_operate(a.edition_id,'review_admissions')));

-- Published forms only; applicants cannot list private editions or drafts.
create function public.published_form(p_id uuid) returns setof public.recruitment_forms
language sql stable security definer set search_path='' as $$ select * from public.recruitment_forms where id=p_id and published and (closes_at is null or closes_at>now()); $$;
revoke all on function public.published_form(uuid) from public;
grant execute on function public.published_form(uuid) to anon,authenticated,service_role;

create function public.create_recruitment_form(p_edition uuid,p_title text,p_purpose text,p_questions jsonb,p_published boolean,p_closes_at timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare q jsonb; v_id uuid; v_version integer;
begin
 if not private.can_operate(p_edition,'manage_recruitment') then raise exception 'Form management unavailable'; end if;
 if length(trim(p_title)) not between 1 and 160 or p_purpose not in ('trainer','trainee') or jsonb_typeof(p_questions)<>'array' or jsonb_array_length(p_questions)>12 or (p_closes_at is not null and p_closes_at<=now()) then raise exception 'Invalid form'; end if;
 if (select count(*) from jsonb_array_elements(p_questions))<>(select count(distinct x->>'id') from jsonb_array_elements(p_questions) x) then raise exception 'Duplicate questions'; end if;
 for q in select * from jsonb_array_elements(p_questions) loop
  if jsonb_typeof(q)<>'object' or coalesce(q->>'id','') !~ '^[a-z][a-z0-9_]{0,39}$' or coalesce(length(trim(q->>'label')),0) not between 1 and 160 or coalesce(q->>'type','') not in ('text','textarea','select') or jsonb_typeof(q->'required') is distinct from 'boolean' then raise exception 'Invalid question'; end if;
  if q->>'type'='select' then
   if jsonb_typeof(q->'options') is distinct from 'array' then raise exception 'Invalid options'; end if;
   if jsonb_array_length(q->'options') not between 1 and 20 or exists(select 1 from jsonb_array_elements(q->'options') o where jsonb_typeof(o)<>'string' or length(trim(o#>>'{}')) not between 1 and 120) then raise exception 'Invalid options'; end if;
  elsif q ? 'options' then raise exception 'Invalid options'; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(p_edition::text||p_purpose,2));
 select coalesce(max(version),0)+1 into v_version from public.recruitment_forms where edition_id=p_edition and purpose=p_purpose;
 insert into public.recruitment_forms(edition_id,title,purpose,version,questions,published,closes_at) values(p_edition,trim(p_title),p_purpose,v_version,p_questions,p_published,p_closes_at) returning id into v_id;
 insert into public.audit_events(actor_id,edition_id,action,resource_id) values(auth.uid(),p_edition,'recruitment.version_created',v_id);
 return v_id;
end; $$;
revoke all on function public.create_recruitment_form(uuid,text,text,jsonb,boolean,timestamptz) from public;
grant execute on function public.create_recruitment_form(uuid,text,text,jsonb,boolean,timestamptz) to authenticated;

-- Privileged public-intake bridge. NOT callable with a browser publishable key.
create function public.submit_application(p_form uuid,p_id uuid,p_receipt_hash text,p_name text,p_email text,p_department text,p_specialization text,p_answers jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare f public.recruitment_forms; a public.applications; q jsonb; answer text;
begin
 select * into f from public.recruitment_forms where id=p_form and published and (closes_at is null or closes_at>now()) for share;
 if not found then raise exception 'Application unavailable'; end if;
 if p_receipt_hash !~ '^[0-9a-f]{64}$' or p_email<>lower(trim(p_email)) or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>8192 then raise exception 'Invalid application'; end if;
 if exists(select 1 from jsonb_object_keys(p_answers) k where not exists(select 1 from jsonb_array_elements(f.questions) q where q->>'id'=k)) then raise exception 'Invalid answers'; end if;
 for q in select * from jsonb_array_elements(f.questions) loop
  if p_answers ? (q->>'id') and jsonb_typeof(p_answers->(q->>'id'))<>'string' then raise exception 'Invalid answers'; end if;
  answer:=coalesce(p_answers->>(q->>'id'),'');
  if length(answer)>1000 or (coalesce((q->>'required')::boolean,false) and length(trim(answer))=0) or (q->>'type'='select' and answer<>'' and not (q->'options' @> to_jsonb(array[answer]))) then raise exception 'Invalid answers'; end if;
 end loop;
 -- Retries must carry the same private receipt and exact payload; never return another applicant's receipt.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1));
 select * into a from public.applications where id=p_id;
 if found then
  if a.receipt_hash=p_receipt_hash and a.form_id=p_form and a.full_name=p_name and a.email=p_email and a.department=p_department and a.specialization=p_specialization and a.answers=p_answers then return; end if;
  raise exception 'Application unavailable';
 end if;
 insert into public.applications(id,edition_id,form_id,form_version,purpose,full_name,email,department,specialization,questions,answers,receipt_hash)
 values(p_id,f.edition_id,f.id,f.version,f.purpose,p_name,p_email,p_department,p_specialization,f.questions,p_answers,p_receipt_hash);
end;
$$;
revoke all on function public.submit_application(uuid,uuid,text,text,text,text,text,jsonb) from public;
grant execute on function public.submit_application(uuid,uuid,text,text,text,text,text,jsonb) to service_role;

create function public.application_receipt(p_id uuid,p_receipt_hash text) returns table(status text,purpose text,submitted_at timestamptz)
language sql stable security definer set search_path='' as $$ select a.status,a.purpose,a.created_at from public.applications a where a.id=p_id and a.receipt_hash=p_receipt_hash; $$;
revoke all on function public.application_receipt(uuid,text) from public;
grant execute on function public.application_receipt(uuid,text) to service_role;

create function public.review_application(p_id uuid,p_version integer,p_state text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare a public.applications;
begin
 select * into a from public.applications where id=p_id for update;
 if not found or not private.can_operate(a.edition_id,'review_admissions') then raise exception 'Review unavailable'; end if;
 if a.version<>p_version or length(trim(p_reason)) not between 1 and 1000 or not ((a.status='submitted' and p_state='under_review') or (a.status='under_review' and p_state in ('passed','failed'))) then raise exception 'Review unavailable'; end if;
 update public.applications set status=p_state,version=version+1 where id=p_id;
 insert into public.application_reviews(application_id,actor_id,from_state,to_state,reason) values(p_id,auth.uid(),a.status,p_state,trim(p_reason));
 insert into public.audit_events(actor_id,edition_id,action,resource_id) values(auth.uid(),a.edition_id,'application.'||p_state,p_id);
 if p_state='passed' then insert into private.invitation_jobs(application_id) values(p_id) on conflict do nothing; end if;
end;
$$;
revoke all on function public.review_application(uuid,integer,text,text) from public;
grant execute on function public.review_application(uuid,integer,text,text) to authenticated;

-- Only verified mailbox owners can see/claim passed applications. No client user-ID argument.
create function public.my_eligible_applications() returns table(id uuid,edition_name text,purpose text,status text)
language sql stable security definer set search_path='' as $$
 select a.id,e.name,a.purpose,a.status from public.applications a join public.editions e on e.id=a.edition_id
 join auth.users u on u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email)=a.email
 where a.status in ('passed','activated') and (a.activated_user_id is null or a.activated_user_id=u.id);
$$;
revoke all on function public.my_eligible_applications() from public;
grant execute on function public.my_eligible_applications() to authenticated;
create function public.activate_application(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a public.applications; v_actor uuid:=auth.uid();
begin
 select * into a from public.applications where id=p_id for update;
 if not found or not exists(select 1 from auth.users u where u.id=v_actor and u.email_confirmed_at is not null and lower(u.email)=a.email) then raise exception 'Activation unavailable'; end if;
 if a.status='activated' and a.activated_user_id=v_actor then return; end if;
 if a.status<>'passed' then raise exception 'Activation unavailable'; end if;
 -- Do not silently reactivate a suspended identity or overwrite an existing affiliation.
 if exists(select 1 from public.edition_members where edition_id=a.edition_id and user_id=v_actor and role=a.purpose) then raise exception 'Contact organizer to reconcile membership'; end if;
 insert into public.edition_members(edition_id,user_id,role,department,active) values(a.edition_id,v_actor,a.purpose,a.department,true);
 update public.applications set status='activated',activated_user_id=v_actor,version=version+1 where id=p_id;
 insert into public.audit_events(actor_id,edition_id,action,resource_id) values(v_actor,a.edition_id,'application.activated',p_id);
end;
$$;
revoke all on function public.activate_application(uuid) from public;
grant execute on function public.activate_application(uuid) to authenticated;

-- Service-only outbox lease: bounded batch, retries, no browser access to emails or jobs.
create function public.lease_invitation_jobs() returns table(application_id uuid,email text,lease_id uuid,existing_user boolean)
language sql security definer set search_path='' as $$
 with candidates as (select j.application_id from private.invitation_jobs j join public.applications a on a.id=j.application_id
 where a.status='passed' and j.attempts<3 and (j.status='pending' or (j.status='leased' and j.lease_until<now())) order by j.updated_at limit 10 for update of j skip locked),
 leased as (update private.invitation_jobs j set status='leased',attempts=j.attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now() from candidates c where j.application_id=c.application_id returning j.application_id,j.lease_id)
 select a.id,a.email,l.lease_id,exists(select 1 from auth.users u where lower(u.email)=a.email) from leased l join public.applications a on a.id=l.application_id;
$$;
create function public.finish_invitation_job(p_id uuid,p_lease uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if p_status not in ('sent','existing_account','failed') then raise exception 'Invalid job outcome'; end if;
 update private.invitation_jobs set status=p_status,last_error=case when p_status='failed' then 'Provider request failed; operator review required' else null end,lease_until=null,updated_at=now() where application_id=p_id and lease_id=p_lease and status='leased';
end; $$;
revoke all on function public.lease_invitation_jobs() from public;
revoke all on function public.finish_invitation_job(uuid,uuid,text) from public;
grant execute on function public.lease_invitation_jobs() to service_role;
grant execute on function public.finish_invitation_job(uuid,uuid,text) to service_role;
commit;
