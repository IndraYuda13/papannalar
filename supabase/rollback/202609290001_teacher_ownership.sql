-- DEVELOPMENT ONLY: destructive rollback for this first, isolated migration.
-- Take a backup and review ownership/RLS before applying to any populated DB.
begin;
drop function public.create_class_with_roster(uuid,text,integer,integer,text);
drop table public.students;
drop table public.classes;
commit;
