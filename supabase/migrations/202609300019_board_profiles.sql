begin;
insert into pn_private.sync_schemas values('board-profile-v1',$schema${"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"schemaVersion":{"type":"number","const":1},"touches":{"anyOf":[{"type":"number","const":0},{"type":"number","const":1},{"type":"number","const":2},{"type":"number","const":4}]},"pointerEvents":{"type":"boolean"},"indexedDb":{"type":"boolean"},"serviceWorker":{"type":"boolean"},"width":{"type":"integer","minimum":1,"maximum":16384},"heightPixels":{"type":"integer","minimum":1,"maximum":16384},"browser":{"type":"string","enum":["chromium","edge","firefox","safari","unknown"]},"major":{"type":"integer","minimum":0,"maximum":9999},"samples":{"type":"integer","minimum":0,"maximum":120},"medianMs":{"anyOf":[{"type":"number","minimum":0,"maximum":60000},{"type":"null"}]},"p95Ms":{"anyOf":[{"type":"number","minimum":0,"maximum":60000},{"type":"null"}]},"height":{"type":"string","enum":["normal","high"]},"durationSeconds":{"type":"integer","minimum":0,"maximum":86400}},"required":["schemaVersion","touches","pointerEvents","indexedDb","serviceWorker","width","heightPixels","browser","major","samples","medianMs","p95Ms","height","durationSeconds"],"additionalProperties":false}$schema$::jsonb);
create table pn_private.board_profiles(board_id uuid primary key references auth.users(id) on delete cascade,payload jsonb not null,updated_at timestamptz not null default now());
alter table pn_private.board_profiles enable row level security;
revoke all on pn_private.board_profiles from public,anon,authenticated;
create function public.board_profile_action(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid=auth.uid();b boolean=coalesce(auth.jwt()->>'is_anonymous','')='true'; profile jsonb;
begin
 if u is null or jsonb_typeof(p_input)<>'object' then return '{"error":"FORBIDDEN"}';end if;
 if p_action='save' then
  if not b then return '{"error":"FORBIDDEN"}';end if;
  if octet_length(p_input::text)>2048 or not pn_private.matches_sync_schema(p_input,(select body from pn_private.sync_schemas where id='board-profile-v1')) then return '{"error":"INVALID_INPUT"}';end if;
  if (p_input->>'samples')::integer=0 and (p_input->'medianMs'<>'null'::jsonb or p_input->'p95Ms'<>'null'::jsonb) or
   (p_input->>'samples')::integer>0 and (p_input->'medianMs'='null'::jsonb or p_input->'p95Ms'='null'::jsonb or (p_input->>'p95Ms')::numeric<(p_input->>'medianMs')::numeric) or
   p_input->'pointerEvents'='false'::jsonb and p_input->'touches'<>'0'::jsonb then return '{"error":"INVALID_INPUT"}';end if;
  if not pn_private.consume_pairing_limit('profile:'||u::text,12) then return '{"error":"RATE_LIMITED"}';end if;
  insert into pn_private.board_profiles values(u,p_input,now()) on conflict(board_id) do update set payload=excluded.payload,updated_at=now();
  return '{"saved":true}';
 elsif p_action='read' then
  if b or not p_input ? 'presentationId' or exists(select 1 from jsonb_object_keys(p_input) k where k<>'presentationId') then return '{"error":"FORBIDDEN"}';end if;
  perform 1 from pn_private.presentations p where p.id=(p_input->>'presentationId')::uuid and p.owner_id=u and not p.revoked and p.expires_at>now();
  if not found then return '{"error":"FORBIDDEN"}';end if;
  select bp.payload into profile from pn_private.board_profiles bp join pn_private.presentations p on p.board_id=bp.board_id where p.id=(p_input->>'presentationId')::uuid;
  return profile;
 end if;
 return '{"error":"INVALID_INPUT"}';
exception when invalid_text_representation then return '{"error":"INVALID_INPUT"}';
end $$;
revoke all on function public.board_profile_action(text,jsonb) from public,anon;
grant execute on function public.board_profile_action(text,jsonb) to authenticated;
commit;
