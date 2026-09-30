begin;
create temp table assertions(label text);
grant select,insert on assertions to authenticated;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;insert into assertions values(label);end$$;
create temp table sync_input(data jsonb);
insert into sync_input values(__SYNC_MUTATION__::jsonb);
grant select,update on sync_input to authenticated;
insert into auth.users(id,email,is_anonymous) values
('10000000-0000-4000-8000-000000000001','sync-a@qa.invalid',false),
('10000000-0000-4000-8000-000000000002','sync-b@qa.invalid',false),
('10000000-0000-4000-8000-000000000003',null,true);
insert into public.classes(id,owner_id,label,grade,student_count,runtime_mode)
 select (data->>'classId')::uuid,'10000000-0000-4000-8000-000000000001','7T',7,3,'demo' from sync_input;
insert into public.students(id,class_id,owner_id,attendance_number)
 select (r->>'id')::uuid,(data->>'classId')::uuid,'10000000-0000-4000-8000-000000000001',(r->>'attendanceNumber')::int from sync_input,jsonb_array_elements(data->'payload'->'roster') r;
select pg_temp.ok((select pn_private.matches_sync_schema(body,(select data from sync_input)) from pn_private.sync_schemas where id='mutation-v1'),'generated SQL schema accepts complete strict DTO');
select pg_temp.ok((select relrowsecurity from pg_class where oid='pn_private.sync_sessions'::regclass),'sync RLS enabled');
select pg_temp.ok(not has_table_privilege('authenticated','pn_private.sync_sessions','INSERT'),'direct writes denied');
set local role authenticated;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","is_anonymous":false}';
select pg_temp.ok((select public.sync_action('apply',data)->>'status'='accepted' from sync_input),'first snapshot accepted');
select pg_temp.ok((select public.sync_action('apply',data)->>'revision'='1' from sync_input),'retry returns original revision');
select pg_temp.ok((select public.sync_action('apply',jsonb_set(data,'{payload,cards,0,choices,0}','"?"'))->>'error'='CONFLICT' from sync_input),'same ID changed payload rejected');
select pg_temp.ok((select public.sync_action('apply',data||'{"nickname":"PRIVATE_CANARY"}')->>'error'='INVALID_INPUT' from sync_input),'top-level private field rejected');
select pg_temp.ok((select public.sync_action('apply',jsonb_set(data,'{payload,roster,0,nickname}','"PRIVATE_CANARY"'))->>'error'='INVALID_INPUT' from sync_input),'nested private field rejected at RPC');
select pg_temp.ok((select jsonb_array_length(public.sync_action('read',jsonb_build_object('classId',data->'classId'))->'records')=1 from sync_input),'owner reads canonical state');
update sync_input set data=data||'{"eventId":"30000000-0000-4000-8000-000000000011","clientSequence":2}';
select pg_temp.ok((select public.sync_action('apply',data)->>'status'='conflict' from sync_input),'stale base never last-write-wins');
update sync_input set data=data||'{"baseRevision":1}';
select pg_temp.ok((select public.sync_action('apply',data||'{"deviceId":"30000000-0000-4000-8000-000000000022"}')->>'status'='conflict' from sync_input),'second writer held');
select pg_temp.ok((select public.sync_action('apply',jsonb_set(data,'{payload,roster,0,id}','"30000000-0000-4000-8000-000000000099"'))->>'error' in ('FORBIDDEN','CONFLICT') from sync_input),'frozen roster cannot be swapped');
select pg_temp.ok((select public.sync_action('apply',jsonb_set(data,'{payload,cards,0,choices,0}','"?"'))->>'error'='CONFLICT' from sync_input),'same card revision different choice rejected');
select pg_temp.ok((select public.sync_action('apply',jsonb_set(data,'{payload,cards}','[]'))->>'error'='CONFLICT' from sync_input),'response cannot silently disappear');
select pg_temp.ok((select public.sync_action('apply',jsonb_set(data,'{payload,package,seed}','7'))->>'error'='CONFLICT' from sync_input),'frozen package immutable');
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000002","is_anonymous":false}';
select pg_temp.ok((select public.sync_action('read',jsonb_build_object('classId',data->'classId'))->>'error'='FORBIDDEN' from sync_input),'teacher B cannot read A');
select pg_temp.ok((select public.sync_action('apply',data)->>'error'='FORBIDDEN' from sync_input),'teacher B cannot write A');
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000003","is_anonymous":true}';
select pg_temp.ok((select public.sync_action('read',jsonb_build_object('classId',data->'classId'))->>'error'='FORBIDDEN' from sync_input),'board cannot read teacher sync');
select pg_temp.ok((select public.sync_action('apply',data)->>'error'='FORBIDDEN' from sync_input),'board cannot write teacher sync');
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","is_anonymous":false}';
select pg_temp.ok((select public.sync_action('apply',data||'{"operation":"session-delete","payload":null}')->>'status'='accepted' from sync_input),'session tombstone accepted');
select pg_temp.ok((select public.sync_action('apply',data||'{"eventId":"30000000-0000-4000-8000-000000000012","baseRevision":2}')->>'status'='deleted' from sync_input),'stale snapshot cannot resurrect deleted session');
delete from public.classes where id=(select (data->>'classId')::uuid from sync_input);
select pg_temp.ok((select public.sync_action('apply',data)->>'error'='FORBIDDEN' from sync_input),'deleted class rejects old outbox');
reset role;
select pg_temp.ok((select count(*)=0 from pn_private.sync_sessions where owner_id='10000000-0000-4000-8000-000000000001'),'class deletion removes private responses');
select pg_temp.ok((select count(*)=0 from pn_private.sync_receipts where owner_id='10000000-0000-4000-8000-000000000001'),'class deletion removes event receipts');
select pg_temp.ok((select count(*)=1 from pn_private.deleted_classes where owner_id='10000000-0000-4000-8000-000000000001'),'class tombstone retained without response payload');
select 'PASS '||count(*)||' sync SQL assertions' from assertions;
select 'ok - '||label from assertions;
rollback;
