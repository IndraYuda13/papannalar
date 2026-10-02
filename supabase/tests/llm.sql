begin;
create temp table assertions(label text);
grant select,insert on assertions to authenticated;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;insert into assertions values(label);end$$;
insert into auth.users(id,email,is_anonymous) values
 ('13000000-0000-4000-8000-000000000001','llm-a@qa.invalid',false),
 ('13000000-0000-4000-8000-000000000002','llm-b@qa.invalid',false),
 ('13000000-0000-4000-8000-000000000003',null,true);
insert into public.classes(id,owner_id,label,grade,student_count,runtime_mode) values
 ('13000000-0000-4000-8000-000000000005','13000000-0000-4000-8000-000000000001','7V',7,3,'demo');
insert into pn_private.sync_sessions(id,owner_id,class_id,ordinal,revision,device_id,payload) values
 ('13000000-0000-4000-8000-000000000006','13000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000005',1,1,'13000000-0000-4000-8000-000000000008','{"package":{"id":"13000000-0000-4000-8000-000000000009"}}');
create temp table data(request jsonb,usage jsonb,token text);
insert into data values('{"action":"reserve","requestId":"13000000-0000-4000-8000-000000000010","classId":"13000000-0000-4000-8000-000000000005","scopeId":"13000000-0000-4000-8000-000000000006","feature":"bisik"}',
 '{"feature":"bisik","model":"claude-haiku-4-5-20251001","promptVersion":"bisik-v1","inputTokens":40,"outputTokens":20,"durationMs":50,"fallback":"none","timestamp":"2026-09-30T00:00:00.000Z"}',
 'UNIT-TEST-GATEWAY-ONLY-NOT-A-CREDENTIAL');
grant select,update on data to authenticated;
select pg_temp.ok(not has_table_privilege('authenticated','pn_private.llm_policy','UPDATE'),'client cannot activate policy or budget');
select pg_temp.ok(not has_table_privilege('authenticated','pn_private.llm_usage','SELECT'),'usage not readable across tenants');
select pg_temp.ok((select count(*)=3 from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='pn_private' and relname in ('llm_policy','llm_accounts','llm_usage') and relrowsecurity),'all LLM tables have RLS');
update pn_private.llm_policy set gateway_hash=(select encode(sha256(convert_to(token,'UTF8')),'hex') from data);
set local role authenticated;
set local request.jwt.claims='{"sub":"13000000-0000-4000-8000-000000000001","is_anonymous":false}';
select pg_temp.ok((select public.llm_control(request,'wrong')->>'error'='FORBIDDEN' from data),'normal client without gateway cannot reserve');
select pg_temp.ok((select public.llm_control(request||'{"name":"CANARY"}',token)->>'error'='INVALID_INPUT' from data),'extra identity field rejected');
select pg_temp.ok((select public.llm_control(request,token)->>'reason'='disabled' from data),'migration disabled by default');
set local request.jwt.claims='{"sub":"13000000-0000-4000-8000-000000000002","is_anonymous":false}';
select pg_temp.ok((select public.llm_control(request,token)->>'error'='FORBIDDEN' from data),'cross teacher denied even with gateway proof');
set local request.jwt.claims='{"sub":"13000000-0000-4000-8000-000000000003","is_anonymous":true}';
select pg_temp.ok((select public.llm_control(request,token)->>'error'='FORBIDDEN' from data),'board identity cannot spend');
reset role;
update pn_private.llm_policy set enabled=true,cap_microusd=1000000000,input_per_million_microusd=1000000,output_per_million_microusd=5000000,pricing_date=current_date;
set local role authenticated;
set local request.jwt.claims='{"sub":"13000000-0000-4000-8000-000000000001","is_anonymous":false}';
select pg_temp.ok((select public.llm_control(request,token)->>'reason'='budget' from data),'account budget absent fails closed');
reset role;
insert into pn_private.llm_accounts(owner_id,cap_microusd) values('13000000-0000-4000-8000-000000000001',1000000000);
set local role authenticated;
select pg_temp.ok((select public.llm_control(request||'{"scopeId":"13000000-0000-4000-8000-000000000099"}',token)->>'error'='FORBIDDEN' from data),'Bisik scope must be an owned canonical session');
select pg_temp.ok((select public.llm_control(request||'{"feature":"enrichment","scopeId":"13000000-0000-4000-8000-000000000009"}',token)->>'reason'='frozen' from data),'frozen canonical package cannot enrich');
select pg_temp.ok((select public.llm_control(request,token)->>'allowed'='true' from data),'owned request reserves conservative budget');
select pg_temp.ok((select public.llm_control(request,token)->>'reason'='active' from data),'same ID never runs provider twice');
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('requestId',gen_random_uuid()),token)->>'reason'='active' from data),'one active per session across server instances');
select pg_temp.ok((select public.llm_control(jsonb_build_object('action','complete','requestId',request->'requestId','usage',usage||'{"prompt":"CANARY"}'),token)->>'error'='INVALID_INPUT' from data),'raw prompt never enters usage');
select pg_temp.ok((select public.llm_control(jsonb_build_object('action','complete','requestId',request->'requestId','usage',usage),token)->>'saved'='true' from data),'closed metadata receipt accepted');
select pg_temp.ok((select public.llm_control(jsonb_build_object('action','complete','requestId',request->'requestId','usage',usage),token)->>'saved'='true' from data),'receipt retry idempotent');
select pg_temp.ok((select public.llm_control(jsonb_build_object('action','complete','requestId',request->'requestId','usage',usage||'{"inputTokens":0}'),token)->>'error'='CONFLICT' from data),'usage receipt cannot be rewritten');
select pg_temp.ok((select public.llm_control(jsonb_build_object('action','feedback','requestId',request->'requestId','classId',request->'classId','helpful',true),token)->>'saved'='true' from data),'feedback boolean only');
reset role;
select pg_temp.ok((select spent_microusd=38768 from pn_private.llm_accounts where owner_id='13000000-0000-4000-8000-000000000001'),'conservative reservation is charged once without refund');
update pn_private.llm_accounts set cap_microusd=spent_microusd;
set local role authenticated;
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('requestId',gen_random_uuid()),token)->>'reason'='budget' from data),'account hard cap enforced');
reset role;
update pn_private.llm_accounts set cap_microusd=1000000000;
update pn_private.llm_policy set cap_microusd=spent_microusd;
set local role authenticated;
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('requestId',gen_random_uuid()),token)->>'reason'='budget' from data),'environment hard cap enforced');
reset role;
update pn_private.llm_policy set cap_microusd=1000000000;
-- Four prior completed calls + original; fixtures test shared sliding window.
insert into pn_private.llm_usage(id,owner_id,class_id,scope_id,feature,reserved_microusd,lease_until,completed)
 select gen_random_uuid(),'13000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000005',gen_random_uuid(),'bisik',38768,clock_timestamp(),true from generate_series(1,4);
set local role authenticated;
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('requestId',gen_random_uuid()),token)->>'reason'='rate' from data),'five per minute across scopes enforced');
reset role;
update pn_private.llm_usage set created_at=clock_timestamp()-interval '2 minutes';
insert into pn_private.llm_usage(id,owner_id,class_id,scope_id,feature,reserved_microusd,lease_until,completed,created_at)
 select gen_random_uuid(),'13000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000005','13000000-0000-4000-8000-000000000006','bisik',38768,clock_timestamp(),true,clock_timestamp()-interval '2 minutes' from generate_series(1,49);
set local role authenticated;
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('requestId',gen_random_uuid()),token)->>'reason'='rate' from data),'fifty per session remains after minute window');
reset role;
update pn_private.llm_usage set scope_id=gen_random_uuid(),completed=false,lease_until=clock_timestamp()-interval '1 second';
set local role authenticated;
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('requestId',gen_random_uuid()),token)->>'allowed'='true' from data),'expired active lease cannot deadlock future requests');
reset role;
delete from public.classes where id='13000000-0000-4000-8000-000000000005';
select pg_temp.ok(not exists(select 1 from pn_private.llm_usage where owner_id='13000000-0000-4000-8000-000000000001'),'class deletion purges usage and feedback');
select pg_temp.ok((select spent_microusd=77536 from pn_private.llm_accounts where owner_id='13000000-0000-4000-8000-000000000001'),'deleting class cannot refund or reset account cap');
select 'PASS '||count(*)||' LLM budget/privacy SQL assertions' from assertions;
select 'ok - '||label from assertions;
rollback;
