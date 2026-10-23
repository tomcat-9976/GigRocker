-- Accounts and sharing, phase 1, step A: give every song and setlist an owner.
-- See docs/requirements/accounts-and-sharing.md (decision D2).
--
-- Adds owner_id to songs and setlists. It records which user owns each row
-- and is filled in automatically with the signed-in user's id when a row is
-- added (auth.uid()). setlist_items and gig_history get no owner column of
-- their own: they belong to their setlist.
--
-- This step deliberately changes NO access rules, so the live app keeps
-- working exactly as before. Signed-out visitors can still read and add
-- songs, and the songs they add have no owner (auth.uid() is null for them).
-- Step B (login) makes owner_id required and switches the rules to owner-only.
--
-- Existing rows start with no owner. They are assigned to Tom by hand in each
-- environment after this migration is applied; that is a data change, so it
-- is not part of a migration. See CHANGELOG.md.
--
-- on delete restrict: a user who still owns songs or setlists can't be
-- deleted by accident. Their records have to be removed or handed over first.

alter table public.songs
  add column owner_id uuid
    default auth.uid()
    references auth.users (id) on delete restrict;

alter table public.setlists
  add column owner_id uuid
    default auth.uid()
    references auth.users (id) on delete restrict;

-- The owner-only access rules in step B filter on these columns, so index them.
create index songs_owner_id_idx on public.songs (owner_id);
create index setlists_owner_id_idx on public.setlists (owner_id);
