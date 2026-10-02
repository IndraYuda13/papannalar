-- M01-c only. No student names, session packages, pairing or learning state.
begin;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  label text not null check (length(btrim(label)) between 1 and 40),
  grade smallint not null check (grade between 1 and 12),
  student_count smallint not null check (student_count between 1 and 40),
  runtime_mode text not null default 'pilot' check (runtime_mode in ('demo', 'pilot')),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  owner_id uuid not null default auth.uid(),
  attendance_number smallint not null check (attendance_number between 1 and 40),
  active boolean not null default true,
  revision integer not null default 1 check (revision > 0),
  foreign key (class_id, owner_id) references public.classes(id, owner_id) on delete cascade,
  unique (class_id, attendance_number)
);

create index classes_owner_idx on public.classes(owner_id);
create index students_owner_idx on public.students(owner_id);
alter table public.classes enable row level security;
alter table public.students enable row level security;
revoke all on public.classes, public.students from public, anon, authenticated;
grant select, insert, delete on public.classes, public.students to authenticated;
grant update (label, grade, revision) on public.classes to authenticated;
grant update (attendance_number, active, revision) on public.students to authenticated;

-- An anonymous Auth user has role authenticated too: require a verified,
-- permanent teacher claim. Missing/anonymous claim fails closed.
create policy teacher_classes on public.classes for all to authenticated
using (owner_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') = 'false')
with check (owner_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') = 'false');

create policy teacher_students on public.students for all to authenticated
using (owner_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') = 'false')
with check (
  owner_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') = 'false'
  and exists (select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid())
);

-- SECURITY INVOKER: the caller's grants/RLS apply to both inserts. PostgreSQL
-- rolls back the whole call if any generated roster row fails.
create function public.create_class_with_roster(
  p_id uuid, p_label text, p_grade integer, p_count integer, p_mode text
) returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.classes(id, label, grade, student_count, runtime_mode)
    values (p_id, btrim(p_label), p_grade, p_count, p_mode);
  insert into public.students(class_id, attendance_number)
    select p_id, n from generate_series(1, p_count) n;
  return p_id;
end;
$$;
revoke all on function public.create_class_with_roster(uuid,text,integer,integer,text) from public, anon;
grant execute on function public.create_class_with_roster(uuid,text,integer,integer,text) to authenticated;

commit;
