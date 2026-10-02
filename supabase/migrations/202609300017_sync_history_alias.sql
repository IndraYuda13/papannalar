-- Resolve PL/pgSQL alias ambiguity without changing applied migrations.
begin;
create or replace function public.sync_action(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid();d jsonb;old jsonb;r jsonb;prior jsonb;t jsonb;e jsonb;member jsonb;schema_doc jsonb;
begin
 if p_action<>'apply' or p_input->>'operation'<>'session-save' then return public.sync_action_v2(p_action,p_input);end if;
 if u is null or coalesce(auth.jwt()->>'is_anonymous','')<>'false' then return '{"error":"FORBIDDEN"}';end if;
 select body into schema_doc from pn_private.sync_schemas where id='mutation-v1';
 if not pn_private.matches_sync_schema(schema_doc,p_input) then return '{"error":"INVALID_INPUT"}';end if;
 perform 1 from public.classes where id=(p_input->>'classId')::uuid and owner_id=u for update;
 if not found then return '{"error":"FORBIDDEN"}';end if;
 if exists(select 1 from pn_private.sync_receipts where owner_id=u and event_id=(p_input->>'eventId')::uuid) then return public.sync_action_v2(p_action,p_input);end if;
 d=p_input->'payload';
 select payload into old from pn_private.sync_sessions where id=(p_input->>'sessionId')::uuid and owner_id=u;
 for r in select value from jsonb_array_elements(coalesce(d->'oral','[]')) loop
  if not exists(select 1 from jsonb_array_elements(d->'roster') s where s->'id'=r->'studentId' and s->'attendanceNumber'=r->'attendanceNumber') or
   (r->>'afterSessionOrdinal')::int not in ((d->'cycle'->>'ordinal')::int-1,(d->'cycle'->>'ordinal')::int) then return '{"error":"FORBIDDEN"}';end if;
  if (r->>'afterSessionOrdinal')::int=(d->'cycle'->>'ordinal')::int and (d->'cycle'->>'assessmentRevision')::int=0 then return '{"error":"INVALID_INPUT"}';end if;
 end loop;
 for prior in select value from jsonb_array_elements(coalesce(old->'oral','[]')) loop
  select value into r from jsonb_array_elements(coalesce(d->'oral','[]')) where value->'id'=prior->'id';
  if not found or (r->>'revision')::int<(prior->>'revision')::int or ((r->>'revision')::int=(prior->>'revision')::int and r<>prior) or
   (r-'revision'-'answers'-'skipped')<>(prior-'revision'-'answers'-'skipped') then return '{"error":"CONFLICT"}';end if;
 end loop;
 for t in select value from jsonb_array_elements(coalesce(d->'turns','[]')) loop
  for e in select value from jsonb_array_elements(t->'events') loop
   if e->'sessionId'<>d->'cycle'->'id' then return '{"error":"FORBIDDEN"}';end if;
   for member in select value from jsonb_array_elements((e->'pilots')||(e->'navigators')||(t->'navigatorFirst')) union all select m from jsonb_array_elements(e->'teams') team,jsonb_array_elements(team) m loop
    if not exists(select 1 from jsonb_array_elements(d->'roster') s where s->'id'=member) then return '{"error":"FORBIDDEN"}';end if;
   end loop;
  end loop;
 end loop;
 for prior in select event_row.value from jsonb_array_elements(coalesce(old->'turns','[]')) turn_row,jsonb_array_elements(turn_row.value->'events') event_row loop
  if not exists(select 1 from jsonb_array_elements(coalesce(d->'turns','[]')) turn_row,jsonb_array_elements(turn_row.value->'events') event_row where event_row.value=prior) then return '{"error":"CONFLICT"}';end if;
 end loop;
 return public.sync_action_v2(p_action,p_input);
exception when invalid_text_representation then return '{"error":"INVALID_INPUT"}';
end $$;
revoke all on function public.sync_action(text,jsonb) from public,anon;
grant execute on function public.sync_action(text,jsonb) to authenticated;
commit;
