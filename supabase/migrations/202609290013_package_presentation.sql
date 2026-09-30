-- M10-c: bounded package projections. Backup before applying; rollback by removing
-- check/activity/package fields, restoring snapshot v1 and binding validator v7.
begin;
create function pn_private.valid_math_prompt(p jsonb) returns boolean language sql immutable set search_path='' as $$
 select pn_private.valid_public_question(jsonb_build_object('id','10000000-0000-4000-8000-000000000001','prompt',p,'options','[{"label":"A","text":"A"},{"label":"B","text":"B"},{"label":"C","text":"C"},{"label":"D","text":"D"}]'::jsonb,'unknownLabel','?'))
$$;
create function pn_private.valid_public_activity(a jsonb, p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare g jsonb; prompt_value jsonb; seen text[]='{}';
begin
 if jsonb_typeof(a)<>'object' or not a ?& array['id','groupId','index','total','prompt','independent'] or exists(select 1 from jsonb_object_keys(a) field_key where field_key not in ('id','groupId','index','total','prompt','independent')) then return false;end if;
 if jsonb_typeof(a->'id')<>'string' or a->>'id'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or jsonb_typeof(a->'groupId')<>'string' or not exists(select 1 from jsonb_array_elements(p->'station'->'assignments') v where v->>'groupId'=a->>'groupId' and v->>'station'='Papan') then return false;end if;
 if jsonb_typeof(a->'index')<>'number' or a->>'index'!~'^[1-3]$' or jsonb_typeof(a->'total')<>'number' or a->>'total'!~'^[23]$' or (a->>'index')::integer>(a->>'total')::integer or not pn_private.valid_math_prompt(a->'prompt') or jsonb_typeof(a->'independent')<>'array' or jsonb_array_length(a->'independent')>2 then return false;end if;
 for g in select value from jsonb_array_elements(a->'independent') loop
  if jsonb_typeof(g)<>'object' or not g ?& array['groupId','prompts'] or exists(select 1 from jsonb_object_keys(g) field_key where field_key not in ('groupId','prompts')) or jsonb_typeof(g->'groupId')<>'string' or g->>'groupId'=any(seen) or not exists(select 1 from jsonb_array_elements(p->'station'->'assignments') v where v->>'groupId'=g->>'groupId' and v->>'station'='Mandiri') or jsonb_typeof(g->'prompts')<>'array' or jsonb_array_length(g->'prompts')<>3 then return false;end if;
  seen=array_append(seen,g->>'groupId');
  for prompt_value in select value from jsonb_array_elements(g->'prompts') loop
   if not pn_private.valid_math_prompt(prompt_value) then return false;end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
alter table pn_private.presentations drop constraint public_state_allowlist;
alter function pn_private.valid_public_state(jsonb) rename to valid_public_state_v7;
create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare c jsonb; pkg jsonb; base jsonb=p-'check'-'activity'-'package';
begin
 if p?'package' then
  pkg=p->'package';
  if jsonb_typeof(pkg)<>'object' or not pkg ?& array['id','revision'] or exists(select 1 from jsonb_object_keys(pkg) field_key where field_key not in ('id','revision')) or jsonb_typeof(pkg->'id')<>'string' or pkg->>'id'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or jsonb_typeof(pkg->'revision')<>'number' or pkg->>'revision'!~'^[1-9][0-9]{0,8}$' then return false;end if;
 end if;
 if p?'check' then
  c=p->'check';
  if p->>'mode'<>'check' or jsonb_typeof(c)<>'object' or not c ?& array['packageId','revision','total','seconds','question'] or exists(select 1 from jsonb_object_keys(c) field_key where field_key not in ('packageId','revision','total','seconds','question')) or not (p?'package') or c->'packageId' is distinct from pkg->'id' or c->'revision' is distinct from pkg->'revision' or jsonb_typeof(c->'total')<>'number' or c->>'total' not in ('5','10') or jsonb_typeof(c->'seconds')<>'number' or c->>'seconds' not in ('60','75','80') or not pn_private.valid_public_question(c->'question') or jsonb_typeof(p->'question')<>'number' or p->>'question'!~'^([1-9]|10)$' or (p->>'question')::integer>(c->>'total')::integer then return false;end if;
  base=jsonb_set(base,'{question}','1'::jsonb);
 end if;
 if p?'activity' and (p->>'mode'<>'station' or not (p?'station') or not pn_private.valid_public_activity(p->'activity',p)) then return false;end if;
 return pn_private.valid_public_state_v7(base);
exception when others then return false;
end $$;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));
create or replace function pn_private.presentation_snapshot(p pn_private.presentations) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('envelope',jsonb_build_object('protocolVersion',1,'presentationId',p.id,'channelEpoch',p.channel_epoch,'revision',p.revision,'commandId',p.command_id,'packageVersion',case when p.public_state?'package' then 'package-v1:'||(p.public_state->'package'->>'id')||':'||(p.public_state->'package'->>'revision') else 'prelim-7b-v1' end,'payload',p.public_state),'ackRevision',p.ack_revision,'ackCommandId',p.ack_command_id,'ackAt',p.ack_at)
$$;
revoke all on function pn_private.valid_math_prompt(jsonb),pn_private.valid_public_activity(jsonb,jsonb),pn_private.valid_public_state(jsonb) from public,anon,authenticated;
commit;
