-- M09 exact model inputs, no grading/identity fields. Rollback strips ratio/algebra
-- tool from active states then restores valid_public_tool_v1 after backup.
begin;
alter function pn_private.valid_public_tool(jsonb) rename to valid_public_tool_v1;
create function pn_private.valid_public_tool(t jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text;
begin
 if jsonb_typeof(t)<>'object' then return false;end if;
 if t->>'kind'='fractions' then return pn_private.valid_public_tool_v1(t);end if;
 if t->>'kind'='ratio' then
  if not t ?& array['kind','baseX','baseY','targetX'] or exists(select 1 from jsonb_object_keys(t) key where key not in ('kind','baseX','baseY','targetX')) then return false;end if;
  foreach k in array array['baseX','baseY','targetX'] loop
   if jsonb_typeof(t->k)<>'number' or (t->>k)!~'^[0-9]{1,5}$' or (t->>k)::integer not between 1 and 10000 then return false;end if;
  end loop;
  return true;
 elsif t->>'kind'='algebra' then
  if not t ?& array['kind','groups','xPerGroup','constantPerGroup'] or exists(select 1 from jsonb_object_keys(t) key where key not in ('kind','groups','xPerGroup','constantPerGroup')) then return false;end if;
  foreach k in array array['groups','xPerGroup','constantPerGroup'] loop
   if jsonb_typeof(t->k)<>'number' or (t->>k)!~'^-?[0-9]$' then return false;end if;
  end loop;
  return (t->>'groups')::integer between 1 and 6 and (t->>'xPerGroup')::integer between -3 and 3 and (t->>'constantPerGroup')::integer between -9 and 9;
 end if;
 return false;
exception when others then return false;
end $$;
revoke all on function pn_private.valid_public_tool(jsonb) from public,anon,authenticated;
commit;
