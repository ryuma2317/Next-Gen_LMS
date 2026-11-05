-- CI exposed an ambiguous PL/pgSQL alias and an RLS policy that depended
-- on a deliberately ungranted table. Preserve earlier migrations and fix forward.
begin;
create or replace function public.submit_application(p_form uuid,p_id uuid,p_receipt_hash text,p_name text,p_email text,p_department text,p_specialization text,p_answers jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare f public.recruitment_forms; a public.applications; q jsonb; answer text;
begin
 select * into f from public.recruitment_forms where id=p_form and published and (closes_at is null or closes_at>now()) for share;
 if not found then raise exception 'Application unavailable'; end if;
 if p_receipt_hash !~ '^[0-9a-f]{64}$' or p_email<>lower(trim(p_email)) or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>8192 then raise exception 'Invalid application'; end if;
 if exists(select 1 from jsonb_object_keys(p_answers) k where not exists(select 1 from jsonb_array_elements(f.questions) as question(value) where question.value->>'id'=k)) then raise exception 'Invalid answers'; end if;
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
revoke all on function public.submit_application(uuid,uuid,text,text,text,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.submit_application(uuid,uuid,text,text,text,text,text,jsonb) to service_role;

create function private.can_read_session_leave(p_session uuid,p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.teaching_sessions t join public.sections s on s.id=t.section_id
  where t.id=p_session and private.is_member(s.edition_id)
   and (p_user=auth.uid() or private.can_operate(s.edition_id,'review_attendance'))
 );
$$;
revoke all on function private.can_read_session_leave(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function private.can_read_session_leave(uuid,uuid) to authenticated;
drop policy leave_read on public.session_leave_requests;
create policy leave_read on public.session_leave_requests for select to authenticated
 using(private.can_read_session_leave(session_id,user_id));
commit;
