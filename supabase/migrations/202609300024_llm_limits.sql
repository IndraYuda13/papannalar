-- No policy is enabled and no budget is granted by this migration. Owner setup
-- is separate, after credentials/pricing/human approvals. Rollback: disable
-- llm_policy first, revoke llm_control; preserve usage for reconciliation.
begin;
insert into pn_private.sync_schemas values('llm-ledger-v1',$schema${"$schema":"https://json-schema.org/draft/2020-12/schema","oneOf":[{"type":"object","properties":{"action":{"type":"string","const":"reserve"},"requestId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"classId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"scopeId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"feature":{"type":"string","enum":["bisik","enrichment"]}},"required":["action","requestId","classId","scopeId","feature"],"additionalProperties":false},{"type":"object","properties":{"action":{"type":"string","const":"complete"},"requestId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"usage":{"type":"object","properties":{"feature":{"type":"string","enum":["bisik","enrichment"]},"model":{"type":"string","const":"claude-haiku-4-5-20251001"},"promptVersion":{"type":"string","enum":["bisik-v1","enrichment-v1"]},"inputTokens":{"anyOf":[{"type":"integer","minimum":0,"maximum":32768},{"type":"null"}]},"outputTokens":{"anyOf":[{"type":"integer","minimum":0,"maximum":1200},{"type":"null"}]},"durationMs":{"type":"integer","minimum":0,"maximum":86400000},"fallback":{"type":"string","enum":["none","disabled","unreviewed","privacy","offline","timeout","provider","invalid","budget","rate","active","frozen","unavailable"]},"timestamp":{"type":"string","maxLength":40}},"required":["feature","model","promptVersion","inputTokens","outputTokens","durationMs","fallback","timestamp"],"additionalProperties":false}},"required":["action","requestId","usage"],"additionalProperties":false},{"type":"object","properties":{"action":{"type":"string","const":"feedback"},"requestId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"classId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"helpful":{"type":"boolean"}},"required":["action","requestId","classId","helpful"],"additionalProperties":false}]}$schema$::jsonb);
create table pn_private.llm_policy(
 id boolean primary key default true check(id), enabled boolean not null default false,
 gateway_hash text, cap_microusd bigint not null default 0 check(cap_microusd>=0),
 spent_microusd bigint not null default 0 check(spent_microusd>=0),
 input_per_million_microusd bigint not null default 0 check(input_per_million_microusd>=0),
 output_per_million_microusd bigint not null default 0 check(output_per_million_microusd>=0),
 pricing_date date, currency text not null default 'USD' check(currency='USD')
);
insert into pn_private.llm_policy(id) values(true);
create table pn_private.llm_accounts(
 owner_id uuid primary key references auth.users(id) on delete cascade,
 cap_microusd bigint not null check(cap_microusd>=0), spent_microusd bigint not null default 0 check(spent_microusd>=0)
);
create table pn_private.llm_usage(
 id uuid primary key, owner_id uuid not null, class_id uuid not null, scope_id uuid not null,
 feature text not null check(feature in ('bisik','enrichment')),
 reserved_microusd bigint not null check(reserved_microusd>0),
 created_at timestamptz not null default clock_timestamp(), lease_until timestamptz not null,
 completed boolean not null default false, usage jsonb, helpful boolean,
 foreign key(class_id,owner_id) references public.classes(id,owner_id) on delete cascade
);
create index llm_usage_owner_time on pn_private.llm_usage(owner_id,created_at);
create index llm_usage_owner_scope on pn_private.llm_usage(owner_id,scope_id);
alter table pn_private.llm_policy enable row level security;
alter table pn_private.llm_accounts enable row level security;
alter table pn_private.llm_usage enable row level security;
revoke all on pn_private.llm_policy,pn_private.llm_accounts,pn_private.llm_usage from public,anon,authenticated;

create function public.llm_control(p_input jsonb,p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid(); policy pn_private.llm_policy; account pn_private.llm_accounts;
 previous pn_private.llm_usage; rid uuid; cid uuid; sid uuid; action text; cost bigint;
begin
 if u is null or coalesce(auth.jwt()->>'is_anonymous','true')<>'false' then return '{"error":"FORBIDDEN"}';end if;
 if octet_length(p_input::text)>2048 or not pn_private.matches_sync_schema((select body from pn_private.sync_schemas where id='llm-ledger-v1'),p_input) then return '{"error":"INVALID_INPUT"}';end if;
 select * into policy from pn_private.llm_policy where id for update;
 if policy.gateway_hash is null or p_token is null or length(p_token)<32 or length(p_token)>256 or
  encode(sha256(convert_to(p_token,'UTF8')),'hex')<>policy.gateway_hash then return '{"error":"FORBIDDEN"}';end if;
 action=p_input->>'action';rid=(p_input->>'requestId')::uuid;
 if action='reserve' then
  cid=(p_input->>'classId')::uuid;sid=(p_input->>'scopeId')::uuid;
  perform 1 from public.classes where id=cid and owner_id=u;
  if not found then return '{"error":"FORBIDDEN"}';end if;
  if p_input->>'feature'='bisik' then
   perform 1 from pn_private.sync_sessions where id=sid and class_id=cid and owner_id=u and not deleted;
   if not found then return '{"error":"FORBIDDEN"}';end if;
  elsif exists(select 1 from pn_private.sync_sessions where class_id=cid and not deleted and payload->'package'->>'id'=sid::text) then
   return '{"allowed":false,"reason":"frozen"}';
  end if;
  if not policy.enabled then return '{"allowed":false,"reason":"disabled"}';end if;
  select * into account from pn_private.llm_accounts where owner_id=u for update;
  if not found or policy.pricing_date is null or policy.pricing_date>current_date or
   policy.input_per_million_microusd<=0 or policy.output_per_million_microusd<=0 then return '{"allowed":false,"reason":"budget"}';end if;
  -- Conservative maximum, not a claim about the actual provider bill. Never
  -- refund on timeout/unknown result. Owner may reconcile and replenish offline.
  cost=ceil((32768::numeric*policy.input_per_million_microusd+1200::numeric*policy.output_per_million_microusd)/1000000);
  if exists(select 1 from pn_private.llm_usage where id=rid) then return '{"allowed":false,"reason":"active"}';end if;
  if exists(select 1 from pn_private.llm_usage where owner_id=u and scope_id=sid and not completed and lease_until>clock_timestamp()) then return '{"allowed":false,"reason":"active"}';end if;
  if (select count(*) from pn_private.llm_usage where owner_id=u and created_at>clock_timestamp()-interval '1 minute')>=5 or
   (select count(*) from pn_private.llm_usage where owner_id=u and scope_id=sid)>=50 then return '{"allowed":false,"reason":"rate"}';end if;
  if cost>policy.cap_microusd-policy.spent_microusd or cost>account.cap_microusd-account.spent_microusd then return '{"allowed":false,"reason":"budget"}';end if;
  update pn_private.llm_policy set spent_microusd=spent_microusd+cost where id;
  update pn_private.llm_accounts set spent_microusd=spent_microusd+cost where owner_id=u;
  insert into pn_private.llm_usage(id,owner_id,class_id,scope_id,feature,reserved_microusd,lease_until)
   values(rid,u,cid,sid,p_input->>'feature',cost,clock_timestamp()+case when p_input->>'feature'='bisik' then interval '5 seconds' else interval '30 seconds' end);
  return '{"allowed":true,"reason":"none"}';
 end if;
 select * into previous from pn_private.llm_usage where id=rid and owner_id=u for update;
 if not found then return '{"error":"FORBIDDEN"}';end if;
 if action='complete' then
  if p_input->'usage'->>'feature'<>previous.feature or p_input->'usage'->>'promptVersion'<>previous.feature||'-v1' then return '{"error":"INVALID_INPUT"}';end if;
  if previous.completed then
   if previous.usage<>p_input->'usage' then return '{"error":"CONFLICT"}';end if;
  else update pn_private.llm_usage set completed=true,usage=p_input->'usage' where id=rid;end if;
  return '{"saved":true}';
 elsif action='feedback' then
  if previous.class_id<>(p_input->>'classId')::uuid or not previous.completed then return '{"error":"FORBIDDEN"}';end if;
  update pn_private.llm_usage set helpful=(p_input->>'helpful')::boolean where id=rid;
  return '{"saved":true}';
 end if;
 return '{"error":"INVALID_INPUT"}';
exception when invalid_text_representation or numeric_value_out_of_range then return '{"error":"INVALID_INPUT"}';
end $$;
revoke all on function public.llm_control(jsonb,text) from public,anon;
grant execute on function public.llm_control(jsonb,text) to authenticated;
commit;
