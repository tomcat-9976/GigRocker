'use client'
// Shows the sign-in form until someone is signed in, then the page itself,
// with a header showing who is signed in and a "Sign out" button.
//
// This only decides what the screen shows. The real protection is in the
// database: its access rules (RLS) return only the signed-in user's own
// records, whatever the page does. See docs/architecture.md.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import SignInForm from './SignInForm'

export default function AuthGate({ children }) {
  // undefined = not known yet, null = signed out, otherwise the signed-in session
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // Called straight away with the current session (if a previous sign-in is
    // remembered in this browser), then on every sign-in, sign-out and token
    // refresh. The callback must stay synchronous: Supabase's client can
    // deadlock if other Supabase calls are awaited inside it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <p className="p-8 text-center text-slate-500">Loading…</p>
  }

  if (!session) {
    return <SignInForm />
  }

  return (
    <>
      <header className="border-b border-slate-800 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 py-3 text-sm">
          <Link href="/" className="font-bold text-cyan-400">GigRocker</Link>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="truncate">{session.user.email}</span>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="rounded border border-slate-700 px-3 py-1 hover:bg-slate-800 hover:text-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      {children}
    </>
  )
}
