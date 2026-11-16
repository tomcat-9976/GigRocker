-- Accounts and sharing, phase 1, step B: owner-only access.
-- See docs/requirements/accounts-and-sharing.md (phase 1, decisions D2 and D7).
--
-- From here on, every song and setlist must have an owner, and only signed-in
-- users can reach anything: each user sees and changes only their own
-- records. Signed-out visitors (the anon role) have no access rules at all,
-- so they get nothing.
--
-- setlist_items and gig_history have no owner column: access to them comes
-- through their setlist. A setlist item may only point at one of the same
-- user's songs.
--
-- (select auth.uid()) rather than auth.uid(): Supabase's recommended form,
-- evaluated once per query instead of once per row.
--
-- Before this runs on staging or production, every existing row must already
-- have an owner, or the "set not null" below fails and the migration rolls back
-- with nothing changed. See the release steps in pull request #9.

-- Every song and setlist has an owner ----------------------------------------

alter table public.songs    alter column owner_id set not null;
alter table public.setlists alter column owner_id set not null;

-- songs ----------------------------------------------------------------------

drop policy "Anyone can read songs" on public.songs;
drop policy "Anyone can add songs"  on public.songs;

create policy "Owners can read their songs" on public.songs
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Owners can add songs" on public.songs
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners can change their songs" on public.songs
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners can delete their songs" on public.songs
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- setlists -------------------------------------------------------------------

create policy "Owners can read their setlists" on public.setlists
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Owners can add setlists" on public.setlists
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners can change their setlists" on public.setlists
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners can delete their setlists" on public.setlists
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- setlist_items: through their setlist, and only with the owner's own songs --

create policy "Owners can read items in their setlists" on public.setlist_items
  for select to authenticated
  using (exists (
    select 1 from public.setlists s
     where s.id = setlist_items.setlist_id
       and s.owner_id = (select auth.uid())));

create policy "Owners can add items to their setlists" on public.setlist_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.setlists s
       where s.id = setlist_items.setlist_id
         and s.owner_id = (select auth.uid()))
    and (
      setlist_items.song_id is null
      or exists (
        select 1 from public.songs g
         where g.id = setlist_items.song_id
           and g.owner_id = (select auth.uid()))));

create policy "Owners can change items in their setlists" on public.setlist_items
  for update to authenticated
  using (exists (
    select 1 from public.setlists s
     where s.id = setlist_items.setlist_id
       and s.owner_id = (select auth.uid())))
  with check (
    exists (
      select 1 from public.setlists s
       where s.id = setlist_items.setlist_id
         and s.owner_id = (select auth.uid()))
    and (
      setlist_items.song_id is null
      or exists (
        select 1 from public.songs g
         where g.id = setlist_items.song_id
           and g.owner_id = (select auth.uid()))));

create policy "Owners can delete items in their setlists" on public.setlist_items
  for delete to authenticated
  using (exists (
    select 1 from public.setlists s
     where s.id = setlist_items.setlist_id
       and s.owner_id = (select auth.uid())));

-- gig_history: through its setlist -------------------------------------------

create policy "Owners can read history of their setlists" on public.gig_history
  for select to authenticated
  using (exists (
    select 1 from public.setlists s
     where s.id = gig_history.setlist_id
       and s.owner_id = (select auth.uid())));

create policy "Owners can add history to their setlists" on public.gig_history
  for insert to authenticated
  with check (exists (
    select 1 from public.setlists s
     where s.id = gig_history.setlist_id
       and s.owner_id = (select auth.uid())));

create policy "Owners can change history of their setlists" on public.gig_history
  for update to authenticated
  using (exists (
    select 1 from public.setlists s
     where s.id = gig_history.setlist_id
       and s.owner_id = (select auth.uid())))
  with check (exists (
    select 1 from public.setlists s
     where s.id = gig_history.setlist_id
       and s.owner_id = (select auth.uid())));

create policy "Owners can delete history of their setlists" on public.gig_history
  for delete to authenticated
  using (exists (
    select 1 from public.setlists s
     where s.id = gig_history.setlist_id
       and s.owner_id = (select auth.uid())));
