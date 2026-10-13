-- P3 (PN-R2-01): pn_private.lesson_dto returned assignments[] in group_id (UUID)
-- order, so the ready-summary list and the "Cetakan siap" gate hint named the
-- groups in an order unrelated to the arrangement the teacher had just made, while the
-- edit grid rendered payload->'groups' in label order. Reload was stable inside one
-- lesson and arbitrary across lessons, which is exactly what a UUID sort looks like.
-- Order by each assignment's group position in payload->'groups' instead: that array is
-- the teacher's own arrangement (the client renders it as the grid and `group_lesson_action
-- save` stores it verbatim), so every consumer now agrees with the grid.
-- Additive: replaces one read-only DTO function; snapshots, RLS and grants are unchanged.
begin;
create or replace function pn_private.lesson_dto(l public.group_lessons) returns jsonb language sql stable set search_path='' as $$
 select l.payload||jsonb_build_object('revision',l.revision,'status',l.status,'assignments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'groupId',a.group_id,'method',a.method,'collectionId',r.set_id,'version',r.version,'runId',r.id,'formId',r.form_id,'roster',r.roster,'status',a.status,'revision',a.revision) order by p.ord,a.group_id) from public.group_assignments a join public.library_runs r on r.id=a.run_id left join lateral (select e.ord from jsonb_array_elements(l.payload->'groups') with ordinality e(g,ord) where e.g->>'id'=a.group_id::text limit 1) p on true where a.lesson_id=l.id),'[]'))
$$;
-- CREATE OR REPLACE keeps privileges, but re-issue the revoke so this migration is
-- self-contained if the function is ever recreated from scratch.
revoke all on function pn_private.lesson_dto(public.group_lessons) from public,anon,authenticated;
commit;
