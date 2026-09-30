-- M04 public presentation transport only. No response/mastery/name tables.
-- Rollback: revoke execute on presentation_action and remove this migration's
-- policy/functions/tables after snapshot backup; never touch classes/students.
begin;
create schema if not exists pn_private;
revoke all on schema pn_private from public, anon, authenticated;
create table pn_private.pairings (
 id uuid primary key default gen_random_uuid(), board_id uuid not null references auth.users(id),
 code_hash text not null check(code_hash ~ '^[a-f0-9]{64}$'), expires_at timestamptz not null default now()+interval '5 minutes',
 claimed boolean not null default false, presentation_id uuid
);
create unique index pairing_unused_code on pn_private.pairings(code_hash) where not claimed;
create table pn_private.pairing_limits (bucket text primary key, started_at timestamptz not null, attempts integer not null);
create table pn_private.presentation_sessions (
 id uuid primary key, class_id uuid not null,owner_id uuid not null,
 foreign key(class_id,owner_id) references public.classes(id,owner_id) on delete cascade
);
create table pn_private.presentations (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references pn_private.presentation_sessions(id) on delete cascade,
 owner_id uuid not null references auth.users(id), board_id uuid not null references auth.users(id),
 channel_epoch uuid not null default gen_random_uuid(), revision integer not null default 1,
 command_id uuid not null default gen_random_uuid(), public_state jsonb not null,
 ack_revision integer not null default 0, ack_command_id uuid,ack_at timestamptz,
 expires_at timestamptz not null default now()+interval '4 hours',revoked boolean not null default false
);
alter table pn_private.pairings enable row level security;
alter table pn_private.pairing_limits enable row level security;
alter table pn_private.presentation_sessions enable row level security;
alter table pn_private.presentations enable row level security;
revoke all on all tables in schema pn_private from public,anon,authenticated;

create function pn_private.consume_pairing_limit(p_bucket text,p_max integer) returns boolean language plpgsql set search_path='' as $$
declare n integer;
begin
 insert into pn_private.pairing_limits values(p_bucket,now(),1)
 on conflict(bucket) do update set
 attempts=case when pn_private.pairing_limits.started_at < now()-interval '1 minute' then 1 else pn_private.pairing_limits.attempts+1 end,
 started_at=case when pn_private.pairing_limits.started_at < now()-interval '1 minute' then now() else pn_private.pairing_limits.started_at end
 returning attempts into n;
 return n<=p_max;
end $$;

create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare g jsonb; n jsonb; seen integer[]='{}';
begin
 if jsonb_typeof(p) <> 'object' or not p ?& array['schemaVersion','mode','question','taskEpoch','groups'] or
 exists(select 1 from jsonb_object_keys(p) k where k not in ('schemaVersion','mode','question','taskEpoch','groups')) or
 p->'schemaVersion' <> '1'::jsonb or jsonb_typeof(p->'mode')<>'string' or jsonb_typeof(p->'taskEpoch')<>'string' or p->>'mode' not in ('opening','check','continuation','groups','station','exit','reflection') or
 jsonb_typeof(p->'question')<>'number' or (p->>'question') !~ '^[1-5]$' or (p->>'taskEpoch') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or
 jsonb_typeof(p->'groups')<>'array' or jsonb_array_length(p->'groups')>4 then return false; end if;
 for g in select value from jsonb_array_elements(p->'groups') loop
  if jsonb_typeof(g->'id')<>'string' or jsonb_typeof(g->'label')<>'string' then return false;end if;
  if jsonb_typeof(g)<>'object' or not g ?& array['id','label','attendanceNumbers'] or
   exists(select 1 from jsonb_object_keys(g) k where k not in ('id','label','attendanceNumbers')) or
   (g->>'id') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or
   g->>'label' not in ('Segitiga Biru','Lingkaran Oranye','Kotak Hijau','Belah Ketupat Ungu') or jsonb_typeof(g->'attendanceNumbers')<>'array' or jsonb_array_length(g->'attendanceNumbers')>40 then return false;end if;
  for n in select value from jsonb_array_elements(g->'attendanceNumbers') loop
   if jsonb_typeof(n)<>'number' or n::text !~ '^([1-9]|[1-3][0-9]|40)$' or (n::text)::integer=any(seen) then return false;end if;
   seen=array_append(seen,(n::text)::integer);
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));

create function pn_private.presentation_snapshot(p pn_private.presentations) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('envelope',jsonb_build_object('protocolVersion',1,'presentationId',p.id,'channelEpoch',p.channel_epoch,'revision',p.revision,'commandId',p.command_id,'packageVersion','prelim-7b-v1','payload',p.public_state),'ackRevision',p.ack_revision,'ackCommandId',p.ack_command_id,'ackAt',p.ack_at)
$$;

create function public.presentation_topic_allowed(p_topic text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from pn_private.presentations p where p_topic='pn:state:'||p.id::text||':'||p.channel_epoch::text and not p.revoked and p.expires_at>now() and
 ((p.owner_id=auth.uid() and auth.jwt()->>'is_anonymous'='false') or (p.board_id=auth.uid() and auth.jwt()->>'is_anonymous'='true')))
$$;
revoke all on function public.presentation_topic_allowed(text) from public,anon;
grant execute on function public.presentation_topic_allowed(text) to authenticated;
-- Realtime already enables RLS; do not ALTER its managed table.
create policy pn_receive_public_state on realtime.messages for select to authenticated
using(extension='broadcast' and public.presentation_topic_allowed((select realtime.topic())));
-- No client INSERT policy for state. Only this SECURITY DEFINER RPC publishes.

create function public.presentation_action(p_action text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid();is_board boolean; pair pn_private.pairings;pres pn_private.presentations;v_session uuid;v_class uuid; state jsonb; snapshot jsonb;
begin
 if u is null or coalesce(auth.jwt()->>'is_anonymous','') not in ('true','false') then return '{"error":"FORBIDDEN"}';end if;
 is_board=auth.jwt()->>'is_anonymous'='true';
 if jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>8192 then return '{"error":"FORBIDDEN"}';end if;
 if p_action in ('create','claim') then
  if not pn_private.consume_pairing_limit(p_action||':'||u::text,5) then return '{"error":"RATE_LIMITED"}';end if;
  if not pn_private.consume_pairing_limit(p_action||':ip:'||coalesce(p_input->>'ipHash','unknown'),50) then return '{"error":"RATE_LIMITED"}';end if;
 end if;
 if p_action='create' then
  if not is_board or (p_input->>'codeHash') !~ '^[a-f0-9]{64}$' then return '{"error":"FORBIDDEN"}';end if;
  update pn_private.pairings set claimed=true where not claimed and (expires_at<=now() or board_id=u);
  insert into pn_private.pairings(board_id,code_hash) values(u,p_input->>'codeHash') returning * into pair;
  return jsonb_build_object('id',pair.id,'expiresAt',pair.expires_at);
 elsif p_action='claim' then
  if is_board then return '{"error":"FORBIDDEN"}';end if;
  v_session=(p_input->>'sessionId')::uuid;v_class=(p_input->>'classId')::uuid;state=p_input->'payload';
  if not exists(select 1 from public.classes c where c.id=v_class and c.owner_id=u) or not pn_private.valid_public_state(state) then return '{"error":"FORBIDDEN"}';end if;
  select * into pair from pn_private.pairings where code_hash=p_input->>'codeHash' and not claimed and expires_at>now() for update;
  if not found then return '{"error":"NOT_FOUND"}';end if;
  insert into pn_private.presentation_sessions(id,class_id,owner_id) values(v_session,v_class,u) on conflict(id) do nothing;
  if not exists(select 1 from pn_private.presentation_sessions s where s.id=v_session and s.owner_id=u and s.class_id=v_class) then return '{"error":"FORBIDDEN"}';end if;
  update pn_private.presentations set revoked=true,channel_epoch=gen_random_uuid() where not revoked and (board_id=pair.board_id or session_id=v_session);
  insert into pn_private.presentations(session_id,owner_id,board_id,public_state) values(v_session,u,pair.board_id,state) returning * into pres;
  update pn_private.pairings set claimed=true,presentation_id=pres.id where id=pair.id;
 elsif p_action='status' then
  if not is_board then return '{"error":"FORBIDDEN"}';end if;
  select * into pair from pn_private.pairings where id=(p_input->>'challengeId')::uuid and board_id=u;
  if not found then return '{"error":"NOT_FOUND"}';end if;
  return jsonb_build_object('presentationId',pair.presentation_id,'expired',pair.expires_at<=now());
 else
  select * into pres from pn_private.presentations where id=(p_input->>'presentationId')::uuid and not revoked and expires_at>now() and
    ((is_board and board_id=u) or (not is_board and owner_id=u)) for update;
  if not found then return '{"error":"FORBIDDEN"}';end if;
  if p_action='snapshot' then return pn_private.presentation_snapshot(pres);
  elsif p_action='ack' then
   if not is_board then return '{"error":"FORBIDDEN"}';end if;
   if pres.channel_epoch<>(p_input->>'channelEpoch')::uuid or pres.revision<>(p_input->>'appliedRevision')::integer or pres.command_id<>(p_input->>'commandId')::uuid then return '{"error":"CONFLICT"}';end if;
   update pn_private.presentations set ack_revision=pres.revision,ack_command_id=pres.command_id,ack_at=now() where id=pres.id;
   return '{"ok":true}';
  elsif p_action='revoke' then
   if is_board then return '{"error":"FORBIDDEN"}';end if;
   update pn_private.presentations set revoked=true,channel_epoch=gen_random_uuid() where id=pres.id;
   return '{"ok":true}';
  elsif p_action='publish' then
   if is_board or not pn_private.valid_public_state(p_input->'payload') then return '{"error":"FORBIDDEN"}';end if;
   if pres.channel_epoch<>(p_input->>'channelEpoch')::uuid then return '{"error":"CONFLICT"}';end if;
   if pres.command_id=(p_input->>'commandId')::uuid then
     if pres.public_state=p_input->'payload' then return pn_private.presentation_snapshot(pres); else return '{"error":"CONFLICT"}';end if;
   end if;
   if pres.revision<>(p_input->>'baseRevision')::integer then return '{"error":"CONFLICT"}';end if;
   update pn_private.presentations set public_state=p_input->'payload',revision=revision+1,command_id=(p_input->>'commandId')::uuid where id=pres.id returning * into pres;
  else return '{"error":"FORBIDDEN"}';end if;
 end if;
 snapshot=pn_private.presentation_snapshot(pres);
 begin
  perform realtime.send(snapshot->'envelope','state','pn:state:'||pres.id::text||':'||pres.channel_epoch::text,true);
 exception when others then null; -- Durable snapshot remains canonical; client recovery polls it.
 end;
 return snapshot;
exception when invalid_text_representation or not_null_violation or check_violation or unique_violation then return '{"error":"CONFLICT"}';
end $$;
revoke all on function public.presentation_action(text,jsonb) from public,anon;
grant execute on function public.presentation_action(text,jsonb) to authenticated;
revoke all on all functions in schema pn_private from public,anon,authenticated;
commit;
