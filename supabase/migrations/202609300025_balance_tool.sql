-- M14-a. No table/tenant policy change. Back up before applying.
-- Rollback after removing balance tools from active projections: drop this
-- wrapper and rename valid_public_tool_v3 back to valid_public_tool.
begin;
alter function pn_private.valid_public_tool(jsonb) rename to valid_public_tool_v3;
create function pn_private.valid_public_tool(t jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare side text; v jsonb;
begin
 if jsonb_typeof(t) is distinct from 'object' then return false;end if;
 if t->>'kind' is distinct from 'balance' then return coalesce(pn_private.valid_public_tool_v3(t),false);end if;
 if not t ?& array['kind','left','right'] or exists(select 1 from jsonb_object_keys(t) key where key not in ('kind','left','right')) then return false;end if;
 foreach side in array array['left','right'] loop
  v=t->side;
  if jsonb_typeof(v) is distinct from 'object' or not v ?& array['x','constant'] then return false;end if;
  if exists(select 1 from jsonb_object_keys(v) key where key not in ('x','constant')) then return false;end if;
  if jsonb_typeof(v->'x') is distinct from 'number' or jsonb_typeof(v->'constant') is distinct from 'number' then return false;end if;
  if v->>'x'!~'^-?[0-9]{1,2}$' or v->>'constant'!~'^-?[0-9]{1,4}$' then return false;end if;
  if (v->>'x')::integer not between -12 and 12 or (v->>'constant')::integer not between -1000 and 1000 then return false;end if;
 end loop;
 return (t->'left'->>'x')::integer<>(t->'right'->>'x')::integer;
exception when others then return false;
end $$;
revoke all on function pn_private.valid_public_tool(jsonb) from public,anon,authenticated;
commit;
