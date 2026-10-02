-- Durable session dependency groups. Backup before applying; rollback by revoking
-- sync_action first, then restore the test/staging snapshot. Never drop live data.
begin;
create table pn_private.sync_schemas (id text primary key, body jsonb not null);
insert into pn_private.sync_schemas values('mutation-v1',$schema${"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"schemaVersion":{"type":"number","const":1},"eventId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"deviceId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"clientSequence":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"classId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"sessionId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"baseRevision":{"type":"integer","minimum":0,"maximum":9007199254740991},"writerEpoch":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"operation":{"type":"string","enum":["session-save","session-delete"]},"payload":{"anyOf":[{"type":"object","properties":{"engineVersion":{"type":"number","const":1},"cycle":{"type":"object","properties":{"schemaVersion":{"type":"number","const":1},"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"classId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"packageId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"ordinal":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"revision":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"absentStudentIds":{"maxItems":40,"type":"array","items":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"}},"groups":{"maxItems":4,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"label":{"type":"string","enum":["Segitiga Biru","Lingkaran Oranye","Kotak Hijau","Belah Ketupat Ungu"]},"members":{"minItems":1,"maxItems":40,"type":"array","items":{"type":"object","properties":{"studentId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"attendanceNumber":{"type":"integer","minimum":1,"maximum":40},"active":{"type":"boolean"},"displayed":{"oneOf":[{"type":"object","properties":{"kind":{"type":"string","const":"step"},"stepId":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]}},"required":["kind","stepId"],"additionalProperties":false},{"type":"object","properties":{"kind":{"type":"string","const":"lanjut"}},"required":["kind"],"additionalProperties":false}]}},"required":["studentId","attendanceNumber","active","displayed"],"additionalProperties":false}},"composition":{"minItems":1,"maxItems":22,"type":"array","items":{"type":"object","properties":{"placement":{"oneOf":[{"type":"object","properties":{"kind":{"type":"string","const":"step"},"stepId":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]}},"required":["kind","stepId"],"additionalProperties":false},{"type":"object","properties":{"kind":{"type":"string","const":"lanjut"}},"required":["kind"],"additionalProperties":false}]},"count":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991}},"required":["placement","count"],"additionalProperties":false}},"activityStep":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"exitBaseStep":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"exitContextStep":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"extensionSteps":{"maxItems":22,"type":"array","items":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]}},"supportStudentIds":{"maxItems":40,"type":"array","items":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"}},"enrichmentStudentIds":{"maxItems":40,"type":"array","items":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"}}},"required":["id","label","members","composition","activityStep","exitBaseStep","exitContextStep","extensionSteps","supportStudentIds","enrichmentStudentIds"],"additionalProperties":false}},"classEnded":{"type":"boolean"},"assessmentRevision":{"type":"integer","minimum":0,"maximum":9007199254740991}},"required":["schemaVersion","id","classId","packageId","ordinal","revision","absentStudentIds","groups","classEnded","assessmentRevision"],"additionalProperties":false},"package":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"classId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"grade":{"type":"integer","minimum":1,"maximum":12},"target":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"variant":{"type":"string","enum":["initial","weekly","oral","short"]},"seed":{"type":"integer","minimum":0,"maximum":4294967295},"revision":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"openingStep":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"assessment":{"maxItems":10,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"stepId":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"seed":{"type":"integer","minimum":0,"maximum":4294967295},"version":{"anyOf":[{"type":"number","const":1},{"type":"number","const":2}]}},"required":["id","stepId","seed","version"],"additionalProperties":false}},"activities":{"minItems":1,"maxItems":22,"type":"array","items":{"type":"object","properties":{"stepId":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"board":{"minItems":2,"maxItems":3,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"stepId":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"seed":{"type":"integer","minimum":0,"maximum":4294967295},"version":{"anyOf":[{"type":"number","const":1},{"type":"number","const":2}]}},"required":["id","stepId","seed","version"],"additionalProperties":false}},"independent":{"minItems":3,"maxItems":3,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"stepId":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"seed":{"type":"integer","minimum":0,"maximum":4294967295},"version":{"anyOf":[{"type":"number","const":1},{"type":"number","const":2}]}},"required":["id","stepId","seed","version"],"additionalProperties":false}},"optional":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"stepId":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"seed":{"type":"integer","minimum":0,"maximum":4294967295},"version":{"anyOf":[{"type":"number","const":1},{"type":"number","const":2}]}},"required":["id","stepId","seed","version"],"additionalProperties":false},"guided":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"stepId":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"seed":{"type":"integer","minimum":0,"maximum":4294967295},"version":{"anyOf":[{"type":"number","const":1},{"type":"number","const":2}]}},"required":["id","stepId","seed","version"],"additionalProperties":false},"exit":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"stepId":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"seed":{"type":"integer","minimum":0,"maximum":4294967295},"version":{"anyOf":[{"type":"number","const":1},{"type":"number","const":2}]}},"required":["id","stepId","seed","version"],"additionalProperties":false},"exitContext":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"stepId":{"type":"string","enum":["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4","D5","D6","E1","E2","E3","E4"]},"seed":{"type":"integer","minimum":0,"maximum":4294967295},"version":{"anyOf":[{"type":"number","const":1},{"type":"number","const":2}]}},"required":["id","stepId","seed","version"],"additionalProperties":false}},"required":["stepId","board","independent","optional","guided","exit","exitContext"],"additionalProperties":false}}},"required":["id","classId","grade","target","variant","seed","revision","openingStep","assessment","activities"],"additionalProperties":false},"roster":{"minItems":1,"maxItems":40,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"classId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"attendanceNumber":{"type":"integer","minimum":1,"maximum":40},"active":{"type":"boolean"}},"required":["id","classId","attendanceNumber","active"],"additionalProperties":false}},"exitId":{"anyOf":[{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},{"type":"null"}]},"cards":{"maxItems":80,"type":"array","items":{"type":"object","properties":{"sessionId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"studentId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"revision":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"choices":{"minItems":2,"maxItems":10,"type":"array","items":{"type":"string","enum":["A","B","C","D","?","missing"]}},"source":{"type":"string","enum":["omr","manual","demo"]}},"required":["sessionId","studentId","revision","choices","source"],"additionalProperties":false}}},"required":["engineVersion","cycle","package","roster","exitId","cards"],"additionalProperties":false},{"type":"null"}]}},"required":["schemaVersion","eventId","deviceId","clientSequence","classId","sessionId","baseRevision","writerEpoch","operation","payload"],"additionalProperties":false}$schema$::jsonb);

-- Closed subset used by the checked-in Zod JSON schema. Every object forbids
-- extra keys, including nested objects. No user-supplied schema is accepted.
create function pn_private.matches_sync_schema(s jsonb, v jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare t text; kv record; a jsonb; n numeric;
begin
 if v is null then return false; end if;
 if s ? 'const' and s->'const' <> v then return false; end if;
 if s ? 'enum' and not exists(select 1 from jsonb_array_elements(s->'enum') e where e=v) then return false; end if;
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
create table pn_private.deleted_classes (id uuid primary key, owner_id uuid not null references auth.users(id), deleted_at timestamptz not null default now());
create table pn_private.sync_sessions (
 id uuid primary key, owner_id uuid not null, class_id uuid not null,
 ordinal integer not null check(ordinal>0), revision integer not null check(revision>0),
 device_id uuid not null, writer_epoch integer not null default 1 check(writer_epoch>0),
 payload jsonb, deleted boolean not null default false,
 foreign key(class_id,owner_id) references public.classes(id,owner_id) on delete cascade,
 unique(class_id,ordinal), check(deleted=(payload is null))
);
create table pn_private.sync_receipts (
 owner_id uuid not null references auth.users(id), event_id uuid not null,
 class_id uuid not null, session_id uuid not null, payload_hash text not null,
 revision integer not null, sequence bigint generated always as identity,
 primary key(owner_id,event_id)
);
alter table pn_private.sync_schemas enable row level security;
alter table pn_private.deleted_classes enable row level security;
alter table pn_private.sync_sessions enable row level security;
alter table pn_private.sync_receipts enable row level security;
create policy sync_session_owner on pn_private.sync_sessions for select to authenticated using(owner_id=auth.uid() and auth.jwt()->>'is_anonymous'='false');
create policy sync_receipt_owner on pn_private.sync_receipts for select to authenticated using(owner_id=auth.uid() and auth.jwt()->>'is_anonymous'='false');
revoke all on pn_private.sync_schemas,pn_private.deleted_classes,pn_private.sync_sessions,pn_private.sync_receipts from public,anon,authenticated;

create function pn_private.class_tombstone() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='DELETE' then
  insert into pn_private.deleted_classes(id,owner_id) values(old.id,old.owner_id) on conflict do nothing;
  delete from pn_private.sync_receipts where class_id=old.id;
  -- presentation_sessions cascade revokes membership and its realtime topic.
  return old;
 end if;
 if exists(select 1 from pn_private.deleted_classes where id=new.id) then raise exception 'Deleted class';end if;
 return new;
end $$;
create trigger class_delete_tombstone before delete on public.classes for each row execute function pn_private.class_tombstone();
create trigger class_no_resurrection before insert on public.classes for each row execute function pn_private.class_tombstone();

create function public.sync_action(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid(); cid uuid; sid uuid; eid uuid; d jsonb; s pn_private.sync_sessions;
 receipt pn_private.sync_receipts; schema_doc jsonb; student jsonb; card jsonb; previous_card jsonb;
 fingerprint text; next_revision int; seq bigint;
begin
 if u is null or coalesce(auth.jwt()->>'is_anonymous','')<>'false' then return '{"error":"FORBIDDEN"}';end if;
 if jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>262144 then return '{"error":"INVALID_INPUT"}';end if;
 cid=(p_input->>'classId')::uuid;
 if not exists(select 1 from public.classes where id=cid and owner_id=u) then return '{"error":"FORBIDDEN"}';end if;
 -- Serialize the class dependency chain (including first writer allocation).
 perform 1 from public.classes where id=cid and owner_id=u for update;
 if p_action='read' then
  if (select count(*) from jsonb_object_keys(p_input))<>1 then return '{"error":"INVALID_INPUT"}';end if;
  return jsonb_build_object('records',coalesce((select jsonb_agg(jsonb_build_object('sessionId',id,'revision',revision,'writerEpoch',writer_epoch,'deviceId',device_id,'payload',payload) order by ordinal) from pn_private.sync_sessions where class_id=cid and owner_id=u and not deleted),'[]'::jsonb));
 end if;
 if p_action<>'apply' then return '{"error":"INVALID_INPUT"}';end if;
 select body into schema_doc from pn_private.sync_schemas where id='mutation-v1';
 if not pn_private.matches_sync_schema(schema_doc,p_input) then return '{"error":"INVALID_INPUT"}';end if;
 eid=(p_input->>'eventId')::uuid; sid=(p_input->>'sessionId')::uuid;
 fingerprint=encode(sha256(convert_to(p_input::text,'UTF8')),'hex');
 select * into receipt from pn_private.sync_receipts where owner_id=u and event_id=eid;
 if found then
  if receipt.payload_hash<>fingerprint then return '{"error":"CONFLICT"}';end if;
  return jsonb_build_object('eventId',eid,'status','accepted','revision',receipt.revision,'sequence',receipt.sequence);
 end if;
 select * into s from pn_private.sync_sessions where id=sid for update;
 if found and (s.owner_id<>u or s.class_id<>cid) then return '{"error":"FORBIDDEN"}';end if;
 if coalesce(s.deleted,false) then return jsonb_build_object('eventId',eid,'status','deleted','revision',s.revision,'sequence',0);end if;
 if coalesce(s.revision,0)<>(p_input->>'baseRevision')::int or
 (s.id is not null and (s.device_id<>(p_input->>'deviceId')::uuid or s.writer_epoch<>(p_input->>'writerEpoch')::int)) or
 (s.id is null and (p_input->>'writerEpoch')::int<>1) then
  return jsonb_build_object('eventId',eid,'status','conflict','revision',coalesce(s.revision,0),'sequence',0);
 end if;
 d=p_input->'payload';next_revision=coalesce(s.revision,0)+1;
 if p_input->>'operation'='session-delete' then
  if s.id is null or d<>'null'::jsonb then return '{"error":"INVALID_INPUT"}';end if;
  update pn_private.sync_sessions set deleted=true,payload=null,revision=next_revision where id=sid;
  delete from pn_private.sync_receipts where session_id=sid and owner_id=u;
  update pn_private.presentations set revoked=true,channel_epoch=gen_random_uuid() where session_id=sid and owner_id=u;
 else
  if d='null'::jsonb or (d->'cycle'->>'id')::uuid<>sid or (d->'cycle'->>'classId')::uuid<>cid or
   (d->'package'->>'classId')::uuid<>cid or d->'cycle'->'packageId'<>d->'package'->'id' then return '{"error":"INVALID_INPUT"}';end if;
  if exists(select 1 from pn_private.sync_sessions where class_id=cid and ordinal<(d->'cycle'->>'ordinal')::int and not deleted and (payload->'cycle'->>'assessmentRevision')::int=0) then return '{"error":"CONFLICT"}';end if;
  if (d->'cycle'->>'ordinal')::int>1 and not exists(select 1 from pn_private.sync_sessions where class_id=cid and ordinal=(d->'cycle'->>'ordinal')::int-1 and not deleted) then return '{"error":"CONFLICT"}';end if;
  if s.id is not null and (s.ordinal<>(d->'cycle'->>'ordinal')::int or s.payload->'package'<>d->'package' or s.payload->'roster'<>d->'roster' or
   (s.payload->'exitId'<>'null'::jsonb and s.payload->'exitId'<>d->'exitId') or
   (jsonb_array_length(s.payload->'cycle'->'groups')>0 and s.payload->'cycle'->'groups'<>d->'cycle'->'groups') or
   (s.payload->'cycle'->>'assessmentRevision')::int>(d->'cycle'->>'assessmentRevision')::int or
   (s.payload->'cycle'->>'classEnded')::boolean and not (d->'cycle'->>'classEnded')::boolean) then return '{"error":"CONFLICT"}';end if;
  for student in select value from jsonb_array_elements(d->'roster') loop
   if (student->>'classId')::uuid<>cid or not exists(select 1 from public.students where id=(student->>'id')::uuid and class_id=cid and owner_id=u and attendance_number=(student->>'attendanceNumber')::int) then return '{"error":"FORBIDDEN"}';end if;
  end loop;
  if (select count(distinct x->>'id') from jsonb_array_elements(d->'roster') x)<>jsonb_array_length(d->'roster') then return '{"error":"INVALID_INPUT"}';end if;
  for card in select value from jsonb_array_elements(d->'cards') loop
   if not exists(select 1 from jsonb_array_elements(d->'roster') r where r->'id'=card->'studentId') or
    card->'sessionId' not in (d->'cycle'->'id',d->'exitId') then return '{"error":"FORBIDDEN"}';end if;
  end loop;
  if s.id is not null then
   for previous_card in select value from jsonb_array_elements(s.payload->'cards') loop
    select value into card from jsonb_array_elements(d->'cards') where value->'studentId'=previous_card->'studentId' and value->'sessionId'=previous_card->'sessionId';
    if not found or (card->>'revision')::int<(previous_card->>'revision')::int or
     ((card->>'revision')::int=(previous_card->>'revision')::int and card<>previous_card) then return '{"error":"CONFLICT"}';end if;
   end loop;
  end if;
  insert into pn_private.sync_sessions(id,owner_id,class_id,ordinal,revision,device_id,payload)
   values(sid,u,cid,(d->'cycle'->>'ordinal')::int,next_revision,(p_input->>'deviceId')::uuid,d)
   on conflict(id) do update set revision=next_revision,payload=d;
 end if;
 insert into pn_private.sync_receipts(owner_id,event_id,class_id,session_id,payload_hash,revision)
  values(u,eid,cid,sid,fingerprint,next_revision) returning sequence into seq;
 return jsonb_build_object('eventId',eid,'status','accepted','revision',next_revision,'sequence',seq);
exception when invalid_text_representation or unique_violation or check_violation then return '{"error":"INVALID_INPUT"}';
end $$;
revoke all on function pn_private.matches_sync_schema(jsonb,jsonb),pn_private.class_tombstone() from public,anon,authenticated;
revoke all on function public.sync_action(text,jsonb) from public,anon;
grant execute on function public.sync_action(text,jsonb) to authenticated;
commit;
