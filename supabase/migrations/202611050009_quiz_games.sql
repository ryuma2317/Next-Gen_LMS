begin;
create unique index one_active_quiz_run on public.quiz_runs(quiz_id) where phase<>'finished';
create function public.create_quiz_run(p_quiz uuid,p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare q public.class_quizzes;r public.quiz_runs;
begin
 select * into q from public.class_quizzes where id=p_quiz for share;
 if q.id is null or q.mode<>'game' or q.state<>'published' or not private.learning_write(q.section_id,'edit_learning') then raise exception 'Hosting unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(q.id::text,8));
 select * into r from public.quiz_runs where id=p_id;
 if found then if r.quiz_id<>q.id then raise exception 'Run reference conflict';end if;return r.id;end if;
 select * into r from public.quiz_runs where quiz_id=q.id and phase<>'finished';
 if found then return r.id;end if;
 insert into public.quiz_runs(id,quiz_id) values(p_id,q.id);
 insert into public.quiz_events(quiz_id,actor_id,action,reason) values(q.id,auth.uid(),'game.created','Created game lobby');
 return p_id;
end;$$;
create function public.quiz_runs(p_quiz uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q public.class_quizzes;
begin
 select * into q from public.class_quizzes where id=p_quiz;
 if q.id is null or not(private.quiz_staff(q.section_id) or (private.quiz_student(q.section_id) and q.state<>'draft')) then raise exception 'Games unavailable';end if;
 return (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]') from(select id,phase,version,created_at from public.quiz_runs where quiz_id=q.id order by created_at desc limit 20) r);
end;$$;
create function public.join_quiz_run(p_run uuid) returns void language plpgsql security definer set search_path='' as $$
declare q public.class_quizzes;r public.quiz_runs;
begin
 select quiz_id into r.quiz_id from public.quiz_runs where id=p_run;
 select * into q from public.class_quizzes where id=r.quiz_id for share;
 select * into r from public.quiz_runs where id=p_run for share;
 if r.id is null or q.state<>'published' or not private.quiz_student(q.section_id) then raise exception 'Join unavailable';end if;
 if exists(select 1 from public.quiz_players where run_id=r.id and user_id=auth.uid()) then return;end if;
 if r.phase<>'lobby' then raise exception 'Lobby has closed';end if;
 insert into public.quiz_players(run_id,user_id) values(r.id,auth.uid()) on conflict do nothing;
end;$$;
create function public.quiz_run_transition(p_run uuid,p_version integer,p_action text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare q public.class_quizzes;r public.quiz_runs;n integer;
begin
 select quiz_id into r.quiz_id from public.quiz_runs where id=p_run;
 select * into q from public.class_quizzes where id=r.quiz_id for share;
 select * into r from public.quiz_runs where id=p_run for update;
 if r.id is null or q.state<>'published' or not private.learning_write(q.section_id,'edit_learning') or r.version is distinct from p_version or coalesce(length(trim(p_reason)),0) not between 1 and 500 then raise exception 'Host action unavailable';end if;
 if p_action='next' and r.phase in ('lobby','reveal') then
  n:=r.question_index+1;
  if n>=jsonb_array_length(q.questions) then update public.quiz_runs set phase='finished',version=version+1 where id=r.id;
  else update public.quiz_runs set phase='question',question_index=n,deadline=clock_timestamp()+make_interval(secs=>(q.config->>'question_seconds')::integer),version=version+1 where id=r.id;end if;
 elsif p_action='reveal' and r.phase='question' then update public.quiz_runs set phase='reveal',version=version+1 where id=r.id;
 elsif p_action='finish' and r.phase<>'finished' then update public.quiz_runs set phase='finished',version=version+1 where id=r.id;
 else raise exception 'Invalid host transition';end if;
 insert into public.quiz_events(quiz_id,actor_id,action,reason) values(q.id,auth.uid(),'game.'||p_action,trim(p_reason));
end;$$;
create function public.answer_quiz_run(p_run uuid,p_index integer,p_selected jsonb) returns void language plpgsql security definer set search_path='' as $$
declare q public.class_quizzes;r public.quiz_runs;previous public.quiz_game_answers;question jsonb;t timestamptz;score integer;
begin
 select quiz_id into r.quiz_id from public.quiz_runs where id=p_run;
 select * into q from public.class_quizzes where id=r.quiz_id for share;
 select * into r from public.quiz_runs where id=p_run for share;
 if r.id is null or not private.quiz_student(q.section_id) or p_index is null or p_index<0 or p_index>=jsonb_array_length(q.questions)
 or not exists(select 1 from public.quiz_players where run_id=r.id and user_id=auth.uid()) then raise exception 'Answer unavailable';end if;
 question:=q.questions->p_index;
 perform private.quiz_answers(jsonb_build_array(question),jsonb_build_object(question->>'id',p_selected));
 -- Duplicate answer deliveries return success but can never overwrite an answer.
 perform pg_advisory_xact_lock(hashtextextended(r.id::text||auth.uid()::text||p_index::text,9));
 select * into previous from public.quiz_game_answers where run_id=r.id and user_id=auth.uid() and question_index=p_index;
 if found then
  if previous.selected @> p_selected and p_selected @> previous.selected then return;end if;raise exception 'Answer already locked';
 end if;
 t:=clock_timestamp();
 if q.state<>'published' or r.phase<>'question' or r.question_index<>p_index or t>=r.deadline then raise exception 'Question closed';end if;
 score:=private.quiz_score(question,p_selected,extract(epoch from r.deadline-t),(q.config->>'question_seconds')::integer,case when q.config->>'scoring'='speed' then (q.config->>'speed_bonus_percent')::integer else 0 end);
 insert into public.quiz_game_answers(run_id,user_id,question_index,selected,score_units,received_at) values(r.id,auth.uid(),p_index,p_selected,score,t);
end;$$;
create function public.quiz_run_view(p_run uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q public.class_quizzes;r public.quiz_runs;question jsonb;standings jsonb:='[]';show_scores boolean;
begin
 select * into r from public.quiz_runs where id=p_run;select * into q from public.class_quizzes where id=r.quiz_id;
 if r.id is null or q.state='draft' or not(private.quiz_staff(q.section_id) or private.quiz_student(q.section_id)) then raise exception 'Game unavailable';end if;
 if r.question_index>=0 then question:=q.questions->r.question_index;end if;
 show_scores:=r.phase='finished' or (r.phase='reveal' and q.config->>'leaderboard'='each_question');
 if show_scores then
  select coalesce(jsonb_agg(jsonb_build_object('label','Participant '||left(md5(r.id::text||scores.user_id::text),6),'score_units',scores.score_units,'rank',scores.position,'is_you',scores.user_id=auth.uid()) order by scores.position,scores.user_id),'[]') into standings
  from (
   select totals.*,rank() over(order by totals.score_units desc) as position from(
    select p.user_id,coalesce(sum(a.score_units),0)::integer as score_units from public.quiz_players p left join public.quiz_game_answers a on a.run_id=p.run_id and a.user_id=p.user_id
    where p.run_id=r.id group by p.user_id
   ) totals
  ) scores;
 end if;
 return jsonb_build_object('id',r.id,'version',r.version,'phase',r.phase,'question_index',r.question_index,'deadline',r.deadline,'server_now',clock_timestamp(),
 'question',case when question is not null then private.quiz_public_questions(jsonb_build_array(question))->0 else null end,'correct',case when r.phase in ('reveal','finished') then question->'correct' else null end,
 'joined',exists(select 1 from public.quiz_players where run_id=r.id and user_id=auth.uid()),
 'answered',exists(select 1 from public.quiz_game_answers where run_id=r.id and user_id=auth.uid() and question_index=r.question_index),
 'players',(select count(*) from public.quiz_players where run_id=r.id),
 'answered_count',(select count(*) from public.quiz_game_answers where run_id=r.id and question_index=r.question_index),'standings',standings);
end;$$;
revoke all on function public.create_quiz_run(uuid,uuid),public.quiz_runs(uuid),public.join_quiz_run(uuid),public.quiz_run_transition(uuid,integer,text,text),public.answer_quiz_run(uuid,integer,jsonb),public.quiz_run_view(uuid) from public,anon,authenticated,service_role;
grant execute on function public.create_quiz_run(uuid,uuid),public.quiz_runs(uuid),public.join_quiz_run(uuid),public.quiz_run_transition(uuid,integer,text,text),public.answer_quiz_run(uuid,integer,jsonb),public.quiz_run_view(uuid) to authenticated;
commit;
