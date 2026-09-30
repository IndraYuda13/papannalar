-- Qualify the item alias in server grading. No scoring or access rule changes.
begin;
do $$declare definition text;begin
 definition=pg_get_functiondef('public.library_action(jsonb,uuid)'::regprocedure);
 if position('where item->>''key''=' in definition)=0 then raise exception 'Expected grading definition missing';end if;
 execute replace(definition,'where item->>''key''=p_input->''answers''->>((n-1)::integer)','where q.item->>''key''=p_input->''answers''->>((q.n-1)::integer)');
end $$;
commit;
