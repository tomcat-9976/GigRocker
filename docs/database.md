# Database changes

How the structure of GigRocker's database (tables, columns, access rules) is changed, tested and released. This is a runbook: follow the steps in order.

## The rules

1. **Migrations are the only source of truth.** The database structure is defined by the files in `supabase/migrations/`, applied in filename order. Don't change structure in the Supabase dashboard (Table Editor, policy editor) or by running SQL by hand.
2. **Never edit a migration that has been applied anywhere.** To change or undo something, write a new migration.
3. **Staging first, production on merge.** A migration is applied to staging, tested there and reviewed in a pull request. Merging the pull request into `main` applies it to production automatically. See [Releasing to production](#releasing-to-production).
4. **Nobody pushes to production by hand.** The Supabase CLI remembers one "linked" project at a time. Keep it on staging. Linking it to production is only for the [emergency fallback](#emergency-fallback-releasing-by-hand), after the cause of a failed automatic release is understood.

Data (the songs, setlists and so on that people enter) is not part of migrations. Migrations change structure, never the content people have added.

## Check which database the CLI is pointing at

Run this before any `supabase db ...` or `supabase migration ...` command:

```bash
cat supabase/.temp/project-ref
```

| Output | Meaning |
| --- | --- |
| `mwavgdpfulntroqeuopg` | **Staging.** Safe to experiment. |
| `xuovllfdugsfvdqqjvho` | **Production.** Only during the emergency fallback. Link back to staging straight after. |

## Making a change

1. Start from an up-to-date `main` and create a branch:
   ```bash
   git checkout main
   git pull
   git checkout -b feature/short-description
   ```
2. Create a new, empty migration file:
   ```bash
   supabase migration new short_description
   ```
   This creates `supabase/migrations/<timestamp>_short_description.sql`. Write the SQL in it. Start the file with comments explaining what the change does and why.
3. If the change affects who can do what (a new table, a new or changed access rule), update the tests in `supabase/tests/access_rules.test.sql` to match. See [Database tests](#database-tests).
4. Commit, push, and open a pull request. Wait for the checks: they apply every migration to an empty database and run the tests. **Fix anything red before going further.** A migration that fails here never reaches staging.
5. Confirm the CLI is linked to **staging** (see above), then apply the migration to staging:
   ```bash
   supabase db push
   ```
   It lists the migrations it is about to apply. Check that the list contains only your new file, then answer **Y**.
6. Verify the change in the staging project's SQL Editor and on the Vercel preview, which uses the staging database.
7. After review and preview testing, merge the pull request.
8. Watch the automatic release to production, then verify it (next section).

**Keep each migration compatible with the code that is already live.** On merge, Vercel deploys the new code and Supabase applies the new migration at about the same time, in no guaranteed order. For a minute or two, old code may run against the new structure or new code against the old. Adding a table or a column is safe. Removing or renaming something the app uses is not; split it into steps across separate pull requests (add the new thing, move the code over, then remove the old thing).

## Releasing to production

Production migrations are applied automatically. Supabase's GitHub integration is connected to the production project with **Deploy to production** switched on. When a pull request merges into `main`, it applies any new migrations to production, usually within a minute. Supabase's documentation describes it in [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration).

The integration's settings live in the Supabase dashboard, not in this repo: production project → **Project Settings → Integrations → GitHub Integration**. They should read:

| Setting | Value |
| --- | --- |
| GitHub repository | `tomcat-9976/GigRocker` |
| Working directory | `.` |
| Deploy to production | On |
| Production branch name | `main` |
| Automatic branching | Off (needs the Pro plan; staging is a separate project instead) |

Also on merge, per Supabase's documentation: Edge Functions and storage buckets declared in `supabase/config.toml` are deployed (there are none today). Auth, API and seed settings in `config.toml` are ignored, so its local-only defaults never reach production.

After merging a pull request:

1. On GitHub, open the merge commit on `main` (the repo's **Commits** page, or the commit link at the bottom of the merged pull request).
2. Wait for its checks. The one named **Supabase Preview** is the production deploy: despite the name, on `main` it applies migrations to production. It should show a green tick, alongside the two CI checks.
3. If the pull request contained a migration, verify it in the production SQL Editor (see [Useful queries](#useful-queries)) and on the live site.

On pull request branches the Supabase Preview check always shows **skipped**. That's expected: it would create preview databases, which this plan doesn't include.

**Never run `supabase db push` against production while the integration is on.** Two tools applying the same migration at the same moment can collide and fail partway.

### If the Supabase check fails

A migration that fails is rolled back, so production is left as it was before that migration.

1. Click **Details** next to the failed check to open the deployment log in the Supabase dashboard, and read the error.
2. Look the error up in [Troubleshooting](#troubleshooting). A history mismatch ("Remote migration versions not found") is the most likely cause, and it's what happened on 2026-10-22.
3. Fix forward where possible: a new pull request with a corrected migration. Merging it runs the automatic release again.
4. Only if the integration can't do it, and the cause is understood, use the emergency fallback below.

### Emergency fallback: releasing by hand

Use this only after a failed automatic release whose cause you understand. **Run one command at a time and check its result before typing the next.** Don't paste the whole list at once: when `db push` asks its Yes/No question, the next pasted line can be taken as the answer.

| # | Command | Check before continuing |
| --- | --- | --- |
| 1 | `git checkout main` | |
| 2 | `git pull` | |
| 3 | `git status` | Says **On branch main** and **up to date with 'origin/main'** |
| 4 | `supabase link --project-ref xuovllfdugsfvdqqjvho` | Asks for the **production** database password |
| 5 | `cat supabase/.temp/project-ref` | Prints `xuovllfdugsfvdqqjvho`. You are now on **production**. |
| 6 | `supabase migration list` | Every row has a Remote value except the new migration(s) from the pull request. Nothing appears in Remote that isn't in Local. |
| 7 | `supabase db push` | Lists only the new migration(s). Then answer **Y**. |
| 8 | `supabase link --project-ref mwavgdpfulntroqeuopg` | |
| 9 | `cat supabase/.temp/project-ref` | Prints `mwavgdpfulntroqeuopg`. Back on **staging**. |

Then verify the change on the production site and in the production SQL Editor (see [Useful queries](#useful-queries)).

If any check fails, don't continue: go straight to step 8 to link back to staging, then investigate (see [Troubleshooting](#troubleshooting)).

## Database tests

`supabase/tests/access_rules.test.sql` holds automated tests, written with [pgTAP](https://pgtap.org), for who can do what with each table: a signed-out visitor using the public anon key, and a signed-in user. They check that:

- RLS is on for every table; no access rule applies to `PUBLIC` (every role) or to signed-out visitors (`anon`). A failure names the offending table or rule.
- Every song and setlist must have an owner.
- A signed-out visitor can't see or add anything.
- Signed-in user A sees only their own songs, setlists, items and history. A can add, change and delete their own records, but can't add records in B's name, give a song away, or touch B's songs. A setlist item may only use A's own songs.
- Signed-in user B can't see or change any of A's records.

The checks on every pull request build a fresh database from the migrations and run these tests. To run them yourself (Docker Desktop must be running):

```bash
supabase db start      # a throwaway local database with every migration applied
supabase test db       # run the tests; each prints "ok" or "not ok"
supabase db stop       # shut it down
```

None of these commands touch staging or production, whichever project the CLI is linked to.

When a migration changes who can do what, change the tests in the same pull request. A rule that becomes more open without a matching test change will fail the checks. That's intended: it makes widening access a deliberate decision.

## Checking that the databases match the migrations

To see whether a database has drifted from the migration files (for example, because something was changed in the dashboard):

```bash
supabase db diff --linked
```

"No schema changes found" means the linked database matches the migrations exactly. Any SQL it prints is a difference to investigate. Docker Desktop must be running.

## Useful queries

Access rules for every table (run in either project's SQL Editor). Every table should show `rls_enabled = true`. A table with no policy rows is closed to the app entirely.

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       p.policyname, p.cmd, p.roles, p.qual, p.with_check
from pg_class c
left join pg_policies p on p.tablename = c.relname and p.schemaname = 'public'
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
order by c.relname, p.policyname;
```

Which migrations a database has recorded as applied, including the SQL each one ran:

```sql
select version, name, statements from supabase_migrations.schema_migrations order by version;
```

## Troubleshooting

### "Remote migration versions not found in local migrations directory"

The database's list of applied migrations contains a version that has no matching file in `supabase/migrations/`. The CLI, and the automatic release on merge, refuse to apply anything until the two agree. Nothing has been changed. On production you'll see it as a failed Supabase Preview check on `main`, with this error in the deployment log.

1. Link back to staging if you were on production.
2. Make sure you're on an up-to-date `main` (`git checkout main`, `git pull`). Often the file exists on GitHub and you just don't have it yet.
3. If the version still isn't in your files, find out what it was. Run the "which migrations" query above in that project's SQL Editor and read its `statements`. It usually comes from a `supabase db pull` or `db push` run from some other folder.
4. Only remove a history entry if `supabase db diff --linked` shows the database's actual structure already matches the migration files. Then, while linked to that project:
   ```bash
   supabase migration repair --status reverted <version>
   ```
   This deletes that one row from the history list. It does not run or undo any SQL.

Never use `migration repair` to make an error go away without understanding the cause. It edits the record of what has happened, not the database itself, so a wrong repair hides real differences.

### A command did something to the wrong database

The CLI uses the `supabase/` folder **in the folder you run it from**. Run Supabase commands only from the project folder, and check `cat supabase/.temp/project-ref` first. A stray `supabase/` folder elsewhere (for example in your home folder) can be linked to a different project.

## Migration history

| Migration | What it does |
| --- | --- |
| `20261022222027_remote_schema.sql` | **Baseline.** Captures the database exactly as it was on 2026-10-22, before migrations were used: four tables (`songs`, `setlists`, `setlist_items`, `gig_history`) and their access rules. Generated from staging with `supabase db pull`. It was never run against either database; both were marked as already having it (`db pull` on staging, `supabase migration repair --status applied` on production). Production's history also held an older entry, `20261022153640_remote_schema`, from a `supabase db pull` run against production earlier that morning whose file never reached the repo. It was removed with `migration repair --status reverted` on 2026-10-22, after `db diff` confirmed production matched the baseline. |
| `20261022222400_lock_down_unused_tables.sql` | Removes the open access rules on `setlists`, `setlist_items` and `gig_history`, which let anonymous visitors read, change and delete them. The app doesn't use these tables yet. On production, the automatic release at merge failed on the stray history entry above, so this migration was applied by hand after the repair. |
| `20261023203700_add_owner_to_songs_and_setlists.sql` | Adds `owner_id` to `songs` and `setlists`: a link to the owning user, filled in automatically with whoever is signed in. It's optional for now and no access rules change. Existing rows were assigned to Tom by hand in each environment afterwards (a data change; see `CHANGELOG.md`). Accounts and sharing, phase 1, step A. |
| `20261025212300_owner_only_access.sql` | Makes `owner_id` required, and replaces the open song rules with owner-only rules for signed-in users on `songs` and `setlists`. Setlist items and gig history are reached through their setlist, and items may only use the same user's songs. Signed-out visitors get nothing. It fails, changing nothing, if any row still lacks an owner. Accounts and sharing, phase 1, step B. |
