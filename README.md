# GigRocker

A web app for working musicians: a stage-ready song library with chords, a transposer, and (planned) a setlist builder and printable binder booklets. Built for a solo performer first, with collaboration with other musicians as a later goal.

**Status:** early prototype. You sign in with an account created by the owner; there's no public sign-up. The song library can add and list your own songs. Transposing, setlists and booklets aren't built yet.

## How it's built

| Part | Tool |
| --- | --- |
| Web app | Next.js (React), styled with Tailwind CSS |
| Hosting | Vercel, deployed automatically from GitHub |
| Database | Supabase (PostgreSQL) |
| Code | GitHub: `tomcat-9976/gigrocker` |

## Environments

There are two completely separate environments. They run the same code but never share data.

| Environment | Who uses it | Deployed from | Supabase project |
| --- | --- | --- | --- |
| **Production** | Real users | the `main` branch | GigRocker (`xuovllfdugsfvdqqjvho`) |
| **Staging** | Testing before release | any other branch or pull request (Vercel preview) | GigRocker-Staging (`mwavgdpfulntroqeuopg`) |

Vercel picks the right database automatically: the environment variables set for "Production" in Vercel point at the production database, and those set for "Preview" point at staging. The code itself never contains database addresses or keys.

## How changes are made

Every change follows the same path, no matter how small:

1. Create a branch from `main` with a descriptive name, such as `feature/setlist-builder` or `fix/song-form-error`.
2. Make the change on that branch. Code, any database change, and any documentation update go together. Database changes have extra steps: see [docs/database.md](docs/database.md).
3. Open a pull request. Two things happen automatically:
   - GitHub runs the **checks** (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)): lint, build, every migration applied to an empty database, and the database access tests.
   - Vercel builds a **preview** of the branch, connected to the **staging** database.
4. If a check fails, fix it on the branch; the checks run again on every push. Once every check is green, test the preview. If it's right, merge the pull request.
5. Merging to `main` deploys to production: Vercel deploys the site, and Supabase applies any new database migrations.

Nothing goes into `main` directly. GitHub enforces this: `main` only accepts pull requests whose checks have passed, and can't be force-pushed or deleted.

## Running it on your own computer

You need:

- [Node.js](https://nodejs.org) **version 24**, the same version Vercel uses (it's set in `package.json`). Check with `node --version`. If npm prints an `EBADENGINE` warning, your Node version doesn't match.
- **Docker Desktop**, running, and the **Supabase CLI**, for a local database.

On your computer, the app normally talks to a **local Supabase**: a complete, private copy of the database and sign-in service, running in Docker and built from this repo's migrations. Nothing you do there touches staging or production.

### The first time

```bash
npm ci                       # install dependencies, exactly the versions in package-lock.json
supabase start               # start the local Supabase; the first run downloads Docker images and takes a while
cp .env.example .env.local   # then fill in the two values, as below
```

`supabase start` finishes by printing local addresses and keys (`supabase status` prints them again at any time). Put two of them in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: the **Project URL**, `http://127.0.0.1:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the **Publishable** key, starting `sb_publishable_`

Then create a test account. Open the local Supabase Studio at http://127.0.0.1:54323, go to **Authentication → Users → Add user → Create new user**, and enter any email and password with **Auto Confirm User** ticked. A second account is useful for checking that users can't see each other's songs. `.env.local` is ignored by Git, so it stays on your computer.

### Every time

```bash
supabase start               # if it isn't running already (quick after the first time)
npm run dev                  # the app, at http://localhost:3000
npm run lint                 # check the code for common mistakes
```

Stop the app with Ctrl+C, and the local Supabase with `supabase stop`, which keeps its data.

When you pull new migrations, apply them to the local database with `supabase migration up`. `supabase db reset` rebuilds it from scratch instead, deleting local test data and accounts.

You can also point `.env.local` at the **staging** project (its URL and anon key are under the dashboard's Connect button) to try the app against staging's data. Never use production's values.

## Known gaps

These are tracked and will be fixed through the normal process above:

- **No password reset by email.** For now, passwords are reset in the Supabase dashboard (Authentication → Users).
- **Songs can't be edited or deleted in the app yet.** The database already allows owners to do both, ready for when the screens exist.
- **Staging database migrations are applied by hand** with the Supabase CLI, before review. Production is automatic.
- **Tailwind CSS 3's build tools have known advisories.** They only run during the build, never in visitors' browsers, so the risk is low. Upgrading to Tailwind 4 fixes them and is planned.

## More documentation

- [`docs/architecture.md`](docs/architecture.md): how the app is put together, the data model and the security model.
- [`docs/database.md`](docs/database.md): how to change the database structure safely (runbook).
- [`docs/requirements/accounts-and-sharing.md`](docs/requirements/accounts-and-sharing.md): agreed requirements and phases for login and sharing setlists with other musicians.
- [`CHANGELOG.md`](CHANGELOG.md): every notable change.
- [`CLAUDE.md`](CLAUDE.md): project context and rules for AI assistants.
