// Tests for the print layout rules (docs/requirements/printing.md).
// Run with `npm test`. They use Node's built-in test runner, so there's
// nothing extra to install. CI runs them on every pull request.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyLine, toVerses, splitChords, attempts, packColumns, choosePlan,
  printoutPages, describePlan, MIN_SIZE, CONTENT_HEIGHT, PX_PER_INCH,
} from './printLayout.mjs';

test('chord lines, section names, chords in words and lyrics are told apart (P7)', () => {
  const cases = {
    'Verse: [G] [D] [Em] [C]': 'chords',
    'Chorus 2: [C] [G] [D] x2': 'chords',
    '| [G] | [D] | [Em] [C] |': 'chords',
    '[G] [D]': 'chords',
    'Intro: [G] - [D] / [C] (2x)': 'chords',
    "[G]Well, I'm a-[D]runnin'": 'mixed',
    'Chorus': 'label',
    'Verse 2:': 'label',
    'Pre-chorus': 'label',
    'Chorus girls dancing all night': 'lyric',
    "Well, I'm a-runnin' down the road": 'lyric',
  };
  for (const [line, type] of Object.entries(cases)) assert.equal(classifyLine(line), type, line);
});

test('a song splits into verses at blank lines, whatever the line endings', () => {
  const verses = toVerses('a\r\nb\n\n\n  \nc\r\n');
  assert.deepEqual(verses.map(v => v.map(l => l.text)), [['a', 'b'], ['c']]);
  assert.deepEqual(toVerses(''), []);
  assert.deepEqual(toVerses(null), []);
});

test('chords are found inside a line', () => {
  assert.deepEqual(splitChords('Verse: [G] [Em]'), ['Verse: ', '[G]', ' ', '[Em]', '']);
});

test('P5: largest text first, one column before two, then two pages', () => {
  const order = attempts(16).map(a => `${a.pages}p ${a.cols}c ${a.size}`);
  assert.deepEqual(order, [
    '1p 1c 16', '1p 2c 16', '1p 1c 15', '1p 2c 15', '1p 1c 14', '1p 2c 14',
    '2p 1c 16', '2p 2c 16', '2p 1c 15', '2p 2c 15', '2p 1c 14', '2p 2c 14',
  ]);
});

test('P10: with Shrink to fit off, only the chosen size is tried', () => {
  assert.deepEqual(attempts(20, false).map(a => a.size), [20, 20, 20, 20]);
});

test('nothing is ever tried below 14 point (P4)', () => {
  // Compared with 14 itself, not MIN_SIZE, so changing the setting fails this test.
  assert.equal(MIN_SIZE, 14);
  for (const size of [14, 16, 22]) assert.ok(attempts(size).every(a => a.size >= 14));
});

// Helpers: verses of lines that are each 10px high.
const verse = (n, types = []) => ({ lines: Array.from({ length: n }, (_, i) => ({ height: 10, type: types[i] ?? 'lyric' })) });
const opts = { titleHeight: 20, columnHeight: 100, gap: 5 };

test('verses fill a column in order, with a gap between them', () => {
  assert.deepEqual(packColumns([verse(4), verse(3)], { ...opts, cols: 1, pages: 1 }), [
    [{ verse: 0, from: 0, to: 4 }, { verse: 1, from: 0, to: 3 }],
  ]);
});

test('a verse that does not fit starts the next column whole', () => {
  // Column 1 holds 80px after the title: 50 + 5 + 30 = 85 is too much.
  const cols = packColumns([verse(5), verse(3)], { ...opts, cols: 2, pages: 1 });
  assert.deepEqual(cols, [[{ verse: 0, from: 0, to: 5 }], [{ verse: 1, from: 0, to: 3 }]]);
});

test('the title only takes room on the first page', () => {
  // One column per page: page 1 holds 80px, page 2 holds 100px.
  const cols = packColumns([verse(8), verse(10)], { ...opts, cols: 1, pages: 2 });
  assert.deepEqual(cols, [[{ verse: 0, from: 0, to: 8 }], [{ verse: 1, from: 0, to: 10 }]]);
});

test('too many columns needed means the layout does not fit', () => {
  assert.equal(packColumns([verse(8), verse(8)], { ...opts, cols: 1, pages: 1 }), null);
});

test('a verse taller than a column is split between lines', () => {
  const cols = packColumns([verse(15)], { ...opts, cols: 2, pages: 1 });
  assert.deepEqual(cols, [[{ verse: 0, from: 0, to: 8 }], [{ verse: 0, from: 8, to: 15 }]]);
});

test('a song with no blank lines still fits, split across columns', () => {
  const cols = packColumns([verse(30)], { ...opts, cols: 2, pages: 2 });
  assert.equal(cols.length, 4);
  assert.deepEqual(cols.flat().map(s => s.to - s.from).reduce((a, b) => a + b), 30);
});

test('a chord line or section name stays with the line after it when a verse splits', () => {
  // 8 lines fit in column 1; line 8 (index 7) is a chord line, so it moves on.
  const types = ['lyric', 'lyric', 'lyric', 'lyric', 'lyric', 'lyric', 'lyric', 'chords'];
  const cols = packColumns([verse(12, types)], { ...opts, cols: 2, pages: 1 });
  assert.deepEqual(cols, [[{ verse: 0, from: 0, to: 7 }], [{ verse: 0, from: 7, to: 12 }]]);
});

// choosePlan with a stand-in for the browser's measuring: every line is
// 0.25in high at 16 point, in proportion at other sizes, and no line wraps.
function planFor(lineCounts, settings = {}) {
  const verses = lineCounts.map(n => Array.from({ length: n }, () => ({ type: 'lyric', text: 'x' })));
  const measure = (size) => ({
    titleHeight: 40,
    lineHeights: verses.map(v => v.map(() => (size / 16) * 0.25 * PX_PER_INCH)),
  });
  return choosePlan(verses, { measure, ...settings });
}

test('a short song fits on one page in one column at the normal size', () => {
  const plan = planFor([4, 4, 4]);
  assert.deepEqual([plan.pages, plan.cols, plan.size], [1, 1, 16]);
});

test('a longer song uses two columns at the normal size before shrinking (no line wraps here)', () => {
  const plan = planFor([8, 8, 8, 8, 8]); // 40 lines: more than one column holds
  assert.deepEqual([plan.pages, plan.cols, plan.size], [1, 2, 16]);
});

test('a song longer than one page at 14 point gets two pages', () => {
  const linesPerColumn = Math.floor((CONTENT_HEIGHT * PX_PER_INCH) / ((14 / 16) * 0.25 * PX_PER_INCH));
  const plan = planFor(Array(Math.ceil((2 * linesPerColumn + 10) / 5)).fill(5));
  assert.equal(plan.pages, 2);
});

test('a very long song continues on as many pages as it takes', () => {
  const plan = planFor(Array(60).fill(5)); // 300 lines
  assert.ok(plan.pages > 2);
  assert.equal(plan.size, 14);
  assert.equal(plan.columns.flat().reduce((n, s) => n + s.to - s.from, 0), 300);
});

test('P10: with Shrink to fit off the chosen size is kept', () => {
  const plan = planFor(Array(12).fill(5), { normalSize: 22, shrink: false });
  assert.equal(plan.size, 22);
});

test('P6: a song of two or more pages gets a blank first page so its pages face each other', () => {
  assert.deepEqual(printoutPages(1), [{ blank: false, songPage: 0, side: 'right' }]);
  assert.deepEqual(printoutPages(2).map(p => `${p.blank ? 'blank' : 'page ' + (p.songPage + 1)} ${p.side}`),
    ['blank right', 'page 1 left', 'page 2 right']);
});

test('the screen says how the song will print, and when it was shrunk (P10)', () => {
  assert.equal(describePlan({ pages: 1, cols: 1, size: 16 }, 16), 'One page, one column, 16 point.');
  assert.equal(describePlan({ pages: 2, cols: 2, size: 14 }, 18), 'Two pages, two columns, 14 point. Shrunk from 18 point to fit.');
  assert.equal(describePlan({ pages: 3, cols: 2, size: 14 }, 14), '3 pages, two columns, 14 point.');
});
