# CLAUDE.md

Context and rules for AI assistants working in this repo. People should start with [README.md](README.md).

## Project

GigRocker is a web app for a gigging musician: song library with chords, transposer, setlists, printable binder booklets, gig history. Solo use first; collaboration with other musicians later.

The owner, Tom, is IT-savvy but not a professional developer, and uses this project to learn professional practice. Explain the reasoning behind changes in plain language, verify rather than assume, and point out risks before acting on them.

## Stack

- Next.js 16 (App Router, Turbopack), **JavaScript, not TypeScript**
- React 19, Tailwind CSS 3
- Supabase (PostgreSQL 17); the browser talks to it directly with the anon key
- Vercel hosting; Node 24 (pinned in `package.json` `engines`)
- ESLint 9 with `eslint-config-next`

## Commands

```bash
npm ci            # install exactly what package-lock.json specifies
npm run dev       # local server; needs .env.local (see .env.example), staging values only
npm run lint      # must pass before opening a pull request
npm run build     # must pass; dummy NEXT_PUBLIC_SUPABASE_* values are fine for a build check
```

## Environments

| | Git | Vercel | Supabase project ref |
| --- | --- | --- | --- |
| Production | `main` | Production | `xuovllfdugsfvdqqjvho` |
| Staging | any other branch / PR | Preview | `mwavgdpfulntroqeuopg` |

## How work is done

- Never commit to `main`. Branch from an up-to-date `main` → pull request → Vercel preview on staging → Tom tests → Tom merges.
- One logical change per pull request, in small commits with messages that explain why.
- Code, migrations and documentation for a change go in the same pull request.
- Every pull request adds a `CHANGELOG.md` entry headed `## YYYY-MM-DD: Title (PR #n)`.
- Keep `README.md`, `docs/architecture.md` and `docs/database.md` accurate; update them in the pull request that makes them wrong.
- Pull request descriptions include why, what changed, what was verified, and a test plan for the preview.

## Database rules

Full runbook: [docs/database.md](docs/database.md).

- Structure changes only through new files in `supabase/migrations/` (`supabase migration new <name>`). Never edit a migration that has been applied.
- Staging first (`supabase db push` while linked to staging); production only after merge, following the runbook.
- **The anon key is public, so RLS is the only access control.** Every table must have RLS enabled. Policies must name roles explicitly (`to anon`, `to authenticated`), never default to `PUBLIC`, and grant only the operations the app needs.
- Keep migrations compatible with the code that is already live (add first, remove later).
- Never put the service_role key, database passwords or production data in the repo.
- Test migrations before they reach staging where possible (for example, apply them to an empty Postgres and probe access as the `anon` role).

## Limits of cloud sessions

Claude sessions running in the cloud can push to GitHub and use the GitHub REST API (not GraphQL), but cannot reach the Supabase databases or `*.vercel.app` previews. In those sessions Tom runs Supabase CLI commands and preview tests and pastes back the results.

## Current state

See "Known gaps" in [README.md](README.md) and "Not built yet" in [docs/architecture.md](docs/architecture.md).
