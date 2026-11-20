# Printing: requirements

**Status:** decisions P1 to P10 agreed with Tom. P1 to P7 were agreed on 2026-11-16. The printing spike ([PR #12](https://github.com/tomcat-9976/GigRocker/pull/12), closed without merging) ran on 2026-11-20 and led to P8 to P10 and a change to P5. Step 3, "Print this song", is built (PR #14). Next: the setlist builder (see [Build order](#build-order)).

This document records how GigRocker prints songs and setlist booklets, the decisions behind it, and the order it'll be built in. When a decision here changes, change this document in the same pull request.

## How printouts are used

Tom prints songs on both sides of the paper, punches them, and keeps them in a three-ring binder on a music stand. Before a gig he prints a booklet for that gig's setlist: the songs in set order. A booklet can also be handed to another musician as a reference (decision D6 in [accounts and sharing](accounts-and-sharing.md)).

On the stand, the binder lies open showing two pages side by side. A song must be readable at a glance from playing distance, and turning pages mid-song is to be avoided.

**Today most songs are lyrics only.** Tom knows how the chords go. Chords matter when playing with other musicians, so everyone is on the same page. They'll be added over time, mainly to the songs played with others, written once per section (P7). Printing has to work well for songs with and without chords.

## Decisions

| # | Decision | Why |
| --- | --- | --- |
| P1 | **US Letter, portrait, printed on both sides, kept in a three-ring binder.** No folded or stapled booklets. | A folded booklet means rearranging pages on each sheet (page 8 beside page 1, and so on) with a page count that's a multiple of 4. A binder needs none of that. |
| P2 | **A wider inside margin for the punched holes** (1 inch), on the left of right-hand pages and the right of left-hand pages. 0.6 inch elsewhere. | Text stays clear of the holes on both sides of the sheet. The app knows which side each page falls on (P6), so it sets these margins itself, whatever the browser supports. Confirmed on punched paper in the spike. |
| P3 | **Chords typed inside the words are printed above them.** A chord in brackets inside a line (`[G]Well, I'm a-[D]runnin'`) is printed above the syllable it's typed in front of. Songs without chords print as plain lyrics. Not needed yet, because chords are written once per section for now (P7), but this is how such songs will print. | Easier to read at a glance than chords inside the line. Because each chord is tied to its syllable, the two stay together when a line wraps in a narrow column. |
| P4 | **Nothing on a song page is printed smaller than 14 point**, chords included. | Readable from a music stand. |
| P5 | **Fitting a song: the largest text that fits.** Starting at the normal size (P8), try one column, then two columns; if neither fits, go down a point and try again, down to 14 point. Only if nothing fits on one page, do the same on two pages (P6). *Changed 2026-11-20.* It was "two columns first, then smaller text". | One page means no page turns. In the spike, two columns at 16 to 18 point wrapped most lyric lines, because a column is only 3.3 inches wide. Tom compared both orders on paper and chose this one. |
| P6 | **A two-page song always starts on a left-hand page**, so both pages are visible at once in the open binder. If the next free page is a right-hand page, the app inserts a blank page first. So a two-page song printed on its own starts with a blank page. One-page songs can fall on either side. | No page turn in the middle of a song. The app counts pages itself to decide where blanks go, so it never relies on browsers honoring "start on a left page", which they don't do reliably. Confirmed in the binder in the spike. |
| P7 | **For now, each section's chords are written once**, on their own line at the start of the section, for example `Verse: [G] [D] [Em] [C]`. A chord line has an optional label ending in a colon, then chords in brackets. Bar lines (`\|`), slashes, dashes and repeat marks such as `x2` or `(2x)` may go between the chords. On paper the brackets are dropped and the line is bold, with the chords in a dark color that still prints dark in black and white. A section name on its own line, such as `Chorus`, prints in bold. Chords stay in brackets in the song so the transposer can change their key. | Quick to write for songs Tom already knows, enough for other musicians to follow, and it adds only one line per section. Chords over every line (P3) can come later for songs that need them. The format and its look were tried in the spike. |
| P8 | **The normal size is 16 point, in a plain sans-serif typeface** (Helvetica on a Mac, with Arial as the fallback). | Tom compared sizes and typefaces on his stand in the spike. |
| P9 | **Printing uses the browser's own Print command.** The app doesn't make PDFs for now. Each page is laid out at real size with its own margins, and tells the browser to use US Letter with no margins of its own. | In the spike it printed correctly from both Safari and Chrome on Tom's Mac, with the page count matching what the app showed. A PDF can still be saved from the print dialog when one is wanted, for example to send to another musician. |
| P10 | **Printing a song has size and typeface controls.** Sizes from 14 to 22 point, and the three typefaces tried in the spike (sans serif, serif, typewriter). They start at P8's 16 point sans serif each time. A **Shrink to fit** switch, on by default, lets P5 make the text smaller. Turned off, the song prints at exactly the chosen size and uses two columns or more pages instead. The screen says how the song will print, including when the text was shrunk and from what size. | Some songs and situations call for a different size (Tom, 2026-11-20). The spike showed that a size choice is confusing unless shrinking can be turned off and the screen says what happened. |

**On each song page:** title, artist, key and tempo, plus a small page number in the outside corner when a song has more than one page. In a setlist booklet, also the song's position in the set and the gig notes for that song. Chords are printed in the gig's key once the transposer works (`setlist_items.transposed_key`).

**A setlist booklet** starts with a page listing the set. That's page 1, a right-hand page, so the first song starts on page 2 on the left.

## How the app knows a song fits

This is the method the spike tested.

1. The song is split into verses at blank lines. A verse is kept whole in a column, unless it's taller than a whole column.
2. Every verse is laid out off screen at real size (CSS inches), in the right typeface, at each size and column width the fitting rule (P5) might use, and measured.
3. The verses are placed in order into columns of the page's height, leaving room for the title on the first page. The first layout in the P5 order that holds them all is used.
4. The pages are drawn at real size and printed as they are.

In the spike, Chrome's PDF output had exactly the pages shown on screen in every test (five songs of 18 to 180 lines, several sizes and typefaces, both fitting orders), with every line on paper and no text past a margin. Tom's prints from Safari and Chrome matched too.

**Verses taller than a column** (in the prototype they ran past the bottom of the page) are split between lines. A chord line or section name stays with the line after it. A song typed with no blank lines at all is one long verse, and splits the same way.

## What fits on a page

These figures count every printed line, section labels and chord lines included, with the usual space between verses and the title on the page.

- **One column:** about 29 lines at 16 point (P8), and about 34 at 14 point. Line height doesn't depend on the typeface, and a one-column line holds about 60 to 70 characters, so these figures hold for Tom's Mac. In the spike, a song of 42 printed lines needed two pages even at 14 point.
- **Two columns** help only when lines are short. A column holds about 30 to 34 characters, so a typical lyric line of 35 to 45 characters wraps onto two lines.

So songs of up to about 30 printed lines fit on one page, and longer ones usually take two facing pages (P6). That's why P6 matters, and why writing a repeated chorus once (see the open questions) would help.

## Build order

This does the printing groundwork before the setlist builder. The booklet itself still comes in phase 3 of [accounts and sharing](accounts-and-sharing.md), after the setlist builder, as agreed.

| Step | What it delivers | Status |
| --- | --- | --- |
| 1. This document | The decisions and the questions for the spike. | Done (PR #11) |
| 2. Spike | A throwaway prototype that Tom printed from Safari and Chrome and tried on his stand and in his binder. Its results are recorded here. | Done (PR #12, closed without merging) |
| 3. Print this song | A Print button on the song page, following P2 to P10, with size and typeface controls. The screen says how the song will print, for example "One page, one column, 16 point" or "Two pages: the printout starts with a blank page". Verses taller than a column are split. The add and edit forms show the P7 format as their example. Automated tests cover the layout rules. The prototype's layout code is the starting point, cleaned up. | Done (PR #14) |
| 4. Setlist builder | Phase 2 of accounts and sharing. | Next |
| 5. Setlist booklet | Phase 3: the songs of a setlist in order, with the list page, page numbers and blank pages (P6). | |

## Not planned

- Folded or stapled booklets, A4 paper, landscape pages (P1).
- PDFs made by the app (P9), unless browser printing stops being good enough.
- Chord diagrams (finger charts).
- Printing for a collaborator's instrument, such as capo or transposed parts.

## Open questions

- **Repeated choruses.** Should a chorus be written out once and then referred to (a line saying "Chorus"), with the app printing just that label for repeats? That would keep more songs to one page.
- **Songs longer than two pages.** The prototype continues on further pages, starting on a left-hand page. Should the app also point out such songs so they can be shortened?
- **Blank pages (P6).** Completely blank (as in the spike), or with a light "Notes" heading for pencil notes?
- **What else keeps everyone together?** Key, tempo and the song's structure (for example "Intro, Verse, Chorus, Verse, Chorus, Bridge, Chorus, Outro") may matter as much as the chords.
- **Songs copied from websites** usually have chords on their own line above the words, not in brackets. If chords over every line (P3) are wanted later, the app could convert such songs when they're pasted in.
- **The screen.** Should the song page on screen look like the printout? Decide in step 3.
