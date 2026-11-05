begin;
create table public.class_quizzes(
 id uuid primary key,section_id uuid not null references public.sections(id),created_by uuid not null references auth.users(id),
 title text not null,description text not null,mode text not null check(mode in ('exam','game')),
 config jsonb not null,questions jsonb not null,state text not null default 'draft' check(state in ('draft','published','closed')),
 version integer not null default 1,released boolean not null default false,created_at timestamptz not null default now()
);
create table public.quiz_attempts(
 id uuid primary key,quiz_id uuid not null references public.class_quizzes(id),user_id uuid not null references auth.users(id),
 attempt integer not null,started_at timestamptz not null,deadline timestamptz not null,
 status text not null default 'active' check(status in ('active','submitted')),version integer not null default 1,
 answers jsonb not null default '{}',snapshot jsonb not null,score_units integer,submitted_at timestamptz,
 unique(quiz_id,user_id,attempt)
);
create index on public.quiz_attempts(quiz_id,user_id,started_at);
create table public.quiz_signals(
 id uuid primary key,attempt_id uuid not null references public.quiz_attempts(id),
 kind text not null check(kind in ('hidden','visible','fullscreen_exit','fullscreen_enter','fullscreen_unavailable')),
 received_at timestamptz not null default clock_timestamp()
);
create index on public.quiz_signals(attempt_id,received_at);
create table public.quiz_runs(
 id uuid primary key,quiz_id uuid not null references public.class_quizzes(id),
 phase text not null default 'lobby' check(phase in ('lobby','question','reveal','finished')),
 question_index integer not null default -1,deadline timestamptz,version integer not null default 1,created_at timestamptz not null default now()
);
create index on public.quiz_runs(quiz_id,created_at);
create table public.quiz_players(
 run_id uuid not null references public.quiz_runs(id),user_id uuid not null references auth.users(id),
 primary key(run_id,user_id)
);
create table public.quiz_game_answers(
 run_id uuid not null references public.quiz_runs(id),user_id uuid not null references auth.users(id),question_index integer not null,
 selected jsonb not null,score_units integer not null,received_at timestamptz not null,
 primary key(run_id,user_id,question_index),foreign key(run_id,user_id) references public.quiz_players(run_id,user_id)
);
create table public.quiz_events(
 id uuid primary key default gen_random_uuid(),quiz_id uuid not null references public.class_quizzes(id),
 actor_id uuid not null references auth.users(id),action text not null,reason text not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.class_quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_signals enable row level security;
alter table public.quiz_runs enable row level security;
alter table public.quiz_players enable row level security;
alter table public.quiz_game_answers enable row level security;
alter table public.quiz_events enable row level security;
revoke all on public.class_quizzes,public.quiz_attempts,public.quiz_signals,public.quiz_runs,public.quiz_players,public.quiz_game_answers,public.quiz_events from anon,authenticated;

create function private.quiz_student(p_section uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.learning_student(p_section) and not private.learning_permission(p_section,'edit_learning') and not private.learning_permission(p_section,'grade_work');
$$;
create function private.quiz_staff(p_section uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.learning_write(p_section,'edit_learning') or private.learning_write(p_section,'grade_work');
$$;
create function private.quiz_public_questions(p_questions jsonb) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',item->'id','kind',item->'kind','prompt',item->'prompt','options',item->'options','points',item->'points') order by position),'[]'::jsonb) from jsonb_array_elements(p_questions) with ordinality as entries(item,position);
$$;
create function private.quiz_validate(p_fields jsonb,p_publish boolean) returns void language plpgsql set search_path='' as $$
declare q jsonb;o jsonb;c jsonb;k text;v jsonb;required text[]:=array['title','description','mode','config','questions'];ckeys text[]:=array['opens_at','closes_at','duration_seconds','max_attempts','results','monitoring','focus_response','question_seconds','scoring','speed_bonus_percent','leaderboard'];seen text[]:='{}';options text[];correct text[];
begin
 if jsonb_typeof(p_fields) is distinct from 'object' or not(p_fields ?& required) or p_fields-required<>'{}'::jsonb or octet_length(p_fields::text)>26000
 or jsonb_typeof(p_fields->'title') is distinct from 'string' or length(trim(p_fields->>'title')) not between 1 and 160
 or jsonb_typeof(p_fields->'description') is distinct from 'string' or length(p_fields->>'description')>1500 or coalesce(p_fields->>'mode','') not in ('exam','game') then raise exception 'Invalid quiz definition';end if;
 c:=p_fields->'config';
 if jsonb_typeof(c) is distinct from 'object' or not(c ?& ckeys) or c-ckeys<>'{}'::jsonb then raise exception 'Invalid settings';end if;
 foreach k in array array['duration_seconds','max_attempts','question_seconds','speed_bonus_percent'] loop
  v:=c->k;
  if v<>'null'::jsonb and (jsonb_typeof(v)<>'number' or v::text !~ '^[0-9]+$') then raise exception 'Invalid numeric setting';end if;
 end loop;
 if (c->>'duration_seconds')::integer not between 30 and 10800 or (c->>'max_attempts')::integer not between 1 and 5
 or (c->>'question_seconds')::integer not between 5 and 300 or (c->>'speed_bonus_percent')::integer not between 0 and 100 then raise exception 'Setting out of range';end if;
 if (c->>'results') not in ('immediate','after_close','teacher') or (c->>'monitoring') not in ('none','fullscreen_visibility')
 or (c->>'focus_response') not in ('report','warn_report') or (c->>'scoring') not in ('correct','speed') or (c->>'leaderboard') not in ('each_question','end') then raise exception 'Unknown setting';end if;
 foreach k in array array['results','monitoring','focus_response','scoring','leaderboard','opens_at','closes_at'] loop
  if c->k<>'null'::jsonb and jsonb_typeof(c->k)<>'string' then raise exception 'Invalid setting type';end if;
 end loop;
 foreach k in array array['opens_at','closes_at'] loop
  if c->>k is not null and ((c->>k) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' or not isfinite((c->>k)::timestamptz)) then raise exception 'Invalid time';end if;
 end loop;
 if jsonb_typeof(p_fields->'questions') is distinct from 'array' or jsonb_array_length(p_fields->'questions')>15 then raise exception 'Invalid questions';end if;
 for q in select value from jsonb_array_elements(p_fields->'questions') loop
  if jsonb_typeof(q) is distinct from 'object' or not(q ?& array['id','kind','prompt','options','correct','points']) or q-array['id','kind','prompt','options','correct','points']<>'{}'::jsonb
  or jsonb_typeof(q->'id') is distinct from 'string' or q->>'id' !~ '^[a-z][a-z0-9_]{0,39}$' or q->>'id' in ('constructor','prototype') or q->>'id'=any(seen)
  or coalesce(q->>'kind','') not in ('single','multiple') or jsonb_typeof(q->'prompt') is distinct from 'string' or length(q->>'prompt')>1000
  or jsonb_typeof(q->'points') is distinct from 'number' or (q->>'points') !~ '^[0-9]+$' or (q->>'points')::integer not between 1 and 100
  or jsonb_typeof(q->'options') is distinct from 'array' or jsonb_typeof(q->'correct') is distinct from 'array' then raise exception 'Invalid question';end if;
  seen:=array_append(seen,q->>'id');options:='{}';
  if jsonb_array_length(q->'options') not between 2 and 6 then raise exception 'Invalid options';end if;
  for o in select value from jsonb_array_elements(q->'options') loop
   if jsonb_typeof(o) is distinct from 'object' or not(o ?& array['id','text']) or o-array['id','text']<>'{}'::jsonb
   or jsonb_typeof(o->'id') is distinct from 'string' or o->>'id' !~ '^[a-z][a-z0-9_]{0,39}$' or o->>'id' in ('constructor','prototype') or o->>'id'=any(options)
   or jsonb_typeof(o->'text') is distinct from 'string' or length(o->>'text')>200 or (p_publish and length(trim(o->>'text'))=0) then raise exception 'Invalid option';end if;
   options:=array_append(options,o->>'id');
  end loop;
  correct:='{}';
  for v in select value from jsonb_array_elements(q->'correct') loop
   if jsonb_typeof(v)<>'string' or not(v#>>'{}'=any(options)) or v#>>'{}'=any(correct) then raise exception 'Invalid key';end if;
   correct:=array_append(correct,v#>>'{}');
  end loop;
  if (q->>'kind'='single' and cardinality(correct)>1) or (p_publish and (cardinality(correct)=0 or length(trim(q->>'prompt'))=0)) then raise exception 'Complete question and correct answer';end if;
 end loop;
 if p_publish then
  if jsonb_array_length(p_fields->'questions')=0 then raise exception 'At least one question required';end if;
  if p_fields->>'mode'='exam' then
   if c->>'opens_at' is null or c->>'closes_at' is null or (c->>'closes_at')::timestamptz<=greatest((c->>'opens_at')::timestamptz,clock_timestamp())
    or c->>'duration_seconds' is null or c->>'max_attempts' is null or c->>'results' is null or c->>'monitoring' is null or c->>'focus_response' is null then raise exception 'Complete exam settings';end if;
  elsif c->>'question_seconds' is null or c->>'scoring' is null or c->>'leaderboard' is null or (c->>'scoring'='speed' and c->>'speed_bonus_percent' is null) then raise exception 'Complete game settings';end if;
 end if;
end;$$;
create function private.quiz_answers(p_questions jsonb,p_answers jsonb) returns void language plpgsql set search_path='' as $$
declare k text;v jsonb;q jsonb;allowed jsonb;
begin
 if jsonb_typeof(p_answers) is distinct from 'object' or octet_length(p_answers::text)>6000 then raise exception 'Invalid answers';end if;
 for k,v in select * from jsonb_each(p_answers) loop
  select value into q from jsonb_array_elements(p_questions) where value->>'id'=k;
  if q is null or jsonb_typeof(v) is distinct from 'array' then raise exception 'Invalid answer';end if;
  select jsonb_agg(value->'id') into allowed from jsonb_array_elements(q->'options');
  if jsonb_array_length(v)>jsonb_array_length(allowed) or (q->>'kind'='single' and jsonb_array_length(v)>1)
   or exists(select 1 from jsonb_array_elements(v) x where jsonb_typeof(x)<>'string' or not(allowed @> jsonb_build_array(x)))
   or (select count(*)<>count(distinct value) from jsonb_array_elements(v)) then raise exception 'Invalid selected options';end if;
 end loop;
end;$$;
create function private.quiz_score(p_question jsonb,p_selected jsonb,p_remaining numeric default 0,p_duration numeric default 1,p_bonus integer default 0) returns integer
language sql immutable set search_path='' as $$
 select case when jsonb_typeof(p_selected)='array' and jsonb_array_length(p_selected)=jsonb_array_length(p_question->'correct')
 and jsonb_array_length(p_question->'correct')>0 and p_selected @> (p_question->'correct') and (p_question->'correct') @> p_selected
 and (select count(*)=count(distinct value) from jsonb_array_elements(p_selected))
 then (p_question->>'points')::integer*100+floor((p_question->>'points')::numeric*100*greatest(0,least(p_bonus,100))*greatest(0,least(p_remaining,p_duration))/(100*greatest(1,p_duration)))::integer else 0 end;
$$;
create function public.quiz_list(p_section uuid) returns setof jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',q.id,'section_id',q.section_id,'title',q.title,'description',q.description,'mode',q.mode,'config',q.config,'state',q.state,'version',q.version,'released',q.released,'can_edit',private.learning_write(p_section,'edit_learning'),'can_report',private.quiz_staff(p_section),'can_participate',private.quiz_student(p_section))
 from public.class_quizzes q where q.section_id=p_section and private.learning_reader(p_section) and (q.state<>'draft' or private.quiz_staff(p_section)) order by q.created_at,q.id limit 100;
$$;
create function public.quiz_definition(p_quiz uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q public.class_quizzes;
begin
 select * into q from public.class_quizzes where id=p_quiz;
 if q.id is null or not private.learning_write(q.section_id,'edit_learning') then raise exception 'Quiz editing unavailable';end if;
 return to_jsonb(q)-array['created_by','created_at'];
end;$$;
create function public.save_quiz(p_id uuid,p_section uuid,p_version integer,p_fields jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare q public.class_quizzes;
begin
 if not private.learning_write(p_section,'edit_learning') or p_version is null or p_version<0 then raise exception 'Quiz editing unavailable';end if;
 perform private.quiz_validate(p_fields,false);
 select * into q from public.class_quizzes where id=p_id for update;
 if found then
  if q.section_id<>p_section or q.state<>'draft' then raise exception 'Quiz editing unavailable';end if;
  if p_version=0 and q.version=1 and (to_jsonb(q)-array['id','section_id','created_by','created_at','state','version','released'])=p_fields then return p_id;end if;
  if q.version is distinct from p_version then raise exception 'Stale quiz';end if;
  update public.class_quizzes set title=p_fields->>'title',description=p_fields->>'description',mode=p_fields->>'mode',config=p_fields->'config',questions=p_fields->'questions',version=version+1 where id=p_id;
 else
  if p_version<>0 then raise exception 'Stale quiz';end if;
  insert into public.class_quizzes(id,section_id,created_by,title,description,mode,config,questions) values(p_id,p_section,auth.uid(),p_fields->>'title',p_fields->>'description',p_fields->>'mode',p_fields->'config',p_fields->'questions');
 end if;
 insert into public.quiz_events(quiz_id,actor_id,action,reason) values(p_id,auth.uid(),'quiz.saved','Saved draft');
 return p_id;
end;$$;
create function public.quiz_transition(p_quiz uuid,p_version integer,p_action text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare q public.class_quizzes;
begin
 select * into q from public.class_quizzes where id=p_quiz for update;
 if q.id is null or not private.learning_write(q.section_id,'edit_learning') or q.version is distinct from p_version or coalesce(length(trim(p_reason)),0) not between 1 and 500 then raise exception 'Quiz action unavailable';end if;
 if p_action='publish' and q.state='draft' then
  perform private.quiz_validate(to_jsonb(q)-array['id','section_id','created_by','created_at','state','version','released'],true);
  update public.class_quizzes set state='published',version=version+1 where id=q.id;
 elsif p_action='close' and q.state='published' then
  update public.class_quizzes set state='closed',version=version+1 where id=q.id;
  update public.quiz_runs set phase='finished',version=version+1 where quiz_id=q.id and phase<>'finished';
 elsif p_action='release' and q.mode='exam' and q.state in ('published','closed') and not q.released then
  update public.class_quizzes set released=true,version=version+1 where id=q.id;
 else raise exception 'Invalid quiz action';end if;
 insert into public.quiz_events(quiz_id,actor_id,action,reason) values(q.id,auth.uid(),'quiz.'||p_action,trim(p_reason));
end;$$;
revoke all on function private.quiz_student(uuid),private.quiz_staff(uuid),private.quiz_public_questions(jsonb),private.quiz_validate(jsonb,boolean),private.quiz_answers(jsonb,jsonb),private.quiz_score(jsonb,jsonb,numeric,numeric,integer),public.quiz_list(uuid),public.quiz_definition(uuid),public.save_quiz(uuid,uuid,integer,jsonb),public.quiz_transition(uuid,integer,text,text) from public,anon,authenticated,service_role;
grant execute on function public.quiz_list(uuid),public.quiz_definition(uuid),public.save_quiz(uuid,uuid,integer,jsonb),public.quiz_transition(uuid,integer,text,text) to authenticated;
commit;
