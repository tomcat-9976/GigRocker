# Printing: requirements

**Status:** decisions P1 to P6 agreed with Tom on 2026-11-16, and updated the same day to reflect that most songs are lyrics only for now. Next: the printing spike (see [Build order](#build-order)).

This document records how GigRocker prints songs and setlist booklets, the decisions behind it, and the order it'll be built in. When a decision here changes, change this document in the same pull request.

## How printouts are used

Tom prints songs on both sides of the paper, punches them, and keeps them in a three-ring binder on a music stand. Before a gig he prints a booklet for that gig's setlist: the songs in set order. A booklet can also be handed to another musician as a reference (decision D6 in [accounts and sharing](accounts-and-sharing.md)).

On the stand, the binder lies open showing two pages side by side. A song must be readable at a glance from playing distance, and turning pages mid-song is to be avoided.

**Today most songs are lyrics only.** Tom knows how the chords go. Chords matter when playing with other musicians, so everyone is on the same page. They'll be added over time, mainly to the songs played with others. Printing has to work well for both kinds of song.

## Decisions

| # | Decision | Why |
| --- | --- | --- |
| P1 | **US Letter, portrait, printed on both sides, kept in a three-ring binder.** No folded or stapled booklets. | A folded booklet means rearranging pages on each sheet (page 8 beside page 1, and so on) with a page count that's a multiple of 4. A binder needs none of that. |
| P2 | **A wider inside margin for the punched holes** (about 1 inch), on the left of right-hand pages and the right of left-hand pages. About 0.6 inch elsewhere. | Text stays clear of the holes on both sides of the sheet. The app knows which side each page falls on (P6), so it sets these margins itself, whatever the browser supports. |
| P3 | **When a song has chords, they're printed above the words they belong to.** Songs are still typed with chords in brackets inside the words (`[G]Well, I'm a-[D]runnin'`). The printout places each chord above the syllable it's typed in front of. Songs without chords print as plain lyrics. | Easier to read at a glance than chords inside the line. Because each chord is tied to its syllable, the two stay together when a line wraps in a narrow column. |
| P4 | **Nothing on a song page is printed smaller than 14 point**, chords included. | Readable from a music stand. |
| P5 | **Fitting a song on one page:** first one column at the normal size; if it doesn't fit, two columns; then smaller text, step by step, down to 14 point; and only then two pages (P6). | One page means no page turns. Two columns come before smaller text, so the text stays as large as possible. |
| P6 | **A two-page song always starts on a left-hand page**, so both pages are visible at once in the open binder. If the next free page is a right-hand page, the app inserts a blank page first. One-page songs can fall on either side. | No page turn in the middle of a song. The app counts pages itself to decide where blanks go, so it never relies on browsers honoring "start on a left page", which they don't do reliably. |

**On each song page:** title, artist, key and tempo, plus a small page number in the outside corner. In a setlist booklet, also the song's position in the set and the gig notes for that song. Chords are printed in the gig's key once the transposer works (`setlist_items.transposed_key`).

**A setlist booklet** starts with a page listing the set. That's page 1, a right-hand page, so the first song starts on page 2 on the left.

## An early estimate of what fits

This is rough arithmetic for US Letter with the margins in P2 and 14 point chords and words. The spike will measure it properly with real songs.

| Layout | Lyrics-only lines that fit | Lines with chords above that fit | Characters per line before it wraps |
| --- | --- | --- | --- |
| One column | about 34 | about 19 | about 70 |
| Two columns | about 68 | about 37 | about 34 |

Fewer lines fit when long lines wrap.

- **Lyrics-only songs** should nearly always fit on one page, often in one column.
- **Songs with chords throughout** are another matter. Many songs are 40 lines or more once repeated choruses are written out, so those will often need two pages (P6). Ways of saving space matter for them: writing a repeated chorus once and marking where it comes back, or giving each section's chords once instead of over every line (see the open questions).

## Build order

This does the printing groundwork before the setlist builder. The booklet itself still comes in phase 3 of [accounts and sharing](accounts-and-sharing.md), after the setlist builder, as agreed.

| Step | What it delivers | Merged? |
| --- | --- | --- |
| 1. This document | The decisions above and the questions the spike must answer. | Yes |
| 2. Spike | A throwaway prototype on its own branch. It prints songs from Tom's library: a lyrics-only song, a song with chords throughout (short and long), and a song with each section's chords given once. Tom prints them on his own printer and tries them on his stand. The results and decisions are recorded here. | No: only this document changes |
| 3. Print this song | A Print button on the song page, following P2 to P5 and the spike's decisions. | Yes |
| 4. Setlist builder | Phase 2 of accounts and sharing, designed with what the spike taught. | Yes |
| 5. Setlist booklet | Phase 3: the songs of a setlist in order, with the list page, page numbers and blank pages (P6). | Yes |

### What the spike must answer

- **How to print.** The browser's own Print command, or a PDF the app makes itself. Browsers differ in their margins and scaling, and in the date and web address they add to each page. A PDF comes out the same everywhere and is easy to hand to another musician. Test both in Safari and Chrome on Tom's Mac.
- **The normal text size and typeface.** 14 point is the minimum (P4). Is something larger better when it fits? Does a typewriter-style (monospaced) font read better than an ordinary one?
- **How the app knows a song fits.** It has to measure the song laid out at page size, and the measurement must match the paper.
- **The real numbers.** How many of Tom's songs fit on one page, how many need two columns, and how many need two pages.

## Not planned

- Folded or stapled booklets, A4 paper, landscape pages (P1).
- Chord diagrams (finger charts).
- Printing for a collaborator's instrument, such as capo or transposed parts.

## Open questions

- **What do other musicians need: chords over every line, or each section's chords once?** A compact chart gives each section's chords once, for example a line `Verse: [G] [D] [Em] [C]`, and fits far more on a page. The leaning is to allow both with the same bracket format. A line that holds only chords prints as a line of chords, and both styles change key with the transposer.
- **Songs copied from websites** usually have chords on their own line above the words, not in brackets. If Tom adds chords that way, the app could convert them when a song is pasted in.
- **What else keeps everyone together?** Key, tempo and the song's structure (for example "Intro, Verse, Chorus, Verse, Chorus, Bridge, Chorus, Outro") may matter as much as the chords.
- **Repeated choruses.** Should a chorus be written out once and then referred to (a line saying "Chorus"), with the app printing just that label for repeats? That saves a lot of space (see the estimate).
- **Songs longer than two pages.** The leaning is to continue on further pages, still starting on a left-hand page, and have the app point out such songs so they can be shortened.
- **Blank pages (P6).** Completely blank, or with a light "Notes" heading for pencil notes?
- **Section labels** (Verse, Chorus, Bridge). Print them as typed, or pick them out in bold?
- **The screen.** Should the song page on screen use the same chords-above layout? Decide in step 3.
