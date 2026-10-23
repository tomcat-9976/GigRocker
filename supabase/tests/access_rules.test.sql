-- Access rules: who can do what with each table.
--
-- The anon key is public, so these rules are GigRocker's whole security
-- system (see docs/architecture.md). These tests run on every pull request
-- against a fresh database built from the migrations, and fail the check if
-- a rule is missing or too open.
--
-- When a migration changes who can do what, update the tests here in the
-- same pull request. Login (accounts and sharing, phase 1 step B) will
-- rewrite the "signed-out visitor" section: today visitors can still read
-- and add songs.
--
-- Run locally (Docker Desktop running):
--   supabase db start
--   supabase test db
--   supabase db stop
--
-- Everything happens inside one transaction that is rolled back at the end,
-- so the test rows never persist.

begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- Rules every table must follow ---------------------------------------------

select is(
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), '')
     from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity),
  '',
  'RLS is on for every table (any table named here has it off)'
);

select is(
  (select coalesce(string_agg(tablename || ': ' || policyname, ', ' order by tablename, policyname), '')
     from pg_policies
    where schemaname = 'public'
      and 'public' = any(roles)),
  '',
  'No access rule applies to PUBLIC, i.e. every role (any rule named here does)'
);

-- Ownership (requirements decision D2) ---------------------------------------

select has_column('public', 'songs', 'owner_id', 'Songs record their owner');
select has_column('public', 'setlists', 'owner_id', 'Setlists record their owner');

-- A test user, as Supabase Auth would create one.
insert into auth.users (id, email)
values ('00000000-0000-4000-8000-0000000000a1', 'owner-a@example.test');

-- auth.uid() reads the signed-in user's id from the request's JWT claims.
-- Setting them here stands in for a request from that user.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

insert into public.setlists (name) values ('Owned setlist');

select is(
  (select owner_id from public.setlists where name = 'Owned setlist'),
  '00000000-0000-4000-8000-0000000000a1'::uuid,
  'A new setlist is owned by whoever adds it'
);

-- Back to no signed-in user for the seed rows below.
select set_config('request.jwt.claims', '', true);

-- One row in each table, added as the table owner, which bypasses RLS.
-- A visitor who can't see these rows is being blocked by the rules, not
-- looking at an empty table.

insert into public.songs (id, title, original_key, lyrics_and_chords)
values ('00000000-0000-4000-8000-000000000001', 'Test song', 'G', '[G]Test');

insert into public.setlists (id, name)
values ('00000000-0000-4000-8000-000000000002', 'Test setlist');

insert into public.setlist_items (setlist_id, song_id, sequence_order, item_type)
values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 1, 'song');

insert into public.gig_history (setlist_id)
values ('00000000-0000-4000-8000-000000000002');

-- A signed-out visitor (the anon role) --------------------------------------

set local role anon;

-- songs: read and add only (until login, phase 1 step B)

select results_eq(
  'select count(*)::int from public.songs',
  array[1],
  'A visitor can read songs'
);

select lives_ok(
  $$ insert into public.songs (title, original_key, lyrics_and_chords) values ('Visitor song', 'C', '[C]Hello') $$,
  'A visitor can add a song'
);

select results_eq(
  $$ select (owner_id is null) from public.songs where title = 'Visitor song' $$,
  array[true],
  'A song added while signed out has no owner'
);

select is_empty(
  $$ update public.songs set title = 'Changed' returning id $$,
  'A visitor cannot change songs'
);

select is_empty(
  $$ delete from public.songs returning id $$,
  'A visitor cannot delete songs'
);

-- setlists, setlist_items, gig_history: closed until login exists

select is_empty(
  'select id from public.setlists',
  'A visitor cannot see setlists'
);

select throws_ok(
  $$ insert into public.setlists (name) values ('Visitor setlist') $$,
  '42501', null,
  'A visitor cannot add setlists'
);

select is_empty(
  'select id from public.setlist_items',
  'A visitor cannot see setlist items'
);

select throws_ok(
  $$ insert into public.setlist_items (sequence_order, item_type) values (1, 'song') $$,
  '42501', null,
  'A visitor cannot add setlist items'
);

select is_empty(
  'select id from public.gig_history',
  'A visitor cannot see gig history'
);

select throws_ok(
  $$ insert into public.gig_history (crowd_vibe) values ('Visitor note') $$,
  '42501', null,
  'A visitor cannot add gig history'
);

-- A signed-in user (the authenticated role) ----------------------------------

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.songs (title, original_key, lyrics_and_chords) values ('Member song', 'D', '[D]Hi') $$,
  'A signed-in user can add a song'
);

select results_eq(
  $$ select owner_id from public.songs where title = 'Member song' $$,
  array['00000000-0000-4000-8000-0000000000a1'::uuid],
  'A song added by a signed-in user is owned by them'
);

select * from finish();
rollback;
