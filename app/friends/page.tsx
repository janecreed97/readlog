'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Friendship } from '@/lib/types'
import Logo from '@/components/Logo'

type Tab = 'find' | 'requests' | 'friends'

function Avatar({ profile, size = 32 }: { profile: Profile; size?: number }) {
  const initials = profile.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <div className="rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-medium text-stone-600 dark:text-stone-300 text-xs" style={{ width: size, height: size }}>
      {initials}
    </div>
  )
}

export default function FriendsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('find')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())
  const [requests, setRequests] = useState<Friendship[]>([])
  const [friends, setFriends] = useState<Profile[]>([])
  const [confirmUnfriend, setConfirmUnfriend] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
  }, [router])

  useEffect(() => {
    if (tab === 'requests') {
      fetch('/api/friends/requests').then(r => r.json()).then(setRequests)
    }
    if (tab === 'friends') {
      fetch('/api/friends').then(r => r.json()).then(setFriends)
    }
  }, [tab])

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
    setRequests(r => r.filter(x => x.id !== id))
  }

  async function unfriend(profileId: string) {
    setLoading(true)
    await fetch(`/api/friends/${profileId}`, { method: 'DELETE' })
    setFriends(f => f.filter(x => x.id !== profileId))
    setConfirmUnfriend(null)
    setLoading(false)
  }

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <header className="bg-white dark:bg-stone-900 border-b border-gray-200 dark:border-stone-700 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="h-12 sm:h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 sm:gap-6">
              <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Logo size={22} />
                <span className="font-bold text-stone-900 dark:text-stone-100">ALEXANDRIA</span>
              </a>
              <nav className="hidden sm:flex gap-4 text-sm">
                <a href="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Library</a>
                <a href="/friends" className="text-stone-900 dark:text-stone-100 font-medium">Friends</a>
                <a href="/inbox" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Inbox</a>
                <a href="/settings" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Settings</a>
              </nav>
            </div>
            <button onClick={handleSignOut} className="hidden sm:block text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Sign out</button>
          </div>
          <div className="sm:hidden flex border-t border-gray-100 dark:border-stone-800">
            <a href="/" className="flex-1 text-center text-xs font-medium py-2 text-gray-400 dark:text-gray-500">Library</a>
            <a href="/friends" className="flex-1 text-center text-xs font-medium py-2 text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100">Friends</a>
            <a href="/inbox" className="flex-1 text-center text-xs font-medium py-2 text-gray-400 dark:text-gray-500">Inbox</a>
            <a href="/settings" className="flex-1 text-center text-xs font-medium py-2 text-gray-400 dark:text-gray-500">Settings</a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-stone-800 rounded-lg p-1 w-fit mb-6">
          {([['find', 'Find Friends'], ['requests', `Requests${requests.length > 0 ? ` (${requests.length})` : ''}`], ['friends', 'My Friends']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white dark:bg-stone-700 shadow text-stone-900 dark:text-stone-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Find Friends */}
        {tab === 'find' && (
          <div className="space-y-4">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username (min 3 characters)…"
              className="w-full border border-gray-200 dark:border-stone-700 rounded-lg px-3 py-2 text-sm dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            {searchResults.length === 0 && query.length >= 3 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">No users found for &ldquo;{query}&rdquo;</p>
            )}
            <div className="space-y-2">
              {searchResults.map((profile) => (
                <div key={profile.id} className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar profile={profile} />
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{profile.display_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{profile.username}</p>
                    </div>
                  </div>
                  {sentRequests.has(profile.id) ? (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Request sent</span>
                  ) : (
                    <button
                      onClick={() => sendRequest(profile.username, profile.id)}
                      className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300"
                    >
                      Add Friend
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requests */}
        {tab === 'requests' && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No pending requests.</p>
            ) : requests.map((req) => req.profile && (
              <div key={req.id} className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar profile={req.profile} />
                  <div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{req.profile.display_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">@{req.profile.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRequest(req.id, 'accept')} className="text-sm font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700">Accept</button>
                  <button onClick={() => handleRequest(req.id, 'decline')} className="text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 px-2 py-1.5">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My Friends */}
        {tab === 'friends' && (
          <div className="space-y-3">
            {friends.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-gray-400 dark:text-gray-500 text-sm">No friends yet.</p>
                <button onClick={() => setTab('find')} className="text-sm text-amber-700 dark:text-amber-400 hover:underline">Find friends →</button>
              </div>
            ) : friends.map((f) => (
              <div key={f.id} className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar profile={f} />
                  <div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{f.display_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">@{f.username}</p>
                  </div>
                </div>
                {confirmUnfriend === f.id ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Unfriend?</span>
                    <button onClick={() => unfriend(f.id)} disabled={loading} className="text-red-500 font-medium hover:text-red-700">Yes</button>
                    <button onClick={() => setConfirmUnfriend(null)} className="text-gray-400 dark:text-gray-500">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmUnfriend(f.id)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500">Unfriend</button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
