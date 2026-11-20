'use client'
// PROTOTYPE from the printing spike: prints one song for a three-ring binder.
// See docs/requirements/printing.md. The song is laid out at real size
// (CSS inches), measured on screen, and the browser's Print command prints it.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import {
  PAGE, CONTENT_WIDTH, COLUMN_WIDTH_2, MIN_SIZE, BLOCK_GAP_EM,
  toBlocks, splitChords, choosePlan, printoutPages,
} from '../../../../lib/printLayout';

const FAMILIES = {
  sans: { label: 'Sans serif (Helvetica)', css: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  serif: { label: 'Serif (Georgia)', css: 'Georgia, "Times New Roman", Times, serif' },
  mono: { label: 'Typewriter (Menlo)', css: 'Menlo, Monaco, Consolas, "Courier New", monospace' },
};
const SIZES = [14, 16, 18, 20, 22];
const CHORD_COLOR = '#0e5f73'; // dark teal: stands out, still prints dark in black and white

// Long lines wrap with the continuation indented, so a wrap reads as one line.
const lineStyle = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', paddingLeft: '1em', textIndent: '-1em' };

function Line({ line }) {
  if (line.type === 'label') return <div style={{ ...lineStyle, fontWeight: 700 }}>{line.text}</div>;
  if (line.type === 'chords') {
    // A section's chords (P7): brackets dropped on paper, chords in bold.
    return (
      <div style={{ ...lineStyle, fontWeight: 700 }}>
        {splitChords(line.text).map((part, i) =>
          i % 2 ? <span key={i} style={{ color: CHORD_COLOR, margin: '0 0.2em' }}>{part.slice(1, -1)}</span> : part
        )}
      </div>
    );
  }
  if (line.type === 'mixed') {
    // Chords inside the words (P3) aren't laid out above the words yet; they
    // keep their brackets so it's clear where they fall.
    return (
      <div style={lineStyle}>
        {splitChords(line.text).map((part, i) =>
          i % 2 ? <span key={i} style={{ color: CHORD_COLOR, fontWeight: 700 }}>{part}</span> : part
        )}
      </div>
    );
  }
  return <div style={lineStyle}>{line.text}</div>;
}

function Block({ lines }) {
  return <div>{lines.map((l, i) => <Line key={i} line={l} />)}</div>;
}

function TitleBlock({ song }) {
  const details = [song.artist, `Key: ${song.original_key}`, song.tempo && `${song.tempo} bpm`, song.time_signature]
    .filter(Boolean).join(' · ');
  // Padding rather than margin, so the measured height includes the space.
  return (
    <div style={{ paddingBottom: `${BLOCK_GAP_EM * 1.5}em` }}>
      <div style={{ fontSize: '1.5em', fontWeight: 700, lineHeight: 1.15 }}>{song.title}</div>
      <div>{details}</div>
    </div>
  );
}

function Column({ blockIndexes, blocks, width }) {
  return (
    <div style={{ width: `${width}in` }}>
      {blockIndexes.map((b, i) => (
        <div key={b} style={{ marginTop: i ? `${BLOCK_GAP_EM}em` : 0 }}><Block lines={blocks[b]} /></div>
      ))}
    </div>
  );
}

function describe(plan, normalSize) {
  const layout = `${plan.cols === 1 ? 'one column' : 'two columns'} at ${plan.size} point`;
  let text;
  if (plan.overflow) text = `Longer than two pages: ${plan.pages} pages, ${layout}.`;
  else if (plan.pages === 1) text = `Fits on one page: ${layout}.`;
  else text = `Needs two pages: ${layout}.`;
  if (plan.size < normalSize) text += ` Shrunk from ${normalSize} point to fit. To print at ${normalSize} point, untick “Shrink to fit”.`;
  return text;
}

export default function PrintSongPage() {
  const { id } = useParams();
  const [song, setSong] = useState(undefined);
  const [loadError, setLoadError] = useState(null);
  const [normalSize, setNormalSize] = useState(18);
  const [family, setFamily] = useState('sans');
  const [fitOrder, setFitOrder] = useState('columns');
  const [shrink, setShrink] = useState(true);
  const [showMargins, setShowMargins] = useState(false);
  const [plan, setPlan] = useState(null);
  const measureRef = useRef(null);

  useEffect(() => {
    let active = true;
    supabase.from('songs').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setLoadError(error.message);
      else setSong(data);
    });
    return () => { active = false; };
  }, [id]);

  const blocks = useMemo(() => (song ? toBlocks(song.lyrics_and_chords) : []), [song]);
  const settingsKey = `${normalSize}|${family}|${fitOrder}|${shrink}`;
  const measureSizes = [];
  for (let s = normalSize; s >= (shrink ? MIN_SIZE : normalSize); s--) measureSizes.push(s);

  // Once the hidden copies below are on screen, measure them and choose a layout.
  useEffect(() => {
    if (!song) return;
    let active = true;
    document.fonts.ready.then(() => {
      if (!active || !measureRef.current) return;
      const measure = (size, cols) => {
        const group = measureRef.current.querySelector(`[data-size="${size}"][data-cols="${cols}"]`);
        return {
          titleHeight: group.querySelector('[data-title]').getBoundingClientRect().height,
          heights: [...group.querySelectorAll('[data-block]')].map(el => el.getBoundingClientRect().height),
        };
      };
      setPlan({ key: settingsKey, ...choosePlan(blocks.length, normalSize, measure, fitOrder, shrink) });
    });
    return () => { active = false; };
  }, [song, blocks, normalSize, fitOrder, shrink, settingsKey]);

  if (loadError) return <p className="p-8 text-red-400">Couldn’t load this song: {loadError}</p>;
  if (song === undefined) return <p className="p-8 text-slate-500">Loading…</p>;
  if (song === null) return <p className="p-8 text-slate-400">Song not found.</p>;

  const fontFamily = FAMILIES[family].css;
  const ready = plan && plan.key === settingsKey;
  const sides = ready ? printoutPages(plan.pages) : [];
  const sheets = Math.ceil(sides.length / 2);

  return (
    <main className="min-h-screen bg-slate-700 p-6 print:p-0 print:bg-white">
      {/* Page size and no browser margins: the pages below carry their own. */}
      <style>{`
        @page { size: letter; margin: 0; }
        @media print { html, body { background: #fff !important; } }
      `}</style>

      <div className="max-w-[8.5in] mx-auto mb-6 rounded-lg bg-slate-900 p-4 text-slate-100 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <Link href={`/songs/${id}`} className="text-sm text-slate-400 hover:text-cyan-300">← Back to song</Link>
          <span className="rounded bg-amber-900/60 px-2 py-0.5 text-xs text-amber-200">Prototype</span>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm text-slate-400">
            Normal text size
            <select value={normalSize} onChange={e => setNormalSize(Number(e.target.value))} className="block mt-1 bg-slate-800 border border-slate-700 rounded p-2 text-white">
              {SIZES.map(s => <option key={s} value={s}>{s} point</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-400">
            Typeface
            <select value={family} onChange={e => setFamily(e.target.value)} className="block mt-1 bg-slate-800 border border-slate-700 rounded p-2 text-white">
              {Object.entries(FAMILIES).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-400">
            When it doesn’t fit
            <select value={fitOrder} onChange={e => setFitOrder(e.target.value)} className="block mt-1 bg-slate-800 border border-slate-700 rounded p-2 text-white">
              <option value="columns">Two columns first</option>
              <option value="largest">Largest text first</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-400 pb-2">
            <input type="checkbox" checked={shrink} onChange={e => setShrink(e.target.checked)} />
            Shrink to fit
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-400 pb-2">
            <input type="checkbox" checked={showMargins} onChange={e => setShowMargins(e.target.checked)} />
            Show margins
          </label>
          <button type="button" onClick={() => window.print()} disabled={!ready} className="ml-auto rounded bg-cyan-500 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-600 disabled:opacity-50">
            Print
          </button>
        </div>
        {ready && (
          <div className="mt-3 text-sm text-slate-300 space-y-1">
            <p data-testid="plan">{describe(plan, normalSize)}</p>
            <p>
              Printout: {sides.length} {sides.length === 1 ? 'page' : 'pages'} on {sheets} {sheets === 1 ? 'sheet' : 'sheets'}.
              {sides.length > 1 && ' Print on both sides. The first page is left blank so the song’s pages face each other in the binder.'}
            </p>
            <p className="text-slate-500">In the print dialog: scale 100% (not “fit to page”), and check the preview shows {sides.length} {sides.length === 1 ? 'page' : 'pages'}.</p>
          </div>
        )}
      </div>

      {/* Hidden copies at every size and column width, used only for measuring. */}
      <div ref={measureRef} aria-hidden="true" className="print:hidden" style={{ position: 'absolute', left: '-10000px', top: 0, visibility: 'hidden', fontFamily }}>
        {measureSizes.map(size => [1, 2].map(cols => (
          <div key={`${size}-${cols}`} data-size={size} data-cols={cols} style={{ fontSize: `${size}pt`, lineHeight: 1.25 }}>
            <div data-title style={{ width: `${CONTENT_WIDTH}in` }}><TitleBlock song={song} /></div>
            <div style={{ width: `${cols === 1 ? CONTENT_WIDTH : COLUMN_WIDTH_2}in` }}>
              {blocks.map((b, i) => <div key={i} data-block><Block lines={b} /></div>)}
            </div>
          </div>
        )))}
      </div>

      {ready && sides.map((side, i) => {
        const inside = `${PAGE.inside}in`;
        const outside = `${PAGE.outside}in`;
        const pageCols = side.blank ? [] : plan.columns.slice(side.songPage * plan.cols, (side.songPage + 1) * plan.cols);
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
              paddingLeft: side.side === 'right' ? inside : outside,
              paddingRight: side.side === 'right' ? outside : inside,
              fontFamily, fontSize: `${plan.size}pt`, lineHeight: 1.25,
              breakAfter: i < sides.length - 1 ? 'page' : 'auto',
            }}
          >
            <div style={{ height: '100%', outline: showMargins ? '1px dashed #f59e0b' : 'none' }}>
              {side.blank ? (
                <p className="print:hidden" style={{ color: '#94a3b8', fontSize: '12pt', textAlign: 'center', marginTop: '4in' }}>
                  Blank page (left empty on purpose)
                </p>
              ) : (
                <>
                  {side.songPage === 0 && <TitleBlock song={song} />}
                  <div style={{ display: 'flex', gap: `${PAGE.columnGap}in` }}>
                    {pageCols.map((col, c) => (
                      <Column key={c} blockIndexes={col} blocks={blocks} width={plan.cols === 1 ? CONTENT_WIDTH : COLUMN_WIDTH_2} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {!side.blank && plan.pages > 1 && (
              <div style={{ position: 'absolute', bottom: '0.2in', fontSize: `${MIN_SIZE}pt`, [side.side === 'right' ? 'right' : 'left']: outside }}>
                {side.songPage + 1} / {plan.pages}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
