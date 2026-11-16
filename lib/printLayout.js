// Print layout for songs (PROTOTYPE, from the printing spike).
// Rules come from docs/requirements/printing.md (decisions P1 to P7).
//
// The page is laid out at real size on screen (CSS inches), measured there,
// and then printed. These functions do the parts that don't need a browser:
// splitting a song into blocks, recognising chord lines, and deciding which
// blocks go in which column.

// --- Page geometry (P1, P2) --------------------------------------------------
export const PAGE = {
  width: 8.5, // inches, US Letter portrait
  height: 11,
  inside: 1.0, // margin on the binder-ring side, for the punched holes
  outside: 0.6,
  top: 0.6,
  bottom: 0.6,
  columnGap: 0.3,
};
export const PX_PER_INCH = 96; // CSS defines 1in as 96px
export const CONTENT_WIDTH = PAGE.width - PAGE.inside - PAGE.outside; // 6.9in
export const CONTENT_HEIGHT = PAGE.height - PAGE.top - PAGE.bottom; // 9.8in
export const COLUMN_WIDTH_2 = (CONTENT_WIDTH - PAGE.columnGap) / 2; // 3.3in

export const MIN_SIZE = 14; // P4: nothing smaller than 14 point
export const BLOCK_GAP_EM = 0.6; // space between verses, in ems of the text size

// --- Reading a song ------------------------------------------------------------
const CHORD = /\[[^\]\n]+\]/g;
const SECTION_NAMES =
  /^\s*(intro|verse|pre-?chorus|chorus|bridge|solo|instrumental|interlude|break|tag|outro|coda|refrain|ending)\b[\s\d.:]*$/i;

// What kind of line this is:
//   'chords' a chord line (P7): an optional label ending in ":", then only
//            chords, bar lines "|", slashes, dashes, and repeat marks like x2
//   'label'  a section name on its own, like "Chorus"
//   'mixed'  chords inside the words (P3, printed inline for now)
//   'lyric'  plain words
const HAS_CHORD = /\[[^\]\n]+\]/;

export function classifyLine(line) {
  if (HAS_CHORD.test(line)) {
    const rest = line
      .replace(/^\s*[^[\]:|]{1,30}:/, '') // "Verse:" or "Chorus 2:"
      .replace(CHORD, '')
      .replace(/\b[x×]\s?\d+\b|\b\d+\s?[x×]\b/gi, '') // x2, 2x
      .replace(/[\s|/\-–—().]/g, '');
    return rest === '' ? 'chords' : 'mixed';
  }
  if (SECTION_NAMES.test(line)) return 'label';
  return 'lyric';
}

// A block is a run of lines between blank lines (a verse, a chorus).
// Blocks are kept whole on a page when possible.
export function toBlocks(text) {
  const blocks = [];
  let current = [];
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (raw.trim() === '') {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push({ type: classifyLine(raw), text: raw.replace(/\s+$/, '') });
    }
  }
  if (current.length) blocks.push(current);
  return blocks;
}

// Splits a line into plain text and chords, for highlighting chords.
export function splitChords(text) {
  return text.split(/(\[[^\]\n]+\])/g);
}

// --- Deciding what goes where -----------------------------------------------
// The attempts, in order, for one page and then two (P6). After that, as a
// last resort, as many pages as it takes at 14 point.
//   'columns' (P5 as written): one column at the normal size, then two
//             columns, then smaller text in two columns down to 14 point.
//   'largest' (to compare in the spike): the largest text that fits, trying
//             one column before two at each size.
export const FIT_ORDERS = ['columns', 'largest'];
export function attempts(normalSize, order = 'columns') {
  const list = [];
  for (const pages of [1, 2]) {
    if (order === 'largest') {
      for (let s = normalSize; s >= MIN_SIZE; s--) {
        list.push({ size: s, cols: 1, pages });
        list.push({ size: s, cols: 2, pages });
      }
    } else {
      list.push({ size: normalSize, cols: 1, pages });
      list.push({ size: normalSize, cols: 2, pages });
      for (let s = normalSize - 1; s >= MIN_SIZE; s--) list.push({ size: s, cols: 2, pages });
    }
  }
  return list;
}

// Puts blocks into columns in order, never splitting a block.
// heights: each block's height in px at this size and column width.
// titleHeight: height of the title area, which sits above the columns on
// page 1. Returns an array of columns (each a list of block indexes), or
// null if the song doesn't fit in cols × pages columns.
export function packBlocks(heights, { titleHeight, columnHeight, cols, pages, gap, allowOverflow = false }) {
  const capacity = (c) => columnHeight - (c < cols ? titleHeight : 0);
  const columns = [];
  let current = [];
  let used = 0;
  for (let i = 0; i < heights.length; i++) {
    const need = (current.length ? gap : 0) + heights[i];
    if (used + need <= capacity(columns.length)) {
      current.push(i);
      used += need;
      continue;
    }
    if (current.length === 0) {
      // Taller than a whole empty column: this layout can't hold it.
      if (!allowOverflow) return null;
      columns.push([i]);
      continue;
    }
    columns.push(current);
    current = [i];
    used = heights[i];
    if (used > capacity(columns.length) && !allowOverflow) return null;
  }
  if (current.length) columns.push(current);
  if (!allowOverflow && columns.length > cols * pages) return null;
  return columns;
}

// Chooses the first attempt that fits.
// measure(size, cols) must return { titleHeight, heights } in px.
export function choosePlan(blockCount, normalSize, measure, order = 'columns') {
  const columnHeight = CONTENT_HEIGHT * PX_PER_INCH;
  for (const a of attempts(normalSize, order)) {
    const m = measure(a.size, a.cols);
    const gap = BLOCK_GAP_EM * a.size * (PX_PER_INCH / 72);
    const columns = packBlocks(m.heights, { titleHeight: m.titleHeight, columnHeight, cols: a.cols, pages: a.pages, gap });
    if (columns) return { ...a, columns, overflow: false };
  }
  // Last resort: 14 point, two columns, as many pages as it takes.
  const m = measure(MIN_SIZE, 2);
  const gap = BLOCK_GAP_EM * MIN_SIZE * (PX_PER_INCH / 72);
  const columns = packBlocks(m.heights, { titleHeight: m.titleHeight, columnHeight, cols: 2, pages: Infinity, gap, allowOverflow: true });
  return { size: MIN_SIZE, cols: 2, pages: Math.ceil(columns.length / 2), columns, overflow: true };
}

// Which printed sheets sides to produce for one song printed on its own.
// Page 1 of a printout is the front of a sheet, a right-hand page in the
// binder. A song of two or more pages must start on a left-hand page (P6),
// so it gets a blank right-hand page first.
export function printoutPages(songPages) {
  const out = [];
  if (songPages > 1) out.push({ blank: true });
  for (let p = 0; p < songPages; p++) out.push({ blank: false, songPage: p });
  return out.map((page, i) => ({ ...page, side: i % 2 === 0 ? 'right' : 'left' }));
}
