-- M15-a: fix SQL alias ambiguity; clearing cache also clears its receipt.
-- Previous migration immutable. Rollback with pre-m15a backup and paired-session revoke.
begin;
create or replace function pn_private.valid_board_packet(p jsonb) returns boolean language plpgsql stable set search_path='' as $$
declare a jsonb;m jsonb;g jsonb;ids text[]='{}';qids text[]='{}';seen text[]='{}';nums text[]='{}';n jsonb;
begin
 if not pn_private.matches_sync_schema((select body from pn_private.sync_schemas where id='board-packet-v1'),p) then return false;end if;
 for a in select value from jsonb_array_elements(p#>'{content,content,activities}') loop
  if a->>'id'=any(ids) then return false;end if;ids=array_append(ids,a->>'id');
  for m in select value from jsonb_array_elements(a->'board') loop qids=array_append(qids,m->>'id');end loop;
 end loop;
 for m in select value from jsonb_array_elements(p#>'{content,models}') loop
  if not m->>'questionId'=any(qids) or m->>'questionId'=any(seen) or not pn_private.valid_public_tool(m->'tool') then return false;end if;
  seen=array_append(seen,m->>'questionId');
 end loop;
 if p#>'{content,lesson}'?'tool' and not pn_private.valid_public_tool(p#>'{content,lesson,tool}') then return false;end if;
 seen='{}';
 for g in select value from jsonb_array_elements(p#>'{plan,groups}') loop
  if g->>'id'=any(seen) or not g->>'activityId'=any(ids) or not g->>'exitActivityId'=any(ids) or not g->>'contextActivityId'=any(ids) then return false;end if;
  seen=array_append(seen,g->>'id');
  for n in select value from jsonb_array_elements(g->'attendanceNumbers') loop
   if n::text=any(nums) then return false;end if;nums=array_append(nums,n::text);
  end loop;
 end loop;
 if p->'plan'?'firstStation' then
  for a in select value from jsonb_array_elements(p#>'{plan,firstStation,assignments}') loop
   if not a->>'groupId'=any(seen) then return false;end if;
  end loop;
 end if;
 for a in select value from jsonb_array_elements(p#>'{plan,stations}') loop
  if not pn_private.valid_public_state(jsonb_build_object('schemaVersion',1,'mode','station','question',1,'taskEpoch',p#>'{plan,id}','groups',(select jsonb_agg(group_row-'activityId'-'exitActivityId'-'contextActivityId') from jsonb_array_elements(p#>'{plan,groups}') group_row),'station',a)) then return false;end if;
 end loop;
 return true;
exception when others then return false;
end $$;
create or replace function public.board_content_action(p_action text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid();is_board boolean=coalesce(auth.jwt()->>'is_anonymous','')='true';p pn_private.presentations;c pn_private.board_packages;v jsonb;result jsonb;epoch text;groups_value jsonb;
begin
 if u is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>524288 or p_input->>'action' is distinct from p_action or not p_input ?& array['presentationId','channelEpoch','action'] then return '{"error":"INVALID_INPUT"}';end if;
 select * into p from pn_private.presentations where id=(p_input->>'presentationId')::uuid and not revoked and expires_at>now() and ((is_board and board_id=u) or (not is_board and owner_id=u)) for update;
 if not found then return '{"error":"FORBIDDEN"}';end if;
 if p.channel_epoch<>(p_input->>'channelEpoch')::uuid then return '{"error":"CONFLICT"}';end if;
 select * into c from pn_private.board_packages where presentation_id=p.id and channel_epoch=p.channel_epoch;
 if p_action='write' then
  if is_board then return '{"error":"FORBIDDEN"}';end if;
  if not p_input?'packet' or exists(select 1 from jsonb_object_keys(p_input) k where k not in ('action','presentationId','channelEpoch','packet')) or not pn_private.valid_board_packet(p_input->'packet') then return '{"error":"INVALID_INPUT"}';end if;
  v=p_input->'packet';
  if p.public_state#>'{package,id}' is distinct from v#>'{content,content,id}' or p.public_state#>'{package,revision}' is distinct from v#>'{content,content,revision}' then return '{"error":"CONFLICT"}';end if;
  if c.packet#>'{content,content,id}'=v#>'{content,content,id}' and c.packet#>'{content,content,revision}'=v#>'{content,content,revision}' and c.packet->'content'<>v->'content' then return '{"error":"CONFLICT"}';end if;
  if c.packet is distinct from v then
   if not pn_private.consume_pairing_limit('content:'||u::text,20) then return '{"error":"RATE_LIMITED"}';end if;
   insert into pn_private.board_packages(presentation_id,channel_epoch,packet) values(p.id,p.channel_epoch,v)
   on conflict(presentation_id) do update set packet=excluded.packet,channel_epoch=excluded.channel_epoch,packet_version=board_packages.packet_version+1,
    cached=case when board_packages.channel_epoch=excluded.channel_epoch and board_packages.packet->'content'=excluded.packet->'content' then board_packages.cached else false end,
    proposal=case when board_packages.channel_epoch=excluded.channel_epoch and board_packages.packet=excluded.packet then board_packages.proposal else null end,resolution=null returning * into c;
  end if;
 elsif p_action='read' then
  if exists(select 1 from jsonb_object_keys(p_input) k where k not in ('action','presentationId','channelEpoch','knownVersion')) or (p_input?'knownVersion' and (jsonb_typeof(p_input->'knownVersion')<>'number' or p_input->>'knownVersion'!~'^[0-9]{1,9}$')) then return '{"error":"INVALID_INPUT"}';end if;
 elsif p_action in ('cached','uncache') then
  if not is_board then return '{"error":"FORBIDDEN"}';end if;
  if exists(select 1 from jsonb_object_keys(p_input) k where k not in ('action','presentationId','channelEpoch','packageId','revision')) then return '{"error":"INVALID_INPUT"}';end if;
  if c.packet is null or c.packet#>'{content,content,id}' is distinct from p_input->'packageId' or c.packet#>'{content,content,revision}' is distinct from p_input->'revision' then return '{"error":"CONFLICT"}';end if;
  update pn_private.board_packages set cached=(p_action='cached') where presentation_id=p.id returning * into c;
 elsif p_action='propose' then
  if not is_board then return '{"error":"FORBIDDEN"}';end if;
  v=p_input->'payload';
  if exists(select 1 from jsonb_object_keys(p_input) k where k not in ('action','presentationId','channelEpoch','payload')) or c.packet is null or not pn_private.valid_public_state(v) or v ?| array['roles','guidance','spotlight'] then return '{"error":"INVALID_INPUT"}';end if;
  if v#>'{package,id}' is distinct from c.packet#>'{content,content,id}' or v#>'{package,revision}' is distinct from c.packet#>'{content,content,revision}' then return '{"error":"CONFLICT"}';end if;
  select coalesce(jsonb_agg(g-'activityId'-'exitActivityId'-'contextActivityId'),'[]') into groups_value from jsonb_array_elements(c.packet#>'{plan,groups}') g;
  if v->'groups'<>'[]'::jsonb and v->'groups'<>groups_value then return '{"error":"INVALID_INPUT"}';end if;
  if c.resolution->>'epoch' is distinct from v->>'taskEpoch' then
   update pn_private.board_packages set proposal=v,resolution=null where presentation_id=p.id returning * into c;
   update pn_private.presentations set ack_at=null,ack_revision=0,ack_command_id=null where id=p.id;
   delete from pn_private.remote_tools where presentation_id=p.id;
  end if;
 elsif p_action='resolve' then
  if is_board then return '{"error":"FORBIDDEN"}';end if;
  if not p_input ?& array['proposalEpoch','baseRevision','commandId','taskEpoch','choice'] or exists(select 1 from jsonb_object_keys(p_input) k where k not in ('action','presentationId','channelEpoch','proposalEpoch','baseRevision','commandId','taskEpoch','choice')) or p_input->>'choice' not in ('board','teacher') then return '{"error":"INVALID_INPUT"}';end if;
  if c.proposal is null or c.proposal->>'taskEpoch' is distinct from p_input->>'proposalEpoch' then return '{"error":"CONFLICT"}';end if;
  epoch=c.proposal->>'taskEpoch';
  v=case when p_input->>'choice'='board' then c.proposal else p.public_state end;
  v=jsonb_set(v,'{taskEpoch}',p_input->'taskEpoch');
  result=public.presentation_action('publish',jsonb_build_object('action','publish','presentationId',p.id,'channelEpoch',p.channel_epoch,'baseRevision',p_input->'baseRevision','commandId',p_input->'commandId','payload',v));
  if result?'error' then return result;end if;
  update pn_private.board_packages set proposal=null,resolution=jsonb_build_object('epoch',epoch,'revision',result#>'{envelope,revision}') where presentation_id=p.id returning * into c;
 else return '{"error":"INVALID_INPUT"}';end if;
 return jsonb_build_object('packet',case when is_board and c.packet_version is distinct from (p_input->>'knownVersion')::integer then c.packet else null end,'packetVersion',coalesce(c.packet_version,0),'cached',coalesce(c.cached,false),'proposal',c.proposal,'resolution',c.resolution) || case when result is not null then jsonb_build_object('snapshot',result) else '{}'::jsonb end;
exception when invalid_text_representation or check_violation or not_null_violation then return '{"error":"INVALID_INPUT"}';
end $$;
commit;
