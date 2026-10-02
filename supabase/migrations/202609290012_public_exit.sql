-- Public question projection, no keys/levels/diagnoses. Backup before migration.
-- Rollback strips exit then restores validator v6 and its CHECK binding.
begin;
create function pn_private.valid_public_question(q jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare node jsonb; option_value jsonb; labels text[]='{}';
begin
 if jsonb_typeof(q)<>'object' or not q ?& array['id','prompt','options','unknownLabel'] or exists(select 1 from jsonb_object_keys(q) field_key where field_key not in ('id','prompt','options','unknownLabel')) or jsonb_typeof(q->'id')<>'string' or q->>'id'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or jsonb_typeof(q->'unknownLabel')<>'string' or q->>'unknownLabel'<>'?' then return false;end if;
 if jsonb_typeof(q->'prompt')<>'array' or jsonb_array_length(q->'prompt') not between 1 and 20 or jsonb_typeof(q->'options')<>'array' or jsonb_array_length(q->'options')<>4 then return false;end if;
 for node in select value from jsonb_array_elements(q->'prompt') loop
  if jsonb_typeof(node)<>'object' then return false;end if;
  if node->>'kind'='text' then
   if not node ?& array['kind','text'] or exists(select 1 from jsonb_object_keys(node) field_key where field_key not in ('kind','text')) or jsonb_typeof(node->'text')<>'string' or length(node->>'text') not between 1 and 1000 then return false;end if;
  elsif node->>'kind'='fraction' then
   if not node ?& array['kind','numerator','denominator'] or exists(select 1 from jsonb_object_keys(node) field_key where field_key not in ('kind','numerator','denominator')) or jsonb_typeof(node->'numerator')<>'string' or jsonb_typeof(node->'denominator')<>'string' or node->>'numerator'!~'^-?[0-9]{1,12}$' or node->>'denominator'!~'^[1-9][0-9]{0,11}$' then return false;end if;
  else return false;end if;
 end loop;
 for option_value in select value from jsonb_array_elements(q->'options') loop
  if jsonb_typeof(option_value)<>'object' or not option_value ?& array['label','text'] or exists(select 1 from jsonb_object_keys(option_value) field_key where field_key not in ('label','text')) or jsonb_typeof(option_value->'label')<>'string' or option_value->>'label' not in ('A','B','C','D') or (option_value->>'label')=any(labels) or jsonb_typeof(option_value->'text')<>'string' or length(option_value->>'text') not between 1 and 1000 then return false;end if;
  labels=array_append(labels,option_value->>'label');
 end loop;
 return true;
exception when others then return false;
end $$;
create function pn_private.valid_public_exit(e jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare group_value jsonb; number_value jsonb; seen integer[]='{}'; ids text[]='{}';
begin
 if jsonb_typeof(e)<>'object' or not e ?& array['id','row','groups'] or exists(select 1 from jsonb_object_keys(e) field_key where field_key not in ('id','row','groups')) or jsonb_typeof(e->'id')<>'string' or e->>'id'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or jsonb_typeof(e->'row')<>'number' or e->>'row'!~'^[123]$' or jsonb_typeof(e->'groups')<>'array' or jsonb_array_length(e->'groups') not between 1 and 4 then return false;end if;
 for group_value in select value from jsonb_array_elements(e->'groups') loop
  if jsonb_typeof(group_value)<>'object' or not group_value ?& array['id','label','attendanceNumbers','question'] or exists(select 1 from jsonb_object_keys(group_value) field_key where field_key not in ('id','label','attendanceNumbers','question')) or jsonb_typeof(group_value->'id')<>'string' or group_value->>'id'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or (group_value->>'id')=any(ids) or group_value->>'label' not in ('Segitiga Biru','Lingkaran Oranye','Kotak Hijau','Belah Ketupat Ungu') or not pn_private.valid_public_question(group_value->'question') or jsonb_typeof(group_value->'attendanceNumbers')<>'array' or jsonb_array_length(group_value->'attendanceNumbers') not between 1 and 40 then return false;end if;
  if jsonb_typeof(group_value->'label')<>'string' then return false;end if;
  ids=array_append(ids,group_value->>'id');
  for number_value in select value from jsonb_array_elements(group_value->'attendanceNumbers') loop
   if jsonb_typeof(number_value)<>'number' or number_value::text!~'^([1-9]|[1-3][0-9]|40)$' or (number_value::text)::integer=any(seen) then return false;end if;
   seen=array_append(seen,(number_value::text)::integer);
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
alter table pn_private.presentations drop constraint public_state_allowlist;
alter function pn_private.valid_public_state(jsonb) rename to valid_public_state_v6;
create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if p?'exit' and (p->>'mode'<>'exit' or not pn_private.valid_public_exit(p->'exit')) then return false;end if;
 return pn_private.valid_public_state_v6(p-'exit');
exception when others then return false;
end $$;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));
revoke all on function pn_private.valid_public_state(jsonb),pn_private.valid_public_exit(jsonb),pn_private.valid_public_question(jsonb) from public,anon,authenticated;
commit;
