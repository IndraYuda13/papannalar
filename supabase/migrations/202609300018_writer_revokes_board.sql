-- A learning-writer takeover also invalidates the previous controller's board channel.
begin;
alter function public.sync_action(text,jsonb) rename to sync_action_v3;
revoke all on function public.sync_action_v3(text,jsonb) from public,anon,authenticated;
create function public.sync_action(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare before_epoch integer; result jsonb;u uuid=auth.uid();
begin
 if p_action<>'takeover' then return public.sync_action_v3(p_action,p_input);end if;
 if u is null or coalesce(auth.jwt()->>'is_anonymous','')<>'false' then return '{"error":"FORBIDDEN"}';end if;
 perform 1 from public.classes where id=(p_input->>'classId')::uuid and owner_id=u for update;
 if not found then return '{"error":"FORBIDDEN"}';end if;
 select writer_epoch into before_epoch from pn_private.sync_sessions where id=(p_input->>'sessionId')::uuid and owner_id=u;
 result=public.sync_action_v3(p_action,p_input);
 if not result ? 'error' and (result->>'writerEpoch')::integer>before_epoch then
  update pn_private.presentations set revoked=true,channel_epoch=gen_random_uuid() where session_id=(p_input->>'sessionId')::uuid and owner_id=u and not revoked;
 end if;
 return result;
exception when invalid_text_representation then return '{"error":"INVALID_INPUT"}';
end $$;
revoke all on function public.sync_action(text,jsonb) from public,anon;
grant execute on function public.sync_action(text,jsonb) to authenticated;
commit;
