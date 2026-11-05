begin;
create function private.finish_quiz_attempt(p_attempt uuid,p_force boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts;total integer;
begin
 select * into a from public.quiz_attempts where id=p_attempt for update;
 if a.status='active' and (p_force or clock_timestamp()>=a.deadline) then
  select coalesce(sum(private.quiz_score(q,a.answers->(q->>'id'))),0)::integer into total from jsonb_array_elements(a.snapshot->'questions') q;
  update public.quiz_attempts set status='submitted',score_units=total,submitted_at=least(clock_timestamp(),deadline),version=version+1 where id=a.id;
 end if;
end;$$;
create function private.quiz_attempt_projection(p_attempt uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.quiz_attempts;q public.class_quizzes;visible boolean;maximum integer;
begin
 select * into a from public.quiz_attempts where id=p_attempt;
 select * into q from public.class_quizzes where id=a.quiz_id;
 visible:=a.status='submitted' and (q.released or q.config->>'results'='immediate' or (q.config->>'results'='after_close' and (q.state='closed' or clock_timestamp()>=(q.config->>'closes_at')::timestamptz)));
 select sum((value->>'points')::integer*100)::integer into maximum from jsonb_array_elements(a.snapshot->'questions');
 return jsonb_build_object('id',a.id,'status',a.status,'version',a.version,'deadline',a.deadline,'server_now',clock_timestamp(),'answers',a.answers,
 'questions',private.quiz_public_questions(a.snapshot->'questions'),'score_units',case when visible then a.score_units else null end,'max_units',maximum,
 'flags',(select count(*) from public.quiz_signals where attempt_id=a.id and kind in ('hidden','fullscreen_exit','fullscreen_unavailable')));
end;$$;
create function public.start_quiz_attempt(p_quiz uuid,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.class_quizzes;a public.quiz_attempts;n integer;t timestamptz;
begin
 select * into q from public.class_quizzes where id=p_quiz for share;
 if q.id is null or q.mode<>'exam' or not private.quiz_student(q.section_id) then raise exception 'Exam unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||q.id::text,7));
 select * into a from public.quiz_attempts where id=p_id;
 if found then
  if a.quiz_id<>q.id or a.user_id<>auth.uid() then raise exception 'Attempt reference conflict';end if;
  perform private.finish_quiz_attempt(a.id,q.state='closed');
  return private.quiz_attempt_projection(a.id);
 end if;
 -- An unfinished attempt is resumed instead of silently consuming a new attempt.
 select * into a from public.quiz_attempts where quiz_id=q.id and user_id=auth.uid() and status='active' order by started_at desc limit 1 for update;
 if found then perform private.finish_quiz_attempt(a.id,q.state='closed');return private.quiz_attempt_projection(a.id);end if;
 t:=clock_timestamp();
 if q.state<>'published' or t<(q.config->>'opens_at')::timestamptz or t>=(q.config->>'closes_at')::timestamptz then raise exception 'Exam window closed';end if;
 select coalesce(max(attempt),0)+1 into n from public.quiz_attempts where quiz_id=q.id and user_id=auth.uid();
 if n>(q.config->>'max_attempts')::integer then raise exception 'Attempt limit reached';end if;
 insert into public.quiz_attempts(id,quiz_id,user_id,attempt,started_at,deadline,snapshot)
 values(p_id,q.id,auth.uid(),n,t,least((q.config->>'closes_at')::timestamptz,t+make_interval(secs=>(q.config->>'duration_seconds')::integer)),jsonb_build_object('questions',q.questions,'config',q.config,'quiz_version',q.version));
 return private.quiz_attempt_projection(p_id);
end;$$;
create function public.quiz_attempt(p_attempt uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts;q public.class_quizzes;
begin
 select * into a from public.quiz_attempts where id=p_attempt;
 select * into q from public.class_quizzes where id=a.quiz_id for share;
 if a.id is null or a.user_id is distinct from auth.uid() or not private.quiz_student(q.section_id) then raise exception 'Attempt unavailable';end if;
 perform private.finish_quiz_attempt(a.id,q.state='closed');
 return private.quiz_attempt_projection(a.id);
end;$$;
create function public.save_quiz_attempt(p_attempt uuid,p_version integer,p_answers jsonb,p_submit boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts;q public.class_quizzes;
begin
 select * into a from public.quiz_attempts where id=p_attempt;
 select * into q from public.class_quizzes where id=a.quiz_id for share;
 if a.id is null or a.user_id is distinct from auth.uid() or not private.quiz_student(q.section_id) or p_submit is null then raise exception 'Attempt unavailable';end if;
 select * into a from public.quiz_attempts where id=p_attempt for update;
 perform private.finish_quiz_attempt(a.id,q.state='closed');
 if a.status='submitted' or clock_timestamp()>=a.deadline or q.state='closed' then return private.quiz_attempt_projection(a.id);end if;
 if a.version is distinct from p_version then raise exception 'Stale answers; reload without overwriting another save';end if;
 perform private.quiz_answers(a.snapshot->'questions',p_answers);
 update public.quiz_attempts set answers=p_answers,version=version+1 where id=a.id;
 if p_submit then perform private.finish_quiz_attempt(a.id,true);end if;
 return private.quiz_attempt_projection(a.id);
end;$$;
create function public.record_quiz_signal(p_attempt uuid,p_id uuid,p_kind text) returns void language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts;q public.class_quizzes;existing public.quiz_signals;
begin
 select * into a from public.quiz_attempts where id=p_attempt;
 select * into q from public.class_quizzes where id=a.quiz_id for share;
 if a.id is null or a.user_id is distinct from auth.uid() or not private.quiz_student(q.section_id) or p_kind is null
 or p_kind not in ('hidden','visible','fullscreen_exit','fullscreen_enter','fullscreen_unavailable') then raise exception 'Signal unavailable';end if;
 select * into a from public.quiz_attempts where id=p_attempt for update;
 select * into existing from public.quiz_signals where id=p_id;
 if found then
  if existing.attempt_id=a.id and existing.kind=p_kind then return;end if;raise exception 'Signal reference conflict';
 end if;
 if a.status<>'active' or clock_timestamp()>=a.deadline or q.state='closed' or a.snapshot->'config'->>'monitoring'<>'fullscreen_visibility' then return;end if;
 if (select count(*) from public.quiz_signals where attempt_id=a.id)>=200 then return;end if;
 -- Client signals are untrusted advisory observations. No score or penalty changes.
 insert into public.quiz_signals(id,attempt_id,kind) values(p_id,a.id,p_kind);
end;$$;
create function public.quiz_attempt_events(p_attempt uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.quiz_attempts;q public.class_quizzes;
begin
 select * into a from public.quiz_attempts where id=p_attempt;select * into q from public.class_quizzes where id=a.quiz_id;
 if a.id is null or not(private.quiz_staff(q.section_id) or (a.user_id=auth.uid() and private.quiz_student(q.section_id))) then raise exception 'Events unavailable';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'received_at',received_at) order by received_at),'[]') from public.quiz_signals where attempt_id=a.id);
end;$$;
create function public.my_quiz_attempts(p_quiz uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.class_quizzes;a public.quiz_attempts;result jsonb:='[]';
begin
 select * into q from public.class_quizzes where id=p_quiz for share;
 if q.id is null or not private.quiz_student(q.section_id) then raise exception 'Attempts unavailable';end if;
 for a in select * from public.quiz_attempts where quiz_id=q.id and user_id=auth.uid() order by attempt desc limit 5 loop
  perform private.finish_quiz_attempt(a.id,q.state='closed');
  result:=result||jsonb_build_array(private.quiz_attempt_projection(a.id));
 end loop;
 return result;
end;$$;
create function public.quiz_report(p_quiz uuid,p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.class_quizzes;a public.quiz_attempts;
begin
 select * into q from public.class_quizzes where id=p_quiz for share;
 if q.id is null or not private.quiz_staff(q.section_id) or p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'Quiz report unavailable';end if;
 for a in select * from public.quiz_attempts where quiz_id=q.id order by user_id,started_at desc,id limit 100 offset p_offset for update loop
  perform private.finish_quiz_attempt(a.id,q.state='closed');
 end loop;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'attempt',r.attempt,'status',r.status,'score_units',r.score_units,'deadline',r.deadline,
 'flags',(select count(*) from public.quiz_signals s where s.attempt_id=r.id and s.kind in ('hidden','fullscreen_exit','fullscreen_unavailable'))) order by r.user_id,r.started_at desc,r.id),'[]')
 from (select * from public.quiz_attempts where quiz_id=q.id order by user_id,started_at desc,id limit 100 offset p_offset) r);
end;$$;
revoke all on function private.finish_quiz_attempt(uuid,boolean),private.quiz_attempt_projection(uuid),public.start_quiz_attempt(uuid,uuid),public.quiz_attempt(uuid),public.save_quiz_attempt(uuid,integer,jsonb,boolean),public.record_quiz_signal(uuid,uuid,text),public.quiz_attempt_events(uuid),public.my_quiz_attempts(uuid),public.quiz_report(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.start_quiz_attempt(uuid,uuid),public.quiz_attempt(uuid),public.save_quiz_attempt(uuid,integer,jsonb,boolean),public.record_quiz_signal(uuid,uuid,text),public.quiz_attempt_events(uuid),public.my_quiz_attempts(uuid),public.quiz_report(uuid,integer) to authenticated;
commit;
