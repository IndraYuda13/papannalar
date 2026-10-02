-- Correct a PL/pgSQL variable/column alias collision without changing the contract.
begin;
create or replace function pn_private.valid_public_lesson(l jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare field_name text;
begin
 if jsonb_typeof(l)<>'object' or not l ?& array['prompt','followup','objective','why','intuitiveOnly','oralReflection'] or exists(select 1 from jsonb_object_keys(l) field_key where field_key not in ('prompt','followup','objective','why','intuitiveOnly','oralReflection','tool')) then return false;end if;
 foreach field_name in array array['prompt','followup','objective','why'] loop
  if jsonb_typeof(l->field_name)<>'string' or length(l->>field_name) not between 1 and 500 then return false;end if;
 end loop;
 if jsonb_typeof(l->'intuitiveOnly')<>'boolean' or jsonb_typeof(l->'oralReflection')<>'boolean' then return false;end if;
 return not l?'tool' or pn_private.valid_public_tool(l->'tool');
exception when others then return false;
end $$;
commit;
