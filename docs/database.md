# Database changes

How the structure of GigRocker's database (tables, columns, access rules) is changed, tested and released. This is a runbook: follow the steps in order.

## The rules

1. **Migrations are the only source of truth.** The database structure is defined by the files in `supabase/migrations/`, applied in filename order. Don't change structure in the Supabase dashboard (Table Editor, policy editor) or by running SQL by hand.
2. **Never edit a migration that has been applied anywhere.** To change or undo something, write a new migration.
3. **Staging first.** A migration is applied to staging, tested there, reviewed in a pull request, and only applied to production after the pull request is merged.
4. **The CLI stays linked to staging.** The Supabase CLI remembers one "linked" project at a time. Keep it on staging, and switch to production only for the few commands in [Releasing to production](#releasing-to-production).

Data (the songs, setlists and so on that people enter) is not part of migrations. Migrations change structure, never the content people have added.

## Check which database the CLI is pointing at

Run this before any `supabase db ...` or `supabase migration ...` command:

```bash
cat supabase/.temp/project-ref
```

| Output | Meaning |
| --- | --- |
| `mwavgdpfulntroqeuopg` | **Staging.** Safe to experiment. |
| `xuovllfdugsfvdqqjvho` | **Production.** Only during a release. |

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
3. Confirm the CLI is linked to **staging** (see above), then apply the migration to staging:
   ```bash
   supabase db push
   ```
   It lists the migrations it is about to apply. Check that the list contains only your new file, then answer **Y**.
4. Verify the change in the staging project's SQL Editor and in the app (`npm run dev` with staging values in `.env.local`).
5. Commit, push, and open a pull request. The Vercel preview uses the staging database, which already has the change.
6. After review and preview testing, merge the pull request.
7. Release the migration to production straight away (next section).

**Keep each migration compatible with the code that is already live.** Vercel deploys the merged code within a minute or two, and the migration reaches production a few minutes later, so for a short time old code runs against the new structure or new code against the old. Adding a table or a column is safe. Removing or renaming something the app uses is not; split it into steps across separate pull requests (add the new thing, move the code over, then remove the old thing).

## Releasing to production

Right after merging a pull request that contains migrations:

```bash
git checkout main
git pull
supabase link --project-ref xuovllfdugsfvdqqjvho     # PRODUCTION (asks for its database password)
supabase migration list                             # only the new migration(s) should be missing from the Remote column
supabase db push                                    # check the list, then Y
supabase link --project-ref mwavgdpfulntroqeuopg     # back to STAGING
cat supabase/.temp/project-ref                       # must print mwavgdpfulntroqeuopg
```

Then verify the change on the production site and in the production SQL Editor.

If `migration list` shows anything unexpected (a migration missing from production that should already be there, or one present in production but not in your files), stop, link back to staging, and investigate before pushing.

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

Which migrations a database has recorded as applied:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

## Migration history

| Migration | What it does |
| --- | --- |
| `20261022222027_remote_schema.sql` | **Baseline.** Captures the database exactly as it was on 2026-10-22, before migrations were used: four tables (`songs`, `setlists`, `setlist_items`, `gig_history`) and their access rules. Generated from staging with `supabase db pull`. It was never run against either database; both were marked as already having it (`db pull` on staging, `supabase migration repair --status applied` on production). |
| `20261022222400_lock_down_unused_tables.sql` | Removes the open access rules on `setlists`, `setlist_items` and `gig_history`, which let anonymous visitors read, change and delete them. The app doesn't use these tables yet. |
