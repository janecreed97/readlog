'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

function toUsername(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 20)
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      // Check if profile already exists
      fetch('/api/profile').then(r => r.json()).then(profile => {
        if (profile?.id) { router.push('/'); return }
        const name = user.user_metadata?.full_name ?? ''
        setDisplayName(name)
        setUsername(toUsername(name))
      })
    })
  }, [router])

  const checkUsername = useCallback(async (val: string) => {
    if (!val || !/^[a-z0-9_]{3,20}$/.test(val)) {
      setUsernameStatus(val.length < 3 ? 'idle' : 'invalid')
      return
    }
    setUsernameStatus('checking')
    const res = await fetch(`/api/profile/check-username?username=${encodeURIComponent(val)}`)
    const data = await res.json()
    setUsernameStatus(data.available ? 'available' : 'taken')
  }, [])

  useEffect(() => {
    const t = setTimeout(() => checkUsername(username), 400)
    return () => clearTimeout(t)
  }, [username, checkUsername])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim() || usernameStatus !== 'available') return
    setSaving(true)
    setError('')
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, username }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); setSaving(false); return }
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo size={28} />
          <span className="font-bold text-xl text-stone-900 dark:text-stone-100 tracking-wider">ALEXANDRIA</span>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-gray-200 dark:border-stone-700 p-8">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-1">Set up your profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose a display name and username to start sharing articles with friends.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                required
                className="w-full border border-gray-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  maxLength={20}
                  required
                  className="w-full border border-gray-300 dark:border-stone-600 rounded-lg pl-7 pr-3 py-2 text-sm dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  placeholder="janesmith"
                />
              </div>
              <p className="mt-1 text-xs">
                {usernameStatus === 'checking' && <span className="text-gray-400">Checking…</span>}
                {usernameStatus === 'available' && <span className="text-green-600">✓ Available</span>}
                {usernameStatus === 'taken' && <span className="text-red-500">✗ Already taken</span>}
                {usernameStatus === 'invalid' && <span className="text-red-500">3–20 chars, letters/numbers/underscores only</span>}
              </p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={saving || usernameStatus !== 'available' || !displayName.trim()}
              className="w-full bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 text-sm mt-2"
            >
              {saving ? 'Setting up…' : 'Continue to Alexandria'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
