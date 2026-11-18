-- Opaque browser sessions. No provider token or cookie handle is stored in plaintext.
begin;
create table private.web_sessions(
 handle_hash text primary key check(handle_hash ~ '^[0-9a-f]{64}$'),
 user_id uuid not null references auth.users(id),sealed_credentials text not null check(length(sealed_credentials) between 50 and 24000),
 version integer not null default 1 check(version>0),
 expires_at timestamptz not null,idle_expires_at timestamptz not null,idle_seconds integer not null check(idle_seconds between 300 and 604800),
 lease_id uuid,lease_until timestamptz,created_at timestamptz not null default clock_timestamp(),
 check(idle_expires_at<=expires_at),check((lease_id is null)=(lease_until is null))
);
create index on private.web_sessions(expires_at);
create index on private.web_sessions(idle_expires_at);
alter table private.web_sessions enable row level security;
revoke all on private.web_sessions from public,anon,authenticated,service_role;

create function public.web_session_create(p_hash text,p_user uuid,p_sealed text,p_absolute integer,p_idle integer) returns void language plpgsql security definer set search_path='' as $$
declare v_now timestamptz:=clock_timestamp();
begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_user is null or p_sealed is null or length(p_sealed) not between 50 and 24000 or p_absolute is null or p_idle is null or p_absolute not between 300 and 604800 or p_idle not between 300 and p_absolute then raise exception 'Invalid session';end if;
 -- Bounded expiry cleanup removes credentials only, never program history.
 delete from private.web_sessions where handle_hash in (select handle_hash from private.web_sessions where least(expires_at,idle_expires_at)<=clock_timestamp() limit 100);
 insert into private.web_sessions(handle_hash,user_id,sealed_credentials,expires_at,idle_expires_at,idle_seconds) values(p_hash,p_user,p_sealed,v_now+make_interval(secs=>p_absolute),v_now+make_interval(secs=>p_idle),p_idle);
end;$$;
create function public.web_session_load(p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.web_sessions;
begin
 update private.web_sessions set idle_expires_at=least(expires_at,clock_timestamp()+make_interval(secs=>idle_seconds)) where handle_hash=p_hash and expires_at>clock_timestamp() and idle_expires_at>clock_timestamp() returning * into s;
 if not found then return null;end if;
 return jsonb_build_object('user_id',s.user_id,'sealed_credentials',s.sealed_credentials,'version',s.version,'expires_at',s.expires_at,'lease_active',coalesce(s.lease_until>clock_timestamp(),false));
end;$$;
create function public.web_session_lease(p_hash text,p_version integer,p_lease uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_version is null or p_lease is null then return false;end if;
 update private.web_sessions set lease_id=p_lease,lease_until=clock_timestamp()+interval '30 seconds' where handle_hash=p_hash and version=p_version and expires_at>clock_timestamp() and idle_expires_at>clock_timestamp() and (lease_until is null or lease_until<=clock_timestamp());
 return found;
end;$$;
create function public.web_session_save(p_hash text,p_version integer,p_lease uuid,p_sealed text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_version is null or p_lease is null or p_sealed is null or length(p_sealed) not between 50 and 24000 then return false;end if;
 update private.web_sessions set sealed_credentials=p_sealed,version=version+1,lease_id=null,lease_until=null where handle_hash=p_hash and version=p_version and lease_id=p_lease and lease_until>clock_timestamp() and expires_at>clock_timestamp() and idle_expires_at>clock_timestamp();
 return found;
end;$$;
create function public.web_session_revoke(p_hash text) returns void language sql security definer set search_path='' as $$delete from private.web_sessions where handle_hash=p_hash;$$;
revoke all on function public.web_session_create(text,uuid,text,integer,integer),public.web_session_load(text),public.web_session_lease(text,integer,uuid),public.web_session_save(text,integer,uuid,text),public.web_session_revoke(text) from public,anon,authenticated,service_role;
grant execute on function public.web_session_create(text,uuid,text,integer,integer),public.web_session_load(text),public.web_session_lease(text,integer,uuid),public.web_session_save(text,integer,uuid,text),public.web_session_revoke(text) to service_role;
commit;
