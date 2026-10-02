-- ADDITIVE PROPOSAL after SQL033 + SQL034; parent assigns the migration number.
-- SQL034 remains frozen. Back up pn_private.presentations/pairings first.
-- Rollback: revoke active grants, drop presentation_logout, restore
-- presentation_action_before_logout as presentation_action, retain tombstones.
-- No library run is closed or changed by logout. SQL execution NOT_RUN here.
begin;
create table pn_private.presentation_controller_revocations (
 owner_id uuid not null references auth.users(id) on delete cascade,
 controller_id uuid not null,
 revoked_at timestamptz not null default now(),
 primary key(owner_id,controller_id)
);
alter table pn_private.presentation_controller_revocations enable row level security;
revoke all on pn_private.presentation_controller_revocations from public,anon,authenticated;

-- Serializes a tab's in-flight claim with logout, including a claim that had not
-- inserted its presentation yet. Different tabs/accounts retain separate grants.
alter function public.presentation_action(text,jsonb) rename to presentation_action_before_logout;
revoke all on function public.presentation_action_before_logout(text,jsonb) from public,anon,authenticated;
create function public.presentation_action(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid();c uuid;
begin
 if u is not null and coalesce(auth.jwt()->>'is_anonymous','')='false' and p_input?'controllerId' then
  c=(p_input->>'controllerId')::uuid;
  if c is null then return '{"error":"FORBIDDEN"}';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(u::text),pg_catalog.hashtext(c::text));
  if exists(select 1 from pn_private.presentation_controller_revocations where owner_id=u and controller_id=c) then
   if p_action='resume' then return '{"snapshot":null}';end if;
   return '{"error":"FORBIDDEN"}';
  end if;
 end if;
 return public.presentation_action_before_logout(p_action,p_input);
exception when invalid_text_representation then return '{"error":"INVALID_INPUT"}';
end $$;
revoke all on function public.presentation_action(text,jsonb) from public,anon;
grant execute on function public.presentation_action(text,jsonb) to authenticated;

create function public.presentation_logout(p_controller_id uuid default null,p_sample_controller uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid();a pn_private.sample_accounts;ids uuid[];n integer;
begin
 if u is null or coalesce(auth.jwt()->>'is_anonymous','')<>'false' then return '{"error":"FORBIDDEN"}';end if;
 -- Compatibility for old callers: absent identity never means all controllers.
 if p_controller_id is null then return '{"ok":true,"revoked":0}';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(u::text),pg_catalog.hashtext(p_controller_id::text));
 select * into a from pn_private.sample_accounts where owner_id=u for update;
 -- Observer, missing cookie and displaced sample browser may sign out without
 -- changing the active sample controller or its lease. Matching an expired but
 -- not yet replaced cookie may still revoke its own stale tab grant.
 if found and (p_sample_controller is null or a.controller is distinct from p_sample_controller) then
  return '{"ok":true,"revoked":0}';
 end if;
 insert into pn_private.presentation_controller_revocations(owner_id,controller_id)
 values(u,p_controller_id) on conflict do nothing;
 with changed as (
  update pn_private.presentations set revoked=true,channel_epoch=gen_random_uuid(),controller_seen_at=null
  where owner_id=u and controller_id=p_controller_id and not revoked returning id
 ) select coalesce(array_agg(id),'{}'::uuid[]),count(*)::integer into ids,n from changed;
 -- Existing reconnect codes are bound to these revoked IDs and therefore fail
 -- SQL034 claim. Do not lock pairings after presentations: claim locks them in
 -- the opposite order, and logout must not deadlock a legitimate takeover.
 delete from pn_private.remote_tools where presentation_id=any(ids);
 return jsonb_build_object('ok',true,'revoked',n);
end $$;
revoke all on function public.presentation_logout(uuid,uuid) from public,anon;
grant execute on function public.presentation_logout(uuid,uuid) to authenticated;
commit;
