-- Board-owned recovery: revoke only this authenticated anonymous board's grants.
-- Preserve teacher sessions, answers, packages, progress, profiles and old SQL.
-- Back up pn_private.presentations/pairings/remote_tools before hosted application.
-- Rollback: revoke active grants; restore presentation_action_before_board_reset
-- as presentation_action, retaining board_reset_receipts until retries expire.
begin;
create table pn_private.board_reset_receipts (
 board_id uuid not null references auth.users(id) on delete cascade,
 reset_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(board_id,reset_id)
);
alter table pn_private.board_reset_receipts enable row level security;
revoke all on pn_private.board_reset_receipts from public,anon,authenticated;

alter function public.presentation_action(text,jsonb) rename to presentation_action_before_board_reset;
revoke all on function public.presentation_action_before_board_reset(text,jsonb) from public,anon,authenticated;
create function public.presentation_action(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid=auth.uid(); board uuid; rid uuid; ids uuid[];
 is_board boolean=coalesce(auth.jwt()->>'is_anonymous','')='true';
begin
 if u is null or coalesce(auth.jwt()->>'is_anonymous','') not in ('true','false') or
    jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>8192 then
  return '{"error":"FORBIDDEN"}';
 end if;
 -- Serialize reset/create/claim for one board before the existing row locks.
 -- Claims lock pairings before auth.users/presentations; reset must never race
 -- a claim into a new grant or introduce the reverse pairing lock order.
 if is_board and p_action in ('reset','create','resume') then board=u;
 elsif not is_board and p_action='claim' then
  select board_id into board from pn_private.pairings
   where code_hash=p_input->>'codeHash' and not claimed and expires_at>now();
 end if;
 if board is not null then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('pn:board-reset'),pg_catalog.hashtext(board::text));
 end if;
 if p_action<>'reset' then
  return public.presentation_action_before_board_reset(p_action,p_input);
 end if;
 if not is_board or p_input- 'action'- 'resetId'- 'ipHash'<>'{}'::jsonb or
    coalesce(p_input->>'ipHash','')!~'^[a-f0-9]{64}$' then return '{"error":"FORBIDDEN"}';end if;
 rid=(p_input->>'resetId')::uuid;
 if rid is null then return '{"error":"FORBIDDEN"}';end if;
 -- Lost responses can be retried without revoking a later, freshly paired run.
 if exists(select 1 from pn_private.board_reset_receipts where board_id=u and reset_id=rid) then
  return '{"ok":true}';
 end if;
 if not pn_private.consume_pairing_limit('reset:'||u::text,12) or
    not pn_private.consume_pairing_limit('reset:ip:'||(p_input->>'ipHash'),50) then
  return '{"error":"RATE_LIMITED"}';
 end if;
 with changed as (
  update pn_private.presentations set revoked=true,channel_epoch=gen_random_uuid(),
   controller_seen_at=null,ack_revision=0,ack_command_id=null,ack_at=null
   where board_id=u and not revoked returning id
 ) select coalesce(array_agg(id),'{}'::uuid[]) into ids from changed;
 update pn_private.pairings set claimed=true where board_id=u and not claimed;
 delete from pn_private.remote_tools where presentation_id=any(ids);
 insert into pn_private.board_reset_receipts(board_id,reset_id) values(u,rid);
 return '{"ok":true}';
exception when invalid_text_representation then return '{"error":"FORBIDDEN"}';
end $$;
revoke all on function public.presentation_action(text,jsonb) from public,anon;
grant execute on function public.presentation_action(text,jsonb) to authenticated;
commit;
