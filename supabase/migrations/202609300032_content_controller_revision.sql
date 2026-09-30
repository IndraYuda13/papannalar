-- M15-a: changing the RAM run plan must not silently discard a local-controller proposal.
-- A stale plan can only return to the teacher state, or be reselected on the board.
-- Rollback: revoke active sessions, restore board_content_action_v2, drop trigger/column.
begin;
alter table pn_private.board_packages add column proposal_packet_version integer;
create function pn_private.preserve_local_proposal() returns trigger language plpgsql set search_path='' as $$
begin
 if old.proposal is not null and old.channel_epoch=new.channel_epoch and old.packet->'content'=new.packet->'content' then
  new.proposal=old.proposal;new.proposal_packet_version=old.proposal_packet_version;
 end if;
 return new;
end $$;
create trigger preserve_local_proposal before update of packet on pn_private.board_packages for each row when (old.packet is distinct from new.packet) execute function pn_private.preserve_local_proposal();
alter function public.board_content_action(text,jsonb) rename to board_content_action_v2;
create function public.board_content_action(p_action text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;p pn_private.presentations;c pn_private.board_packages;u uuid=auth.uid();is_board boolean=coalesce(auth.jwt()->>'is_anonymous','')='true';
begin
 if p_action in ('propose','resolve') then
  select * into p from pn_private.presentations where id=(p_input->>'presentationId')::uuid and not revoked and expires_at>now() and ((is_board and board_id=u) or (not is_board and owner_id=u)) for update;
  if not found then return '{"error":"FORBIDDEN"}';end if;
  select * into c from pn_private.board_packages where presentation_id=p.id and channel_epoch=p.channel_epoch;
  if p_action='propose' then
   if not is_board then return '{"error":"FORBIDDEN"}';end if;
   if not p_input?'packetVersion' or jsonb_typeof(p_input->'packetVersion')<>'number' or p_input->>'packetVersion'!~'^[1-9][0-9]{0,8}$' then return '{"error":"INVALID_INPUT"}';end if;
   if c.packet_version is distinct from (p_input->>'packetVersion')::integer then return '{"error":"CONFLICT"}';end if;
  elsif p_input->>'choice'='board' and c.proposal_packet_version is distinct from c.packet_version then return '{"error":"CONFLICT"}';end if;
 end if;
 result=public.board_content_action_v2(p_action,case when p_action='propose' then p_input-'packetVersion' else p_input end);
 if result?'error' then return result;end if;
 if p_action='propose' then
  update pn_private.board_packages set proposal_packet_version=packet_version where presentation_id=p.id and proposal->>'taskEpoch'=p_input#>>'{payload,taskEpoch}';
 end if;
 select * into c from pn_private.board_packages where presentation_id=(p_input->>'presentationId')::uuid and channel_epoch=(p_input->>'channelEpoch')::uuid;
 return result||jsonb_build_object('proposalStale',c.proposal is not null and c.proposal_packet_version is distinct from c.packet_version);
exception when invalid_text_representation then return '{"error":"INVALID_INPUT"}';
end $$;
revoke all on function pn_private.preserve_local_proposal(),public.board_content_action_v2(text,jsonb) from public,anon,authenticated;
revoke all on function public.board_content_action(text,jsonb) from public,anon;
grant execute on function public.board_content_action(text,jsonb) to authenticated;
commit;
