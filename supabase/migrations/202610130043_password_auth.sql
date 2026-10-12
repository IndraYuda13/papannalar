begin;
create table pn_private.password_credentials(user_id uuid primary key references auth.users(id),email text not null unique,salt text not null check(length(salt)=64),password_hash text not null check(length(password_hash)=128),created_at timestamptz not null default now());
create table pn_private.password_sessions(token_hash text primary key check(length(token_hash)=64),user_id uuid not null references auth.users(id),expires_at timestamptz not null,session_id uuid not null,kind text not null check(kind in ('access','refresh')));
create table pn_private.password_limits(bucket text primary key,started_at timestamptz not null,attempts integer not null);
alter table pn_private.password_credentials enable row level security;
alter table pn_private.password_sessions enable row level security;
alter table pn_private.password_limits enable row level security;
revoke all on pn_private.password_credentials,pn_private.password_sessions,pn_private.password_limits from public,anon,authenticated;
create function public.password_auth_limit(p_email_hash text,p_ip_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare key text;count int;allowed boolean=true;
begin
 if p_email_hash is null or p_ip_hash is null or p_email_hash!~'^[a-f0-9]{64}$' or p_ip_hash!~'^[a-f0-9]{64}$' then return false;end if;
 foreach key in array array['email:'||p_email_hash,'ip:'||p_ip_hash] loop
 insert into pn_private.password_limits values(key,now(),1) on conflict(bucket) do update set attempts=case when password_limits.started_at<now()-interval '1 minute' then 1 else password_limits.attempts+1 end,started_at=case when password_limits.started_at<now()-interval '1 minute' then now() else password_limits.started_at end returning attempts into count;
 if count>(case when key like 'email:%' then 15 else 100 end) then allowed=false;end if;
 end loop;return allowed;
end $$;
revoke all on function public.password_auth_limit(text,text) from public;grant execute on function public.password_auth_limit(text,text) to anon,authenticated;
commit;
