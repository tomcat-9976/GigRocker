# Architecture

How GigRocker is put together, as of 2026-10-22. Update this file in the same pull request as any change that makes it inaccurate.

## Overview

GigRocker is a Next.js web app hosted on Vercel, with its data in a Supabase (PostgreSQL) database. All pages run in the visitor's browser and talk to Supabase directly, using the project's public "anon" key. There is no server-side code of our own yet.

That has one big consequence: **the database's Row Level Security (RLS) rules are the only thing that decides what a visitor can read or change.** The anon key is visible to anyone who opens the site, by design, so the rules have to be right for every table.

```mermaid
flowchart LR
    Browser["Visitor's browser"]
    Vercel["Vercel<br/>serves the Next.js pages"]
    API["Supabase API<br/>(anon key)"]
    DB[("PostgreSQL<br/>RLS rules on every table")]
    Browser -- "loads pages" --> Vercel
    Browser -- "reads and writes data" --> API
    API --> DB
```

## Environments

| | Production | Staging |
| --- | --- | --- |
| Purpose | Real use | Testing before release |
| Code deployed from | `main` branch | any other branch or pull request (Vercel preview) |
| Supabase project | GigRocker, `xuovllfdugsfvdqqjvho` | GigRocker-Staging, `mwavgdpfulntroqeuopg` |
| Vercel environment variables | "Production" set | "Preview" set |

Both environments run the same code and the same migrations, but never share data. The code contains no database addresses or keys; Vercel supplies `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for each environment.

## Code layout

| Path | What it is |
| --- | --- |
| `app/layout.js` | Page shell shared by every page (dark theme, page title) |
| `app/page.js` | Home page, linking to the song library |
| `app/songs/page.js` | Song library: add a song, list songs. Also contains a chord-transposing helper that isn't wired up yet |
| `lib/supabase.js` | Creates the Supabase client from the two environment variables |
| `supabase/config.toml` | Supabase CLI settings (used for local tooling, not by the live site) |
| `supabase/migrations/` | The database structure, as numbered SQL files. See [database.md](database.md) |
| `tailwind.config.js`, `postcss.config.js` | Styling build setup |
| `eslint.config.mjs` | Code-checking rules (`npm run lint`) |

## Data model

```mermaid
erDiagram
    users ||--o{ songs : "owns"
    users ||--o{ setlists : "owns"
    songs ||--o{ setlist_items : "appears in"
    setlists ||--o{ setlist_items : "contains"
    setlists ||--o{ gig_history : "was played at"

    users {
        uuid id PK "Supabase Auth (auth.users)"
        text email
    }
    songs {
        uuid id PK
        uuid owner_id FK "defaults to the signed-in user"
        text title
        text artist
        text original_key
        text lyrics_and_chords
        int tempo
        text time_signature
        timestamptz created_at
    }
    setlists {
        uuid id PK
        uuid owner_id FK "defaults to the signed-in user"
        text name
        text venue
        date gig_date
        text status "default draft"
        timestamptz created_at
    }
    setlist_items {
        uuid id PK
        uuid setlist_id FK
        uuid song_id FK
        int sequence_order
        text item_type
        text custom_label
        text transposed_key
        text notes
    }
    gig_history {
        uuid id PK
        uuid setlist_id FK
        timestamptz played_at
        text crowd_vibe
        text sound_notes
        text performance_reflections
    }
```

- Deleting a setlist also deletes its items and its gig history entries (`on delete cascade`).
- Deleting a song keeps any setlist items that used it, with the song link cleared (`on delete set null`).
- Only `songs` is used by the app today. The other three tables were created ahead of the setlist builder, and no part of the app uses them yet.
- Songs and setlists record their owner in `owner_id`, a link to the user in Supabase Auth. It's filled in automatically with whoever is signed in when the row is added. Setlist items and gig history belong to their setlist. A user who still owns songs or setlists can't be deleted (`on delete restrict`).
- Ownership isn't enforced yet. `owner_id` is optional, and the access rules below don't use it. Login (phase 1, step B of [the requirements](requirements/accounts-and-sharing.md)) makes it required and switches the rules to owner-only.

## Security model

| Table | RLS | What the app (anonymous visitors) can do |
| --- | --- | --- |
| `songs` | on | Read and add. Changing and deleting are blocked. |
| `setlists`, `setlist_items`, `gig_history` | on | Nothing. No policies, so all access through the API is denied. |

- The **anon key** is public and safe to expose, because RLS limits what it can do.
- The **service_role key** bypasses RLS entirely. It must never appear in the app, the repo, or Vercel's `NEXT_PUBLIC_` variables.
- Database passwords are used only by the Supabase CLI on a developer's machine, and are never stored in the repo.

## Deployment

- **Code:** pushing a branch makes Vercel build a preview against staging. Merging to `main` makes Vercel build and deploy production. Node 24 is pinned in `package.json`, and `package-lock.json` pins every dependency version, so both environments build identically.
- **Database:** migrations are applied to staging with the Supabase CLI during development. Production is automatic: Supabase's GitHub integration ("Deploy to production") applies new migrations when a pull request merges into `main`, and reports the result as the "Supabase Preview" check on the merge commit. See [database.md](database.md).
- **Checks:** every pull request runs GitHub Actions ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). One job lints and builds the site. The other applies every migration to a throwaway database and runs the access tests in `supabase/tests`. No secrets are involved and neither database is touched. `main` is protected: it only accepts pull requests whose checks pass.

## Not built yet

- Login, per-user data and sharing setlists with other musicians, in five phases. See [requirements/accounts-and-sharing.md](requirements/accounts-and-sharing.md).
- A decision on what data staging should hold once other people use the app (a scrubbed copy of production, or made-up sample data)
