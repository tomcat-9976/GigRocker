'use client'
// Print one song for a three-ring binder (docs/requirements/printing.md).
// Every verse is laid out off screen at real size and measured; choosePlan()
// in lib/printLayout.mjs picks the size, columns and pages; the pages are
// drawn at real size and printed with the browser's own Print command (P9).
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import {
  PAGE, CONTENT_WIDTH, COLUMN_WIDTH_2, MIN_SIZE, DEFAULT_SIZE, SIZES, TYPEFACES, DEFAULT_TYPEFACE,
  LINE_HEIGHT, VERSE_GAP_EM, toVerses, splitChords, choosePlan, printoutPages, describePlan,
} from '../../../../lib/printLayout.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHORD_COLOR = '#0e5f73'; // dark teal: stands out, and still prints dark in black and white

// Long lines wrap with the rest indented, so a wrapped line reads as one.
const lineStyle = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', paddingLeft: '1em', textIndent: '-1em' };

function Line({ line }) {
  const parts = splitChords(line.text);
  if (line.type === 'chords') {
    // A section's chords (P7): bold, brackets dropped, a little space around each chord.
    return (
      <div data-line style={{ ...lineStyle, fontWeight: 700 }}>
        {parts.map((part, i) => i % 2
          ? <span key={i} style={{ color: CHORD_COLOR, margin: '0 0.2em' }}>{part.slice(1, -1)}</span>
          : part)}
      </div>
    );
  }
  if (line.type === 'mixed') {
    // Chords typed inside the words (P3 isn't built yet): kept in brackets, in bold.
    return (
      <div data-line style={lineStyle}>
        {parts.map((part, i) => i % 2
          ? <span key={i} style={{ color: CHORD_COLOR, fontWeight: 700 }}>{part}</span>
          : part)}
      </div>
    );
  }
  return <div data-line style={{ ...lineStyle, fontWeight: line.type === 'label' ? 700 : 400 }}>{line.text}</div>;
}

function TitleBlock({ song }) {
  const details = [song.artist, `Key: ${song.original_key}`, song.tempo && `${song.tempo} bpm`, song.time_signature]
    .filter(Boolean).join(' · ');
  // Padding, not margin, so the measured height includes the space below.
  return (
    <div style={{ paddingBottom: `${VERSE_GAP_EM * 1.5}em` }}>
      <div style={{ fontSize: '1.5em', fontWeight: 700, lineHeight: 1.15 }}>{song.title}</div>
      <div>{details}</div>
    </div>
  );
}

function Column({ segments, verses, width }) {
  return (
    <div style={{ width: `${width}in` }}>
      {segments.map((seg, i) => (
        <div key={`${seg.verse}-${seg.from}`} style={{ marginTop: i ? `${VERSE_GAP_EM}em` : 0 }}>
          {verses[seg.verse].slice(seg.from, seg.to).map((line, j) => <Line key={j} line={line} />)}
        </div>
      ))}
    </div>
  );
}

const selectClass = 'block mt-1 bg-slate-800 border border-slate-700 rounded p-2 text-white';

export default function PrintSongPage() {
  const { id } = useParams();
  const validId = UUID.test(id);
  const [song, setSong] = useState(undefined); // undefined = loading, null = not found
  const [loadError, setLoadError] = useState(null);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [typeface, setTypeface] = useState(DEFAULT_TYPEFACE);
  const [shrink, setShrink] = useState(true);
  const [plan, setPlan] = useState(null);
  const measureRef = useRef(null);

  useEffect(() => {
    if (!validId) return;
    let active = true;
    supabase.from('songs').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setLoadError(error.message);
      else setSong(data);
    });
    return () => { active = false; };
  }, [id, validId]);

  const verses = useMemo(() => (song ? toVerses(song.lyrics_and_chords) : []), [song]);
  const settings = `${size}|${typeface}|${shrink}`;
  const measureSizes = [];
  for (let s = size; s >= (shrink ? Math.min(MIN_SIZE, size) : size); s--) measureSizes.push(s);

  // Once the hidden copies below are on screen, measure them and choose a layout.
  useEffect(() => {
    if (!song) return;
    let active = true;
    document.fonts.ready.then(() => {
      if (!active || !measureRef.current) return;
      const measure = (s, cols) => {
        const group = measureRef.current.querySelector(`[data-size="${s}"][data-cols="${cols}"]`);
        return {
          titleHeight: group.querySelector('[data-title]').getBoundingClientRect().height,
          lineHeights: [...group.querySelectorAll('[data-verse]')].map(v =>
            [...v.querySelectorAll('[data-line]')].map(l => l.getBoundingClientRect().height)),
        };
      };
      setPlan({ settings, ...choosePlan(verses, { normalSize: size, shrink, measure }) });
    });
    return () => { active = false; };
  }, [song, verses, size, shrink, settings]);

  if (loadError) return <p className="p-8 text-red-400">Couldn’t load this song: {loadError}</p>;
  if (!validId || song === null) return <p className="p-8 text-slate-400">Song not found.</p>;
  if (song === undefined) return <p className="p-8 text-slate-500">Loading…</p>;

  const fontFamily = TYPEFACES[typeface].css;
  const ready = plan && plan.settings === settings;
  const sides = ready ? printoutPages(plan.pages) : [];
  const sheets = Math.ceil(sides.length / 2);

  return (
    <main className="min-h-screen bg-slate-700 p-6 print:p-0 print:bg-white">
      {/* US Letter with no browser margins: each page below carries its own (P2, P9). */}
      <style>{`
        @page { size: letter; margin: 0; }
        @media print { html, body { background: #fff !important; } }
      `}</style>

      <div className="max-w-[8.5in] mx-auto mb-6 rounded-lg bg-slate-900 p-4 text-slate-100 print:hidden">
        <Link href={`/songs/${id}`} className="inline-block mb-3 text-sm text-slate-400 hover:text-cyan-300">← Back to song</Link>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm text-slate-400">
            Text size
            <select value={size} onChange={e => setSize(Number(e.target.value))} className={selectClass}>
              {SIZES.map(s => <option key={s} value={s}>{s} point{s === DEFAULT_SIZE ? ' (normal)' : ''}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-400">
            Typeface
            <select value={typeface} onChange={e => setTypeface(e.target.value)} className={selectClass}>
              {Object.entries(TYPEFACES).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-400">
            <input type="checkbox" checked={shrink} onChange={e => setShrink(e.target.checked)} />
            Shrink to fit
          </label>
          <button
            type="button" onClick={() => window.print()} disabled={!ready}
            className="ml-auto rounded bg-cyan-500 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-600 disabled:opacity-50"
          >
            Print
          </button>
        </div>
        {ready && (
          <div className="mt-3 space-y-1 text-sm text-slate-300">
            <p data-testid="plan">{describePlan(plan, size)}</p>
            <p>
              Printout: {sides.length} {sides.length === 1 ? 'page' : 'pages'} on {sheets} {sheets === 1 ? 'sheet' : 'sheets'}.
              {sides.length > 1 && ' Print on both sides. The first page is left blank so the song’s pages face each other in the binder.'}
            </p>
            <p className="text-slate-500">In the print dialog, keep the scale at 100% (not “fit to page”) and check the preview shows {sides.length} {sides.length === 1 ? 'page' : 'pages'}.</p>
          </div>
        )}
      </div>

      {/* Hidden copies at each size and column width that might be used, for measuring only. */}
      <div ref={measureRef} aria-hidden="true" className="print:hidden" style={{ position: 'absolute', left: '-10000px', top: 0, visibility: 'hidden', fontFamily }}>
        {measureSizes.map(s => [1, 2].map(cols => (
          <div key={`${s}-${cols}`} data-size={s} data-cols={cols} style={{ fontSize: `${s}pt`, lineHeight: LINE_HEIGHT }}>
            <div data-title style={{ width: `${CONTENT_WIDTH}in` }}><TitleBlock song={song} /></div>
            <div style={{ width: `${cols === 1 ? CONTENT_WIDTH : COLUMN_WIDTH_2}in` }}>
              {verses.map((lines, v) => (
                <div key={v} data-verse>{lines.map((line, i) => <Line key={i} line={line} />)}</div>
              ))}
            </div>
          </div>
        )))}
      </div>

      {ready && sides.map((side, i) => {
        const pageColumns = side.blank ? [] : plan.columns.slice(side.songPage * plan.cols, (side.songPage + 1) * plan.cols);
        const columnWidth = plan.cols === 1 ? CONTENT_WIDTH : COLUMN_WIDTH_2;
        return (
          <section
            key={i}
            data-testid="printed-page"
            className="mx-auto mb-6 shadow-xl print:mb-0 print:shadow-none"
            style={{
              width: `${PAGE.width}in`, height: `${PAGE.height}in`, boxSizing: 'border-box', overflow: 'hidden',
              position: 'relative', background: '#fff', color: '#000',
              paddingTop: `${PAGE.top}in`, paddingBottom: `${PAGE.bottom}in`,
              // P2: the wide margin is on the ring side, which alternates.
              paddingLeft: `${side.side === 'right' ? PAGE.inside : PAGE.outside}in`,
              paddingRight: `${side.side === 'right' ? PAGE.outside : PAGE.inside}in`,
              fontFamily, fontSize: `${plan.size}pt`, lineHeight: LINE_HEIGHT,
              breakAfter: i < sides.length - 1 ? 'page' : 'auto',
            }}
          >
            {side.blank ? (
              <p className="print:hidden" style={{ color: '#94a3b8', fontSize: '12pt', textAlign: 'center', marginTop: '4in' }}>
                This page is left blank on purpose.
              </p>
            ) : (
              <>
                {side.songPage === 0 && <TitleBlock song={song} />}
                <div style={{ display: 'flex', gap: `${PAGE.columnGap}in` }}>
                  {pageColumns.map((segments, c) => <Column key={c} segments={segments} verses={verses} width={columnWidth} />)}
                </div>
                {plan.pages > 1 && (
                  <div style={{ position: 'absolute', bottom: '0.2in', fontSize: `${MIN_SIZE}pt`, [side.side === 'right' ? 'right' : 'left']: `${PAGE.outside}in` }}>
                    {side.songPage + 1} / {plan.pages}
                  </div>
                )}
              </>
            )}
          </section>
        );
      })}
    </main>
  );
}
