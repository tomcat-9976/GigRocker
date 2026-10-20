'use client'
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans flex flex-col items-center justify-center">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-extrabold text-cyan-400 mb-4 tracking-tight">GigRocker</h1>
        <p className="text-slate-400 mb-8">Your stage-ready song library, transposer, and binder booklet manager.</p>
        
        <div className="flex flex-col gap-4">
          <Link href="/songs" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold p-4 rounded-lg shadow-lg transition text-center block">
            Manage Song Library & Chords
          </Link>
          <div className="bg-slate-900 border border-slate-800 text-slate-500 p-4 rounded-lg cursor-not-allowed">
            Setlist Builder & Booklet Printer (Coming Next)
          </div>
        </div>
      </div>
    </main>
  );
}
