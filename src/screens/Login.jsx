import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const signIn = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (!error) return
    if (error.code === 'invalid_credentials') setError('Email atau password salah.')
    else if (error.name === 'AuthRetryableFetchError') setError('Tidak bisa terhubung ke server. Cek koneksi internet.')
    else setError(error.message)
  }

  return (
    <main className="page login">
      <h1>Habit Tracker</h1>
      <form className="form" onSubmit={signIn}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" autoComplete="email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" autoComplete="current-password" required />
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Masuk…' : 'Masuk'}</button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </main>
  )
}
