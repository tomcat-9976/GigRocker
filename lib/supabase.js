import { createClient } from '@supabase/supabase-js'

// One Supabase client for the whole app, used from the browser.
// NEXT_PUBLIC_SUPABASE_ANON_KEY holds the project's public key: the legacy
// "anon" key on the hosted projects, or the "Publishable" key that a local
// `supabase start` prints. Both are safe to expose; the database's access
// rules decide what they can do. The signed-in session is kept in this
// browser's storage and refreshed automatically.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
