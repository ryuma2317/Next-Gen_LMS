-- Rotate a browser handle on MFA/password changes without resetting its deadlines.
begin;
create function public.web_session_rotate(p_hash text,p_version integer,p_lease uuid,p_new_hash text,p_sealed text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_version is null or p_lease is null or p_new_hash is null or p_new_hash !~ '^[0-9a-f]{64}$' or p_new_hash=p_hash or p_sealed is null or length(p_sealed) not between 50 and 24000 then return false;end if;
 update private.web_sessions set handle_hash=p_new_hash,sealed_credentials=p_sealed,version=version+1,lease_id=null,lease_until=null where handle_hash=p_hash and version=p_version and lease_id=p_lease and lease_until>clock_timestamp() and expires_at>clock_timestamp() and idle_expires_at>clock_timestamp();
 return found;
end;$$;
revoke all on function public.web_session_rotate(text,integer,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.web_session_rotate(text,integer,uuid,text,text) to service_role;
commit;
