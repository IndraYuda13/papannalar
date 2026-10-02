-- Real PostgreSQL authorization assertions. Fixture changes roll back.
begin;
create temp table assertions (label text);
grant insert, select on assertions to authenticated, anon;
create function pg_temp.ok(value boolean, label text) returns void language plpgsql as $$
begin
  if value is distinct from true then raise exception 'FAILED: %', label; end if;
  insert into assertions values(label);
end $$;
create function pg_temp.denied(command text, expected text, label text) returns void language plpgsql as $$
begin
  begin execute command;
  exception when others then
    if sqlstate = expected then perform pg_temp.ok(true,label); return; end if;
    raise;
  end;
  raise exception 'Expected denial: %',label;
end $$;
select pg_temp.ok((select relrowsecurity from pg_class where oid='public.classes'::regclass), 'classes RLS enabled');
select pg_temp.ok((select relrowsecurity from pg_class where oid='public.students'::regclass), 'students RLS enabled');
select pg_temp.ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='students' and column_name in ('name','nickname','display_name','student_name')), 'server roster has no names');
insert into auth.users(id,email,is_anonymous) values
('10000000-0000-4000-8000-000000000001','teacher-a@qa.invalid',false),
('10000000-0000-4000-8000-000000000002','teacher-b@qa.invalid',false),
('10000000-0000-4000-8000-000000000003',null,true);
set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","is_anonymous":false}';
select public.create_class_with_roster('20000000-0000-4000-8000-000000000001','7B',7,3,'pilot');
select pg_temp.ok((select count(*)=1 from public.classes), 'A reads own class');
select pg_temp.ok((select count(*)=3 from public.students), 'A reads generated roster');
select pg_temp.ok((select array_agg(attendance_number order by attendance_number)=array[1,2,3]::smallint[] from public.students), 'roster attendance 1..N');
select pg_temp.ok((select bool_and(substring(id::text,15,1)='4') from public.students), 'student IDs are random UUID v4');
update public.classes set label='7B Baru',revision=2;
select pg_temp.ok((select label='7B Baru' from public.classes limit 1), 'A updates own class');
select pg_temp.denied($q$select public.create_class_with_roster('20000000-0000-4000-8000-000000000009','invalid',13,41,'pilot')$q$, '23514', 'database validates grade/count');
select pg_temp.ok((select count(*)=1 from public.classes), 'invalid create leaves no partial class');
select pg_temp.denied($q$update public.classes set owner_id='10000000-0000-4000-8000-000000000002'$q$,'42501','owner immutable');
select pg_temp.denied($q$update public.classes set runtime_mode='demo'$q$,'42501','class mode immutable');
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","is_anonymous":false}';
select public.create_class_with_roster('20000000-0000-4000-8000-000000000002','8A',8,2,'demo');
select pg_temp.ok((select count(*)=1 from public.classes), 'B reads own class only');
select pg_temp.ok((select count(*)=2 from public.students), 'B reads own roster only');
select pg_temp.ok((select count(*)=0 from public.classes where id='20000000-0000-4000-8000-000000000001'), 'B cannot read A class');
select pg_temp.ok((select count(*)=0 from public.students where class_id='20000000-0000-4000-8000-000000000001'), 'B cannot read A roster');
with changed as (update public.classes set label='attack' where id='20000000-0000-4000-8000-000000000001' returning id) select pg_temp.ok((select count(*)=0 from changed),'B cannot update A');
with removed as (delete from public.classes where id='20000000-0000-4000-8000-000000000001' returning id) select pg_temp.ok((select count(*)=0 from removed),'B cannot delete A');
select pg_temp.denied($q$insert into public.students(class_id,attendance_number) values('20000000-0000-4000-8000-000000000001',4)$q$,'42501','B cannot insert student into A class');
select pg_temp.denied($q$insert into public.students(class_id,owner_id,attendance_number) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',4)$q$,'42501','forged owner relation denied');
with changed as (update public.students set active=false where class_id='20000000-0000-4000-8000-000000000001' returning id) select pg_temp.ok((select count(*)=0 from changed),'B cannot update A roster');
with removed as (delete from public.students where class_id='20000000-0000-4000-8000-000000000001' returning id) select pg_temp.ok((select count(*)=0 from removed),'B cannot delete A roster');
delete from public.classes where id='20000000-0000-4000-8000-000000000002';
select pg_temp.ok((select count(*)=0 from public.students), 'own delete cascades roster');
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","is_anonymous":false}';
select pg_temp.ok((select count(*)=1 from public.classes where label='7B Baru'), 'A class survives attacks');
select pg_temp.ok((select count(*)=3 from public.students), 'A roster survives attacks');
reset role;
create function pg_temp.fail_roster() returns trigger language plpgsql as $$
begin
  if new.class_id='20000000-0000-4000-8000-000000000008' and new.attendance_number=2 then raise exception 'injected failure'; end if;
  return new;
end $$;
create trigger test_roster_failure before insert on public.students for each row execute function pg_temp.fail_roster();
set local role authenticated;
select pg_temp.denied($q$select public.create_class_with_roster('20000000-0000-4000-8000-000000000008','7X',7,3,'demo')$q$,'P0001','mid-roster failure aborts RPC');
select pg_temp.ok((select count(*)=0 from public.classes where id='20000000-0000-4000-8000-000000000008'), 'no half-created class');
select pg_temp.ok((select count(*)=0 from public.students where class_id='20000000-0000-4000-8000-000000000008'), 'no partial roster');
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000003","is_anonymous":true}';
select pg_temp.ok((select count(*)=0 from public.classes), 'board cannot list classes');
select pg_temp.ok((select count(*)=0 from public.students), 'board cannot query roster');
select pg_temp.denied($q$select public.create_class_with_roster('20000000-0000-4000-8000-000000000007','board',7,1,'demo')$q$,'42501','board cannot create class');
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001"}';
select pg_temp.ok((select count(*)=0 from public.classes), 'missing permanent claim fails closed');
set local role anon;
set local request.jwt.claims = '{}';
select pg_temp.denied('select * from public.classes','42501','public cannot query classes');
select pg_temp.denied('select * from public.students','42501','public cannot query students');
reset role;
select 'PASS ' || count(*) || ' real PostgreSQL ownership/security assertions' from assertions;
select 'ok - ' || label from assertions;
rollback;
