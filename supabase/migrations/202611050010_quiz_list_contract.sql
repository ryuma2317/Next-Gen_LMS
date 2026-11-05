-- Give the HTTP collection a single explicit JSON array result, independent of
-- scalar SETOF row envelopes. Preserve the earlier feature migration.
begin;
drop function public.quiz_list(uuid);
create function public.quiz_list(p_section uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(
  jsonb_build_object('id',q.id,'section_id',q.section_id,'title',q.title,'description',q.description,'mode',q.mode,'config',q.config,'state',q.state,'version',q.version,'released',q.released,
  'can_edit',private.learning_write(p_section,'edit_learning'),'can_report',private.quiz_staff(p_section),'can_participate',private.quiz_student(p_section)) order by q.created_at,q.id),'[]'::jsonb)
 from (
  select * from public.class_quizzes where section_id=p_section and private.learning_reader(p_section) and (state<>'draft' or private.quiz_staff(p_section)) order by created_at,id limit 100
 ) q;
$$;
revoke all on function public.quiz_list(uuid) from public,anon,authenticated,service_role;
grant execute on function public.quiz_list(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
