'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Cpu, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Account created! You can now sign in.')
        setMode('signin')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-white text-lg leading-tight">Personal OS</h1>
            <p className="text-xs text-white/40">AI Personal Operating System</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-white/8 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-white/40 mb-6">
            {mode === 'signin'
              ? 'Sign in to manage your goals and actions.'
              : 'Sign up to start your Personal OS.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Success */}
            {message && (
              <p className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white text-black rounded-xl py-3 px-4 text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 mt-1"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-xs text-white/30 mt-4">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); setMessage(null) }}
                  className="text-white/60 hover:text-white underline transition-colors"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null); setMessage(null) }}
                  className="text-white/60 hover:text-white underline transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          By signing in, you agree to the terms of use.
        </p>
      </div>
    </div>
  )
}
