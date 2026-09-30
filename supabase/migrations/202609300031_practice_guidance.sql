-- M15-a: only teacher publication can reveal a practice model; board reports 0..3 hint progress.
-- Backup/rollback: strip guidance from active states, restore validator v11 + CHECK,
-- drop guidance_status and the two hint columns. No assessment keys or model history stored.
begin;
alter table pn_private.presentations drop constraint public_state_allowlist;
alter function pn_private.valid_public_state(jsonb) rename to valid_public_state_v11;
create function pn_private.valid_public_state(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare g jsonb=p->'guidance';
begin
 if p?'guidance' and (p->>'mode' not in ('station','together','spotlight') or not (p?'tool' or (p->>'mode'='spotlight' and p->'spotlight'?'tool')) or jsonb_typeof(g)<>'object' or not g ?& array['hint','reveal'] or exists(select 1 from jsonb_object_keys(g) k where k not in ('hint','reveal')) or jsonb_typeof(g->'hint')<>'number' or g->>'hint'!~'^[0-3]$' or jsonb_typeof(g->'reveal')<>'boolean') then return false;end if;
 return pn_private.valid_public_state_v11(p-'guidance');
exception when others then return false;
end $$;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));
alter table pn_private.presentations add column hint_task_epoch uuid, add column hint_count smallint not null default 0 check(hint_count between 0 and 3);
create function public.guidance_status(p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid();is_board boolean=coalesce(auth.jwt()->>'is_anonymous','')='true';p pn_private.presentations;count_value integer;
begin
 if u is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>1024 or not p_input ?& array['action','presentationId','channelEpoch','taskEpoch'] or exists(select 1 from jsonb_object_keys(p_input) k where k not in ('action','presentationId','channelEpoch','taskEpoch','hint')) then return '{"error":"INVALID_INPUT"}';end if;
 select * into p from pn_private.presentations where id=(p_input->>'presentationId')::uuid and not revoked and expires_at>now() and ((is_board and board_id=u) or (not is_board and owner_id=u)) for update;
 if not found then return '{"error":"FORBIDDEN"}';end if;
 if p.channel_epoch<>(p_input->>'channelEpoch')::uuid or p.public_state->>'taskEpoch'<>p_input->>'taskEpoch' then return '{"error":"CONFLICT"}';end if;
 if p.public_state->>'mode' not in ('station','together','spotlight') then return '{"error":"FORBIDDEN"}';end if;
 if exists(select 1 from pn_private.board_packages c where c.presentation_id=p.id and c.channel_epoch=p.channel_epoch and c.proposal is not null) then return '{"error":"CONFLICT"}';end if;
 count_value=case when p.hint_task_epoch::text=p_input->>'taskEpoch' then p.hint_count else 0 end;
 if p_input->>'action'='ack' then
  if not is_board then return '{"error":"FORBIDDEN"}';end if;
  if not p_input?'hint' or jsonb_typeof(p_input->'hint')<>'number' or p_input->>'hint'!~'^[0-3]$' then return '{"error":"INVALID_INPUT"}';end if;
  count_value=greatest(count_value,(p_input->>'hint')::integer);
  update pn_private.presentations set hint_count=count_value,hint_task_epoch=(p_input->>'taskEpoch')::uuid where id=p.id;
 elsif p_input->>'action'='read' then
  if is_board or p_input?'hint' then return '{"error":"FORBIDDEN"}';end if;
 else return '{"error":"INVALID_INPUT"}';end if;
 return jsonb_build_object('taskEpoch',p_input->'taskEpoch','hint',count_value,'active',true);
exception when invalid_text_representation then return '{"error":"INVALID_INPUT"}';
end $$;
revoke all on function pn_private.valid_public_state(jsonb) from public,anon,authenticated;
revoke all on function public.guidance_status(jsonb) from public,anon;
grant execute on function public.guidance_status(jsonb) to authenticated;
commit;
