-- Lock down the tables the app doesn't use yet: setlists, setlist_items
-- and gig_history.
--
-- Each had a policy named "Enable all access for authenticated users on ..."
-- that actually applied to PUBLIC (every role, including anonymous
-- visitors) for every operation with no conditions. Anyone holding the
-- site's public (anon) key could read, change or delete these tables.
--
-- Nothing in the app reads or writes these tables yet, so the safe default
-- is no access at all. Dropping the policies leaves Row Level Security on
-- with no policies, which denies every operation through the API for the
-- anon and authenticated roles. Existing rows are untouched, and the
-- Supabase dashboard and service role can still see them.
--
-- Proper per-user policies will be added when login and the setlist
-- builder are built.

drop policy "Enable all access for authenticated users on gig_history"
  on public.gig_history;

drop policy "Enable all access for authenticated users on setlist_items"
  on public.setlist_items;

drop policy "Enable all access for authenticated users on setlists"
  on public.setlists;
