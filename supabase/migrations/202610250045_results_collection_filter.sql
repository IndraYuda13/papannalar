-- docs/11 §3 asks /guru/asesmen to filter by tanggal, kelas and kumpulan, but the
-- results index only ever accepted classId/from/to, so the Kumpulan combobox had
-- nothing to send and the teacher could not narrow a class by the question set an
-- activity came from. The collection is not new data: every library run already
-- stores the set it ran (public.library_runs.set_id) and a group lesson's
-- assignments point at runs, so the dimension is derived on read. No column is
-- added, nothing is backfilled, and no stored row changes shape.
-- Rollback: redeploy the previous app build, then restore the prior
-- public.learning_results body and the prior results-v1 sync_schemas row from
-- git history (202610130042_learning_groups.sql). Nothing is dropped, because
-- this migration writes no data: it widens one input allowlist and replaces one
-- read-only function.
begin;
update pn_private.sync_schemas set body=$schema${"anyOf":[{"type":"object","required":["action"],"properties":{"action":{"type":"string","const":"list"},"classId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"collectionId":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"from":{"type":"string","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},"to":{"type":"string","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},"cursor":{"type":"string","maxLength":200}},"additionalProperties":false},{"type":"object","required":["action","source","id"],"properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$"},"action":{"type":"string","const":"detail"},"source":{"enum":["library","group_lesson","diagnostic"],"type":"string"}},"additionalProperties":false}],"$schema":"https://json-schema.org/draft/2020-12/schema"}$schema$ where id='results-v1';
create or replace function public.learning_results(p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.library_runs;l public.group_lessons;d jsonb;entries jsonb;more boolean;offset_n int=0;
begin
 if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','')<>'false' then return '{"error":"FORBIDDEN"}';end if;
 if not pn_private.matches_sync_schema((select body from pn_private.sync_schemas where id='results-v1'),p_input) then return '{"error":"INVALID_INPUT"}';end if;
 if p_input->>'action'='detail' then
 if p_input->>'source'='library' then select * into r from public.library_runs where id=(p_input->>'id')::uuid and owner_id=auth.uid();if not found then return '{"error":"NOT_FOUND"}';end if;return jsonb_build_object('source','library','detail',pn_private.learning_detail(r));
 elsif p_input->>'source'='group_lesson' then select * into l from public.group_lessons where id=(p_input->>'id')::uuid and owner_id=auth.uid();if not found then return '{"error":"NOT_FOUND"}';end if;return jsonb_build_object('source','group_lesson','lesson',pn_private.lesson_dto(l),'runs',coalesce((select jsonb_agg(pn_private.learning_detail(rr) order by rr.id) from public.library_runs rr join public.group_assignments a on a.run_id=rr.id where a.lesson_id=l.id),'[]'));
 else select payload into d from pn_private.sync_sessions where id=(p_input->>'id')::uuid and owner_id=auth.uid() and not deleted;if not found then return '{"error":"NOT_FOUND"}';end if;return jsonb_build_object('source','diagnostic','detail',d);end if;
 end if;
 if p_input?'cursor' then if p_input->>'cursor' !~ '^[0-9]{1,8}$' then return '{"error":"INVALID_INPUT"}';end if;offset_n=(p_input->>'cursor')::int;end if;
 -- A lesson binds groups to collections, so it owns one collection only while its
 -- runs agree on it; mixed lessons keep no collection and stay out of the filter.
 -- Labels name the version the activity actually ran, never the set's later edits.
 with lesson_collections as (
 select a.lesson_id,case when count(distinct rr.set_id)=1 then (array_agg(rr.set_id))[1] end collection_id,case when count(distinct rr.set_id)=1 then min(v.document->>'title') else 'Beberapa kumpulan' end collection_label from public.group_assignments a join public.library_runs rr on rr.id=a.run_id join public.question_versions v on v.set_id=rr.set_id and v.version=rr.version group by a.lesson_id),
 all_entries as (
 select rr.lesson_date date,rr.id,'library:'||rr.id::text key,rr.class_id,rr.class_label,v.document->>'title' title,rr.status,case when coalesce(rr.response_method,case when rr.mode='assessment' then 'cards' else 'none' end)='cards' then 'cards' else 'activity' end template,'library' source,rr.synthetic,rr.set_id collection_id,v.document->>'title' collection_label from public.library_runs rr join public.question_versions v on v.set_id=rr.set_id and v.version=rr.version where rr.owner_id=auth.uid() and rr.parent_lesson_id is null
 union all select ll.lesson_date,ll.id,'group_lesson:'||ll.id::text,ll.class_id,ll.payload->>'classLabel','Belajar kelompok',case when ll.status='closed' then 'closed' else 'active' end,'groups','group_lesson',(ll.payload->>'synthetic')::boolean,lc.collection_id,coalesce(lc.collection_label,'Tanpa kumpulan') from public.group_lessons ll left join lesson_collections lc on lc.lesson_id=ll.id where ll.owner_id=auth.uid() and ll.status<>'draft'
 union all select null::date,s.id,'diagnostic:'||s.id::text,s.class_id,c.label,'Cek kemampuan',case when s.payload#>>'{cycle,classEnded}'='true' then 'closed' else 'active' end,'diagnostic','diagnostic',c.runtime_mode='demo',null::uuid,'Tanpa kumpulan' from pn_private.sync_sessions s join public.classes c on c.id=s.class_id where s.owner_id=auth.uid() and not s.deleted),
 page as(select * from all_entries where (not p_input?'classId' or class_id=(p_input->>'classId')::uuid) and (not p_input?'collectionId' or collection_id=(p_input->>'collectionId')::uuid) and (not p_input?'from' or date>=(p_input->>'from')::date) and (not p_input?'to' or date<=(p_input->>'to')::date) order by date desc nulls last,key limit 51 offset offset_n),
 numbered as(select *,row_number() over(order by date desc nulls last,key) n from page)
 select coalesce(jsonb_agg(jsonb_build_object('key',key,'source',source,'id',id,'classId',class_id,'classLabel',class_label,'collectionId',collection_id,'collectionLabel',collection_label,'date',coalesce(date::text,''),'title',title,'status',status,'template',template,'synthetic',synthetic) order by n) filter(where n<=50),'[]'),count(*)>50 into entries,more from numbered;
 return jsonb_build_object('entries',entries,'nextCursor',case when more then (offset_n+50)::text else null end);
exception when invalid_text_representation or datetime_field_overflow then return '{"error":"INVALID_INPUT"}';end $$;
-- CREATE OR REPLACE keeps privileges, but re-issue them so this migration is
-- self-contained if the function is ever recreated from scratch.
revoke all on function public.learning_results(jsonb) from public,anon;grant execute on function public.learning_results(jsonb) to authenticated;
commit;
