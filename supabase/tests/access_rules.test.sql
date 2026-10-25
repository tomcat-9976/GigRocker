-- Access rules: who can do what with each table.
--
-- The anon key is public, so these rules are GigRocker's whole security
-- system (see docs/architecture.md). These tests run on every pull request
-- against a fresh database built from the migrations, and fail the check if
-- a rule is missing or too open.
--
-- The rules (docs/requirements/accounts-and-sharing.md, phase 1):
--   - a signed-out visitor (anon role) can do nothing;
--   - a signed-in user (authenticated role) can see and change only their
--     own songs and setlists, and the items and history of their own setlists;
--   - a setlist item may only use the same user's songs.
-- When a migration changes who can do what, update these tests in the same
-- pull request.
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

select plan(35);

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

select is(
  (select coalesce(string_agg(tablename || ': ' || policyname, ', ' order by tablename, policyname), '')
     from pg_policies
    where schemaname = 'public'
      and 'anon' = any(roles)),
  '',
  'No access rule applies to signed-out visitors (any rule named here does)'
);

select col_not_null('public', 'songs', 'owner_id', 'Every song has an owner');
select col_not_null('public', 'setlists', 'owner_id', 'Every setlist has an owner');

-- Two users, each with their own records -------------------------------------
-- Added as the table owner, which bypasses RLS. A user who can't see the
-- other's rows is being blocked by the rules, not looking at empty tables.

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'user-a@example.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'user-b@example.test');

insert into public.songs (id, owner_id, title, original_key, lyrics_and_chords) values
  ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-0000000000a1', 'A song', 'G', '[G]A'),
  ('00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-0000000000b2', 'B song', 'C', '[C]B');

insert into public.setlists (id, owner_id, name) values
  ('00000000-0000-4000-8000-00000000a002', '00000000-0000-4000-8000-0000000000a1', 'A setlist');

insert into public.setlist_items (setlist_id, song_id, sequence_order, item_type) values
  ('00000000-0000-4000-8000-00000000a002', '00000000-0000-4000-8000-00000000a001', 1, 'song');

insert into public.gig_history (setlist_id) values
  ('00000000-0000-4000-8000-00000000a002');

-- A signed-out visitor (the anon role): nothing --------------------------------

set local role anon;

select is_empty('select id from public.songs', 'A visitor cannot see songs');

select throws_ok(
  $$ insert into public.songs (title, original_key, lyrics_and_chords) values ('Visitor song', 'C', '[C]Hello') $$,
  '42501', null,
  'A visitor cannot add songs'
);

select is_empty('select id from public.setlists', 'A visitor cannot see setlists');

select throws_ok(
  $$ insert into public.setlists (name) values ('Visitor setlist') $$,
  '42501', null,
  'A visitor cannot add setlists'
);

select is_empty('select id from public.setlist_items', 'A visitor cannot see setlist items');

select throws_ok(
  $$ insert into public.setlist_items (setlist_id, sequence_order, item_type) values ('00000000-0000-4000-8000-00000000a002', 9, 'song') $$,
  '42501', null,
  'A visitor cannot add setlist items'
);

select is_empty('select id from public.gig_history', 'A visitor cannot see gig history');

select throws_ok(
  $$ insert into public.gig_history (setlist_id) values ('00000000-0000-4000-8000-00000000a002') $$,
  '42501', null,
  'A visitor cannot add gig history'
);

-- User A, signed in: their own records only --------------------------------

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

select results_eq(
  'select title from public.songs order by title',
  array['A song'],
  'A user sees only their own songs'
);

select lives_ok(
  $$ insert into public.songs (title, original_key, lyrics_and_chords) values ('A new song', 'D', '[D]New') $$,
  'A user can add a song'
);

select results_eq(
  $$ select owner_id from public.songs where title = 'A new song' $$,
  array['00000000-0000-4000-8000-0000000000a1'::uuid],
  'A song a user adds is owned by them'
);

select throws_ok(
  $$ insert into public.songs (owner_id, title, original_key, lyrics_and_chords) values ('00000000-0000-4000-8000-0000000000b2', 'Planted song', 'E', '[E]x') $$,
  '42501', null,
  'A user cannot add a song owned by someone else'
);

select results_eq(
  $$ update public.songs set title = 'A song (edited)' where title = 'A song' returning title $$,
  array['A song (edited)'],
  'A user can change their own song'
);

select throws_ok(
  $$ update public.songs set owner_id = '00000000-0000-4000-8000-0000000000b2' where title = 'A song (edited)' $$,
  '42501', null,
  'A user cannot give their song to someone else'
);

select is_empty(
  $$ update public.songs set title = 'Hacked' where title = 'B song' returning id $$,
  'A user cannot change someone else''s song'
);

select is_empty(
  $$ delete from public.songs where title = 'B song' returning id $$,
  'A user cannot delete someone else''s song'
);

select results_eq(
  $$ delete from public.songs where title = 'A new song' returning title $$,
  array['A new song'],
  'A user can delete their own song'
);

select results_eq(
  'select name from public.setlists',
  array['A setlist'],
  'A user sees their own setlist'
);

select results_eq(
  'select count(*)::int from public.setlist_items',
  array[1],
  'A user sees the items in their own setlist'
);

select results_eq(
  'select count(*)::int from public.gig_history',
  array[1],
  'A user sees the history of their own setlist'
);

select lives_ok(
  $$ insert into public.setlists (name) values ('A second setlist') $$,
  'A user can add a setlist'
);

select lives_ok(
  $$ insert into public.setlist_items (setlist_id, song_id, sequence_order, item_type)
     values ('00000000-0000-4000-8000-00000000a002', '00000000-0000-4000-8000-00000000a001', 2, 'song') $$,
  'A user can add their own song to their own setlist'
);

select throws_ok(
  $$ insert into public.setlist_items (setlist_id, song_id, sequence_order, item_type)
     values ('00000000-0000-4000-8000-00000000a002', '00000000-0000-4000-8000-00000000b001', 3, 'song') $$,
  '42501', null,
  'A user cannot add someone else''s song to their setlist'
);

select lives_ok(
  $$ insert into public.gig_history (setlist_id, crowd_vibe) values ('00000000-0000-4000-8000-00000000a002', 'Great night') $$,
  'A user can add history to their own setlist'
);

-- User B, signed in: none of A's records ------------------------------------

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

select results_eq(
  'select title from public.songs order by title',
  array['B song'],
  'Another user sees only their own songs, not A''s'
);

select is_empty('select id from public.setlists', 'Another user cannot see A''s setlists');

select is_empty('select id from public.setlist_items', 'Another user cannot see the items in A''s setlist');

select is_empty('select id from public.gig_history', 'Another user cannot see the history of A''s setlist');

select throws_ok(
  $$ insert into public.setlist_items (setlist_id, song_id, sequence_order, item_type)
     values ('00000000-0000-4000-8000-00000000a002', '00000000-0000-4000-8000-00000000b001', 4, 'song') $$,
  '42501', null,
  'Another user cannot add items to A''s setlist'
);

select is_empty(
  $$ update public.songs set title = 'Hacked' where title = 'A song (edited)' returning id $$,
  'Another user cannot change A''s song'
);

select * from finish();
rollback;
