-- M09 patterns and exact number-line descriptors. Backup before applying.
-- Rollback: strip pattern and number-line tool from current snapshots, restore
-- valid_public_state_v4 and valid_public_tool_v2; no teacher identity/RLS change.
begin;
alter function pn_private.valid_public_tool(jsonb) rename to valid_public_tool_v2;
create function pn_private.valid_public_tool(t jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; d integer; n integer;
begin
 if t->>'kind'='fractions' and t->>'operation'='equivalent' then
  if not pn_private.valid_public_tool_v2(t) then return false;end if;
  d=(t->'left'->>'denominator')::integer;n=(t->'left'->>'numerator')::integer;
  return exists(select 1 from generate_series(2,12) as p where p<>d and (n*p)%d=0);
 end if;
 if t->>'kind'<>'number-line' then return pn_private.valid_public_tool_v2(t);end if;
 if jsonb_typeof(t)<>'object' or not t ?& array['kind','origin','delta','orientation'] or exists(select 1 from jsonb_object_keys(t) key where key not in ('kind','origin','delta','orientation')) or t->>'orientation' not in ('horizontal','vertical') then return false;end if;
 foreach k in array array['origin','delta'] loop
  v=t->k;
  if jsonb_typeof(v)<>'object' or not v ?& array['numerator','denominator'] or exists(select 1 from jsonb_object_keys(v) key where key not in ('numerator','denominator')) then return false;end if;
  if jsonb_typeof(v->'numerator')<>'number' or jsonb_typeof(v->'denominator')<>'number' or v->>'numerator'!~'^-?[0-9]{1,5}$' or v->>'denominator'!~'^[0-9]{1,5}$' or (v->>'numerator')::integer not between -10000 and 10000 or (v->>'denominator')::integer not between 1 and 10000 then return false;end if;
 end loop;
 return (t->'delta'->>'numerator')::integer<>0;
exception when others then return false;
end $$;
alter function pn_private.valid_public_state(jsonb) rename to valid_public_state_v4;
create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if p ? 'pattern' and (not p ? 'tool' or jsonb_typeof(p->'pattern')<>'string' or p->>'pattern' not in ('predict','watch','explore','build','find-error','together','open')) then return false;end if;
 return pn_private.valid_public_state_v4(p-'pattern');
exception when others then return false;
end $$;
revoke all on function pn_private.valid_public_state(jsonb), pn_private.valid_public_tool(jsonb) from public,anon,authenticated;
commit;
