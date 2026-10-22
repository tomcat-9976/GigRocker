# GigRocker

A web app for working musicians: a stage-ready song library with chords, a transposer, and (planned) a setlist builder and printable binder booklets. Built for a solo performer first, with collaboration with other musicians as a later goal.

**Status:** early prototype. The song library can add and list songs. Transposing, setlists and booklets are not built yet.

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
2. Make the change on that branch. Code, any database change, and any documentation update go together.
3. Open a pull request. Vercel builds a preview of the branch, connected to the **staging** database.
4. Test the preview. If it's right, merge the pull request.
5. Merging to `main` deploys to production.

Nothing goes into `main` directly.

## Running it on your own computer

You need [Node.js](https://nodejs.org) **version 24** installed, the same version Vercel uses (it's set in `package.json`). Check with `node --version`. If npm prints an `EBADENGINE` warning, your Node version doesn't match.

```bash
npm ci                       # install dependencies, exactly the versions in package-lock.json
cp .env.example .env.local   # then fill in the two values in .env.local
npm run dev                  # start the app at http://localhost:3000
npm run lint                 # check the code for common mistakes
```

Use the **staging** project's values in `.env.local`, never production's. That way local experiments can't touch real data. `.env.local` is ignored by Git, so your keys stay on your computer.

## Known gaps

These are tracked and will be fixed through the normal process above:

- **No login yet.** Anyone with the site address can see and add songs. Editing and deleting are blocked at the database level (see `CHANGELOG.md`, 2026-10-22).
- **The database structure isn't in version control yet.** The `songs` table was created by hand in each Supabase project. Capturing it as migration files is planned.
- **Tailwind CSS 3's build tools have known advisories.** They only run during the build, never in visitors' browsers, so the risk is low. Upgrading to Tailwind 4 fixes them and is planned.

## More documentation

- [`CHANGELOG.md`](CHANGELOG.md): every notable change, including database changes made by hand.
