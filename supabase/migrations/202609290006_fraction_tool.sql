-- M09 public mathematical model inputs only. Rollback: strip tool, restore v3
-- validator/constraint after backup. No student answers/keys enter this contract.
begin;
alter table pn_private.presentations drop constraint public_state_allowlist;
alter function pn_private.valid_public_state(jsonb) rename to valid_public_state_v3;
create function pn_private.valid_public_tool(t jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare f jsonb; a integer; b integer; x integer; y integer; rest integer;
begin
 if jsonb_typeof(t)<>'object' or not t ?& array['kind','operation','left','right'] or exists(select 1 from jsonb_object_keys(t) k where k not in ('kind','operation','left','right')) or t->>'kind'<>'fractions' or t->>'operation' not in ('represent','add','equivalent') then return false;end if;
 for f in select value from jsonb_array_elements(jsonb_build_array(t->'left',t->'right')) loop
  if jsonb_typeof(f)<>'object' or not f ?& array['numerator','denominator'] or exists(select 1 from jsonb_object_keys(f) k where k not in ('numerator','denominator')) or jsonb_typeof(f->'numerator')<>'number' or jsonb_typeof(f->'denominator')<>'number' or f->>'numerator'!~'^-?[0-9]{1,2}$' or f->>'denominator'!~'^[0-9]{1,2}$' or (f->>'denominator')::integer not between 2 and 12 or abs((f->>'numerator')::integer)>(f->>'denominator')::integer then return false;end if;
 end loop;
 if t->>'operation'='add' then
  a=(t#>>'{left,denominator}')::integer;b=(t#>>'{right,denominator}')::integer;x=a;y=b;
  while y<>0 loop rest=x%y;x=y;y=rest;end loop;
  if a*b/x>12 then return false;end if;
 end if;
 return jsonb_typeof(t->'kind')='string' and jsonb_typeof(t->'operation')='string';
exception when others then return false;
end $$;
create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if not pn_private.valid_public_state_v3(p-'tool') then return false;end if;
 return not p?'tool' or pn_private.valid_public_tool(p->'tool');
exception when others then return false;
end $$;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));
revoke all on function pn_private.valid_public_state(jsonb),pn_private.valid_public_tool(jsonb) from public,anon,authenticated;
commit;
