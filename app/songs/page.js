'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Simple chord transposition helper
const CHORDS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function transposeChord(chord, semitones) {
  const match = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;
  let root = match[1];
  let suffix = match[2];
  let index = CHORDS_SHARP.indexOf(root);
  if (index === -1) return chord;
  let newIndex = (index + semitones + 12) % 12;
  return CHORDS_SHARP[newIndex] + suffix;
}

export default function SongsPage() {
  const [songs, setSongs] = useState([]);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [originalKey, setOriginalKey] = useState('G');
  const [lyrics, setLyrics] = useState('');
  const [transposeSteps, setTransposeSteps] = useState(0);

  useEffect(() => {
    fetchSongs();
  }, []);

  async function fetchSongs() {
    const { data, error } = await supabase.from('songs').select('*');
    if (error) console.error('Error fetching songs:', error);
    else setSongs(data || []);
  }

  async function saveSong(e) {
    e.preventDefault();
    const { error } = await supabase.from('songs').insert([
      { title, artist, original_key: originalKey, lyrics_and_chords: lyrics }
    ]);
    if (error) {
      alert('Error saving song');
    } else {
      setTitle('');
      setArtist('');
      setLyrics('');
      fetchSongs();
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">GigRocker Song Library</h1>
        
        {/* Add Song Form */}
        <form onSubmit={saveSong} className="bg-slate-900 p-6 rounded-lg border border-slate-800 mb-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Add New Song</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input 
              type="text" placeholder="Song Title" value={title} onChange={e => setTitle(e.target.value)} 
              className="bg-slate-800 border border-slate-700 p-2 rounded text-white" required 
            />
            <input 
              type="text" placeholder="Artist" value={artist} onChange={e => setArtist(e.target.value)} 
              className="bg-slate-800 border border-slate-700 p-2 rounded text-white" 
            />
            <input 
              type="text" placeholder="Original Key (e.g., G)" value={originalKey} onChange={e => setOriginalKey(e.target.value)} 
              className="bg-slate-800 border border-slate-700 p-2 rounded text-white" required 
            />
          </div>
          <textarea 
            placeholder="Paste lyrics and chords here... (e.g., [G]Well, I'm a-runnin' down the road)" 
            value={lyrics} onChange={e => setLyrics(e.target.value)} rows="6"
            className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white font-mono mb-4" required
          ></textarea>
          <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-4 py-2 rounded">
            Save Song to Library
          </button>
        </form>

        {/* Library List */}
        <h2 className="text-2xl font-semibold mb-4">Your Repertoire</h2>
        {songs.length === 0 && (
          <p className="text-slate-500">No songs yet. Add your first one above.</p>
        )}
        <div className="space-y-4">
          {songs.map(song => (
            <div key={song.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-cyan-300">{song.title} <span className="text-sm font-normal text-slate-400">by {song.artist}</span></h3>
                <p className="text-sm text-slate-400">Key: {song.original_key}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
