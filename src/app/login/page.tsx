'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [forgotMode, setForgotMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  async function handleForgotPassword() {
    if (!resetEmail) return
    setResetLoading(true)
    setResetError('')
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: process.env.NEXT_PUBLIC_SITE_URL + '/reset-password',
    })
    if (error) {
      setResetError(error.message)
    } else {
      setResetSent(true)
    }
    setResetLoading(false)
  }

  const inputCls = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#1A2B4A] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30'

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1A2B4A]">PropFlow</h1>
          <p className="text-gray-400 mt-2">J Goodell Homes</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          {forgotMode ? (
            <>
              <h2 className="text-xl font-semibold text-[#1A2B4A] mb-2">Reset your password</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>

              {resetSent ? (
                <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Check your email for a reset link.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputCls}
                    />
                  </div>
                  {resetError && <p className="text-red-600 text-sm">{resetError}</p>}
                  <button
                    onClick={handleForgotPassword}
                    disabled={resetLoading || !resetEmail}
                    className="w-full py-3 bg-[#1C7BC0] hover:bg-[#1C7BC0]/90 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                  >
                    {resetLoading ? 'Sending...' : 'Send reset link'}
                  </button>
                </div>
              )}

              <button
                onClick={() => { setForgotMode(false); setResetSent(false); setResetError('') }}
                className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back to sign in
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-[#1A2B4A] mb-6">Sign in to your account</h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className={inputCls}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className={inputCls}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setResetEmail(email) }}
                    className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#1C7BC0] hover:bg-[#1C7BC0]/90 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm">
                  Need an account?{' '}
                  <a href="/signup" className="text-[#1C7BC0] hover:underline">
                    Request access
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
