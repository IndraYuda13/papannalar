begin;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'FAILED: %',label;end if;end$$;
create temp table graph_fixture(v jsonb);
insert into graph_fixture values
('{"kind":"graphs","mode":"linear","lines":[{"m":2,"b":1}],"goal":{"type":"value","x":3},"domain":{"minX":-5,"maxX":10,"minY":-10,"maxY":30}}'),
('{"kind":"graphs","mode":"linear","lines":[{"m":1,"b":20},{"m":5,"b":0}],"goal":{"type":"intersection"},"domain":{"minX":0,"maxX":10,"minY":-5,"maxY":60}}'),
('{"kind":"graphs","mode":"inequalities","constraints":[{"a":1,"b":1,"c":4,"operator":"le"},{"a":1,"b":0,"c":0,"operator":"ge"},{"a":0,"b":1,"c":0,"operator":"ge"}],"domain":{"minX":-2,"maxX":6,"minY":-2,"maxY":6}}'),
('{"kind":"graphs","mode":"quadratic","a":1,"b":-5,"c":6,"domain":{"minX":-2,"maxX":6,"minY":-4,"maxY":20}}'),
('{"kind":"graphs","mode":"exponential","base":{"numerator":2,"denominator":1},"scale":{"numerator":1,"denominator":1},"shift":1,"comparison":{"m":2,"b":2},"goal":{"type":"target","y":{"numerator":16,"denominator":1}},"domain":{"minX":0,"maxX":6,"minY":-5,"maxY":70}}');
select pg_temp.ok(count(*)=5 and bool_and(pn_private.valid_public_tool(v)),'all five source examples accepted') from graph_fixture;
select pg_temp.ok(bool_and(pn_private.valid_public_state('{"schemaVersion":1,"mode":"station","question":1,"taskEpoch":"10000000-0000-4000-8000-000000000001","groups":[],"pattern":"build"}'::jsonb||jsonb_build_object('tool',v))),'all graph projections accepted') from graph_fixture;
select pg_temp.ok(bool_and(not pn_private.valid_public_tool(v||'{"name":"CANARY"}')),'identity rejected for every mode') from graph_fixture;
select pg_temp.ok(bool_and(not pn_private.valid_public_tool(jsonb_set(v,'{domain,stepId}','"D6"'))),'nested private field rejected') from graph_fixture;
select pg_temp.ok(bool_and(not pn_private.valid_public_tool(v||'{"history":[]}')),'local history rejected') from graph_fixture;
select pg_temp.ok(bool_and(not pn_private.valid_public_tool(jsonb_set(v,'{domain,minX}','15'))),'reversed domain rejected') from graph_fixture;
select pg_temp.ok(not pn_private.valid_public_tool(v||'{"a":0}'),'zero quadratic degree rejected') from graph_fixture where v->>'mode'='quadratic';
select pg_temp.ok(not pn_private.valid_public_tool(jsonb_set(v,'{goal}','{"type":"intersection"}')),'intersection needs two lines') from graph_fixture where v->>'mode'='linear' and v->'goal'->>'type'='value';
select pg_temp.ok(not pn_private.valid_public_tool(jsonb_set(v,'{lines,1,b}','100')),'off-domain intersection rejected') from graph_fixture where v->'goal'->>'type'='intersection';
select pg_temp.ok(not pn_private.valid_public_tool(jsonb_set(v,'{constraints}','[{"a":1,"b":0,"c":0,"operator":"le"},{"a":1,"b":0,"c":1,"operator":"ge"}]')),'empty region rejected') from graph_fixture where v->>'mode'='inequalities';
select pg_temp.ok(not pn_private.valid_public_tool(jsonb_set(v,'{constraints}','[{"a":1,"b":0,"c":0,"operator":"lt"},{"a":1,"b":0,"c":0,"operator":"ge"}]')),'excluded boundary is empty') from graph_fixture where v->>'mode'='inequalities';
select pg_temp.ok(pn_private.valid_public_tool(jsonb_set(v,'{constraints,0,operator}','"lt"')),'strict triangle remains feasible') from graph_fixture where v->>'mode'='inequalities';
select pg_temp.ok(not pn_private.valid_public_tool(jsonb_set(v,'{base,numerator}','1')),'constant base rejected') from graph_fixture where v->>'mode'='exponential';
select pg_temp.ok(not pn_private.valid_public_tool(jsonb_set(v,'{base,numerator}','11')),'base out of bound rejected') from graph_fixture where v->>'mode'='exponential';
select pg_temp.ok(not pn_private.valid_public_tool(jsonb_set(v,'{goal,y,numerator}','17')),'unsupported exponent target rejected') from graph_fixture where v->>'mode'='exponential';
select pg_temp.ok(not pn_private.valid_public_tool(jsonb_set(v,'{domain,maxY}','10')),'off-domain target rejected') from graph_fixture where v->>'mode'='exponential';
select pg_temp.ok(pn_private.valid_public_tool(v||'{"base":{"numerator":11,"denominator":10},"shift":0,"goal":{"type":"value","x":12},"domain":{"minX":0,"maxX":12,"minY":0,"maxY":10}}'),'exact 10 percent growth valid') from graph_fixture where v->>'mode'='exponential';
select pg_temp.ok(not pn_private.valid_public_tool(jsonb_set(v,'{lines,0,m}','2.5')),'fractional coefficient outside current task slider rejected') from graph_fixture where v->'goal'->>'type'='value';
select pg_temp.ok(not pn_private.valid_public_tool(jsonb_set(v,'{goal,x}','11')),'off-domain probe rejected') from graph_fixture where v->'goal'->>'type'='value';
select pg_temp.ok(not has_function_privilege('authenticated','pn_private.valid_graph_task(jsonb)','EXECUTE'),'private graph validator not client RPC');
select 'PASS 20 graph SQL guards (five source descriptors)';
rollback;
