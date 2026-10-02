-- M08: extend public allowlist, preserving membership/RLS/command ledger.
-- Rollback after backup: remove station from public_state, restore v1 validator
-- from migration 002 and re-add public_state_allowlist. No tenant data deletion.
begin;
alter table pn_private.presentations drop constraint public_state_allowlist;
alter function pn_private.valid_public_state(jsonb) rename to valid_public_state_v1;
create function pn_private.valid_public_station(s jsonb, groups jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare a jsonb; seen text[]='{}'; ng integer=0; np integer=0;
begin
 if jsonb_typeof(s)<>'object' or not s ?& array['round','total','phase','deadlineAt','reserveSeconds','assignments'] or exists(select 1 from jsonb_object_keys(s) k where k not in ('round','total','phase','deadlineAt','reserveSeconds','assignments')) then return false;end if;
 if jsonb_typeof(s->'round')<>'number' or (s->>'round')!~'^[1-4]$' or jsonb_typeof(s->'total')<>'number' or (s->>'total')!~'^[1-4]$' or (s->>'round')::integer>(s->>'total')::integer or jsonb_typeof(s->'phase')<>'string' or s->>'phase' not in ('ready','work','transition','complete') then return false;end if;
 if s->'deadlineAt'<>'null'::jsonb and (jsonb_typeof(s->'deadlineAt')<>'number' or (s->>'deadlineAt')!~'^[0-9]{1,16}$') then return false;end if;
 if jsonb_typeof(s->'reserveSeconds')<>'number' or (s->>'reserveSeconds')!~'^[0-9]{1,3}$' or (s->>'reserveSeconds')::integer>180 or jsonb_typeof(s->'assignments')<>'array' or jsonb_array_length(s->'assignments')<>jsonb_array_length(groups) or jsonb_array_length(groups) not between 1 and 4 then return false;end if;
 for a in select value from jsonb_array_elements(s->'assignments') loop
  if jsonb_typeof(a)<>'object' or not a ?& array['groupId','station'] or exists(select 1 from jsonb_object_keys(a) k where k not in ('groupId','station')) or jsonb_typeof(a->'groupId')<>'string' or jsonb_typeof(a->'station')<>'string' or a->>'station' not in ('Guru','Papan','Mandiri') or (a->>'groupId')=any(seen) or not exists(select 1 from jsonb_array_elements(groups) g where g->>'id'=a->>'groupId') then return false;end if;
  seen=array_append(seen,a->>'groupId');
  if a->>'station'='Guru' then ng=ng+1;end if;
  if a->>'station'='Papan' then np=np+1;end if;
 end loop;
 return ng<=1 and np<=1;
exception when others then return false;
end $$;
create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if not pn_private.valid_public_state_v1(p-'station') then return false;end if;
 return not p?'station' or pn_private.valid_public_station(p->'station',p->'groups');
exception when others then return false;
end $$;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));
revoke all on function pn_private.valid_public_state(jsonb), pn_private.valid_public_station(jsonb,jsonb) from public,anon,authenticated;
commit;
