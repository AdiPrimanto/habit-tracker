import React, { useState } from 'react'
import { supabase } from '../supabase'
import BackgroundDecoration from '../components/BackgroundDecoration'
import { Sparkles, Mail, Lock, LogIn, AlertCircle } from 'lucide-react'

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
    <div className="login-screen-wrapper">
      <BackgroundDecoration />
      <main className="login-card-container">
        <div className="login-brand">
          <div className="login-logo-icon">
            <Sparkles size={28} />
          </div>
          <h1>Habit Tracker</h1>
          <p className="login-subtitle">Bangun kebiasaan baik setiap hari</p>
        </div>

        <form className="login-form" onSubmit={signIn}>
          <div className="input-group">
            <Mail className="input-field-icon" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
              autoComplete="email"
              required
              className="login-input"
            />
          </div>

          <div className="input-group">
            <Lock className="input-field-icon" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
              required
              className="login-input"
            />
          </div>

          <button type="submit" className="btn-primary btn-login-submit" disabled={busy}>
            <LogIn size={18} />
            <span>{busy ? 'Memproses...' : 'Masuk'}</span>
          </button>

          {error && (
            <div className="login-error-alert" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}
