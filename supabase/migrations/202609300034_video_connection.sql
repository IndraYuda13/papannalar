-- PROPOSAL SQL034. Parent applies as a NEW numbered migration after SQL033.
-- Back up pn_private pairing/presentation/board_packages and library_runs first.
-- Rollback: revoke active presentations; restore presentation_action_before_video
-- and remove the video helper/columns. Do not undo progress/results or SQL033.
-- No applied migration is edited by this worker. SQL integration NOT_RUN here.
begin;
alter table pn_private.presentations add column controller_id uuid;
alter table pn_private.presentations add column controller_seen_at timestamptz;
alter table pn_private.pairings add column resume_presentation_id uuid references pn_private.presentations(id) on delete cascade;

-- Closed runs never come back through a fresh QR, either. This reads the parent
-- SQL033 run status; classical sessions retain their existing lifecycle rules.
create function pn_private.presentation_session_open(p_session uuid) returns boolean
language sql stable set search_path='' as $$
 select not exists(select 1 from public.library_runs r where r.id=p_session and r.status='closed')
 and not exists(select 1 from pn_private.sync_sessions s where s.id=p_session and
   (s.deleted or s.payload#>>'{cycle,classEnded}'='true'))
$$;

-- A full snapshot is not a heartbeat. Board callers cannot refresh teacher lease.
create function pn_private.presentation_pulse(p pn_private.presentations) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('channelEpoch',p.channel_epoch,'revision',p.revision,
 'ackRevision',p.ack_revision,'ackCommandId',p.ack_command_id,'ackAt',p.ack_at,
 'controllerSeenAt',p.controller_seen_at,'serverNow',now())
$$;

alter function public.presentation_action(text,jsonb) rename to presentation_action_before_video;
revoke all on function public.presentation_action_before_video(text,jsonb) from public,anon,authenticated;
create function public.presentation_action(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid=auth.uid(); is_board boolean=coalesce(auth.jwt()->>'is_anonymous','')='true';
 p pn_private.presentations; pair pn_private.pairings; result jsonb; gate jsonb;
 v_controller uuid; v_session uuid; v_class uuid; bound uuid;
begin
 if u is null or coalesce(auth.jwt()->>'is_anonymous','') not in ('true','false') or
   jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>8192 then return '{"error":"FORBIDDEN"}';end if;
 -- Legacy non-sample callers may omit the tab identity. New clients always send
 -- a per-tab UUID; no snapshot ever reveals the active controller's identity.
 v_controller=coalesce((p_input->>'controllerId')::uuid,u);
 if not is_board and p_action in ('claim','publish','revoke','heartbeat') then
  gate=public.sample_control((p_input->>'sampleController')::uuid,false,false);
  if gate ? 'error' then return '{"error":"CONFLICT"}';end if;
 end if;
 if p_action='create' then
  if not is_board then return '{"error":"FORBIDDEN"}';end if;
  if p_input?'presentationId' then
   select * into p from pn_private.presentations where id=(p_input->>'presentationId')::uuid
    and board_id=u and not revoked and expires_at>now();
   if not found or not pn_private.presentation_session_open(p.session_id) then return '{"error":"FORBIDDEN"}';end if;
  else
   select * into p from pn_private.presentations where board_id=u and not revoked and expires_at>now()
    and pn_private.presentation_session_open(session_id) order by expires_at desc limit 1;
  end if;
  result=public.presentation_action_before_video(p_action,p_input-'presentationId');
  if result?'error' then return result;end if;
  update pn_private.pairings set resume_presentation_id=p.id where id=(result->>'id')::uuid;
  return result;
 elsif p_action='claim' then
  if is_board then return '{"error":"FORBIDDEN"}';end if;
  if not pn_private.consume_pairing_limit('claim:'||u::text,5) or
     not pn_private.consume_pairing_limit('claim:ip:'||coalesce(p_input->>'ipHash','unknown'),50) then return '{"error":"RATE_LIMITED"}';end if;
  v_session=(p_input->>'sessionId')::uuid;v_class=(p_input->>'classId')::uuid;
  -- Lock class first so two claims for the same run serialize with run closure.
  perform 1 from public.classes where id=v_class and owner_id=u for update;
  if not found or not pn_private.valid_public_state(p_input->'payload') then return '{"error":"FORBIDDEN"}';end if;
  perform 1 from public.library_runs where id=v_session for update;
  if not pn_private.presentation_session_open(v_session) then return '{"error":"FORBIDDEN"}';end if;
  if exists(select 1 from public.library_runs r where r.id=v_session and (r.owner_id<>u or r.class_id<>v_class)) then return '{"error":"FORBIDDEN"}';end if;
  if exists(select 1 from pn_private.sync_sessions s where s.id=v_session and (s.owner_id<>u or s.class_id<>v_class)) then return '{"error":"FORBIDDEN"}';end if;
  select * into pair from pn_private.pairings where code_hash=p_input->>'codeHash' and not claimed and expires_at>now() for update;
  if not found then return '{"error":"NOT_FOUND"}';end if;
  -- Serialize claims for one board too; an idle code cannot hijack another run.
  perform 1 from auth.users where id=pair.board_id for update;
  insert into pn_private.presentation_sessions(id,class_id,owner_id) values(v_session,v_class,u) on conflict(id) do nothing;
  if not exists(select 1 from pn_private.presentation_sessions where id=v_session and owner_id=u and class_id=v_class) then return '{"error":"FORBIDDEN"}';end if;
  if pair.resume_presentation_id is not null then
   select * into p from pn_private.presentations where id=pair.resume_presentation_id and session_id=v_session
    and owner_id=u and board_id=pair.board_id and not revoked and expires_at>now() for update;
   if not found then return '{"error":"FORBIDDEN"}';end if;
  else
   select * into p from pn_private.presentations where session_id=v_session and owner_id=u and not revoked and expires_at>now() order by expires_at desc limit 1 for update;
   if exists(select 1 from pn_private.presentations where board_id=pair.board_id and not revoked and expires_at>now() and session_id<>v_session) then return '{"error":"CONFLICT"}';end if;
  end if;
  if p.id is null then
   insert into pn_private.presentations(session_id,owner_id,board_id,public_state,controller_id,controller_seen_at)
    values(v_session,u,pair.board_id,p_input->'payload',v_controller,now()) returning * into p;
  else
   -- Question, revision, command/task identity, timers and public payload survive.
   update pn_private.presentations set board_id=pair.board_id,controller_id=v_controller,controller_seen_at=now(),
    channel_epoch=gen_random_uuid(),ack_revision=0,ack_command_id=null,ack_at=null where id=p.id returning * into p;
   -- Preserve a pending local-board handoff across reconnect; do not resolve it.
   update pn_private.board_packages set channel_epoch=p.channel_epoch,cached=false where presentation_id=p.id;
   delete from pn_private.remote_tools where presentation_id=p.id;
  end if;
  update pn_private.pairings set claimed=true,presentation_id=p.id where id=pair.id;
  result=pn_private.presentation_snapshot(p);
  begin perform realtime.send(result->'envelope','state','pn:state:'||p.id::text||':'||p.channel_epoch::text,true);exception when others then null;end;
  return result;
 elsif p_action='resume' then
  if is_board then
   select * into p from pn_private.presentations where board_id=u and not revoked and expires_at>now()
    and pn_private.presentation_session_open(session_id) order by expires_at desc limit 1;
  else
   select pp.* into p from pn_private.presentations pp join pn_private.presentation_sessions s on s.id=pp.session_id
    where pp.session_id=(p_input->>'sessionId')::uuid and s.class_id=(p_input->>'classId')::uuid and pp.owner_id=u
    and coalesce(pp.controller_id,u)=v_controller and not pp.revoked and pp.expires_at>now()
    and pn_private.presentation_session_open(pp.session_id) order by pp.expires_at desc limit 1;
  end if;
  return jsonb_build_object('snapshot',case when p.id is null then null else pn_private.presentation_snapshot(p) end);
 elsif p_action='status' then
  result=public.presentation_action_before_video(p_action,p_input);
  if result?'error' then return result;end if;
  if result->>'presentationId' is not null and not exists(select 1 from pn_private.presentations
    where id=(result->>'presentationId')::uuid and board_id=u and not revoked and expires_at>now()
      and pn_private.presentation_session_open(session_id)) then
   return jsonb_build_object('presentationId',null,'expired',true);
  end if;
  return result;
 end if;
 select * into p from pn_private.presentations where id=(p_input->>'presentationId')::uuid and not revoked and expires_at>now()
  and ((is_board and board_id=u) or (not is_board and owner_id=u)) for update;
 if not found or not pn_private.presentation_session_open(p.session_id) then return '{"error":"FORBIDDEN"}';end if;
 if not is_board then
  -- Epoch is also a capability for existing content/remote RPCs. Those enforce
  -- exact epochs. A displaced controller cannot fetch the newly rotated epoch.
  if p_action='publish' and not p_input?'controllerId' then
   if p.channel_epoch is distinct from (p_input->>'channelEpoch')::uuid then return '{"error":"CONFLICT"}';end if;
  elsif coalesce(p.controller_id,u)<>v_controller then return '{"error":"FORBIDDEN"}';end if;
 end if;
 if p_action='heartbeat' then
  if not is_board then update pn_private.presentations set controller_seen_at=now() where id=p.id returning * into p;end if;
  return pn_private.presentation_pulse(p);
 elsif p_action='revoke' then
  if is_board then return '{"error":"FORBIDDEN"}';end if;
  update pn_private.pairings set claimed=true where resume_presentation_id=p.id and not claimed;
 end if;
 return public.presentation_action_before_video(p_action,p_input-'controllerId'-'sampleController');
exception when invalid_text_representation or not_null_violation or check_violation or unique_violation then return '{"error":"CONFLICT"}';
end $$;
revoke all on function public.presentation_action(text,jsonb) from public,anon;
grant execute on function public.presentation_action(text,jsonb) to authenticated;
revoke all on function pn_private.presentation_session_open(uuid),pn_private.presentation_pulse(pn_private.presentations) from public,anon,authenticated;
commit;
