# Changelog

Notable changes to GigRocker, newest first. Each entry says what changed, why, and how it reached production.

Database changes made by hand (before migrations are set up) are recorded here in full, including the exact SQL, so they can be reproduced and later folded into migration files.

## Unreleased

Changes merged into a branch but not yet in production.

### Fixed
- Site styling now works. Tailwind was never running during the build because `postcss.config.js` and `tailwind.config.js` were missing, so the site rendered with plain browser defaults.

### Added
- `.gitignore`, which keeps environment files (keys), database dumps (real data), build output and macOS `.DS_Store` files out of the repo.
- `package-lock.json`, so every build installs identical dependency versions.
- `README.md` and `.env.example`, describing the app, the environments, the change process and how to run it locally.
- This changelog.

### Removed
- `.DS_Store` files that had been committed by accident.

## 2026-10-22: Database access rules on `songs` tightened (manual change)

**Applied by hand** in the Supabase SQL Editor, to staging first and then production. Not yet captured in a migration file.

**Why:** Row Level Security was on, but the only policy (named "Enable all access for authenticated users on songs") applied to the `public` role, which includes anonymous visitors, and allowed every operation with no conditions. Anyone who loaded the site could read, add, edit or delete every song.

**What changed:** the open policy was replaced by two narrow ones that allow exactly what the app currently does, reading and adding songs. Editing and deleting are now blocked for everyone using the app. This is a stopgap until login is built and each user can only see their own songs.

```sql
begin;

drop policy "Enable all access for authenticated users on songs" on public.songs;

create policy "Anyone can read songs" on public.songs
  for select to anon, authenticated using (true);

create policy "Anyone can add songs" on public.songs
  for insert to anon, authenticated with check (true);

commit;
```

**How to check it's in place** (run in each project's SQL Editor; expect two rows, SELECT and INSERT, each for `{anon,authenticated}`):

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       p.policyname, p.cmd, p.roles, p.qual, p.with_check
from pg_class c
left join pg_policies p on p.tablename = c.relname and p.schemaname = 'public'
where c.relname = 'songs' and c.relnamespace = 'public'::regnamespace;
```
