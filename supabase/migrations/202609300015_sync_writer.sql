begin;
alter function public.sync_action(text,jsonb) rename to sync_action_v1;
revoke all on function public.sync_action_v1(text,jsonb) from public,anon,authenticated;
create function public.sync_action(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid(); cid uuid; sid uuid; s pn_private.sync_sessions;
begin
 if p_action<>'takeover' then return public.sync_action_v1(p_action,p_input);end if;
 if u is null or coalesce(auth.jwt()->>'is_anonymous','')<>'false' then return '{"error":"FORBIDDEN"}';end if;
 if jsonb_typeof(p_input)<>'object' or not p_input ?& array['classId','sessionId','deviceId','baseRevision','expectedEpoch'] or
  exists(select 1 from jsonb_object_keys(p_input) k where k not in ('classId','sessionId','deviceId','baseRevision','expectedEpoch')) or
  (p_input->>'baseRevision') !~ '^[1-9][0-9]{0,8}$' or (p_input->>'expectedEpoch') !~ '^[1-9][0-9]{0,8}$' then return '{"error":"INVALID_INPUT"}';end if;
 cid=(p_input->>'classId')::uuid;sid=(p_input->>'sessionId')::uuid;
 perform 1 from public.classes where id=cid and owner_id=u for update;
 if not found then return '{"error":"FORBIDDEN"}';end if;
 select * into s from pn_private.sync_sessions where id=sid and class_id=cid and owner_id=u and not deleted for update;
 if not found then return '{"error":"NOT_FOUND"}';end if;
 -- Exact retry after a lost ACK does not allocate another epoch.
 if s.device_id=(p_input->>'deviceId')::uuid and s.writer_epoch=(p_input->>'expectedEpoch')::int+1 and s.revision=(p_input->>'baseRevision')::int+1 then
  return jsonb_build_object('sessionId',s.id,'revision',s.revision,'writerEpoch',s.writer_epoch,'deviceId',s.device_id,'payload',s.payload);
 end if;
 if s.revision<>(p_input->>'baseRevision')::int or s.writer_epoch<>(p_input->>'expectedEpoch')::int then return '{"error":"CONFLICT"}';end if;
 update pn_private.sync_sessions set writer_epoch=writer_epoch+1,revision=revision+1,device_id=(p_input->>'deviceId')::uuid where id=sid returning * into s;
 return jsonb_build_object('sessionId',s.id,'revision',s.revision,'writerEpoch',s.writer_epoch,'deviceId',s.device_id,'payload',s.payload);
exception when invalid_text_representation or not_null_violation then return '{"error":"INVALID_INPUT"}';
end $$;
revoke all on function public.sync_action(text,jsonb) from public,anon;
grant execute on function public.sync_action(text,jsonb) to authenticated;
commit;
