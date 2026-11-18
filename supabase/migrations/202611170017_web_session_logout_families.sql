-- Keep logout authoritative even when a rotated Set-Cookie response arrives late.
begin;
alter table private.web_sessions add column family_id uuid not null default gen_random_uuid() unique;
create table private.web_session_handles(
 handle_hash text primary key check(handle_hash ~ '^[0-9a-f]{64}$'),
 family_id uuid not null references private.web_sessions(family_id) on delete cascade,
 csrf_hash text not null check(csrf_hash ~ '^[0-9a-f]{64}$')
);
create index on private.web_session_handles(family_id);
alter table private.web_session_handles enable row level security;
revoke all on private.web_session_handles from public,anon,authenticated,service_role;
create function public.web_session_register(p_hash text,p_csrf_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare s private.web_sessions;existing text;
begin
 if p_csrf_hash is null or p_csrf_hash !~ '^[0-9a-f]{64}$' then return false;end if;
 select * into s from private.web_sessions where handle_hash=p_hash and expires_at>clock_timestamp() and idle_expires_at>clock_timestamp() for update;
 if not found then return false;end if;
 select csrf_hash into existing from private.web_session_handles where handle_hash=p_hash;
 if found then return existing=p_csrf_hash;end if;
 insert into private.web_session_handles values(p_hash,s.family_id,p_csrf_hash);return true;
end;$$;
create or replace function public.web_session_load(p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.web_sessions;
begin
 update private.web_sessions set idle_expires_at=least(expires_at,clock_timestamp()+make_interval(secs=>idle_seconds)) where handle_hash=p_hash and expires_at>clock_timestamp() and idle_expires_at>clock_timestamp() returning * into s;
 if not found then return null;end if;
 return jsonb_build_object('user_id',s.user_id,'sealed_credentials',s.sealed_credentials,'version',s.version,'expires_at',s.expires_at,'lease_active',coalesce(s.lease_until>clock_timestamp(),false),'registered',exists(select 1 from private.web_session_handles where handle_hash=p_hash));
end;$$;
create function public.web_session_rotate(p_hash text,p_version integer,p_lease uuid,p_new_hash text,p_sealed text,p_csrf_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare s private.web_sessions;
begin
 if p_version is null or p_lease is null or p_new_hash is null or p_new_hash !~ '^[0-9a-f]{64}$' or p_new_hash=p_hash or p_csrf_hash is null or p_csrf_hash !~ '^[0-9a-f]{64}$' or p_sealed is null or length(p_sealed) not between 50 and 24000 then return false;end if;
 select * into s from private.web_sessions where handle_hash=p_hash and version=p_version and lease_id=p_lease and lease_until>clock_timestamp() and expires_at>clock_timestamp() and idle_expires_at>clock_timestamp() for update;
 if not found or (select count(*) from private.web_session_handles where family_id=s.family_id)>=1000 then return false;end if;
 update private.web_sessions set handle_hash=p_new_hash,sealed_credentials=p_sealed,version=version+1,lease_id=null,lease_until=null where handle_hash=p_hash;
 insert into private.web_session_handles values(p_new_hash,s.family_id,p_csrf_hash);return true;
end;$$;
create or replace function public.web_session_revoke(p_hash text) returns void language sql security definer set search_path='' as $$
 delete from private.web_sessions where handle_hash=p_hash or family_id in(select family_id from private.web_session_handles where handle_hash=p_hash);
$$;
create function public.web_session_logout(p_hash text,p_csrf_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.web_sessions;proof text;
begin
 select ws.* into s from private.web_sessions ws join private.web_session_handles h on h.family_id=ws.family_id where h.handle_hash=p_hash for update of ws;
 if not found then return jsonb_build_object('status','missing');end if;
 select csrf_hash into proof from private.web_session_handles where handle_hash=p_hash;
 if proof is distinct from p_csrf_hash then return jsonb_build_object('status','denied');end if;
 delete from private.web_sessions where family_id=s.family_id;
 -- Only the server receives this encrypted envelope for best-effort provider logout.
 return jsonb_build_object('status','revoked','handle_hash',s.handle_hash,'user_id',s.user_id,'sealed_credentials',s.sealed_credentials);
end;$$;
revoke all on function public.web_session_rotate(text,integer,uuid,text,text),public.web_session_register(text,text),public.web_session_load(text),public.web_session_rotate(text,integer,uuid,text,text,text),public.web_session_revoke(text),public.web_session_logout(text,text) from public,anon,authenticated,service_role;
grant execute on function public.web_session_register(text,text),public.web_session_load(text),public.web_session_rotate(text,integer,uuid,text,text,text),public.web_session_revoke(text),public.web_session_logout(text,text) to service_role;
commit;
