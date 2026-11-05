-- Apply through Supabase migrations. No production participants or credentials are seeded.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.editions (
  id uuid primary key default gen_random_uuid(), name text not null,
  selection_open boolean not null default false,
  core_limit integer not null default 2 check(core_limit between 0 and 12),
  elective_limit integer not null default 2 check(elective_limit between 0 and 12),
  check(core_limit + elective_limit between 1 and 24),
  created_at timestamptz not null default now()
);
create table public.edition_members (
  edition_id uuid not null references public.editions(id),
  user_id uuid not null references auth.users(id),
  role text not null check(role in ('trainee','trainer','volunteer','organizer','admin','super_admin','mentor','advisor')),
  department text not null check(department in ('CS','DB','TN','EXTERNAL')),
  active boolean not null default false,
  primary key(edition_id,user_id,role)
);
create index on public.edition_members(user_id,edition_id);
create table public.offerings (
  id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.editions(id),
  title text not null, department text not null check(department in ('CS','DB','TN')),
  kind text not null check(kind in ('core','elective')), unique(id,edition_id)
);
create table public.sections (
  id uuid primary key default gen_random_uuid(), edition_id uuid not null,
  offering_id uuid not null, capacity integer not null check(capacity between 1 and 500),
  day text not null, room text not null, trainer text not null,
  foreign key(offering_id,edition_id) references public.offerings(id,edition_id),
  unique(id,edition_id,offering_id)
);
create table public.enrollments (
  edition_id uuid not null, offering_id uuid not null, section_id uuid not null,
  user_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
  primary key(edition_id,user_id,offering_id),
  foreign key(section_id,edition_id,offering_id) references public.sections(id,edition_id,offering_id)
);
create index on public.enrollments(section_id);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id),
  edition_id uuid not null references public.editions(id), action text not null,
  resource_id uuid not null, created_at timestamptz not null default now()
);
create function private.is_member(p_edition uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.edition_members m where m.edition_id=p_edition and m.user_id=auth.uid() and m.active);
$$;
revoke all on function private.is_member(uuid) from public;
grant execute on function private.is_member(uuid) to authenticated;
alter table public.editions enable row level security;
alter table public.edition_members enable row level security;
alter table public.offerings enable row level security;
alter table public.sections enable row level security;
alter table public.enrollments enable row level security;
alter table public.audit_events enable row level security;
create policy editions_read on public.editions for select to authenticated using(private.is_member(id));
create policy membership_read on public.edition_members for select to authenticated using(user_id=auth.uid());
create policy offerings_read on public.offerings for select to authenticated using(private.is_member(edition_id));
create policy sections_read on public.sections for select to authenticated using(private.is_member(edition_id));
create policy enrollment_read on public.enrollments for select to authenticated using(user_id=auth.uid() and private.is_member(edition_id));
-- No client write or audit-read policies. All initial configuration is trusted operator SQL.
revoke all on public.editions,public.edition_members,public.offerings,public.sections,public.enrollments,public.audit_events from anon,authenticated;
grant select on public.editions,public.edition_members,public.offerings,public.sections,public.enrollments to authenticated;

create function public.class_catalog(p_edition uuid)
returns table(id uuid,offering_id uuid,title text,department text,kind text,capacity integer,enrolled bigint,day text,room text,trainer text)
language sql stable security definer set search_path = '' as $$
 select s.id,o.id,o.title,o.department,o.kind,s.capacity,
 (select count(*) from public.enrollments e where e.section_id=s.id),s.day,s.room,s.trainer
 from public.sections s join public.offerings o on o.id=s.offering_id
 where s.edition_id=p_edition and private.is_member(p_edition)
 order by o.kind,o.title,s.id;
$$;
revoke all on function public.class_catalog(uuid) from public;
grant execute on function public.class_catalog(uuid) to authenticated;

create function public.claim_section(p_section uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
 v_actor uuid := auth.uid(); v_edition uuid; v_section public.sections;
 v_offering public.offerings; v_member public.edition_members; v_open boolean; v_core integer; v_elective integer;
begin
 if v_actor is null then raise exception 'Selection unavailable'; end if;
 select edition_id into v_edition from public.sections where id=p_section;
 if v_edition is null then raise exception 'Selection unavailable'; end if;
 -- Same actor's claims serialize even across different sections; shared seat count uses a row lock.
 perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':' || v_edition::text,0));
 select selection_open,core_limit,elective_limit into v_open,v_core,v_elective from public.editions where id=v_edition for share;
 select * into v_member from public.edition_members where edition_id=v_edition and user_id=v_actor and role='trainee' and active for share;
 if not found then raise exception 'Selection unavailable'; end if;
 select * into v_section from public.sections where id=p_section for update;
 select * into v_offering from public.offerings where id=v_section.offering_id;
 if v_offering.kind='core' and v_offering.department<>v_member.department then raise exception 'Selection unavailable'; end if;
 -- Idempotent retry of an existing claim. It does not reopen or move a closed selection.
 if exists(select 1 from public.enrollments where edition_id=v_edition and user_id=v_actor and section_id=p_section) then return; end if;
 if not v_open then raise exception 'Selection unavailable'; end if;
 if (select count(*) from public.enrollments where edition_id=v_edition and user_id=v_actor)>=v_core+v_elective then raise exception 'Selection unavailable'; end if;
 if (select count(*) from public.enrollments e join public.offerings o on o.id=e.offering_id where e.edition_id=v_edition and e.user_id=v_actor and o.kind=v_offering.kind)>=(case when v_offering.kind='core' then v_core else v_elective end) then raise exception 'Selection unavailable'; end if;
 if exists(select 1 from public.enrollments where edition_id=v_edition and user_id=v_actor and offering_id=v_offering.id) then raise exception 'Selection unavailable'; end if;
 if (select count(*) from public.enrollments where section_id=p_section)>=v_section.capacity then raise exception 'Selection unavailable'; end if;
 insert into public.enrollments(edition_id,offering_id,section_id,user_id) values(v_edition,v_offering.id,p_section,v_actor);
 insert into public.audit_events(actor_id,edition_id,action,resource_id) values(v_actor,v_edition,'section.claimed',p_section);
end;
$$;
revoke all on function public.claim_section(uuid) from public;
grant execute on function public.claim_section(uuid) to authenticated;
commit;
