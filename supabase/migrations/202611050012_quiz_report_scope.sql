-- Authoring/hosting does not imply access to private grades or monitoring reports.
begin;
create or replace function public.quiz_list(p_section uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(
  jsonb_build_object('id',q.id,'section_id',q.section_id,'title',q.title,'description',q.description,'mode',q.mode,'config',q.config,'state',q.state,'version',q.version,'released',q.released,
  'can_edit',private.learning_write(p_section,'edit_learning'),'can_report',private.learning_write(p_section,'grade_work'),'can_participate',private.quiz_student(p_section)) order by q.created_at,q.id),'[]'::jsonb)
 from (
  select * from public.class_quizzes where section_id=p_section and private.learning_reader(p_section) and (state<>'draft' or private.quiz_staff(p_section)) order by created_at,id limit 100
 ) q;
$$;
create or replace function public.quiz_attempt_events(p_attempt uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.quiz_attempts;q public.class_quizzes;
begin
 select * into a from public.quiz_attempts where id=p_attempt;select * into q from public.class_quizzes where id=a.quiz_id;
 if a.id is null or not(private.learning_write(q.section_id,'grade_work') or (a.user_id=auth.uid() and private.quiz_student(q.section_id))) then raise exception 'Events unavailable';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'received_at',received_at) order by received_at),'[]') from public.quiz_signals where attempt_id=a.id);
end;$$;
create or replace function public.quiz_report(p_quiz uuid,p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.class_quizzes;a public.quiz_attempts;
begin
 select * into q from public.class_quizzes where id=p_quiz for share;
 if q.id is null or not private.learning_write(q.section_id,'grade_work') or p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'Quiz report unavailable';end if;
 for a in select * from public.quiz_attempts where quiz_id=q.id order by user_id,started_at desc,id limit 100 offset p_offset for update loop
  perform private.finish_quiz_attempt(a.id,q.state='closed');
 end loop;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'attempt',r.attempt,'status',r.status,'score_units',r.score_units,'deadline',r.deadline,
 'flags',(select count(*) from public.quiz_signals s where s.attempt_id=r.id and s.kind in ('hidden','fullscreen_exit','fullscreen_unavailable'))) order by r.user_id,r.started_at desc,r.id),'[]')
 from (select * from public.quiz_attempts where quiz_id=q.id order by user_id,started_at desc,id limit 100 offset p_offset) r);
end;$$;
revoke all on function public.quiz_list(uuid),public.quiz_attempt_events(uuid),public.quiz_report(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.quiz_list(uuid),public.quiz_attempt_events(uuid),public.quiz_report(uuid,integer) to authenticated;
commit;
