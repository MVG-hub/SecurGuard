import { useState, useEffect } from 'react'
import AuthPage from './components/AuthPage.jsx'
import Dashboard from './components/Dashboard.jsx'
import api from './api.js'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(!!localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      setChecking(true)
      // Token is already set in localStorage; api.js interceptor reads it fresh on each request
      api.get('/auth/me')
        .then(r => setUser(r.data))
        .catch(() => {
          localStorage.removeItem('token')
          setToken(null)
        })
        .finally(() => setChecking(false))
    } else {
      setChecking(false)
    }
  }, [token])

  const handleLogin = (t) => {
    localStorage.setItem('token', t)
    setToken(t)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    // Force full page reset so no stale scan state bleeds across accounts
    window.location.reload()
  }

  // Show nothing while validating existing token to avoid flicker
  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading SecurCode…</p>
        </div>
      </div>
    )
  }

  if (!token) return <AuthPage onLogin={handleLogin} />
  return <Dashboard user={user} onLogout={handleLogout} />
}
