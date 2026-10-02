-- Public roles contain attendance numbers only. Rollback: strip roles, restore
-- validator v2 and constraint. Membership/RLS unchanged; backup before applying.
begin;
alter table pn_private.presentations drop constraint public_state_allowlist;
alter function pn_private.valid_public_state(jsonb) rename to valid_public_state_v2;
create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare r jsonb=p->'roles'; n jsonb; seen integer[]='{}'; allowed integer[]='{}'; g jsonb;
begin
 if not pn_private.valid_public_state_v2(p-'roles') then return false;end if;
 if not p?'roles' then return true;end if;
 if jsonb_typeof(r)<>'object' or not r ?& array['taskId','pilots','navigators'] or exists(select 1 from jsonb_object_keys(r) k where k not in ('taskId','pilots','navigators')) or jsonb_typeof(r->'taskId')<>'string' or (r->>'taskId')!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or jsonb_typeof(r->'pilots')<>'array' or jsonb_typeof(r->'navigators')<>'array' or jsonb_array_length(r->'pilots')>2 or jsonb_array_length(r->'navigators')>2 then return false;end if;
 for g in select value from jsonb_array_elements(p->'groups') loop
  if not p?'station' or exists(select 1 from jsonb_array_elements(p#>'{station,assignments}') a where a->>'groupId'=g->>'id' and a->>'station'='Papan') then
   for n in select value from jsonb_array_elements(g->'attendanceNumbers') loop allowed=array_append(allowed,(n::text)::integer);end loop;
  end if;
 end loop;
 for n in select value from jsonb_array_elements((r->'pilots')||(r->'navigators')) loop
  if jsonb_typeof(n)<>'number' or n::text!~'^([1-9]|[1-3][0-9]|40)$' or (n::text)::integer=any(seen) or not ((n::text)::integer=any(allowed)) then return false;end if;
  seen=array_append(seen,(n::text)::integer);
 end loop;
 return true;
exception when others then return false;
end $$;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));
revoke all on function pn_private.valid_public_state(jsonb) from public,anon,authenticated;
commit;
