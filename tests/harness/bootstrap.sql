-- Test harness only: match the Supabase auth functions on an isolated PostgreSQL.
-- This is not a substitute for testing the GoTrue service itself.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, is_anonymous boolean not null default false);
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb;
$$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select (auth.jwt()->>'sub')::uuid;
$$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
-- Test-only Realtime SQL surface: exercises actual RLS, not a WebSocket server.
create schema if not exists realtime;
create table if not exists realtime.messages (topic text,extension text,payload jsonb);
alter table realtime.messages enable row level security;
grant usage on schema realtime to authenticated;
grant select,insert on realtime.messages to authenticated;
create or replace function realtime.topic() returns text language sql stable as $$
 select current_setting('realtime.topic',true);
$$;
create or replace function realtime.send(payload jsonb,event text,topic text,private boolean) returns void language sql as $$
 insert into realtime.messages(topic,extension,payload) values(topic,'broadcast',payload);
$$;
