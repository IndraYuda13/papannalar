-- Zod discriminated unions emit oneOf. Require exactly one matching strict branch.
begin;
create or replace function pn_private.matches_sync_schema(s jsonb, v jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare t text; kv record; a jsonb; n numeric;
begin
 if v is null or s is null or jsonb_typeof(s)<>'object' or not (s ? 'type' or s ? 'anyOf' or s ? 'oneOf') then return false; end if;
 if s ? 'const' and s->'const' <> v then return false; end if;
 if s ? 'enum' and not exists(select 1 from jsonb_array_elements(s->'enum') e where e=v) then return false; end if;
 if s ? 'oneOf' then
  n=0; for a in select value from jsonb_array_elements(s->'oneOf') loop
   if pn_private.matches_sync_schema(a,v) then n=n+1;end if;
  end loop;return n=1;
 end if;
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

commit;
