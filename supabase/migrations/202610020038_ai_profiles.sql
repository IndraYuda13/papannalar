-- Additive UI/AI v2 ledger. No paid profile/account is enabled by this migration.
-- Keep v1 rows/receipts and policy caps; use a new config version for price changes.
-- Rollback: disable llm_policy and profiles first; restore v1 app only after v2
-- in-flight leases drain. Preserve rows and snapshots for reconciliation.
begin;
insert into pn_private.sync_schemas values('llm-ledger-v2',$schema${"$schema":"https://json-schema.org/draft/2020-12/schema","anyOf":[{"type":"object","properties":{"action":{"type":"string","const":"reserve"},"requestId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"classId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"scopeId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"feature":{"type":"string","enum":["bisik","enrichment"]}},"required":["action","requestId","classId","scopeId","feature"],"additionalProperties":false},{"type":"object","properties":{"action":{"type":"string","const":"complete"},"requestId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"usage":{"type":"object","properties":{"feature":{"type":"string","enum":["bisik","enrichment"]},"promptVersion":{"type":"string","enum":["bisik-v1","enrichment-v1"]},"durationMs":{"type":"integer","minimum":0,"maximum":86400000},"fallback":{"type":"string","enum":["none","disabled","unreviewed","privacy","offline","timeout","provider","invalid","budget","rate","active","frozen","unavailable"]},"timestamp":{"type":"string","maxLength":40},"model":{"type":"string","const":"claude-haiku-4-5-20251001"},"inputTokens":{"anyOf":[{"type":"integer","minimum":0,"maximum":32768},{"type":"null"}]},"outputTokens":{"anyOf":[{"type":"integer","minimum":0,"maximum":1200},{"type":"null"}]}},"required":["feature","promptVersion","durationMs","fallback","timestamp","model","inputTokens","outputTokens"],"additionalProperties":false}},"required":["action","requestId","usage"],"additionalProperties":false},{"type":"object","properties":{"action":{"type":"string","const":"reserve"},"schemaVersion":{"type":"number","const":2},"requestId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"classId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"scopeId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"feature":{"type":"string","enum":["bisik","enrichment"]},"profile":{"type":"object","properties":{"profileId":{"type":"string","minLength":1,"maxLength":64,"pattern":"^[a-zA-Z0-9_.-]+$"},"configVersion":{"type":"string","minLength":1,"maxLength":64,"pattern":"^[a-zA-Z0-9_.-]+$"},"protocol":{"type":"string","enum":["openai-chat-completions","anthropic-messages"]},"requestedModel":{"type":"string","minLength":1,"maxLength":160,"pattern":"^[-a-zA-Z0-9_.:/]+$"},"maxInputTokens":{"type":"integer","minimum":1024,"maximum":131072},"maxOutputTokens":{"type":"integer","minimum":1,"maximum":16384}},"required":["profileId","configVersion","protocol","requestedModel","maxInputTokens","maxOutputTokens"],"additionalProperties":false}},"required":["action","schemaVersion","requestId","classId","scopeId","feature","profile"],"additionalProperties":false},{"type":"object","properties":{"action":{"type":"string","const":"complete"},"schemaVersion":{"type":"number","const":2},"requestId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"usage":{"type":"object","properties":{"feature":{"type":"string","enum":["bisik","enrichment"]},"promptVersion":{"type":"string","enum":["bisik-v1","enrichment-v1"]},"durationMs":{"type":"integer","minimum":0,"maximum":86400000},"fallback":{"type":"string","enum":["none","disabled","unreviewed","privacy","offline","timeout","provider","invalid","budget","rate","active","frozen","unavailable"]},"timestamp":{"type":"string","maxLength":40},"schemaVersion":{"type":"number","const":2},"profileId":{"type":"string","minLength":1,"maxLength":64,"pattern":"^[a-zA-Z0-9_.-]+$"},"protocol":{"type":"string","enum":["openai-chat-completions","anthropic-messages"]},"requestedModel":{"type":"string","minLength":1,"maxLength":160,"pattern":"^[-a-zA-Z0-9_.:/]+$"},"reportedModel":{"anyOf":[{"type":"string","minLength":1,"maxLength":160,"pattern":"^[-a-zA-Z0-9_.:/]+$"},{"type":"null"}]},"configVersion":{"type":"string","minLength":1,"maxLength":64,"pattern":"^[a-zA-Z0-9_.-]+$"},"priceVersion":{"type":"string","minLength":1,"maxLength":64,"pattern":"^[a-zA-Z0-9_.-]+$"},"inputTokens":{"anyOf":[{"type":"integer","minimum":0,"maximum":131072},{"type":"null"}]},"outputTokens":{"anyOf":[{"type":"integer","minimum":0,"maximum":16384},{"type":"null"}]},"cacheReadInputTokens":{"anyOf":[{"type":"integer","minimum":0,"maximum":131072},{"type":"null"}]},"cacheCreationInputTokens":{"anyOf":[{"type":"integer","minimum":0,"maximum":131072},{"type":"null"}]},"usageKnown":{"type":"boolean"},"errorCategory":{"anyOf":[{"type":"string","enum":["auth","rate","timeout","unavailable","refusal","invalid"]},{"type":"null"}]}},"required":["feature","promptVersion","durationMs","fallback","timestamp","schemaVersion","profileId","protocol","requestedModel","reportedModel","configVersion","priceVersion","inputTokens","outputTokens","cacheReadInputTokens","cacheCreationInputTokens","usageKnown","errorCategory"],"additionalProperties":false}},"required":["action","schemaVersion","requestId","usage"],"additionalProperties":false},{"type":"object","properties":{"action":{"type":"string","const":"status"},"schemaVersion":{"type":"number","const":2},"profile":{"type":"object","properties":{"profileId":{"type":"string","minLength":1,"maxLength":64,"pattern":"^[a-zA-Z0-9_.-]+$"},"configVersion":{"type":"string","minLength":1,"maxLength":64,"pattern":"^[a-zA-Z0-9_.-]+$"},"protocol":{"type":"string","enum":["openai-chat-completions","anthropic-messages"]},"requestedModel":{"type":"string","minLength":1,"maxLength":160,"pattern":"^[-a-zA-Z0-9_.:/]+$"},"maxInputTokens":{"type":"integer","minimum":1024,"maximum":131072},"maxOutputTokens":{"type":"integer","minimum":1,"maximum":16384}},"required":["profileId","configVersion","protocol","requestedModel","maxInputTokens","maxOutputTokens"],"additionalProperties":false}},"required":["action","schemaVersion","profile"],"additionalProperties":false},{"type":"object","properties":{"action":{"type":"string","const":"feedback"},"requestId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"classId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"helpful":{"type":"boolean"}},"required":["action","requestId","classId","helpful"],"additionalProperties":false}]}$schema$::jsonb);
create table pn_private.llm_profiles(
 profile_id text not null check(profile_id ~ '^[a-zA-Z0-9_.-]{1,64}$'),
 config_version text not null check(config_version ~ '^[a-zA-Z0-9_.-]{1,64}$'),
 protocol text not null check(protocol in ('openai-chat-completions','anthropic-messages')),
 requested_model text not null check(requested_model ~ '^[-a-zA-Z0-9_.:/]{1,160}$'),
 enabled boolean not null default false,
 price_version text not null check(price_version ~ '^[a-zA-Z0-9_.-]{1,64}$'),
 pricing_date date, currency text not null default 'USD' check(currency='USD'),
 configured_free boolean not null default false,
 input_per_million_microusd bigint check(input_per_million_microusd between 0 and 1000000000000),
 output_per_million_microusd bigint check(output_per_million_microusd between 0 and 1000000000000),
 cache_read_per_million_microusd bigint check(cache_read_per_million_microusd between 0 and 1000000000000),
 cache_creation_per_million_microusd bigint check(cache_creation_per_million_microusd between 0 and 1000000000000),
 max_input_tokens integer not null check(max_input_tokens between 1024 and 131072),
 max_output_tokens integer not null check(max_output_tokens between 1 and 16384),
 cap_microusd bigint not null default 0 check(cap_microusd>=0), spent_microusd bigint not null default 0 check(spent_microusd>=0),
 request_cap bigint not null check(request_cap>0), requests_reserved bigint not null default 0 check(requests_reserved>=0),
 token_cap bigint not null check(token_cap>0), tokens_reserved bigint not null default 0 check(tokens_reserved>=0),
 primary key(profile_id,config_version)
);
alter table pn_private.llm_profiles enable row level security;
revoke all on pn_private.llm_profiles from public,anon,authenticated;
-- Explicit one-time legacy mapping. Does not relabel or update historical usage.
insert into pn_private.llm_profiles(profile_id,config_version,protocol,requested_model,enabled,price_version,pricing_date,
 input_per_million_microusd,output_per_million_microusd,cache_read_per_million_microusd,cache_creation_per_million_microusd,
 max_input_tokens,max_output_tokens,cap_microusd,request_cap,token_cap)
 select 'legacy-anthropic','legacy-v1','anthropic-messages','claude-haiku-4-5-20251001',enabled,'legacy-policy-v1',pricing_date,
 input_per_million_microusd,output_per_million_microusd,input_per_million_microusd,input_per_million_microusd,
 32768,1200,cap_microusd,1000,33968000 from pn_private.llm_policy where id;
alter table pn_private.llm_usage add column schema_version integer not null default 1 check(schema_version in (1,2));
alter table pn_private.llm_usage add column profile_snapshot jsonb;
alter table pn_private.llm_usage add constraint llm_usage_snapshot_version check((schema_version=1 and profile_snapshot is null) or (schema_version=2 and profile_snapshot is not null));
alter table pn_private.llm_usage drop constraint llm_usage_reserved_microusd_check;
alter table pn_private.llm_usage add constraint llm_usage_reserved_microusd_check check(reserved_microusd>=0);
-- Legacy callable only through the wrapper, which prevents completing v2 as v1.
alter function public.llm_control(jsonb,text) rename to llm_control_v1;
revoke all on function public.llm_control_v1(jsonb,text) from public,anon,authenticated;
create function public.llm_control(p_input jsonb,p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid(); policy pn_private.llm_policy; account pn_private.llm_accounts;
 profile pn_private.llm_profiles; previous pn_private.llm_usage; snapshot jsonb; receipt jsonb;
 rid uuid; cid uuid; sid uuid; action text; cost bigint; tokens bigint;
begin
 if u is null or coalesce(auth.jwt()->>'is_anonymous','true')<>'false' then return '{"error":"FORBIDDEN"}';end if;
 if octet_length(p_input::text)>4096 or not pn_private.matches_sync_schema((select body from pn_private.sync_schemas where id='llm-ledger-v2'),p_input) then return '{"error":"INVALID_INPUT"}';end if;
 if not(p_input ? 'schemaVersion') then
  if p_input->>'action'='complete' and exists(select 1 from pn_private.llm_usage where id=(p_input->>'requestId')::uuid and schema_version=2) then return '{"error":"INVALID_INPUT"}';end if;
  return public.llm_control_v1(p_input,p_token);
 end if;
 select * into policy from pn_private.llm_policy where id for update;
 if policy.gateway_hash is null or p_token is null or length(p_token)<32 or length(p_token)>256 or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>policy.gateway_hash then return '{"error":"FORBIDDEN"}';end if;
 action=p_input->>'action';
 if action in ('reserve','status') then
  select * into profile from pn_private.llm_profiles where profile_id=p_input->'profile'->>'profileId' and config_version=p_input->'profile'->>'configVersion' for update;
  if not found then return '{"allowed":false,"reason":"budget"}';end if;
  if profile.protocol<>p_input->'profile'->>'protocol' or profile.requested_model<>p_input->'profile'->>'requestedModel' or
   profile.max_input_tokens<>(p_input->'profile'->>'maxInputTokens')::integer or profile.max_output_tokens<>(p_input->'profile'->>'maxOutputTokens')::integer then return '{"error":"INVALID_INPUT"}';end if;
  if action='reserve' then
   rid=(p_input->>'requestId')::uuid;cid=(p_input->>'classId')::uuid;sid=(p_input->>'scopeId')::uuid;
   perform 1 from public.classes where id=cid and owner_id=u;
   if not found then return '{"error":"FORBIDDEN"}';end if;
   if p_input->>'feature'='bisik' then
    perform 1 from pn_private.sync_sessions where id=sid and class_id=cid and owner_id=u and not deleted;
    if not found then return '{"error":"FORBIDDEN"}';end if;
   elsif exists(select 1 from pn_private.sync_sessions where class_id=cid and not deleted and payload->'package'->>'id'=sid::text) then return '{"allowed":false,"reason":"frozen"}';end if;
  end if;
  if not policy.enabled or not profile.enabled then return '{"allowed":false,"reason":"disabled"}';end if;
  select * into account from pn_private.llm_accounts where owner_id=u for update;
  if not found or profile.pricing_date is null or profile.pricing_date>current_date or
   profile.input_per_million_microusd is null or profile.output_per_million_microusd is null or
   profile.cache_read_per_million_microusd is null or profile.cache_creation_per_million_microusd is null or
   (not profile.configured_free and (profile.input_per_million_microusd<=0 or profile.output_per_million_microusd<=0)) or
   (profile.configured_free and (profile.input_per_million_microusd<>0 or profile.output_per_million_microusd<>0 or profile.cache_read_per_million_microusd<>0 or profile.cache_creation_per_million_microusd<>0)) then return '{"allowed":false,"reason":"budget"}';end if;
  cost=ceil((profile.max_input_tokens::numeric*greatest(profile.input_per_million_microusd,profile.cache_read_per_million_microusd,profile.cache_creation_per_million_microusd)+profile.max_output_tokens::numeric*profile.output_per_million_microusd)/1000000);
  tokens=profile.max_input_tokens::bigint+profile.max_output_tokens;
  if cost>policy.cap_microusd-policy.spent_microusd or cost>account.cap_microusd-account.spent_microusd or cost>profile.cap_microusd-profile.spent_microusd or
   profile.requests_reserved>=profile.request_cap or tokens>profile.token_cap-profile.tokens_reserved then return '{"allowed":false,"reason":"budget"}';end if;
  if action='status' then return '{"allowed":true,"reason":"none"}';end if;
  if exists(select 1 from pn_private.llm_usage where id=rid) or exists(select 1 from pn_private.llm_usage where owner_id=u and scope_id=sid and not completed and lease_until>clock_timestamp()) then return '{"allowed":false,"reason":"active"}';end if;
  if (select count(*) from pn_private.llm_usage where owner_id=u and created_at>clock_timestamp()-interval '1 minute')>=5 or
   (select count(*) from pn_private.llm_usage where owner_id=u and scope_id=sid)>=50 then return '{"allowed":false,"reason":"rate"}';end if;
  snapshot=jsonb_build_object('profileId',profile.profile_id,'configVersion',profile.config_version,'protocol',profile.protocol,'requestedModel',profile.requested_model,
   'priceVersion',profile.price_version,'pricingDate',profile.pricing_date,'currency',profile.currency,'configuredFree',profile.configured_free,
   'inputPrice',profile.input_per_million_microusd,'outputPrice',profile.output_per_million_microusd,'cacheReadPrice',profile.cache_read_per_million_microusd,'cacheCreationPrice',profile.cache_creation_per_million_microusd,
   'maxInputTokens',profile.max_input_tokens,'maxOutputTokens',profile.max_output_tokens,'promptVersion',p_input->>'feature'||'-v1');
  update pn_private.llm_policy set spent_microusd=spent_microusd+cost where id;
  update pn_private.llm_accounts set spent_microusd=spent_microusd+cost where owner_id=u;
  update pn_private.llm_profiles set spent_microusd=spent_microusd+cost,requests_reserved=requests_reserved+1,tokens_reserved=tokens_reserved+tokens where profile_id=profile.profile_id and config_version=profile.config_version;
  insert into pn_private.llm_usage(id,owner_id,class_id,scope_id,feature,reserved_microusd,lease_until,schema_version,profile_snapshot)
   values(rid,u,cid,sid,p_input->>'feature',cost,clock_timestamp()+case when p_input->>'feature'='bisik' then interval '5 seconds' else interval '30 seconds' end,2,snapshot);
  return jsonb_build_object('allowed',true,'reason','none','priceVersion',profile.price_version);
 end if;
 rid=(p_input->>'requestId')::uuid;
 select * into previous from pn_private.llm_usage where id=rid and owner_id=u for update;
 if not found then return '{"error":"FORBIDDEN"}';end if;
 if action='complete' then
  receipt=p_input->'usage';snapshot=previous.profile_snapshot;
  if previous.schema_version<>2 or receipt->>'feature'<>previous.feature or receipt->>'promptVersion'<>snapshot->>'promptVersion' or
   receipt->>'profileId'<>snapshot->>'profileId' or receipt->>'configVersion'<>snapshot->>'configVersion' or receipt->>'protocol'<>snapshot->>'protocol' or receipt->>'requestedModel'<>snapshot->>'requestedModel' or receipt->>'priceVersion'<>snapshot->>'priceVersion' or
   (receipt->>'usageKnown')::boolean<>((receipt->>'inputTokens') is not null and (receipt->>'outputTokens') is not null) or
   coalesce((receipt->>'outputTokens')::bigint,0)>(snapshot->>'maxOutputTokens')::bigint or
   coalesce((receipt->>'inputTokens')::bigint,0)>(snapshot->>'maxInputTokens')::bigint or
   coalesce((receipt->>'cacheReadInputTokens')::bigint,0)>(snapshot->>'maxInputTokens')::bigint or
   coalesce((receipt->>'cacheCreationInputTokens')::bigint,0)>(snapshot->>'maxInputTokens')::bigint then return '{"error":"INVALID_INPUT"}';end if;
  if snapshot->>'protocol'='anthropic-messages' then
   if coalesce((receipt->>'inputTokens')::bigint,0)+coalesce((receipt->>'cacheReadInputTokens')::bigint,0)+coalesce((receipt->>'cacheCreationInputTokens')::bigint,0)>(snapshot->>'maxInputTokens')::bigint then return '{"error":"INVALID_INPUT"}';end if;
  elsif receipt->>'cacheCreationInputTokens' is not null or ((receipt->>'inputTokens') is not null and coalesce((receipt->>'cacheReadInputTokens')::bigint,0)>(receipt->>'inputTokens')::bigint) then return '{"error":"INVALID_INPUT"}';end if;
  if previous.completed then
   if previous.usage<>receipt then return '{"error":"CONFLICT"}';end if;
  else update pn_private.llm_usage set completed=true,usage=receipt where id=rid;end if;
  return '{"saved":true}';
 end if;
 return '{"error":"INVALID_INPUT"}';
exception when invalid_text_representation or numeric_value_out_of_range then return '{"error":"INVALID_INPUT"}';
end $$;
revoke all on function public.llm_control(jsonb,text) from public,anon;
grant execute on function public.llm_control(jsonb,text) to authenticated;
commit;
