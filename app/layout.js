import './globals.css'
import AuthGate from './components/AuthGate'

export const metadata = {
  title: 'GigRocker',
  description: 'Your stage-ready song library, transposer, and binder booklet manager.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {/* Every page requires sign-in. */}
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  )
}
