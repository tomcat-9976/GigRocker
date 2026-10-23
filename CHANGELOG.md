# Changelog

Notable changes to GigRocker, newest first. Each entry says what changed, why, and how it reached production.

**How entries are written:** every pull request adds its own entry, headed with the date and the pull request number. Merging to `main` is the release, so the entry's date is the day it merges; if a pull request waits longer than planned, update the date before merging.

Database structure changes live in `supabase/migrations/` (see [docs/database.md](docs/database.md)). Entries here say which migrations a release includes.

## 2026-10-23: Songs and setlists record their owner (PR #8)

Accounts and sharing, phase 1, step A. Nothing changes for users of the app.

### Added
- Migration `20261023203700_add_owner_to_songs_and_setlists.sql`: `owner_id` on `songs` and `setlists`. It links to the user in Supabase Auth, is filled in automatically with whoever is signed in, and is indexed. A user who still owns records can't be deleted. It's optional for now, and no access rules change.
- Database tests: 18, up from 12. They now also check that both tables have an owner column, that a new setlist or song is owned by whoever adds it, and that a song added while signed out has no owner.

### Release steps (by hand, per environment, staging first)
Data and settings changes, which don't belong in migrations:
- Create Tom's account in Supabase Auth.
- Switch sign-ups off (requirements decision D7).
- After the migration reaches that database, assign existing songs and setlists to Tom.
- Production only: remove test songs (decision D8).

## 2026-10-23: Requirements for accounts and sharing (PR #7)

Documentation only.

### Added
- `docs/requirements/accounts-and-sharing.md`: the agreed vision, eight decisions, five phases (private login, setlist builder, simple sharing, collaborators, open network), and the data model direction for login and sharing setlists with other musicians.
- Links to it from `README.md`, `docs/architecture.md` and `CLAUDE.md`. `CLAUDE.md` now asks AI sessions to follow `docs/requirements/` when planning features.

## 2026-10-23: Production migrations deploy automatically on merge (PR #6)

Documentation only; no code, migration or setting changes.

### Changed
- Production database releases are documented as automatic. Supabase's GitHub integration is connected to the production project with "Deploy to production" on and `main` as the production branch, so merging a pull request applies its migrations to production. This was already switched on before 2026-10-22. It came to light when the "Supabase Preview" check was found running on merges to `main`, and Tom confirmed the settings in the dashboard.
- `docs/database.md`: "Releasing to production" now means merging, then confirming the Supabase Preview check on the merge commit. It covers what to do when that check fails, and the manual steps become an emergency fallback. The integration's expected settings are recorded.
- `README.md`, `docs/architecture.md`, `CLAUDE.md`: no longer say production migrations are applied by hand. `CLAUDE.md` adds checking the production deploy after every merge.

### Fixed (record)
- On 2026-10-22, the automatic release of PR #3 failed within a minute of the merge. Production's history held the stray `20261022153640` entry, and the integration refuses to apply migrations when a version in the history has no matching file. The lock-down migration was then applied by hand after the repair, as recorded under PR #4. The manual push and the automatic release didn't overlap, because the automatic one had already stopped.

## 2026-10-23: Automatic checks on every pull request (PR #5)

### Added
- GitHub Actions workflow `.github/workflows/ci.yml`, run on every pull request into `main` and on `main` after a merge. It has two checks:
  - **Lint and build** runs `npm ci`, `npm run lint` and `npm run build` on the Node version in `package.json`.
  - **Migrations and access rules** applies every migration to a throwaway database with the Supabase CLI (2.121.0), then runs the database tests.
- `supabase/tests/access_rules.test.sql`: 12 pgTAP tests. They check that RLS is on for every table, that no rule applies to `PUBLIC`, and exactly what an anonymous visitor can do with each table.
- Branch protection on `main`: changes arrive only through pull requests whose checks pass. Force-pushes and deletion are blocked.

### Changed
- `docs/database.md`: migrations now pass the checks before they're applied to staging. A new "Database tests" section explains the tests and how to run them locally.
- `README.md`, `docs/architecture.md`, `CLAUDE.md`: describe the checks and the protected `main`.

## 2026-10-22: Runbook lessons from the first production release (PR #4)

Documentation only; no code or database changes.

### Changed
- `docs/database.md`: the production release steps are now a numbered table, run one command at a time, with a check after each. They include confirming which project the CLI is linked to straight after linking, and a `git status` check that you're on an up-to-date `main`.

### Added
- `docs/database.md`: a Troubleshooting section covering "Remote migration versions not found in local migrations directory", when `migration repair` is and isn't safe, and why Supabase commands must run from the project folder.
- A record of how PR #3 reached production. The first `db push` was refused because production's migration history held an extra entry (`20261022153640_remote_schema`) from a `supabase db pull` run against production that morning. Since production's structure had been confirmed to match the baseline, that history entry was removed (`migration repair --status reverted`) and the lock-down migration was applied. Production now has RLS on all four tables, with `songs` read and add only and the other three closed.

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
