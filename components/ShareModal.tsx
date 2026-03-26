'use client'

import { useEffect, useState } from 'react'
import type { Article, Profile } from '@/lib/types'

interface Props {
  article: Article
  onClose: () => void
}

export default function ShareModal({ article, onClose }: Props) {
  const [friends, setFriends] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

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

  function toggle(id: string) {
    setSelected(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  async function send() {
    if (selected.size === 0) return
    setSending(true)
    await fetch('/api/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: article.id, recipient_ids: [...selected], note: note.trim() || undefined }),
    })
    setSent(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
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
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {friends.map(f => (
                  <label key={f.id} className="flex items-center gap-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg px-2 py-1.5">
                    <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} className="rounded" />
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{f.display_name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">@{f.username}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value.slice(0, 280))}
                  rows={2}
                  placeholder="Add a note… (optional)"
                  className="w-full border border-gray-200 dark:border-stone-600 rounded-lg px-3 py-2 text-sm dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                />
                {note.length > 200 && <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{280 - note.length} left</p>}
              </div>
              <button
                onClick={send}
                disabled={selected.size === 0 || sending}
                className="w-full bg-gray-900 text-white font-medium py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 text-sm"
              >
                {sending ? 'Sending…' : `Send to ${selected.size || ''} ${selected.size === 1 ? 'friend' : selected.size === 0 ? 'friends' : 'friends'}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
