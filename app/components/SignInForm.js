'use client'
// Email and password sign-in (docs/requirements/accounts-and-sharing.md, D1).
// There is no sign-up form: accounts are created by the project owner in the
// Supabase dashboard, and sign-ups are switched off (D7).
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function signIn(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      // Supabase deliberately doesn't say whether the email or the password was wrong.
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'That email and password don’t match an account.'
          : `Couldn’t sign in: ${signInError.message}`
      )
      setBusy(false)
    }
    // On success there's nothing to do here: AuthGate sees the new session
    // and replaces this form with the app.
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 font-sans">
      <form
        onSubmit={signIn}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-lg"
      >
        <h1 className="text-3xl font-extrabold text-cyan-400 tracking-tight mb-1">GigRocker</h1>
        <p className="text-slate-400 text-sm mb-6">Sign in to your song library.</p>

        <label htmlFor="email" className="block text-sm text-slate-300 mb-1">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white mb-4"
        />

        <label htmlFor="password" className="block text-sm text-slate-300 mb-1">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white mb-4"
        />

        {error && <p role="alert" className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 font-bold py-2 rounded transition"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-slate-500 text-xs mt-4">
          Accounts are created by the owner. There’s no public sign-up.
        </p>
      </form>
    </main>
  )
}
