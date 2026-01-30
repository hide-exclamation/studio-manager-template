'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DEFAULTS } from '@/lib/settings'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [companyName, setCompanyName] = useState(DEFAULTS.companyName)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Fetch company name for display
    fetch('/api/public-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.companyName) {
          setCompanyName(data.companyName)
        }
      })
      .catch(() => {
        // Use default if fetch fails
      })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-xl"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {companyName}
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Studio Manager
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Courriel
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)'
              }}
              placeholder="courriel@exemple.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)'
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-status-error)'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: 'var(--color-bg-dark)',
              color: 'var(--color-text-inverse)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
