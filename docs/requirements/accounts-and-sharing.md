# Accounts and sharing: requirements

**Status:** agreed with Tom on 2026-10-23. Phase 1 is next.

This document records what login and sharing should do, the decisions behind them, and the order they'll be built in. Each phase gets its own detailed plan and pull requests. When a decision here changes, change this document in the same pull request.

## Vision

- **Most of the time GigRocker has one user.** Login's first job is keeping that musician's library private.
- **Sometimes a gig involves another musician.** The owner shares that gig's setlist, with the songs in it, so the other musician can read it, adjust it, or simply be handed a printout.
- **Later, other musicians get their own private accounts** with the same abilities, and can share with each other. That makes a network of private libraries, connected gig by gig.

Build as simply as possible, but never in a way that blocks the later phases.

## Decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | Sign in with **email and password**. No emailed sign-in links or third-party sign-in for now. | It doesn't depend on email delivery. Supabase's built-in email sender is heavily limited and meant for testing. A proper email service comes in with invitations (phase 4). |
| D2 | **Every song and setlist has exactly one owner**, recorded on the row from phase 1, even while there's only one user. | Adding ownership later, after several people's data is mixed together, is a painful migration. With owners in place from the start, later phases add features without restructuring. |
| D3 | **The unit of sharing is a setlist.** Access to someone else's songs only ever comes through a setlist they've shared. Libraries and accounts are never shared as a whole. | It matches how musicians actually collaborate: gig by gig. |
| D4 | **Collaborators change gig-level details only:** song order, the key for this gig and notes (`setlist_items.sequence_order`, `transposed_key`, `notes`). They never change the owner's master copy of a song. | The owner's library stays theirs, and nobody can change a chord chart for every future gig by accident. |
| D5 | **Collaborators see only the songs in setlists shared with them**, never the owner's whole library. | Least access needed for the job. |
| D6 | **The first forms of sharing are a printable booklet and a private read-only link.** The link needs no account and can be revoked. Collaborator accounts come later. | They cover "give them a reference" with no sign-up, invitations or email. |
| D7 | **Sign-ups stay off until phase 5.** Until then, accounts are created only by the project owner in the Supabase dashboard. | Nobody can create an account they weren't given. |
| D8 | **Existing songs are kept and assigned to Tom.** Test entries are removed first. | The library built so far isn't lost. |

## Phases

| Phase | What it delivers | Depends on |
| --- | --- | --- |
| 1. Private login | Sign in and out. Every song and setlist has an owner. Owners see and change only their own records, and signed-out visitors see nothing. | — |
| 2. Setlist builder | Create a setlist for a gig (name, venue, date) from your songs. Order the songs and set a per-gig key and notes. | 1 |
| 3. Simple sharing | A printable booklet of a setlist with its songs, and a private read-only link to one setlist that can be revoked. | 2 |
| 4. Collaborators | Invite a musician to one setlist as a **viewer** or **editor** (D4). They sign in and see only that setlist and its songs. The owner can remove them. | 3, plus an email service |
| 5. Open network | Musicians create their own accounts with private libraries and share with each other in the same way. | 4 |

### Phase 1 in detail

Done when:

- Signed-out visitors see only a sign-in page. They can't read or add anything, and the database tests prove it.
- Tom signs in on production and sees his existing songs, now owned by him.
- Songs added while signed in are owned by whoever added them.
- The database tests prove that a second signed-in user can't see, change or delete Tom's songs or setlists.
- Sign-ups are switched off in both Supabase projects, and Tom has an account in each.

Not in phase 1: password reset emails (for now, reset from the Supabase dashboard), profiles or display names, and editing or deleting songs in the app. The database will allow owners to change and delete their own songs, ready for when the screens exist.

## Data model direction

How each kind of record is reached. Rows marked with a later phase don't exist yet.

| Record | Owned by | Who else can reach it |
| --- | --- | --- |
| `songs` | `owner_id` (phase 1) | Viewers and editors of a setlist that contains it, read-only (phases 3–4) |
| `setlists` | `owner_id` (phase 1) | Its members (phase 4); anyone holding a live share link, read-only (phase 3) |
| `setlist_items` | its setlist | Same as the setlist. Editors may change order, per-gig key and notes (D4). |
| `gig_history` | its setlist | Same as the setlist |
| `setlist_members` (phase 4) | the setlist's owner | Links a user to a setlist with a role: viewer or editor |
| `setlist_share_links` (phase 3) | the setlist's owner | A secret link to one setlist that can be revoked or expire |

The access rules in plain words:

- You can do anything with records you own.
- You can see a setlist if you own it, you're a member, or you hold a live share link to it.
- You can see a song if you own it, or it's in a setlist you can see.
- You can change a setlist's gig-level details if you own it or you're one of its editors.

## Not planned yet

These are possible later, but out of scope until a phase calls for them:

- Editing the same setlist at the same moment as someone else, or comments and notifications.
- A band or group as a sharing unit (sharing with the same few musicians every time).
- Collaborators suggesting changes to a master song.
- Showing chords transposed for a collaborator's instrument.
- Public profiles or searching for other musicians.

## Open questions

- Should share links expire by default, and after how long? (Phase 3.)
- Which email service sends invitations? (Phase 4.)
- What data should staging hold once production contains other musicians' data? (Before phase 5.)
