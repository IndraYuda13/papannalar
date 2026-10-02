-- Public catalog context and opening roles. No student identity or free ink.
-- Rollback: strip lesson; remove roles from opening states; rebind validator v5.
begin;
alter table pn_private.presentations drop constraint public_state_allowlist;
alter function pn_private.valid_public_state(jsonb) rename to valid_public_state_v5;
create function pn_private.valid_public_lesson(l jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text;
begin
 if jsonb_typeof(l)<>'object' or not l ?& array['prompt','followup','objective','why','intuitiveOnly','oralReflection'] or exists(select 1 from jsonb_object_keys(l) k where k not in ('prompt','followup','objective','why','intuitiveOnly','oralReflection','tool')) then return false;end if;
 foreach k in array array['prompt','followup','objective','why'] loop
  if jsonb_typeof(l->k)<>'string' or length(l->>k) not between 1 and 500 then return false;end if;
 end loop;
 if jsonb_typeof(l->'intuitiveOnly')<>'boolean' or jsonb_typeof(l->'oralReflection')<>'boolean' then return false;end if;
 return not l?'tool' or pn_private.valid_public_tool(l->'tool');
exception when others then return false;
end $$;
create function pn_private.valid_opening_roles(r jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare n jsonb; seen integer[]='{}';
begin
 if jsonb_typeof(r)<>'object' or not r ?& array['taskId','pilots','navigators'] or exists(select 1 from jsonb_object_keys(r) k where k not in ('taskId','pilots','navigators')) or jsonb_typeof(r->'taskId')<>'string' or (r->>'taskId')!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or jsonb_typeof(r->'pilots')<>'array' or jsonb_typeof(r->'navigators')<>'array' or jsonb_array_length(r->'pilots')>2 or jsonb_array_length(r->'navigators')>2 then return false;end if;
 for n in select value from jsonb_array_elements((r->'pilots')||(r->'navigators')) loop
  if jsonb_typeof(n)<>'number' or n::text!~'^([1-9]|[1-3][0-9]|40)$' or (n::text)::integer=any(seen) then return false;end if;
  seen=array_append(seen,(n::text)::integer);
 end loop;
 return true;
exception when others then return false;
end $$;
create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if p?'lesson' and not pn_private.valid_public_lesson(p->'lesson') then return false;end if;
 if p->>'mode'='opening' and p?'roles' then
  return pn_private.valid_opening_roles(p->'roles') and pn_private.valid_public_state_v5(p-'lesson'-'roles');
 end if;
 return pn_private.valid_public_state_v5(p-'lesson');
exception when others then return false;
end $$;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));
revoke all on function pn_private.valid_public_state(jsonb),pn_private.valid_public_lesson(jsonb),pn_private.valid_opening_roles(jsonb) from public,anon,authenticated;
commit;
