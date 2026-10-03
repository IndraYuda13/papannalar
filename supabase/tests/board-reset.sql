begin;
create temp table checks(label text); create temp table fixture(k text primary key,v jsonb);
grant all on checks,fixture to authenticated;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;insert into checks values(label);end$$;
insert into auth.users(id,is_anonymous) values
 ('98000000-0000-4000-8000-000000000001',false),
 ('98000000-0000-4000-8000-000000000002',true),
 ('98000000-0000-4000-8000-000000000003',true);
insert into public.classes(id,owner_id,label,grade,student_count,runtime_mode) values
 ('98000000-0000-4000-8000-000000000010','98000000-0000-4000-8000-000000000001','7R',7,3,'demo');
insert into fixture values('state','{"schemaVersion":1,"mode":"opening","question":3,"taskEpoch":"98000000-0000-4000-8000-000000000020","groups":[]}'),
 ('reset',jsonb_build_object('resetId','98000000-0000-4000-8000-000000000030','ipHash',repeat('a',64)));
set local role authenticated;
set local request.jwt.claims='{"sub":"98000000-0000-4000-8000-000000000002","is_anonymous":true}';
insert into fixture select 'pair',public.presentation_action('create',jsonb_build_object('codeHash',repeat('a',64),'ipHash','qa-reset'));
set local request.jwt.claims='{"sub":"98000000-0000-4000-8000-000000000003","is_anonymous":true}';
insert into fixture select 'other-pair',public.presentation_action('create',jsonb_build_object('codeHash',repeat('b',64),'ipHash','qa-reset'));
set local request.jwt.claims='{"sub":"98000000-0000-4000-8000-000000000001","is_anonymous":false}';
insert into fixture select 'first',public.presentation_action('claim',jsonb_build_object('codeHash',repeat('a',64),'classId','98000000-0000-4000-8000-000000000010','sessionId','98000000-0000-4000-8000-000000000040','payload',(select v from fixture where k='state')));
insert into fixture select 'other',public.presentation_action('claim',jsonb_build_object('codeHash',repeat('b',64),'classId','98000000-0000-4000-8000-000000000010','sessionId','98000000-0000-4000-8000-000000000041','payload',(select v from fixture where k='state')));
select pg_temp.ok(public.presentation_action('reset',(select v from fixture where k='reset'))->>'error'='FORBIDDEN','teacher cannot invoke board reset');
set local request.jwt.claims='{"sub":"98000000-0000-4000-8000-000000000002","is_anonymous":true}';
insert into fixture select 'resume-code',public.presentation_action('create',jsonb_build_object('codeHash',repeat('c',64),'ipHash','qa-reset'));
select pg_temp.ok(public.presentation_action('reset',(select v||jsonb_build_object('presentationId',(select v->'envelope'->'presentationId' from fixture where k='other')) from fixture where k='reset'))->>'error'='FORBIDDEN','board cannot target another presentation');
select pg_temp.ok(public.presentation_action('reset',(select v from fixture where k='reset'))->>'ok'='true','board reset acknowledges');
select pg_temp.ok(public.presentation_action('resume','{}')->'snapshot'='null'::jsonb,'own board cannot resume stale presentation');
select pg_temp.ok(public.presentation_action('snapshot',jsonb_build_object('presentationId',(select v->'envelope'->'presentationId' from fixture where k='first')))->>'error'='FORBIDDEN','old board snapshot revoked');
select pg_temp.ok(public.presentation_topic_allowed((select 'pn:state:'||(v->'envelope'->>'presentationId')||':'||(v->'envelope'->>'channelEpoch') from fixture where k='first'))=false,'old private realtime topic revoked');
set local request.jwt.claims='{"sub":"98000000-0000-4000-8000-000000000001","is_anonymous":false}';
select pg_temp.ok(public.presentation_action('snapshot',jsonb_build_object('presentationId',(select v->'envelope'->'presentationId' from fixture where k='first')))->>'error'='FORBIDDEN','teacher loses old presentation grant');
select pg_temp.ok(public.presentation_action('claim',jsonb_build_object('codeHash',repeat('c',64),'classId','98000000-0000-4000-8000-000000000010','sessionId','98000000-0000-4000-8000-000000000040','payload',(select v from fixture where k='state')))->>'error'='NOT_FOUND','old reconnect QR invalidated');
select pg_temp.ok(public.presentation_action('snapshot',jsonb_build_object('presentationId',(select v->'envelope'->'presentationId' from fixture where k='other')))->'envelope'->'payload'->>'question'='3','other board and question survive');
set local request.jwt.claims='{"sub":"98000000-0000-4000-8000-000000000002","is_anonymous":true}';
insert into fixture select 'new-code',public.presentation_action('create',jsonb_build_object('codeHash',repeat('d',64),'ipHash','qa-reset'));
set local request.jwt.claims='{"sub":"98000000-0000-4000-8000-000000000001","is_anonymous":false}';
insert into fixture select 'new',public.presentation_action('claim',jsonb_build_object('codeHash',repeat('d',64),'classId','98000000-0000-4000-8000-000000000010','sessionId','98000000-0000-4000-8000-000000000042','payload',(select v from fixture where k='state')));
select pg_temp.ok((select v->'envelope'->>'presentationId' is not null from fixture where k='new'),'fresh code can connect to a different session');
set local request.jwt.claims='{"sub":"98000000-0000-4000-8000-000000000002","is_anonymous":true}';
select pg_temp.ok(public.presentation_action('reset',(select v from fixture where k='reset'))->>'ok'='true','lost reset response is idempotently retryable');
select pg_temp.ok(public.presentation_action('resume','{}')->'snapshot'->'envelope'->>'presentationId'=(select v->'envelope'->>'presentationId' from fixture where k='new'),'retry does not revoke fresh pairing');
reset role;
select pg_temp.ok((select count(*)=3 from pn_private.presentation_sessions where owner_id='98000000-0000-4000-8000-000000000001'),'teacher session history retained');
select pg_temp.ok((select count(*)=1 from public.classes where owner_id='98000000-0000-4000-8000-000000000001'),'teacher class retained');
select pg_temp.ok((select count(*)=1 from pn_private.board_reset_receipts where board_id='98000000-0000-4000-8000-000000000002'),'one reset receipt despite retry');
select pg_temp.ok(not has_table_privilege('authenticated','pn_private.board_reset_receipts','select'),'no direct access to reset receipts');
select count(*)||' board reset SQL assertions PASS' from checks;
rollback;
