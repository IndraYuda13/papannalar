-- JSON Schema tuples are used for the four fixed card choices. Keep all strict
-- object/enum/bounds checks, including recursive calls, from the existing validator.
begin;
alter function pn_private.matches_sync_schema(jsonb,jsonb) rename to matches_sync_schema_before_tuples;
create function pn_private.matches_sync_schema(s jsonb,v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare n integer;i integer;
begin
 if s ? 'prefixItems' then
  if jsonb_typeof(v)<>'array' then return false;end if;n=jsonb_array_length(v);
  if n<>jsonb_array_length(s->'prefixItems') then return false;end if;
  for i in 0..n-1 loop if not pn_private.matches_sync_schema(s->'prefixItems'->i,v->i) then return false;end if;end loop;return true;
 end if;
 return pn_private.matches_sync_schema_before_tuples(s,v);
exception when others then return false;
end $$;
commit;
