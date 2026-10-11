-- T2-01 / T4: the bisik reservation lease must cover the request it protects.
-- The frozen hotfix raised the bisik request deadline to 15 s (server) and the
-- client abort to 15 s, but the reservation lease stayed at 5 s, so a second
-- concurrent bisik reserve for the same scope (second tab/device or a client
-- retry with a new requestId) was allowed and charged the full conservative
-- maximum again. Set the lease to 20 s (bisik) / 45 s (enrichment) so it
-- outlives the 15 s / 30 s deadlines; the client aborts before the lease lapses.
-- Both the v1 (legacy) and v2 (current) llm_control bodies are updated; the
-- 1-minute per-user rate cap still bounds repeated requests. Additive function
-- replacement only: no table, row, snapshot or receipt is touched.
-- Rollback: re-apply 202610020038_ai_profiles.sql (v2) and
-- 202609300024_llm_limits.sql (v1) to restore the previous 5 s interval.
begin;
create or replace function public.llm_control_v1(p_input jsonb,p_token text) returns jsonb
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
   values(rid,u,cid,sid,p_input->>'feature',cost,clock_timestamp()+case when p_input->>'feature'='bisik' then interval '20 seconds' else interval '45 seconds' end);
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
-- Preserve 038: v1 is denied direct execution and reachable only via the v2 wrapper.
revoke all on function public.llm_control_v1(jsonb,text) from public,anon,authenticated;
create or replace function public.llm_control(p_input jsonb,p_token text) returns jsonb
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
   values(rid,u,cid,sid,p_input->>'feature',cost,clock_timestamp()+case when p_input->>'feature'='bisik' then interval '20 seconds' else interval '45 seconds' end,2,snapshot);
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
