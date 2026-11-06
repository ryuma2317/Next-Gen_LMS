-- Separate project membership, explicit capabilities and immutable work history.
-- No role label receives a grant automatically. Apply after the complete set.
begin;
alter table public.edition_capabilities drop constraint edition_capabilities_capability_check;
alter table public.edition_capabilities add constraint edition_capabilities_capability_check check(capability in ('review_admissions','manage_recruitment','manage_selection','review_attendance','manage_schedule','manage_projects'));
create table public.projects(
 id uuid primary key,edition_id uuid not null references public.editions(id),
 title text not null,theme text not null,columns jsonb not null,limits jsonb not null,
 archived boolean not null default false,version integer not null default 1,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp()
);
create index on public.projects(edition_id,created_at,id);
create table public.project_members(
 project_id uuid not null references public.projects(id),user_id uuid not null references auth.users(id),
 role text not null check(role in ('participant','mentor','advisor')),active boolean not null,
 can_tasks boolean not null,can_comment boolean not null,can_sprints boolean not null,
 version integer not null default 1,primary key(project_id,user_id)
);
create index on public.project_members(user_id,project_id) where active;
create table public.project_sprints(
 id uuid primary key,project_id uuid not null references public.projects(id),
 title text not null,goal text not null,starts_at timestamptz not null,ends_at timestamptz not null check(ends_at>starts_at),
 state text not null default 'planned' check(state in ('planned','active','closed')),version integer not null default 1,
 created_at timestamptz not null default clock_timestamp(),unique(id,project_id)
);
create unique index project_one_active_sprint on public.project_sprints(project_id) where state='active';
create table public.project_tasks(
 id uuid primary key,project_id uuid not null references public.projects(id),title text not null,description text not null,
 column_id text not null,assignee_id uuid,sprint_id uuid,archived boolean not null default false,version integer not null default 1,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 foreign key(project_id,assignee_id) references public.project_members(project_id,user_id),
 foreign key(sprint_id,project_id) references public.project_sprints(id,project_id)
);
create index on public.project_tasks(project_id,created_at,id);
create table public.project_task_changes(
 task_id uuid not null references public.project_tasks(id),version integer not null,
 actor_id uuid not null references auth.users(id),action text not null,snapshot jsonb not null,
 created_at timestamptz not null default clock_timestamp(),primary key(task_id,version)
);
create table public.project_comments(
 id uuid primary key,task_id uuid not null references public.project_tasks(id),author_id uuid not null references auth.users(id),
 body text not null,created_at timestamptz not null default clock_timestamp()
);
create index on public.project_comments(task_id,created_at,id);
create table public.project_events(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),
 actor_id uuid not null references auth.users(id),action text not null,snapshot jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_sprints enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_task_changes enable row level security;
alter table public.project_comments enable row level security;
alter table public.project_events enable row level security;
revoke all on public.projects,public.project_members,public.project_sprints,public.project_tasks,public.project_task_changes,public.project_comments,public.project_events from public,anon,authenticated,service_role;

create function private.project_shape(v jsonb,keys text[]) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(v)='object' and (select coalesce(array_agg(k order by k),'{}'::text[]) from jsonb_object_keys(v) k)=(select array_agg(k order by k) from unnest(keys) k),false);
$$;
create function private.project_text(v text,maximum integer,required boolean default false) returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(v)<=maximum and octet_length(v)<=12000 and v !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]' and (not required or length(trim(v))>0),false);
$$;
create function private.project_access(p_project uuid,p_capability text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(exists(select 1 from public.projects p where p.id=p_project and private.is_member(p.edition_id) and
 (private.can_operate(p.edition_id,'manage_projects') or exists(select 1 from public.project_members m where m.project_id=p.id and m.user_id=auth.uid() and m.active and
 case p_capability when 'read' then true when 'tasks' then m.can_tasks when 'comment' then m.can_comment when 'sprints' then m.can_sprints else false end))),false);
$$;
create function private.project_admin(p_project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select private.can_operate(edition_id,'manage_projects') from public.projects where id=p_project),false);
$$;
create function private.project_name(p_edition uuid,p_user uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select a.full_name from public.applications a where a.edition_id=p_edition and a.activated_user_id=p_user order by a.created_at desc,a.id limit 1),'Participant '||left(p_user::text,8));
$$;
create function public.project_list(p_edition uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('can_manage',private.can_operate(p_edition,'manage_projects'),'projects',
 coalesce((select jsonb_agg(to_jsonb(x)-'created_at' order by x.created_at,x.id) from
 (select p.id,p.title,p.theme,p.archived,p.version,p.created_at from public.projects p where p.edition_id=p_edition and private.project_access(p.id,'read') order by p.created_at,p.id limit 100) x),'[]'));
$$;
create function public.project_board(p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.projects;members jsonb;sprints jsonb;
begin
 select * into p from public.projects where id=p_project;
 if not private.project_access(p_project,'read') then raise exception 'Project unavailable';end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',private.project_name(p.edition_id,m.user_id),'role',m.role,'active',m.active,'version',m.version,'can_tasks',m.can_tasks,'can_comment',m.can_comment,'can_sprints',m.can_sprints) order by m.user_id),'[]') into members from public.project_members m where m.project_id=p.id;
 select coalesce(jsonb_agg(to_jsonb(x)-'created_at' order by x.created_at,x.id),'[]') into sprints from (select s.id,s.title,s.goal,s.starts_at,s.ends_at,s.state,s.version,s.created_at from public.project_sprints s where s.project_id=p.id order by s.created_at,s.id limit 100) x;
 return jsonb_build_object('id',p.id,'title',p.title,'theme',p.theme,'archived',p.archived,'version',p.version,'columns',p.columns,'limits',p.limits,'can_manage',private.project_admin(p.id),'can_tasks',private.project_access(p.id,'tasks') and not p.archived,'can_comment',private.project_access(p.id,'comment') and not p.archived,'can_sprints',private.project_access(p.id,'sprints') and not p.archived,'members',members,'sprints',sprints);
end;$$;
create function private.validate_project(p_fields jsonb) returns void language plpgsql set search_path='' as $$
declare c jsonb;role text;
begin
 if not private.project_shape(p_fields,array['title','theme','columns','limits']) or jsonb_typeof(p_fields->'title') is distinct from 'string' or jsonb_typeof(p_fields->'theme') is distinct from 'string' or not private.project_text(p_fields->>'title',160,true) or not private.project_text(p_fields->>'theme',3000) or jsonb_typeof(p_fields->'columns') is distinct from 'array' or not private.project_shape(p_fields->'limits',array['participant','mentor','advisor']) then raise exception 'Invalid project configuration';end if;
 if jsonb_array_length(p_fields->'columns') not between 2 and 8 then raise exception 'Configure 2 to 8 columns';end if;
 for c in select value from jsonb_array_elements(p_fields->'columns') loop
  if not private.project_shape(c,array['id','title','complete']) or jsonb_typeof(c->'id') is distinct from 'string' or (c->>'id') !~ '^[a-z][a-z0-9_]{0,39}$' or c->>'id' in ('constructor','prototype') or jsonb_typeof(c->'title') is distinct from 'string' or not private.project_text(c->>'title',60,true) or jsonb_typeof(c->'complete') is distinct from 'boolean' then raise exception 'Invalid board column';end if;
 end loop;
 if (select count(*)<>count(distinct c->>'id') from jsonb_array_elements(p_fields->'columns') c) then raise exception 'Duplicate columns';end if;
 foreach role in array array['participant','mentor','advisor'] loop
  if jsonb_typeof(p_fields->'limits'->role) is distinct from 'number' or (p_fields->'limits'->>role) !~ '^[0-9]{1,3}$' or (p_fields->'limits'->>role)::integer>100 or (role='participant' and (p_fields->'limits'->>role)::integer<1) then raise exception 'Explicit capacity required';end if;
 end loop;
end;$$;
create function public.save_project(p_id uuid,p_edition uuid,p_version integer,p_fields jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.projects;v_role text;
begin
 perform 1 from public.editions where id=p_edition for update;
 if p_id is null or p_version is null or p_version<0 or not private.can_operate(p_edition,'manage_projects') then raise exception 'Project management unavailable';end if;
 perform private.validate_project(p_fields);
 p_fields:=jsonb_set(p_fields,'{title}',to_jsonb(trim(p_fields->>'title')));
 select * into p from public.projects where id=p_id for update;
 if found then
  if p.edition_id<>p_edition or p.archived then raise exception 'Project unavailable';end if;
  if p_version=0 and p.version=1 and jsonb_build_object('title',p.title,'theme',p.theme,'columns',p.columns,'limits',p.limits)=p_fields then return p.id;end if;
  if p.version is distinct from p_version then raise exception 'Stale project';end if;
  if exists(select 1 from public.project_tasks t where t.project_id=p.id and not exists(select 1 from jsonb_array_elements(p_fields->'columns') c where c->>'id'=t.column_id)) then raise exception 'A used column cannot be removed';end if;
  foreach v_role in array array['participant','mentor','advisor'] loop
   if (select count(*) from public.project_members m where m.project_id=p.id and m.active and m.role=v_role)>(p_fields->'limits'->>v_role)::integer then raise exception 'Capacity below active membership';end if;
  end loop;
  update public.projects set title=trim(p_fields->>'title'),theme=p_fields->>'theme',columns=p_fields->'columns',limits=p_fields->'limits',version=version+1 where id=p.id;
 else
  if p_version<>0 or (select count(*) from public.projects where edition_id=p_edition)>=100 then raise exception 'New project unavailable';end if;
  insert into public.projects(id,edition_id,title,theme,columns,limits,created_by) values(p_id,p_edition,trim(p_fields->>'title'),p_fields->>'theme',p_fields->'columns',p_fields->'limits',auth.uid());
 end if;
 insert into public.project_events(project_id,actor_id,action,snapshot) values(p_id,auth.uid(),'project.saved',p_fields);
 return p_id;
end;$$;
create function public.save_project_member(p_project uuid,p_user uuid,p_version integer,p_role text,p_active boolean,p_tasks boolean,p_comment boolean,p_sprints boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare p public.projects;m public.project_members;
begin
 select * into p from public.projects where id=p_project for update;
 if not private.project_admin(p_project) or p_user is null or p_version is null or p_version<0 or p_role is null or p_role not in ('participant','mentor','advisor') or p_active is null or p_tasks is null or p_comment is null or p_sprints is null or not private.project_text(p_reason,1000,true) then raise exception 'Member management unavailable';end if;
 if p.archived and (p_active or p_tasks or p_comment or p_sprints) then raise exception 'Archived project is read only';end if;
 if p_active and not exists(select 1 from public.edition_members where edition_id=p.edition_id and user_id=p_user and active) then raise exception 'Active edition membership required';end if;
 select * into m from public.project_members where project_id=p_project and user_id=p_user for update;
 if found then
  if p_version=0 and m.version=1 and row(m.role,m.active,m.can_tasks,m.can_comment,m.can_sprints) is not distinct from row(p_role,p_active,p_tasks,p_comment,p_sprints) then return;end if;
  if m.version is distinct from p_version then raise exception 'Stale membership';end if;
 else
  if p_version<>0 or (select count(*) from public.project_members where project_id=p.id)>=1000 then raise exception 'New membership unavailable';end if;
 end if;
 if p_active and (select count(*) from public.project_members where project_id=p.id and role=p_role and active and user_id<>p_user)>=(p.limits->>p_role)::integer then raise exception 'Project membership capacity reached';end if;
 insert into public.project_members(project_id,user_id,role,active,can_tasks,can_comment,can_sprints) values(p_project,p_user,p_role,p_active,p_tasks,p_comment,p_sprints)
 on conflict(project_id,user_id) do update set role=excluded.role,active=excluded.active,can_tasks=excluded.can_tasks,can_comment=excluded.can_comment,can_sprints=excluded.can_sprints,version=public.project_members.version+1;
 insert into public.project_events(project_id,actor_id,action,snapshot) values(p_project,auth.uid(),'member.saved',jsonb_build_object('user_id',p_user,'role',p_role,'active',p_active,'tasks',p_tasks,'comment',p_comment,'sprints',p_sprints,'reason',p_reason));
end;$$;
create function public.archive_project(p_project uuid,p_version integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare p public.projects;
begin
 select * into p from public.projects where id=p_project for update;
 if not private.project_admin(p_project) or p.version is distinct from p_version or p.archived or not private.project_text(p_reason,1000,true) then raise exception 'Archive unavailable';end if;
 update public.projects set archived=true,version=version+1 where id=p_project;
 insert into public.project_events(project_id,actor_id,action,snapshot) values(p_project,auth.uid(),'project.archived',jsonb_build_object('reason',p_reason));
end;$$;
create function public.save_project_task(p_id uuid,p_project uuid,p_version integer,p_fields jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.projects;t public.project_tasks;assignee uuid;sprint uuid;action text;new_version integer;
begin
 select * into p from public.projects where id=p_project for update;
 if not private.project_access(p_project,'tasks') or p.archived or p_id is null or p_version is null or p_version<0 then raise exception 'Task editing unavailable';end if;
 if not private.project_shape(p_fields,array['title','description','column_id','assignee_id','sprint_id']) or jsonb_typeof(p_fields->'title') is distinct from 'string' or jsonb_typeof(p_fields->'description') is distinct from 'string' or not private.project_text(p_fields->>'title',160,true) or not private.project_text(p_fields->>'description',6000) or not exists(select 1 from jsonb_array_elements(p.columns) c where c->>'id'=p_fields->>'column_id') or jsonb_typeof(p_fields->'column_id') is distinct from 'string' or jsonb_typeof(p_fields->'assignee_id') not in ('string','null') or jsonb_typeof(p_fields->'sprint_id') not in ('string','null') then raise exception 'Invalid task fields';end if;
 assignee:=(p_fields->>'assignee_id')::uuid;sprint:=(p_fields->>'sprint_id')::uuid;
 p_fields:=jsonb_set(p_fields,'{title}',to_jsonb(trim(p_fields->>'title')));
 select * into t from public.project_tasks where id=p_id for update;
 if found then
  if t.project_id<>p_project or t.archived then raise exception 'Task unavailable';end if;
  if p_version=0 and t.version=1 and jsonb_build_object('title',t.title,'description',t.description,'column_id',t.column_id,'assignee_id',t.assignee_id,'sprint_id',t.sprint_id)=p_fields then return t.id;end if;
  if t.version is distinct from p_version then raise exception 'Stale task';end if;
 else
  if p_version<>0 or (select count(*) from public.project_tasks where project_id=p.id)>=10000 then raise exception 'New task unavailable';end if;
 end if;
 if assignee is not null and (t.id is null or assignee is distinct from t.assignee_id) and not exists(select 1 from public.project_members m where m.project_id=p_project and m.user_id=assignee and m.role='participant' and m.active and exists(select 1 from public.edition_members e where e.edition_id=p.edition_id and e.user_id=m.user_id and e.active)) then raise exception 'Assign an active participant of this project';end if;
 if sprint is not null and (t.id is null or sprint is distinct from t.sprint_id) and not exists(select 1 from public.project_sprints s where s.id=sprint and s.project_id=p_project and s.state<>'closed') then raise exception 'Select a permitted open sprint';end if;
 action:=case when t.id is null then 'created' when t.column_id is distinct from p_fields->>'column_id' then 'moved' else 'updated' end;
 insert into public.project_tasks(id,project_id,title,description,column_id,assignee_id,sprint_id) values(p_id,p_project,trim(p_fields->>'title'),p_fields->>'description',p_fields->>'column_id',assignee,sprint)
 on conflict(id) do update set title=excluded.title,description=excluded.description,column_id=excluded.column_id,assignee_id=excluded.assignee_id,sprint_id=excluded.sprint_id,version=public.project_tasks.version+1,updated_at=clock_timestamp()
 returning version into new_version;
 insert into public.project_task_changes(task_id,version,actor_id,action,snapshot) values(p_id,new_version,auth.uid(),action,p_fields);
 return p_id;
end;$$;
create function public.archive_project_task(p_task uuid,p_version integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare project uuid;p public.projects;t public.project_tasks;
begin
 select project_id into project from public.project_tasks where id=p_task;
 select * into p from public.projects where id=project for update;
 select * into t from public.project_tasks where id=p_task for update;
 if not private.project_access(project,'tasks') or p.archived or t.archived or t.version is distinct from p_version or not private.project_text(p_reason,1000,true) then raise exception 'Task archive unavailable';end if;
 update public.project_tasks set archived=true,version=version+1,updated_at=clock_timestamp() where id=p_task;
 insert into public.project_task_changes(task_id,version,actor_id,action,snapshot) values(p_task,t.version+1,auth.uid(),'archived',jsonb_build_object('reason',p_reason,'previous',to_jsonb(t)));
end;$$;
create function public.comment_project_task(p_id uuid,p_task uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
declare project uuid;p public.projects;t public.project_tasks;previous public.project_comments;
begin
 select project_id into project from public.project_tasks where id=p_task;
 select * into p from public.projects where id=project for update;
 select * into t from public.project_tasks where id=p_task;
 if p_id is null or not private.project_access(project,'comment') or p.archived or t.archived or not private.project_text(p_body,3000,true) then raise exception 'Comment unavailable';end if;
 select * into previous from public.project_comments where id=p_id;
 if found then
  if row(previous.task_id,previous.author_id,previous.body) is not distinct from row(p_task,auth.uid(),p_body) then return;end if;
  raise exception 'Comment reference already used';
 end if;
 insert into public.project_comments(id,task_id,author_id,body) values(p_id,p_task,auth.uid(),p_body);
end;$$;
create function public.save_project_sprint(p_id uuid,p_project uuid,p_version integer,p_title text,p_goal text,p_starts timestamptz,p_ends timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.projects;s public.project_sprints;
begin
 select * into p from public.projects where id=p_project for update;
 if not private.project_access(p_project,'sprints') or p.archived or p_id is null or p_version is null or p_version<0 or not private.project_text(p_title,160,true) or not private.project_text(p_goal,3000) or p_starts is null or p_ends is null or not isfinite(p_starts) or not isfinite(p_ends) or p_ends<=p_starts then raise exception 'Sprint planning unavailable';end if;
 p_title:=trim(p_title);
 select * into s from public.project_sprints where id=p_id for update;
 if found then
  if s.project_id<>p_project or s.state<>'planned' then raise exception 'Sprint unavailable';end if;
  if p_version=0 and s.version=1 and row(s.title,s.goal,s.starts_at,s.ends_at) is not distinct from row(p_title,p_goal,p_starts,p_ends) then return s.id;end if;
  if s.version is distinct from p_version then raise exception 'Stale sprint';end if;
 else
  if p_version<>0 or (select count(*) from public.project_sprints where project_id=p.id)>=100 then raise exception 'New sprint unavailable';end if;
 end if;
 insert into public.project_sprints(id,project_id,title,goal,starts_at,ends_at) values(p_id,p_project,trim(p_title),p_goal,p_starts,p_ends)
 on conflict(id) do update set title=excluded.title,goal=excluded.goal,starts_at=excluded.starts_at,ends_at=excluded.ends_at,version=public.project_sprints.version+1;
 insert into public.project_events(project_id,actor_id,action,snapshot) values(p_project,auth.uid(),'sprint.saved',jsonb_build_object('id',p_id,'title',p_title,'goal',p_goal,'starts_at',p_starts,'ends_at',p_ends));
 return p_id;
end;$$;
create function public.transition_project_sprint(p_sprint uuid,p_version integer,p_action text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare project uuid;p public.projects;s public.project_sprints;
begin
 select project_id into project from public.project_sprints where id=p_sprint;
 select * into p from public.projects where id=project for update;
 select * into s from public.project_sprints where id=p_sprint for update;
 if not private.project_access(project,'sprints') or p.archived or s.version is distinct from p_version or not private.project_text(p_reason,1000,true) or p_action is null then raise exception 'Sprint action unavailable';end if;
 if p_action='start' and s.state='planned' and not exists(select 1 from public.project_sprints where project_id=project and state='active') then
  update public.project_sprints set state='active',version=version+1 where id=p_sprint;
 elsif p_action='close' and s.state='active' then
  update public.project_sprints set state='closed',version=version+1 where id=p_sprint;
 else raise exception 'Invalid sprint transition';end if;
 insert into public.project_events(project_id,actor_id,action,snapshot) values(project,auth.uid(),'sprint.'||p_action,jsonb_build_object('id',p_sprint,'reason',p_reason));
end;$$;
create function public.project_tasks_page(p_project uuid,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.project_access(p_project,'read') or p_offset is null or p_offset not between 0 and 10000 then raise exception 'Tasks unavailable';end if;
 return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at,t.id),'[]') from (select id,project_id,title,description,column_id,assignee_id,sprint_id,archived,version,created_at,updated_at from public.project_tasks where project_id=p_project order by created_at,id limit 50 offset p_offset) t);
end;$$;
create function public.project_candidates(p_project uuid,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare edition uuid;
begin
 select edition_id into edition from public.projects where id=p_project;
 if not private.project_admin(p_project) or p_offset is null or p_offset not between 0 and 10000 then raise exception 'Roster unavailable';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',private.project_name(edition,m.user_id),'roles',m.roles) order by m.user_id),'[]') from
 (select user_id,array_agg(role order by role) roles from public.edition_members where edition_id=edition and active group by user_id order by user_id limit 50 offset p_offset) m);
end;$$;
create function public.project_task_thread(p_task uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare project uuid;edition uuid;comments jsonb;changes jsonb;
begin
 select t.project_id,p.edition_id into project,edition from public.project_tasks t join public.projects p on p.id=t.project_id where t.id=p_task;
 if not private.project_access(project,'read') then raise exception 'Task unavailable';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'author',private.project_name(edition,c.author_id),'body',c.body,'created_at',c.created_at) order by c.created_at desc,c.id desc),'[]') into comments from (select * from public.project_comments where task_id=p_task order by created_at desc,id desc limit 100) c;
 select coalesce(jsonb_agg(jsonb_build_object('version',c.version,'actor',private.project_name(edition,c.actor_id),'action',c.action,'created_at',c.created_at) order by c.version desc),'[]') into changes from (select * from public.project_task_changes where task_id=p_task order by version desc limit 50) c;
 return jsonb_build_object('comments',comments,'changes',changes);
end;$$;
revoke all on function
 private.project_shape(jsonb,text[]),private.project_text(text,integer,boolean),private.project_access(uuid,text),private.project_admin(uuid),private.project_name(uuid,uuid),private.validate_project(jsonb),
 public.project_list(uuid),public.project_board(uuid),public.project_tasks_page(uuid,integer),public.project_candidates(uuid,integer),public.project_task_thread(uuid),
 public.save_project(uuid,uuid,integer,jsonb),public.save_project_member(uuid,uuid,integer,text,boolean,boolean,boolean,boolean,text),public.archive_project(uuid,integer,text),
 public.save_project_task(uuid,uuid,integer,jsonb),public.archive_project_task(uuid,integer,text),public.comment_project_task(uuid,uuid,text),
 public.save_project_sprint(uuid,uuid,integer,text,text,timestamptz,timestamptz),public.transition_project_sprint(uuid,integer,text,text)
 from public,anon,authenticated,service_role;
grant execute on function
 public.project_list(uuid),public.project_board(uuid),public.project_tasks_page(uuid,integer),public.project_candidates(uuid,integer),public.project_task_thread(uuid),
 public.save_project(uuid,uuid,integer,jsonb),public.save_project_member(uuid,uuid,integer,text,boolean,boolean,boolean,boolean,text),public.archive_project(uuid,integer,text),
 public.save_project_task(uuid,uuid,integer,jsonb),public.archive_project_task(uuid,integer,text),public.comment_project_task(uuid,uuid,text),
 public.save_project_sprint(uuid,uuid,integer,text,text,timestamptz,timestamptz),public.transition_project_sprint(uuid,integer,text,text)
 to authenticated;
commit;
