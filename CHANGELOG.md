# Changelog

Notable changes to GigRocker, newest first. Each entry says what changed, why, and how it reached production.

**How entries are written:** every pull request adds its own entry, headed with the date and the pull request number. Merging to `main` is the release, so the entry's date is the day it merges; if a pull request waits longer than planned, update the date before merging.

Database structure changes live in `supabase/migrations/` (see [docs/database.md](docs/database.md)). Entries here say which migrations a release includes.

## 2026-10-22: Database structure under version control (PR #3)

### Added
- Supabase CLI setup (`supabase/config.toml`) and a **baseline migration**, `20261022222027_remote_schema.sql`, capturing the database exactly as it was: four tables (`songs`, `setlists`, `setlist_items`, `gig_history`), their relationships and access rules. It includes the hand-made `songs` access change below, so that change is now in version control too. Both databases are marked as already having the baseline; it was never run against them.
- `docs/database.md`, a runbook for changing the database structure safely, including how to release migrations to production.
- `docs/architecture.md`, describing how the app works, the data model and the security model. It replaces the earlier Gemini summary, which described practices that weren't in place yet.
- `CLAUDE.md`, giving AI assistants the project's context and rules.

### Security
- Migration `20261022222400_lock_down_unused_tables.sql`: `setlists`, `setlist_items` and `gig_history` each had a policy that let anyone, including anonymous visitors, read, add, change and delete every row. The app doesn't use these tables yet, so the policies were removed and the tables are now closed to the app entirely. They were found while reviewing the baseline; the earlier review had only checked `songs`.

## 2026-10-22: Upgrade to Next.js 16 and React 19 (PR #2)

### Security
- Upgraded Next.js from 14.1.0 to 16.4.2 and React from 18 to 19. Next.js 14.1.0 had many published security advisories, including one rated critical. The app's runtime dependencies now report 0 known vulnerabilities (`npm audit --omit=dev`).

### Changed
- Node.js 24 is now required, declared in `package.json` (`engines`). Next.js 16 needs Node 20.9 or newer, and declaring it means Vercel and local machines use the same version.
- `npm run lint` now runs ESLint directly with Next.js's recommended rules (`eslint.config.mjs`), because Next.js 16 removed the `next lint` command. ESLint is held at version 9 to match Next.js's own starter template.

### Known issues
- `npm audit` (including development tools) still reports advisories in Tailwind CSS 3's build-time dependencies. These run only while the site is built, on the project's own files, never in visitors' browsers. Fixing them requires Tailwind 4, a breaking change planned as a separate pull request.

## 2026-10-22: Repo foundation (PR #1)

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

**Applied by hand** in the Supabase SQL Editor, to staging first and then production. Since captured in the baseline migration (PR #3).

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
