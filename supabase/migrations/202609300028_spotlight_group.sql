-- M14-c: selected public group for the single-group spotlight, no roster expansion.
-- Rollback: strip spotlight.groupId and bind public_state_allowlist to validator v9.
begin;
alter table pn_private.presentations drop constraint public_state_allowlist;
alter function pn_private.valid_public_state(jsonb) rename to valid_public_state_v9;
create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if p->'spotlight'?'groupId' and (jsonb_typeof(p->'spotlight'->'groupId')<>'string' or not exists(select 1 from jsonb_array_elements(p->'groups') g where g->'id'=p->'spotlight'->'groupId')) then return false;end if;
 return pn_private.valid_public_state_v9(p #- '{spotlight,groupId}');
exception when others then return false;
end $$;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));
revoke all on function pn_private.valid_public_state(jsonb) from public,anon,authenticated;
commit;
