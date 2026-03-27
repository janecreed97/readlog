'use client'

import { useEffect, useRef, useState } from 'react'
import type { Article, Profile } from '@/lib/types'

interface Props {
  article: Article
  onClose: () => void
}

export default function ShareModal({ article, onClose }: Props) {
  const [friends, setFriends] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Profile[]>([])
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/friends').then(r => r.json()),
    ]).then(([profile, friendsData]) => {
      setHasProfile(!!profile?.id)
      setFriends(Array.isArray(friendsData) ? friendsData : [])
      setLoading(false)
    })
  }, [])

  const selectedIds = new Set(selected.map(f => f.id))

  const filtered = friends.filter(f => {
    if (selectedIds.has(f.id)) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return f.display_name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q)
  })

  function selectFriend(f: Profile) {
    setSelected(s => [...s, f])
    setQuery('')
    inputRef.current?.focus()
  }

  function removeFriend(id: string) {
    setSelected(s => s.filter(f => f.id !== id))
  }

  async function send() {
    if (selected.length === 0) return
    setSending(true)
    await fetch('/api/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id: article.id,
        recipient_ids: selected.map(f => f.id),
        note: note.trim() || undefined,
      }),
    })
    setSent(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-stone-700">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">Share article</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Article preview */}
          <div className="bg-stone-50 dark:bg-stone-800 rounded-lg px-4 py-3 space-y-0.5">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 line-clamp-2">{article.title}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{article.source}</p>
          </div>

          {sent ? (
            <div className="py-6 text-center">
              <p className="text-2xl mb-2">✓</p>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Shared!</p>
            </div>
          ) : loading ? (
            <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Loading…</div>
          ) : !hasProfile ? (
            <div className="py-4 text-center space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Set up your profile to share articles with friends.</p>
              <a href="/profile/setup" className="text-sm text-amber-700 dark:text-amber-400 font-medium hover:underline">Set up profile →</a>
            </div>
          ) : friends.length === 0 ? (
            <div className="py-4 text-center space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">No friends yet.</p>
              <a href="/friends" className="text-sm text-amber-700 dark:text-amber-400 font-medium hover:underline">Add friends →</a>
            </div>
          ) : (
            <>
              {/* Friend search input + chips */}
              <div className="relative">
                {/* Backdrop to close dropdown */}
                {dropdownOpen && (
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                )}

                <div
                  className="relative z-20 min-h-[42px] flex flex-wrap gap-1.5 items-center border border-gray-200 dark:border-stone-600 rounded-lg px-2 py-1.5 bg-white dark:bg-stone-800 cursor-text focus-within:ring-2 focus-within:ring-stone-400"
                  onClick={() => { inputRef.current?.focus(); setDropdownOpen(true) }}
                >
                  {/* Selected friend chips */}
                  {selected.map(f => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-medium px-2 py-1 rounded-full"
                    >
                      {f.display_name}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeFriend(f.id) }}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  {/* Search input */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setDropdownOpen(true) }}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder={selected.length === 0 ? 'Search friends…' : ''}
                    className="flex-1 min-w-[120px] bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                  />
                </div>

                {/* Dropdown results */}
                {dropdownOpen && filtered.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-600 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filtered.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); selectFriend(f) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-700 text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-xs font-semibold text-amber-800 dark:text-amber-300 shrink-0">
                          {f.display_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{f.display_name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">@{f.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No matches state */}
                {dropdownOpen && query.trim() !== '' && filtered.length === 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-600 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                    No friends match &ldquo;{query}&rdquo;
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value.slice(0, 280))}
                  rows={2}
                  placeholder="Add a note… (optional)"
                  className="w-full border border-gray-200 dark:border-stone-600 rounded-lg px-3 py-2 text-sm dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                />
                {note.length > 200 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{280 - note.length} left</p>
                )}
              </div>

              <button
                onClick={send}
                disabled={selected.length === 0 || sending}
                className="w-full bg-gray-900 text-white font-medium py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 text-sm"
              >
                {sending
                  ? 'Sending…'
                  : selected.length === 0
                  ? 'Select a friend to send'
                  : `Send to ${selected.length} ${selected.length === 1 ? 'friend' : 'friends'}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
