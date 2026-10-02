-- Preserve command identity across later revisions, not only the latest retry.
begin;
create table pn_private.presentation_commands(
 presentation_id uuid not null references pn_private.presentations(id) on delete cascade,
 command_id uuid not null, request jsonb not null, primary key(presentation_id,command_id)
);
alter table pn_private.presentation_commands enable row level security;
revoke all on pn_private.presentation_commands from public,anon,authenticated;
alter function public.presentation_action(text,jsonb) set schema pn_private;
revoke all on function pn_private.presentation_action(text,jsonb) from public,anon,authenticated;
create function public.presentation_action(p_action text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare pres pn_private.presentations;previous jsonb;allowed jsonb;result jsonb;command uuid;
begin
 if p_action<>'publish' then return pn_private.presentation_action(p_action,p_input);end if;
 if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','')<>'false' then return '{"error":"FORBIDDEN"}';end if;
 select * into pres from pn_private.presentations where id=(p_input->>'presentationId')::uuid and owner_id=auth.uid() and not revoked and expires_at>now() for update;
 if not found then return '{"error":"FORBIDDEN"}';end if;
 if pres.channel_epoch<>(p_input->>'channelEpoch')::uuid then return '{"error":"CONFLICT"}';end if;
 if not pn_private.valid_public_state(p_input->'payload') then return '{"error":"FORBIDDEN"}';end if;
 command=(p_input->>'commandId')::uuid;
 -- Explicit allowlist: arbitrary RPC outer fields cannot enter durable history.
 allowed=jsonb_build_object('channelEpoch',pres.channel_epoch,'baseRevision',(p_input->>'baseRevision')::integer,'payload',p_input->'payload');
 select request into previous from pn_private.presentation_commands where presentation_id=pres.id and command_id=command;
 if found then
  if previous<>allowed then return '{"error":"CONFLICT"}';end if;
  return pn_private.presentation_snapshot(pres);
 end if;
 result=pn_private.presentation_action(p_action,p_input);
 if result?'envelope' then insert into pn_private.presentation_commands values(pres.id,command,allowed);end if;
 return result;
exception when invalid_text_representation or not_null_violation then return '{"error":"CONFLICT"}';
end $$;
revoke all on function public.presentation_action(text,jsonb) from public,anon;
grant execute on function public.presentation_action(text,jsonb) to authenticated;
commit;
