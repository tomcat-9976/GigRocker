// Print layout for songs: the rules from docs/requirements/printing.md
// (decisions P1 to P10), kept separate from the page so they can be tested
// on their own (lib/printLayout.test.mjs, run with `npm test`).
//
// How a song is printed: the page lays every verse out off screen at real
// size and measures it, then choosePlan() below decides the size, columns and
// pages, and the page draws them. Nothing here touches the browser.
//
// The file ends in .mjs so both Next.js and Node's test runner read it as a
// modern JavaScript module without extra settings.

// --- Page geometry (P1, P2), in inches --------------------------------------
export const PAGE = {
  width: 8.5, // US Letter, portrait
  height: 11,
  inside: 1.0, // margin on the ring side, clear of the punched holes
  outside: 0.6,
  top: 0.6,
  bottom: 0.6,
  columnGap: 0.3,
};
export const PX_PER_INCH = 96; // CSS defines 1in as 96px
export const CONTENT_WIDTH = PAGE.width - PAGE.inside - PAGE.outside; // 6.9in
export const CONTENT_HEIGHT = PAGE.height - PAGE.top - PAGE.bottom; // 9.8in
export const COLUMN_WIDTH_2 = (CONTENT_WIDTH - PAGE.columnGap) / 2; // 3.3in

// --- Type (P4, P8, P10) -------------------------------------------------------
export const MIN_SIZE = 14; // P4: nothing smaller than 14 point
export const DEFAULT_SIZE = 16; // P8
export const SIZES = [14, 16, 18, 20, 22]; // P10
export const TYPEFACES = {
  // P8: sans serif is the default. The others were tried in the spike (P10).
  sans: { label: 'Sans serif', css: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  serif: { label: 'Serif', css: 'Georgia, "Times New Roman", Times, serif' },
  mono: { label: 'Typewriter', css: 'Menlo, Monaco, Consolas, "Courier New", monospace' },
};
export const DEFAULT_TYPEFACE = 'sans';
export const LINE_HEIGHT = 1.25; // in ems
export const VERSE_GAP_EM = 0.6; // space between verses, in ems

const ptToPx = (pt) => (pt * PX_PER_INCH) / 72;

// --- Reading a song -----------------------------------------------------------
const HAS_CHORD = /\[[^\]\n]+\]/;
const CHORDS = /\[[^\]\n]+\]/g;
const SECTION_NAME =
  /^\s*(intro|verse|pre-?chorus|chorus|bridge|solo|instrumental|interlude|break|tag|outro|coda|refrain|ending)\b[\s\d.:]*$/i;

// What kind of line this is:
//   'chords' a chord line (P7): an optional label ending in ":", then only
//            chords, with bar lines, slashes, dashes and repeat marks (x2,
//            (2x)) allowed between them
//   'label'  a section name on its own, such as "Chorus" or "Verse 2:"
//   'mixed'  chords inside the words (P3, printed inline for now)
//   'lyric'  plain words
export function classifyLine(line) {
  if (HAS_CHORD.test(line)) {
    const rest = line
      .replace(/^\s*[^[\]:|]{1,30}:/, '') // "Verse:" or "Chorus 2:"
      .replace(CHORDS, '')
      .replace(/\b[x×]\s?\d+\b|\b\d+\s?[x×]\b/gi, '') // x2, 2x
      .replace(/[\s|/\-–—().]/g, '');
    return rest === '' ? 'chords' : 'mixed';
  }
  return SECTION_NAME.test(line) ? 'label' : 'lyric';
}

// Splits a song into verses: runs of lines between blank lines.
export function toVerses(text) {
  const verses = [];
  let current = [];
  for (const raw of String(text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    if (raw.trim() === '') {
      if (current.length) verses.push(current);
      current = [];
    } else {
      current.push({ type: classifyLine(raw), text: raw.replace(/\s+$/, '') });
    }
  }
  if (current.length) verses.push(current);
  return verses;
}

// Splits a line into plain text and chords: chords are at the odd positions.
export function splitChords(text) {
  return text.split(/(\[[^\]\n]+\])/g);
}

// --- Fitting (P5, P6) ---------------------------------------------------------
// The layouts to try, in order. P5: the largest text that fits, trying one
// column before two at each size, down to 14 point; then the same on two
// pages. With shrink off (P10), only the chosen size is tried.
export function attempts(normalSize, shrink = true) {
  const smallest = shrink ? Math.min(MIN_SIZE, normalSize) : normalSize;
  const list = [];
  for (const pages of [1, 2]) {
    for (let size = normalSize; size >= smallest; size--) {
      list.push({ size, cols: 1, pages });
      list.push({ size, cols: 2, pages });
    }
  }
  return list;
}

// Places verses, in order, into columns. A verse is kept whole, starting a
// new column if it doesn't fit in the current one. A verse taller than a
// whole column is split between lines, never leaving a chord line or section
// name at the bottom of a column without the line it belongs to.
//
// verses:      [{ lines: [{ height, type }] }], heights in px
// titleHeight: room the title takes on page 1, above the columns
// Returns the columns, each a list of { verse, from, to } (line indexes,
// `to` not included), or null if they need more than cols × pages columns.
export function packColumns(verses, { titleHeight, columnHeight, cols, pages, gap }) {
  const maxColumns = cols * pages;
  const capacity = (c) => columnHeight - (c < cols ? titleHeight : 0); // page 1 holds the title
  const columns = [[]];
  let used = 0;
  const here = () => columns.length - 1;
  const nextColumn = () => {
    columns.push([]);
    used = 0;
    return columns.length <= maxColumns;
  };
  const sum = (lines, from, to) => lines.slice(from, to).reduce((h, l) => h + l.height, 0);

  for (let v = 0; v < verses.length; v++) {
    const lines = verses[v].lines;
    const height = sum(lines, 0, lines.length);
    const gapBefore = columns[here()].length ? gap : 0;

    if (used + gapBefore + height <= capacity(here())) {
      columns[here()].push({ verse: v, from: 0, to: lines.length });
      used += gapBefore + height;
      continue;
    }
    if (height <= capacity(here() + 1) && columns[here()].length) {
      if (!nextColumn()) return null;
      columns[here()].push({ verse: v, from: 0, to: lines.length });
      used = height;
      continue;
    }

    // Too tall for a whole column (or for this first one): split between lines.
    let from = 0;
    while (from < lines.length) {
      const g = columns[here()].length ? gap : 0;
      let to = from;
      while (to < lines.length && used + g + sum(lines, from, to + 1) <= capacity(here())) to++;
      // Keep a chord line or section name with the line after it.
      while (to > from && to < lines.length && ['chords', 'label'].includes(lines[to - 1].type)) to--;
      // An empty column always takes at least one line, so the loop moves on.
      if (to === from && columns[here()].length === 0) to = from + 1;
      if (to > from) {
        columns[here()].push({ verse: v, from, to });
        used += g + sum(lines, from, to);
        from = to;
      }
      if (from < lines.length && !nextColumn()) return null;
    }
  }
  if (columns[here()].length === 0) columns.pop();
  return columns.length <= maxColumns ? columns : null;
}

// Chooses the layout. verses are from toVerses(); measure(size, cols) returns
// { titleHeight, lineHeights } in px, where lineHeights[v][i] is the height of
// line i of verse v at that size and column width.
// Returns { size, cols, pages, columns }.
export function choosePlan(verses, { normalSize = DEFAULT_SIZE, shrink = true, measure }) {
  const columnHeight = CONTENT_HEIGHT * PX_PER_INCH;
  const tryLayout = (size, cols, pages) => {
    const m = measure(size, cols);
    const measured = verses.map((lines, v) => ({
      lines: lines.map((line, i) => ({ type: line.type, height: m.lineHeights[v][i] })),
    }));
    return packColumns(measured, { titleHeight: m.titleHeight, columnHeight, cols, pages, gap: VERSE_GAP_EM * ptToPx(size) });
  };
  for (const a of attempts(normalSize, shrink)) {
    const columns = tryLayout(a.size, a.cols, a.pages);
    if (columns) return { size: a.size, cols: a.cols, pages: Math.ceil(columns.length / a.cols), columns };
  }
  // Longer than two pages: the smallest allowed size, two columns, as many
  // pages as it takes.
  const size = shrink ? Math.min(MIN_SIZE, normalSize) : normalSize;
  const columns = tryLayout(size, 2, Infinity);
  return { size, cols: 2, pages: Math.ceil(columns.length / 2), columns };
}

// The sides of paper for one song printed on its own. Page 1 of a printout is
// the front of a sheet: a right-hand page in the binder. A song of two or more
// pages must start on a left-hand page (P6), so it gets a blank page first.
export function printoutPages(songPages) {
  const sides = [];
  if (songPages > 1) sides.push({ blank: true });
  for (let p = 0; p < songPages; p++) sides.push({ blank: false, songPage: p });
  return sides.map((side, i) => ({ ...side, side: i % 2 === 0 ? 'right' : 'left' }));
}

// What the screen says about a plan (P10).
export function describePlan(plan, normalSize) {
  const pages = plan.pages === 1 ? 'One page' : plan.pages === 2 ? 'Two pages' : `${plan.pages} pages`;
  const cols = plan.cols === 1 ? 'one column' : 'two columns';
  let text = `${pages}, ${cols}, ${plan.size} point.`;
  if (plan.size < normalSize) text += ` Shrunk from ${normalSize} point to fit.`;
  return text;
}
