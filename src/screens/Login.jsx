import { useState } from 'react'
import { supabase } from '../supabase'

// Supabase mengembalikan error OAuth (mis. signup dimatikan) lewat query atau hash URL
const urlError = () => {
  const params = new URLSearchParams(window.location.search + '&' + window.location.hash.slice(1))
  return params.get('error_description')
}

export default function Login() {
  const [error, setError] = useState(urlError)

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <main className="page login">
      <h1>Habit Tracker</h1>
      <button className="primary" onClick={signIn}>Continue with Google</button>
      {error && <p className="error">{error}</p>}
    </main>
  )
}
