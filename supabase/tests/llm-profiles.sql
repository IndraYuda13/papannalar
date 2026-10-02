begin;
create temp table assertions(label text);
grant select,insert on assertions to authenticated;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;insert into assertions values(label);end$$;
insert into auth.users(id,email,is_anonymous) values
 ('38000000-0000-4000-8000-000000000001','ai-v2-a@qa.invalid',false),
 ('38000000-0000-4000-8000-000000000002','ai-v2-b@qa.invalid',false),
 ('38000000-0000-4000-8000-000000000003',null,true);
insert into public.classes(id,owner_id,label,grade,student_count,runtime_mode) values
 ('38000000-0000-4000-8000-000000000005','38000000-0000-4000-8000-000000000001','7V',7,3,'demo');
insert into pn_private.sync_sessions(id,owner_id,class_id,ordinal,revision,device_id,payload) values
 ('38000000-0000-4000-8000-000000000006','38000000-0000-4000-8000-000000000001','38000000-0000-4000-8000-000000000005',1,1,'38000000-0000-4000-8000-000000000008','{"package":{"id":"38000000-0000-4000-8000-000000000009"}}');
create temp table data(request jsonb,usage jsonb,token text);
insert into data values('{"schemaVersion":2,"action":"reserve","requestId":"38000000-0000-4000-8000-000000000010","classId":"38000000-0000-4000-8000-000000000005","scopeId":"38000000-0000-4000-8000-000000000006","feature":"bisik","profile":{"profileId":"fixture-openai","configVersion":"v2","protocol":"openai-chat-completions","requestedModel":"fixture-alias","maxInputTokens":40000,"maxOutputTokens":2048}}',
 '{"schemaVersion":2,"feature":"bisik","profileId":"fixture-openai","configVersion":"v2","protocol":"openai-chat-completions","requestedModel":"fixture-alias","reportedModel":"fixture-snapshot","priceVersion":"price-fixture-v2","promptVersion":"bisik-v1","inputTokens":40,"outputTokens":20,"cacheReadInputTokens":5,"cacheCreationInputTokens":null,"usageKnown":true,"durationMs":50,"errorCategory":null,"fallback":"none","timestamp":"2026-10-02T00:00:00.000Z"}',
 'SYNTHETIC-V2-GATEWAY-NOT-A-CREDENTIAL');
grant select,update on data to authenticated;
insert into pn_private.llm_profiles(profile_id,config_version,protocol,requested_model,price_version,max_input_tokens,max_output_tokens,request_cap,token_cap)
 values('fixture-openai','v2','openai-chat-completions','fixture-alias','price-fixture-v2',40000,2048,20,840960);
update pn_private.llm_policy set gateway_hash=(select encode(sha256(convert_to(token,'UTF8')),'hex') from data),enabled=true,cap_microusd=1000000000;
insert into pn_private.llm_accounts(owner_id,cap_microusd) values('38000000-0000-4000-8000-000000000001',1000000000);
select pg_temp.ok(not has_table_privilege('authenticated','pn_private.llm_profiles','SELECT'),'profile policy not readable to client');
select pg_temp.ok(not has_function_privilege('authenticated','public.llm_control_v1(jsonb,text)','EXECUTE'),'legacy helper cannot bypass v2 guard');
select pg_temp.ok((select relrowsecurity from pg_class where oid='pn_private.llm_profiles'::regclass),'profile policy RLS enabled');
set local role authenticated;
set local request.jwt.claims='{"sub":"38000000-0000-4000-8000-000000000001","is_anonymous":false}';
select pg_temp.ok((select public.llm_control(request,'wrong')->>'error'='FORBIDDEN' from data),'gateway proof required');
select pg_temp.ok((select public.llm_control(request||'{"studentName":"CANARY"}',token)->>'error'='INVALID_INPUT' from data),'no extra private fields');
select pg_temp.ok((select public.llm_control(request,token)->>'reason'='disabled' from data),'new profile disabled by default');
reset role;
update pn_private.llm_profiles set enabled=true where profile_id='fixture-openai';
set local role authenticated;
select pg_temp.ok((select public.llm_control(request,token)->>'reason'='budget' from data),'missing prices never mean free');
reset role;
update pn_private.llm_profiles set pricing_date=current_date,input_per_million_microusd=2000000,output_per_million_microusd=6000000,cache_read_per_million_microusd=1000000,cache_creation_per_million_microusd=3000000,cap_microusd=1000000000 where profile_id='fixture-openai';
set local role authenticated;
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('profile',(request->'profile')||'{"requestedModel":"client-model"}'),token)->>'error'='INVALID_INPUT' from data),'model must match trusted policy');
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('profile',(request->'profile')||'{"maxOutputTokens":1200}'),token)->>'error'='INVALID_INPUT' from data),'transport and SQL caps must match');
set local request.jwt.claims='{"sub":"38000000-0000-4000-8000-000000000002","is_anonymous":false}';
select pg_temp.ok((select public.llm_control(request,token)->>'error'='FORBIDDEN' from data),'teacher B cannot reserve class A');
set local request.jwt.claims='{"sub":"38000000-0000-4000-8000-000000000003","is_anonymous":true}';
select pg_temp.ok((select public.llm_control(request,token)->>'error'='FORBIDDEN' from data),'board cannot reserve');
set local request.jwt.claims='{"sub":"38000000-0000-4000-8000-000000000001","is_anonymous":false}';
select pg_temp.ok((select public.llm_control(request,token)->>'priceVersion'='price-fixture-v2' from data),'reserve freezes explicit price version');
select pg_temp.ok((select public.llm_control(request,token)->>'reason'='active' from data),'duplicate request cannot spend again');
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('requestId',gen_random_uuid()),token)->>'reason'='active' from data),'only one live request per scope');
reset role;
select pg_temp.ok((select profile_snapshot->>'requestedModel'='fixture-alias' and profile_snapshot->>'inputPrice'='2000000' and reserved_microusd=132288 from pn_private.llm_usage where id='38000000-0000-4000-8000-000000000010'),'snapshot and worst category price are recorded');
update pn_private.llm_profiles set requested_model='next-model',price_version='price-next',max_output_tokens=4096 where profile_id='fixture-openai';
set local role authenticated;
select pg_temp.ok((select public.llm_control(jsonb_build_object('schemaVersion',2,'action','complete','requestId',request->'requestId','usage',usage||'{"requestedModel":"next-model"}'),token)->>'error'='INVALID_INPUT' from data),'new profile cannot relabel old request');
select pg_temp.ok((select public.llm_control(jsonb_build_object('schemaVersion',2,'action','complete','requestId',request->'requestId','usage',usage||'{"outputTokens":2049}'),token)->>'error'='INVALID_INPUT' from data),'snapshot output bound enforced');
select pg_temp.ok((select public.llm_control(jsonb_build_object('schemaVersion',2,'action','complete','requestId',request->'requestId','usage',usage||'{"inputTokens":null,"outputTokens":null,"cacheReadInputTokens":null,"usageKnown":false}'),token)->>'saved'='true' from data),'missing usage is nullable unknown');
select pg_temp.ok((select public.llm_control(jsonb_build_object('schemaVersion',2,'action','complete','requestId',request->'requestId','usage',usage||'{"inputTokens":null,"outputTokens":null,"cacheReadInputTokens":null,"usageKnown":false}'),token)->>'saved'='true' from data),'identical receipt retry idempotent');
select pg_temp.ok((select public.llm_control(jsonb_build_object('schemaVersion',2,'action','complete','requestId',request->'requestId','usage',usage),token)->>'error'='CONFLICT' from data),'receipt conflicts cannot rewrite unknown usage');
select pg_temp.ok((select public.llm_control(jsonb_build_object('action','complete','requestId',request->'requestId','usage','{"feature":"bisik","model":"claude-haiku-4-5-20251001","promptVersion":"bisik-v1","inputTokens":40,"outputTokens":20,"durationMs":50,"fallback":"none","timestamp":"2026-10-02"}'::jsonb),token)->>'error'='INVALID_INPUT' from data),'v2 cannot be completed as fake Haiku v1');
set local request.jwt.claims='{"sub":"38000000-0000-4000-8000-000000000002","is_anonymous":false}';
select pg_temp.ok((select public.llm_control(jsonb_build_object('schemaVersion',2,'action','complete','requestId',request->'requestId','usage',usage),token)->>'error'='FORBIDDEN' from data),'cross teacher completion denied');
reset role;
select pg_temp.ok((select spent_microusd=132288 from pn_private.llm_accounts where owner_id='38000000-0000-4000-8000-000000000001'),'unknown usage conservatively charged, never zero/refund');
update pn_private.llm_profiles set requested_model='fixture-alias',price_version='price-fixture-v2',max_output_tokens=2048,configured_free=true,input_per_million_microusd=0,output_per_million_microusd=0,cache_read_per_million_microusd=0,cache_creation_per_million_microusd=0,request_cap=2 where profile_id='fixture-openai';
set local role authenticated;
set local request.jwt.claims='{"sub":"38000000-0000-4000-8000-000000000001","is_anonymous":false}';
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('requestId','38000000-0000-4000-8000-000000000011'),token)->>'allowed'='true' from data),'explicit free profile still bounded');
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('requestId',gen_random_uuid()),token)->>'reason'='budget' from data),'request cap enforced even when free');
reset role;
select pg_temp.ok((select reserved_microusd=0 and schema_version=2 from pn_private.llm_usage where id='38000000-0000-4000-8000-000000000011'),'explicit free zero amount is distinguished from unknown usage');
update pn_private.llm_profiles set request_cap=20,token_cap=84096 where profile_id='fixture-openai';
set local role authenticated;
select pg_temp.ok((select public.llm_control(request||jsonb_build_object('requestId',gen_random_uuid()),token)->>'reason'='budget' from data),'reserved token cap enforced for free profile');
reset role;
select pg_temp.ok((select tokens_reserved=84096 and requests_reserved=2 from pn_private.llm_profiles where profile_id='fixture-openai'),'tokens and requests count every reservation');
select 'PASS '||count(*)||' dual-protocol profile/ledger SQL assertions' from assertions;
select 'ok - '||label from assertions;
rollback;
