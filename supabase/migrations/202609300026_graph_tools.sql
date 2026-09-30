-- M14-b. Backup before applying. No tenant tables or privilege expansion.
-- Rollback: remove graphs from active projections, drop this wrapper and the
-- two private helpers, restore valid_public_tool_v4, delete graph-tool-v1 schema.
begin;
insert into pn_private.sync_schemas values('graph-tool-v1',$schema${"$schema":"https://json-schema.org/draft/2020-12/schema","oneOf":[{"type":"object","properties":{"kind":{"type":"string","const":"graphs"},"mode":{"type":"string","const":"linear"},"domain":{"type":"object","properties":{"minX":{"type":"integer","minimum":-16,"maximum":15},"maxX":{"type":"integer","minimum":-15,"maximum":16},"minY":{"type":"integer","minimum":-1000000,"maximum":999999},"maxY":{"type":"integer","minimum":-999999,"maximum":1000000}},"required":["minX","maxX","minY","maxY"],"additionalProperties":false},"lines":{"minItems":1,"maxItems":2,"type":"array","items":{"type":"object","properties":{"m":{"type":"integer","minimum":-12,"maximum":12},"b":{"type":"integer","minimum":-100,"maximum":100}},"required":["m","b"],"additionalProperties":false}},"goal":{"oneOf":[{"type":"object","properties":{"type":{"type":"string","const":"value"},"x":{"type":"integer","minimum":-16,"maximum":16}},"required":["type","x"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"intersection"}},"required":["type"],"additionalProperties":false}]}},"required":["kind","mode","domain","lines","goal"],"additionalProperties":false},{"type":"object","properties":{"kind":{"type":"string","const":"graphs"},"mode":{"type":"string","const":"inequalities"},"domain":{"type":"object","properties":{"minX":{"type":"integer","minimum":-16,"maximum":15},"maxX":{"type":"integer","minimum":-15,"maximum":16},"minY":{"type":"integer","minimum":-1000000,"maximum":999999},"maxY":{"type":"integer","minimum":-999999,"maximum":1000000}},"required":["minX","maxX","minY","maxY"],"additionalProperties":false},"constraints":{"minItems":2,"maxItems":4,"type":"array","items":{"type":"object","properties":{"a":{"type":"integer","minimum":-12,"maximum":12},"b":{"type":"integer","minimum":-12,"maximum":12},"c":{"type":"integer","minimum":-100,"maximum":100},"operator":{"type":"string","enum":["le","lt","ge","gt"]}},"required":["a","b","c","operator"],"additionalProperties":false}}},"required":["kind","mode","domain","constraints"],"additionalProperties":false},{"type":"object","properties":{"kind":{"type":"string","const":"graphs"},"mode":{"type":"string","const":"quadratic"},"domain":{"type":"object","properties":{"minX":{"type":"integer","minimum":-16,"maximum":15},"maxX":{"type":"integer","minimum":-15,"maximum":16},"minY":{"type":"integer","minimum":-1000000,"maximum":999999},"maxY":{"type":"integer","minimum":-999999,"maximum":1000000}},"required":["minX","maxX","minY","maxY"],"additionalProperties":false},"a":{"type":"integer","minimum":-12,"maximum":12},"b":{"type":"integer","minimum":-40,"maximum":40},"c":{"type":"integer","minimum":-200,"maximum":200}},"required":["kind","mode","domain","a","b","c"],"additionalProperties":false},{"type":"object","properties":{"kind":{"type":"string","const":"graphs"},"mode":{"type":"string","const":"exponential"},"domain":{"type":"object","properties":{"minX":{"type":"integer","minimum":-16,"maximum":15},"maxX":{"type":"integer","minimum":-15,"maximum":16},"minY":{"type":"integer","minimum":-1000000,"maximum":999999},"maxY":{"type":"integer","minimum":-999999,"maximum":1000000}},"required":["minX","maxX","minY","maxY"],"additionalProperties":false},"base":{"type":"object","properties":{"numerator":{"type":"integer","minimum":1,"maximum":10000},"denominator":{"type":"integer","minimum":1,"maximum":10000}},"required":["numerator","denominator"],"additionalProperties":false},"scale":{"type":"object","properties":{"numerator":{"type":"integer","minimum":1,"maximum":10000},"denominator":{"type":"integer","minimum":1,"maximum":10000}},"required":["numerator","denominator"],"additionalProperties":false},"shift":{"type":"integer","minimum":-6,"maximum":6},"comparison":{"type":"object","properties":{"m":{"type":"integer","minimum":-12,"maximum":12},"b":{"type":"integer","minimum":-100,"maximum":100}},"required":["m","b"],"additionalProperties":false},"goal":{"oneOf":[{"type":"object","properties":{"type":{"type":"string","const":"value"},"x":{"type":"integer","minimum":-16,"maximum":16}},"required":["type","x"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"target"},"y":{"type":"object","properties":{"numerator":{"type":"integer","minimum":1,"maximum":1000000},"denominator":{"type":"integer","minimum":1,"maximum":1000000}},"required":["numerator","denominator"],"additionalProperties":false}},"required":["type","y"],"additionalProperties":false}]}},"required":["kind","mode","domain","base","scale","shift","comparison","goal"],"additionalProperties":false}]}$schema$::jsonb);
-- A bounded closed polygon has vertices. With strict edges, their average is
-- feasible iff each strict edge has at least one feasible vertex off the edge.
-- Integer cross products avoid rounding at an exact inequality boundary.
create function pn_private.valid_graph_region(t jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare qs jsonb=t->'constraints'; d jsonb=t->'domain'; candidates jsonb='[]'; q jsonb; r jsonb; checkq jsonb; point jsonb;
 i integer; j integer; den numeric; nx numeric; ny numeric; value numeric; valid boolean; strict_found boolean;
begin
 qs=qs||jsonb_build_array(
  jsonb_build_object('a',1,'b',0,'c',d->'minX','operator','ge'),jsonb_build_object('a',1,'b',0,'c',d->'maxX','operator','le'),
  jsonb_build_object('a',0,'b',1,'c',d->'minY','operator','ge'),jsonb_build_object('a',0,'b',1,'c',d->'maxY','operator','le'));
 for i in 0..jsonb_array_length(qs)-2 loop
  q=qs->i;
  for j in i+1..jsonb_array_length(qs)-1 loop
   r=qs->j;den=(q->>'a')::numeric*(r->>'b')::numeric-(r->>'a')::numeric*(q->>'b')::numeric;
   if den=0 then continue;end if;
   nx=(q->>'c')::numeric*(r->>'b')::numeric-(r->>'c')::numeric*(q->>'b')::numeric;
   ny=(q->>'a')::numeric*(r->>'c')::numeric-(r->>'a')::numeric*(q->>'c')::numeric;
   if den<0 then den=-den;nx=-nx;ny=-ny;end if;
   valid=true;
   for checkq in select v from jsonb_array_elements(qs) v loop
    value=(checkq->>'a')::numeric*nx+(checkq->>'b')::numeric*ny-(checkq->>'c')::numeric*den;
    if checkq->>'operator' in ('le','lt') and value>0 or checkq->>'operator' in ('ge','gt') and value<0 then valid=false;exit;end if;
   end loop;
   if valid then candidates=candidates||jsonb_build_array(jsonb_build_object('nx',nx,'ny',ny,'den',den));end if;
  end loop;
 end loop;
 if jsonb_array_length(candidates)=0 then return false;end if;
 for q in select v from jsonb_array_elements(qs) v loop
  if q->>'operator' not in ('lt','gt') then continue;end if;
  strict_found=false;
  for point in select v from jsonb_array_elements(candidates) v loop
   value=(q->>'a')::numeric*(point->>'nx')::numeric+(q->>'b')::numeric*(point->>'ny')::numeric-(q->>'c')::numeric*(point->>'den')::numeric;
   if q->>'operator'='lt' and value<0 or q->>'operator'='gt' and value>0 then strict_found=true;exit;end if;
  end loop;
  if not strict_found then return false;end if;
 end loop;
 return true;
end $$;
create function pn_private.valid_graph_task(t jsonb) returns boolean
language plpgsql stable set search_path='' as $$
declare d jsonb=t->'domain'; goal jsonb=t->'goal'; q jsonb; k text=t->>'mode';
 minx integer;maxx integer;miny integer;maxy integer;x integer;y numeric;dm numeric;nx numeric;ny numeric;
 num numeric;den numeric;bn numeric;bd numeric;exponent integer;j integer;
begin
 if not pn_private.matches_sync_schema((select body from pn_private.sync_schemas where id='graph-tool-v1'),t) then return false;end if;
 minx=(d->>'minX')::integer;maxx=(d->>'maxX')::integer;miny=(d->>'minY')::integer;maxy=(d->>'maxY')::integer;
 if minx>=maxx or miny>=maxy then return false;end if;
 if k='linear' then
  if goal->>'type'='value' then
   x=(goal->>'x')::integer;y=(t->'lines'->0->>'m')::numeric*x+(t->'lines'->0->>'b')::numeric;
   return x between minx and maxx and y between miny and maxy;
  end if;
  if jsonb_array_length(t->'lines')<>2 then return false;end if;
  dm=(t->'lines'->0->>'m')::numeric-(t->'lines'->1->>'m')::numeric;
  if dm=0 then return true;end if;
  nx=(t->'lines'->1->>'b')::numeric-(t->'lines'->0->>'b')::numeric;
  ny=(t->'lines'->0->>'m')::numeric*nx+(t->'lines'->0->>'b')::numeric*dm;
  if dm<0 then dm=-dm;nx=-nx;ny=-ny;end if;
  return nx between minx*dm and maxx*dm and ny between miny*dm and maxy*dm;
 elsif k='inequalities' then
  for q in select v from jsonb_array_elements(t->'constraints') v loop
   if (q->>'a')::integer=0 and (q->>'b')::integer=0 then return false;end if;
  end loop;
  return pn_private.valid_graph_region(t);
 elsif k='quadratic' then return (t->>'a')::integer<>0;
 elsif k='exponential' then
  bn=(t->'base'->>'numerator')::numeric;bd=(t->'base'->>'denominator')::numeric;
  if bn=bd or bn*10<bd or bn>bd*10 then return false;end if;
  if goal->>'type'='value' then
   x=(goal->>'x')::integer;
   if x not between minx and maxx then return false;end if;
   minx=x;maxx=x;
  end if;
  for x in minx..maxx loop
   exponent=x+(t->>'shift')::integer;num=(t->'scale'->>'numerator')::numeric;den=(t->'scale'->>'denominator')::numeric;
   for j in 1..abs(exponent) loop
    if exponent<0 then num=num*bd;den=den*bn;else num=num*bn;den=den*bd;end if;
   end loop;
   if num between miny*den and maxy*den and (goal->>'type'='value' or num*(goal->'y'->>'denominator')::numeric=den*(goal->'y'->>'numerator')::numeric) then return true;end if;
  end loop;
 end if;
 return false;
exception when others then return false;
end $$;
alter function pn_private.valid_public_tool(jsonb) rename to valid_public_tool_v4;
create function pn_private.valid_public_tool(t jsonb) returns boolean
language plpgsql stable set search_path='' as $$
begin
 if t->>'kind'='graphs' then return pn_private.valid_graph_task(t);end if;
 return pn_private.valid_public_tool_v4(t);
end $$;
revoke all on function pn_private.valid_public_tool(jsonb),pn_private.valid_graph_task(jsonb),pn_private.valid_graph_region(jsonb) from public,anon,authenticated;
commit;
