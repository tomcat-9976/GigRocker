'use client'
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

// Song ids are UUIDs. Anything else in the address can't be a song, so we
// show "not found" without asking the database (which would reject it).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Chords are written inline in square brackets, e.g. "[G]Well, I'm a-[D]runnin'".
// Splitting on a pattern with a capture group keeps the chords in the result,
// at the odd positions, so they can be styled differently from the words.
const CHORD = /(\[[^\]\n]+\])/g;

function LyricsWithChords({ text }) {
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-base leading-relaxed bg-slate-900 border border-slate-800 rounded-lg p-4">
      {text.split(CHORD).map((part, i) =>
        i % 2 === 1
          ? <span key={i} className="font-bold text-cyan-300">{part}</span>
          : part
      )}
    </pre>
  );
}

const inputClass = 'w-full bg-slate-800 border border-slate-700 p-2 rounded text-white';
const LYRICS_HINT = 'Leave a blank line between verses. For chords, start a section with a line like  Verse: [G] [D] [Em] [C]';
const buttonClass = 'rounded px-4 py-2 font-bold disabled:opacity-50';

export default function SongPage() {
  const { id } = useParams();
  const router = useRouter();

  // undefined = still loading, null = not found (or not yours: the database's
  // access rules hide other people's songs, so the two look the same here).
  const [song, setSong] = useState(undefined);
  const [loadError, setLoadError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const validId = UUID.test(id);

  useEffect(() => {
    if (!validId) return;
    let active = true; // ignore a late answer if the page has moved on
    supabase
      .from('songs')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setLoadError(error.message);
        else setSong(data);
      });
    return () => { active = false; };
  }, [id, validId]);

  function startEditing() {
    setForm({
      title: song.title,
      artist: song.artist ?? '',
      original_key: song.original_key,
      lyrics_and_chords: song.lyrics_and_chords,
    });
    setActionError(null);
    setConfirmingDelete(false);
    setEditing(true);
  }

  function updateField(name) {
    return (e) => setForm({ ...form, [name]: e.target.value });
  }

  async function saveChanges(e) {
    e.preventDefault();
    const changes = {
      title: form.title.trim(),
      artist: form.artist.trim(),
      original_key: form.original_key.trim(),
      lyrics_and_chords: form.lyrics_and_chords,
    };
    if (!changes.title || !changes.original_key || !changes.lyrics_and_chords.trim()) {
      setActionError('Title, key, and lyrics can’t be empty.');
      return;
    }
    setBusy(true);
    setActionError(null);
    const { data, error } = await supabase
      .from('songs')
      .update(changes)
      .eq('id', id)
      .select()
      .maybeSingle();
    setBusy(false);
    if (error) {
      setActionError(`Couldn’t save: ${error.message}`);
    } else if (!data) {
      // No row changed: the song was deleted elsewhere, or isn't yours.
      setActionError('Couldn’t save: this song no longer exists.');
    } else {
      setSong(data);
      setEditing(false);
    }
  }

  async function deleteSong() {
    setBusy(true);
    setActionError(null);
    // Ask for the deleted row back, so we can tell "deleted" from "nothing to delete".
    const { data, error } = await supabase
      .from('songs')
      .delete()
      .eq('id', id)
      .select('id');
    if (error || !data || data.length === 0) {
      setBusy(false);
      setActionError(`Couldn’t delete: ${error ? error.message : 'this song no longer exists.'}`);
      return;
    }
    router.push('/songs');
  }

  let content;
  if (loadError) {
    content = <p className="text-red-400">Couldn’t load this song: {loadError}</p>;
  } else if (!validId || song === null) {
    content = (
      <div>
        <h1 className="text-3xl font-bold mb-2 text-cyan-400">Song not found</h1>
        <p className="text-slate-400">It may have been deleted, or the link is wrong.</p>
      </div>
    );
  } else if (song === undefined) {
    content = <p className="text-slate-500">Loading…</p>;
  } else if (editing) {
    content = (
      <form onSubmit={saveChanges} className="space-y-4">
        <h1 className="text-2xl font-bold text-cyan-400">Edit song</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block text-sm text-slate-400">
            Title
            <input type="text" value={form.title} onChange={updateField('title')} className={`${inputClass} mt-1`} required />
          </label>
          <label className="block text-sm text-slate-400">
            Artist
            <input type="text" value={form.artist} onChange={updateField('artist')} className={`${inputClass} mt-1`} />
          </label>
          <label className="block text-sm text-slate-400">
            Key
            <input type="text" value={form.original_key} onChange={updateField('original_key')} className={`${inputClass} mt-1`} required />
          </label>
        </div>
        <label className="block text-sm text-slate-400">
          Lyrics and chords
          <textarea
            value={form.lyrics_and_chords} onChange={updateField('lyrics_and_chords')} rows="16"
            className={`${inputClass} mt-1 font-mono`} required
          />
          <span className="block mt-1 text-xs text-slate-500">{LYRICS_HINT}</span>
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className={`${buttonClass} bg-cyan-500 hover:bg-cyan-600 text-slate-950`}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" disabled={busy} onClick={() => { setEditing(false); setActionError(null); }} className={`${buttonClass} border border-slate-700 hover:bg-slate-800`}>
            Cancel
          </button>
        </div>
      </form>
    );
  } else {
    content = (
      <article>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400">{song.title}</h1>
            {song.artist && <p className="text-lg text-slate-400">{song.artist}</p>}
            <p className="text-sm text-slate-400 mt-1">
              Key: {song.original_key}
              {song.tempo ? ` · ${song.tempo} bpm` : ''}
              {song.time_signature ? ` · ${song.time_signature}` : ''}
            </p>
          </div>
          {!confirmingDelete && (
            <div className="flex gap-3">
              <Link href={`/songs/${id}/print`} className={`${buttonClass} border border-slate-700 hover:bg-slate-800`}>
                Print
              </Link>
              <button type="button" onClick={startEditing} className={`${buttonClass} bg-cyan-500 hover:bg-cyan-600 text-slate-950`}>
                Edit
              </button>
              <button type="button" onClick={() => { setConfirmingDelete(true); setActionError(null); }} className={`${buttonClass} border border-red-800 text-red-300 hover:bg-red-950`}>
                Delete
              </button>
            </div>
          )}
        </div>

        {confirmingDelete && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4">
            <p className="mb-3">Delete “{song.title}”? This can’t be undone.</p>
            <div className="flex gap-3">
              <button type="button" disabled={busy} onClick={deleteSong} className={`${buttonClass} bg-red-600 hover:bg-red-700 text-white`}>
                {busy ? 'Deleting…' : 'Yes, delete it'}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmingDelete(false)} className={`${buttonClass} border border-slate-700 hover:bg-slate-800`}>
                Keep it
              </button>
            </div>
          </div>
        )}

        <LyricsWithChords text={song.lyrics_and_chords} />
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/songs" className="inline-block mb-6 text-sm text-slate-400 hover:text-cyan-300">
          ← Back to library
        </Link>
        {actionError && (
          <p role="alert" className="mb-4 rounded border border-red-800 bg-red-950/40 p-3 text-red-300">{actionError}</p>
        )}
        {content}
      </div>
    </main>
  );
}
