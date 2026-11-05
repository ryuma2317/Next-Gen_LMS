-- Explicit application allowlist: provider/default grants to named roles survive
-- a REVOKE FROM PUBLIC. Leave unrelated Supabase/provider functions untouched.
begin;
revoke all on function
 private.is_member(uuid),private.can_operate(uuid,text),private.is_section_trainer(uuid),private.can_view_session(uuid),
 private.learning_permission(uuid,text),private.learning_write(uuid,text),private.learning_student(uuid),private.learning_reader(uuid),private.learning_staff(uuid),private.learning_url(text),
 public.class_catalog(uuid),public.claim_section(uuid),public.admissions_access(uuid),public.published_form(uuid),
 public.create_recruitment_form(uuid,text,text,jsonb,boolean,timestamptz),public.submit_application(uuid,uuid,text,text,text,text,text,jsonb),public.application_receipt(uuid,text),
 public.review_application(uuid,integer,text,text),public.my_eligible_applications(),public.activate_application(uuid),public.lease_invitation_jobs(),public.finish_invitation_job(uuid,uuid,text),
 public.configure_attendance_policy(uuid,integer,integer,integer,text),public.create_teaching_session(uuid,text,text,timestamptz,timestamptz,integer),public.attendance_catalog(uuid),public.start_teaching_session(uuid,integer),
 public.attendance_display_context(uuid),public.attendance_checkin_context(uuid),public.record_session_checkin(uuid,uuid,uuid),public.record_session_checkin(uuid,uuid,uuid,timestamptz),
 public.finalize_teaching_session(uuid,integer),public.request_session_leave(uuid,text),public.review_session_leave(uuid,integer,boolean,text),public.correct_session_attendance(uuid,uuid,integer,text,text),
 public.cancel_teaching_session(uuid,integer,text),public.attendance_roster(uuid),public.my_attendance_summary(uuid),public.attendance_leave_queue(uuid),
 public.learning_classes(uuid),public.learning_lessons(uuid),public.learning_assignments(uuid),public.save_class_lesson(uuid,uuid,integer,text,text,text),public.publish_class_lesson(uuid,integer),
 public.save_class_assignment(uuid,uuid,integer,jsonb),public.publish_class_assignment(uuid,integer),public.close_class_assignment(uuid,integer,text),public.submit_class_work(uuid,uuid,integer,text,text),
 public.grade_class_work(uuid,integer,integer,text,text),public.release_class_grade(uuid,integer,text),public.learning_work(uuid,integer)
 from public,anon,authenticated,service_role;

grant execute on function private.is_member(uuid),private.can_operate(uuid,text),private.is_section_trainer(uuid),private.can_view_session(uuid) to authenticated;
grant execute on function public.published_form(uuid) to anon,authenticated,service_role;
grant execute on function public.submit_application(uuid,uuid,text,text,text,text,text,jsonb),public.application_receipt(uuid,text),public.lease_invitation_jobs(),public.finish_invitation_job(uuid,uuid,text),public.record_session_checkin(uuid,uuid,uuid,timestamptz) to service_role;

grant execute on function
 public.class_catalog(uuid),public.claim_section(uuid),public.admissions_access(uuid),public.create_recruitment_form(uuid,text,text,jsonb,boolean,timestamptz),
 public.review_application(uuid,integer,text,text),public.my_eligible_applications(),public.activate_application(uuid),
 public.configure_attendance_policy(uuid,integer,integer,integer,text),public.create_teaching_session(uuid,text,text,timestamptz,timestamptz,integer),public.attendance_catalog(uuid),public.start_teaching_session(uuid,integer),
 public.attendance_display_context(uuid),public.attendance_checkin_context(uuid),public.finalize_teaching_session(uuid,integer),public.request_session_leave(uuid,text),public.review_session_leave(uuid,integer,boolean,text),public.correct_session_attendance(uuid,uuid,integer,text,text),
 public.cancel_teaching_session(uuid,integer,text),public.attendance_roster(uuid),public.my_attendance_summary(uuid),public.attendance_leave_queue(uuid),
 public.learning_classes(uuid),public.learning_lessons(uuid),public.learning_assignments(uuid),public.save_class_lesson(uuid,uuid,integer,text,text,text),public.publish_class_lesson(uuid,integer),
 public.save_class_assignment(uuid,uuid,integer,jsonb),public.publish_class_assignment(uuid,integer),public.close_class_assignment(uuid,integer,text),public.submit_class_work(uuid,uuid,integer,text,text),
 public.grade_class_work(uuid,integer,integer,text,text),public.release_class_grade(uuid,integer,text),public.learning_work(uuid,integer)
 to authenticated;
-- No grant restores the legacy three-argument check-in RPC or private learning helpers.
commit;
