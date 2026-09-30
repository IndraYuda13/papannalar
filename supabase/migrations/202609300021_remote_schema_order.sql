-- Fix schema-first validator calls; reject malformed/missing schemas instead of accepting them.
begin;
create or replace function pn_private.matches_sync_schema(s jsonb, v jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare t text; kv record; a jsonb; n numeric;
begin
 if v is null or s is null or jsonb_typeof(s)<>'object' or not (s ? 'type' or s ? 'anyOf') then return false; end if;
 if s ? 'const' and s->'const' <> v then return false; end if;
 if s ? 'enum' and not exists(select 1 from jsonb_array_elements(s->'enum') e where e=v) then return false; end if;
 if s ? 'anyOf' then
  for a in select value from jsonb_array_elements(s->'anyOf') loop
   if pn_private.matches_sync_schema(a,v) then return true; end if;
  end loop; return false;
 end if;
 t=s->>'type';
 if t='integer' then
  if jsonb_typeof(v)<>'number' then return false; end if;
  n=(v::text)::numeric; if trunc(n)<>n then return false; end if;
 elsif t is not null and jsonb_typeof(v)<>t then return false;
 end if;
 if t='object' then
  if s->'additionalProperties' <> 'false'::jsonb then return false; end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(s->'required','[]')) k where not v ? k) then return false;end if;
  for kv in select * from jsonb_each(v) loop
   if not (s->'properties') ? kv.key or not pn_private.matches_sync_schema(s->'properties'->kv.key,kv.value) then return false;end if;
  end loop;
 elsif t='array' then
  if s ? 'minItems' and jsonb_array_length(v)<(s->>'minItems')::int then return false;end if;
  if s ? 'maxItems' and jsonb_array_length(v)>(s->>'maxItems')::int then return false;end if;
  for a in select value from jsonb_array_elements(v) loop
   if not pn_private.matches_sync_schema(s->'items',a) then return false;end if;
  end loop;
 elsif t='string' then
  if s ? 'minLength' and length(v#>>'{}')<(s->>'minLength')::int then return false;end if;
  if s ? 'maxLength' and length(v#>>'{}')>(s->>'maxLength')::int then return false;end if;
  if s ? 'pattern' and (v#>>'{}') !~ (s->>'pattern') then return false;end if;
 elsif t in ('integer','number') then
  n=(v::text)::numeric;
  if s ? 'minimum' and n<(s->>'minimum')::numeric then return false;end if;
  if s ? 'maximum' and n>(s->>'maximum')::numeric then return false;end if;
  if s ? 'exclusiveMinimum' and n<=(s->>'exclusiveMinimum')::numeric then return false;end if;
 end if;
 return true;
exception when others then return false;
end $$;
create or replace function public.board_profile_action(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid();b boolean=coalesce(auth.jwt()->>'is_anonymous','')='true'; profile jsonb;
begin
 if u is null or jsonb_typeof(p_input)<>'object' then return '{"error":"FORBIDDEN"}';end if;
 if p_action='save' then
  if not b then return '{"error":"FORBIDDEN"}';end if;
  if octet_length(p_input::text)>2048 or not pn_private.matches_sync_schema((select body from pn_private.sync_schemas where id='board-profile-v1'),p_input) then return '{"error":"INVALID_INPUT"}';end if;
  if (p_input->>'samples')::integer=0 and (p_input->'medianMs'<>'null'::jsonb or p_input->'p95Ms'<>'null'::jsonb) or
   (p_input->>'samples')::integer>0 and (p_input->'medianMs'='null'::jsonb or p_input->'p95Ms'='null'::jsonb or (p_input->>'p95Ms')::numeric<(p_input->>'medianMs')::numeric) or
   p_input->'pointerEvents'='false'::jsonb and p_input->'touches'<>'0'::jsonb then return '{"error":"INVALID_INPUT"}';end if;
  if not pn_private.consume_pairing_limit('profile:'||u::text,12) then return '{"error":"RATE_LIMITED"}';end if;
  insert into pn_private.board_profiles values(u,p_input,now()) on conflict(board_id) do update set payload=excluded.payload,updated_at=now();
  return '{"saved":true}';
 elsif p_action='read' then
  if b or not p_input ? 'presentationId' or exists(select 1 from jsonb_object_keys(p_input) k where k<>'presentationId') then return '{"error":"FORBIDDEN"}';end if;
  perform 1 from pn_private.presentations p where p.id=(p_input->>'presentationId')::uuid and p.owner_id=u and not p.revoked and p.expires_at>now();
  if not found then return '{"error":"FORBIDDEN"}';end if;
  select bp.payload into profile from pn_private.board_profiles bp join pn_private.presentations p on p.board_id=bp.board_id where p.id=(p_input->>'presentationId')::uuid;
  return profile;
 end if;
 return '{"error":"INVALID_INPUT"}';
exception when invalid_text_representation then return '{"error":"INVALID_INPUT"}';
end $$;
create or replace function public.remote_tool_action(p_action text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid();is_board boolean=coalesce(auth.jwt()->>'is_anonymous','')='true';p pn_private.presentations;r pn_private.remote_tools;cmd jsonb;answer jsonb; changed boolean=false;
begin
 if u is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>2048 or p_input->>'action'<>p_action or p_action not in ('join','read','send','ack') or not p_input ?& array['action','presentationId','channelEpoch','taskEpoch'] then return '{"error":"INVALID_INPUT"}';end if;
 if not pn_private.matches_sync_schema((select body from pn_private.sync_schemas where id='remote-request-v1'),p_input) then return '{"error":"INVALID_INPUT"}';end if;
 select * into p from pn_private.presentations where id=(p_input->>'presentationId')::uuid and not revoked and expires_at>now() and ((is_board and board_id=u) or (not is_board and owner_id=u)) for update;
 if not found then return '{"error":"FORBIDDEN"}';end if;
 if p.channel_epoch<>(p_input->>'channelEpoch')::uuid or p.public_state->>'taskEpoch'<>p_input->>'taskEpoch' then return '{"error":"CONFLICT"}';end if;
 if p.public_state->>'mode' not in ('opening','station') then return '{"error":"FORBIDDEN"}';end if;
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
