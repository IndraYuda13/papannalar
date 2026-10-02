-- M14-c. Backup before applying. Public descriptors only; no model/ink storage.
-- Rollback: revoke active new-mode presentations, restore remote mode allowlist,
-- strip split/spotlight/viewId/layout, restore validator v8 + its CHECK binding.
begin;
create function pn_private.valid_public_split(s jsonb, groups_value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare panel jsonb; exercise jsonb; seen text[]='{}'; questions text[];
begin
 if jsonb_typeof(s)<>'object' or not s?'panels' or exists(select 1 from jsonb_object_keys(s) k where k<>'panels') or jsonb_typeof(s->'panels')<>'array' or jsonb_array_length(s->'panels') not between 2 and 4 then return false;end if;
 for panel in select value from jsonb_array_elements(s->'panels') loop
  if jsonb_typeof(panel)<>'object' or not panel ?& array['groupId','exercises'] or exists(select 1 from jsonb_object_keys(panel) k where k not in ('groupId','exercises')) or jsonb_typeof(panel->'groupId')<>'string' or panel->>'groupId'=any(seen) or not exists(select 1 from jsonb_array_elements(groups_value) g where g->>'id'=panel->>'groupId') or jsonb_typeof(panel->'exercises')<>'array' or jsonb_array_length(panel->'exercises') not between 2 and 3 then return false;end if;
  seen=array_append(seen,panel->>'groupId');questions='{}';
  for exercise in select value from jsonb_array_elements(panel->'exercises') loop
   if jsonb_typeof(exercise)<>'object' or not exercise ?& array['id','prompt'] or exists(select 1 from jsonb_object_keys(exercise) k where k not in ('id','prompt','tool')) or jsonb_typeof(exercise->'id')<>'string' or exercise->>'id'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or exercise->>'id'=any(questions) or not pn_private.valid_math_prompt(exercise->'prompt') or (exercise?'tool' and not pn_private.valid_public_tool(exercise->'tool')) then return false;end if;
   questions=array_append(questions,exercise->>'id');
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
alter table pn_private.presentations drop constraint public_state_allowlist;
alter function pn_private.valid_public_state(jsonb) rename to valid_public_state_v8;
create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare base jsonb=p-'viewId'-'layout'-'split'-'spotlight'; spot jsonb=p->'spotlight'; layout_value jsonb=p->'layout'; mode_value text=p->>'mode';
begin
 if p?'viewId' and (jsonb_typeof(p->'viewId')<>'string' or p->>'viewId'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$') then return false;end if;
 if p?'layout' and (jsonb_typeof(layout_value)<>'object' or not layout_value ?& array['touchZone','largeObjects'] or exists(select 1 from jsonb_object_keys(layout_value) k where k not in ('touchZone','largeObjects')) or jsonb_typeof(layout_value->'touchZone')<>'string' or layout_value->>'touchZone' not in ('normal','sd') or jsonb_typeof(layout_value->'largeObjects')<>'boolean') then return false;end if;
 if (mode_value='spotlight') is distinct from (p?'spotlight') then return false;end if;
 if p?'spotlight' then
  if not p?'viewId' or jsonb_typeof(spot)<>'object' or not spot ?& array['id','returnMode','tool'] or exists(select 1 from jsonb_object_keys(spot) k where k not in ('id','returnMode','tool')) or jsonb_typeof(spot->'id')<>'string' or spot->>'id'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or jsonb_typeof(spot->'returnMode')<>'string' or spot->>'returnMode' not in ('opening','continuation','station','together','split') or not pn_private.valid_public_tool(spot->'tool') then return false;end if;
  mode_value=spot->>'returnMode';
 end if;
 if (mode_value='split') is distinct from (p?'split') then return false;end if;
 if p?'split' and not pn_private.valid_public_split(p->'split',p->'groups') then return false;end if;
 if mode_value='together' and not p?'tool' then return false;end if;
 if p?'activity' and mode_value not in ('station','together') then return false;end if;
 base=jsonb_set(base,'{mode}',to_jsonb(case when mode_value in ('split','together') then 'station' else mode_value end));
 return pn_private.valid_public_state_v8(base);
exception when others then return false;
end $$;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));
revoke all on function pn_private.valid_public_state(jsonb),pn_private.valid_public_split(jsonb,jsonb) from public,anon,authenticated;
create or replace function public.remote_tool_action(p_action text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid();is_board boolean=coalesce(auth.jwt()->>'is_anonymous','')='true';p pn_private.presentations;r pn_private.remote_tools;cmd jsonb;answer jsonb; changed boolean=false;
begin
 if u is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>2048 or p_input->>'action'<>p_action or p_action not in ('join','read','send','ack') or not p_input ?& array['action','presentationId','channelEpoch','taskEpoch'] then return '{"error":"INVALID_INPUT"}';end if;
 if not pn_private.matches_sync_schema((select body from pn_private.sync_schemas where id='remote-request-v1'),p_input) then return '{"error":"INVALID_INPUT"}';end if;
 select * into p from pn_private.presentations where id=(p_input->>'presentationId')::uuid and not revoked and expires_at>now() and ((is_board and board_id=u) or (not is_board and owner_id=u)) for update;
 if not found then return '{"error":"FORBIDDEN"}';end if;
 if p.channel_epoch<>(p_input->>'channelEpoch')::uuid or p.public_state->>'taskEpoch'<>p_input->>'taskEpoch' then return '{"error":"CONFLICT"}';end if;
 if p.public_state->>'mode' not in ('opening','station','together','split','spotlight') then return '{"error":"FORBIDDEN"}';end if;
 delete from pn_private.remote_tools where expires_at<now();
 select * into r from pn_private.remote_tools where presentation_id=p.id;
 if p_action='join' then
  if not is_board or not p_input ? 'instanceId' then return '{"error":"FORBIDDEN"}';end if;
  if r.instance_id is distinct from (p_input->>'instanceId')::uuid or r.task_epoch is distinct from (p_input->>'taskEpoch')::uuid then
   insert into pn_private.remote_tools(presentation_id,instance_id,task_epoch,expires_at) values(p.id,(p_input->>'instanceId')::uuid,(p_input->>'taskEpoch')::uuid,p.expires_at)
   on conflict(presentation_id) do update set instance_id=excluded.instance_id,task_epoch=excluded.task_epoch,sequence=0,command=null,receipt=null,sent_at=null,move_at=null returning * into r;
  end if;
 elsif p_action='send' then
  if is_board then return '{"error":"FORBIDDEN"}';end if;
  cmd=p_input->'command';
  if cmd is null or not pn_private.matches_sync_schema((select body from pn_private.sync_schemas where id='remote-command-v1'),cmd) then return '{"error":"INVALID_INPUT"}';end if;
  if r.instance_id is null or r.instance_id<>(cmd->>'instanceId')::uuid or r.task_epoch<>(cmd->>'taskEpoch')::uuid or r.task_epoch<>(p_input->>'taskEpoch')::uuid then return '{"error":"CONFLICT"}';end if;
  if r.command->>'id'=cmd->>'id' then
   if r.command<>cmd then return '{"error":"CONFLICT"}';end if;
  else
   if (cmd->>'sequence')::int<>r.sequence+1 then return '{"error":"CONFLICT"}';end if;
   if r.command is not null and r.receipt is null and r.command->'input'->>'kind'<>'move' and r.sent_at>now()-interval '3 seconds' then return '{"error":"CONFLICT"}';end if;
   if cmd->'input'->>'kind'='move' and r.move_at>clock_timestamp()-interval '100 milliseconds' then return '{"error":"RATE_LIMITED"}';end if;
   update pn_private.remote_tools set sequence=(cmd->>'sequence')::int,command=cmd,receipt=null,sent_at=clock_timestamp(),move_at=case when cmd->'input'->>'kind'='move' then clock_timestamp() else move_at end where presentation_id=p.id returning * into r;
   changed=true;
  end if;
 elsif p_action='ack' then
  if not is_board then return '{"error":"FORBIDDEN"}';end if;
  if r.instance_id is null or r.instance_id<>(p_input->>'instanceId')::uuid or r.task_epoch<>(p_input->>'taskEpoch')::uuid then return '{"error":"CONFLICT"}';end if;
  answer=p_input->'receipt';
  if answer is null or jsonb_typeof(answer)<>'object' or not answer ?& array['id','applied','editable'] or exists(select 1 from jsonb_object_keys(answer) k where k not in ('id','applied','editable')) or jsonb_typeof(answer->'applied')<>'boolean' or jsonb_typeof(answer->'editable')<>'boolean' then return '{"error":"INVALID_INPUT"}';end if;
  if r.command->>'id' is distinct from answer->>'id' then return '{"error":"CONFLICT"}';end if;
  update pn_private.remote_tools set receipt=answer where presentation_id=p.id returning * into r;changed=true;
 end if;
 -- Expired input is never delivered after reconnect. Only the latest bounded mailbox exists.
 if r.sent_at<clock_timestamp()-interval '3 seconds' then
  update pn_private.remote_tools set command=null,receipt=null where presentation_id=p.id returning * into r;
 end if;
 answer=jsonb_build_object('instanceId',case when r.task_epoch=(p_input->>'taskEpoch')::uuid then r.instance_id end,'sequence',coalesce(r.sequence,0),'command',r.command,'receipt',r.receipt);
 if changed then
  begin perform realtime.send('{}'::jsonb,'remote','pn:input:'||p.id::text||':'||p.channel_epoch::text,true);exception when others then null;end;
 end if;
 return answer;
exception when invalid_text_representation or numeric_value_out_of_range then return '{"error":"INVALID_INPUT"}';
end $$;
commit;
