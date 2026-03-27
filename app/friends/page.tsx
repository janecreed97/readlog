'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Friendship } from '@/lib/types'

function Avatar({ profile, size = 32 }: { profile: Profile; size?: number }) {
  const initials = profile.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  }
  return (
    <div className="rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-medium text-stone-600 dark:text-stone-300 text-xs shrink-0" style={{ width: size, height: size }}>
      {initials}
    </div>
  )
}

export default function FriendsPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())
  const [requests, setRequests] = useState<Friendship[]>([])
  const [friends, setFriends] = useState<Profile[]>([])
  const [confirmUnfriend, setConfirmUnfriend] = useState<string | null>(null)
  const [loadingUnfriend, setLoadingUnfriend] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
    fetch('/api/friends/requests').then(r => r.json()).then(data => { if (Array.isArray(data)) setRequests(data) })
    fetch('/api/friends').then(r => r.json()).then(data => { if (Array.isArray(data)) setFriends(data) })
  }, [router])

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setSearchResults([]); return }
    const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setSearchResults(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  async function sendRequest(username: string, profileId: string) {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressee_username: username }),
    })
    if (res.ok) setSentRequests(s => new Set([...s, profileId]))
  }

  async function handleRequest(id: string, action: 'accept' | 'decline') {
    await fetch(`/api/friends/request/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (action === 'accept') {
      const req = requests.find(r => r.id === id)
      if (req?.profile) setFriends(f => [...f, req.profile!])
    }
    setRequests(r => r.filter(x => x.id !== id))
  }

  async function unfriend(profileId: string) {
    setLoadingUnfriend(true)
    await fetch(`/api/friends/${profileId}`, { method: 'DELETE' })
    setFriends(f => f.filter(x => x.id !== profileId))
    setConfirmUnfriend(null)
    setLoadingUnfriend(false)
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Search bar */}
        <div className="space-y-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find people by username…"
            className="w-full border border-gray-200 dark:border-stone-700 rounded-lg px-3 py-2 text-sm dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          {query.length >= 3 && searchResults.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 px-1">No users found for &ldquo;{query}&rdquo;</p>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((profile) => (
                <div key={profile.id} className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 px-4 py-3 flex items-center justify-between gap-3">
                  <Link href={`/profile/${profile.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar profile={profile} />
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{profile.display_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{profile.username}</p>
                    </div>
                  </Link>
                  {sentRequests.has(profile.id) ? (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Request sent</span>
                  ) : (
                    <button
                      onClick={() => sendRequest(profile.username, profile.id)}
                      className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300"
                    >
                      Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending requests */}
        {requests.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
              Pending requests ({requests.length})
            </h2>
            <div className="space-y-2">
              {requests.map((req) => req.profile && (
                <div key={req.id} className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 px-4 py-3 flex items-center justify-between gap-3">
                  <Link href={`/profile/${req.profile.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar profile={req.profile} />
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{req.profile.display_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{req.profile.username}</p>
                    </div>
                  </Link>
                  <div className="flex gap-2">
                    <button onClick={() => handleRequest(req.id, 'accept')} className="text-sm font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700">Accept</button>
                    <button onClick={() => handleRequest(req.id, 'decline')} className="text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 px-2 py-1.5">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Friends list */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
            Friends{friends.length > 0 ? ` (${friends.length})` : ''}
          </h2>
          {friends.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No friends yet — search for people above.</p>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.id} className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 px-4 py-3 flex items-center justify-between gap-3">
                  <Link href={`/profile/${f.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar profile={f} />
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{f.display_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{f.username}</p>
                    </div>
                  </Link>
                  {confirmUnfriend === f.id ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Unfriend?</span>
                      <button onClick={() => unfriend(f.id)} disabled={loadingUnfriend} className="text-red-500 font-medium hover:text-red-700">Yes</button>
                      <button onClick={() => setConfirmUnfriend(null)} className="text-gray-400 dark:text-gray-500">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmUnfriend(f.id)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500">Unfriend</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
