'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ShareRecord } from '@/lib/types'
import Logo from '@/components/Logo'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function Avatar({ profile }: { profile: { display_name: string; avatar_url: string | null } }) {
  const initials = profile.display_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile.avatar_url) return <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
  return <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-medium text-stone-600 dark:text-stone-300">{initials}</div>
}

export default function InboxPage() {
  const router = useRouter()
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'saved'>('all')
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      fetch('/api/inbox').then(r => r.json()).then((data: ShareRecord[]) => {
        setShares(Array.isArray(data) ? data : [])
        setLoading(false)
        // Mark all unread as read
        const unread = data.filter((s: ShareRecord) => s.status === 'unread')
        unread.forEach((s: ShareRecord) => {
          fetch(`/api/inbox/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'read' }) })
        })
      })
    })
  }, [router])

  async function handleSave(id: string) {
    const res = await fetch(`/api/inbox/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'saved' }) })
    if (res.ok) setSaved(s => new Set([...s, id]))
  }

  async function handleDismiss(id: string) {
    await fetch(`/api/inbox/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'dismissed' }) })
    setDismissed(d => new Set([...d, id]))
  }

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const visible = shares.filter(s => {
    if (dismissed.has(s.id)) return false
    if (tab === 'saved') return saved.has(s.id) || s.status === 'saved'
    return true
  })

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
                <a href="/friends" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Friends</a>
                <a href="/inbox" className="text-stone-900 dark:text-stone-100 font-medium">Inbox</a>
                <a href="/settings" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Settings</a>
              </nav>
            </div>
            <button onClick={handleSignOut} className="hidden sm:block text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Sign out</button>
          </div>
          <div className="sm:hidden flex border-t border-gray-100 dark:border-stone-800">
            <a href="/" className="flex-1 text-center text-xs font-medium py-2 text-gray-400 dark:text-gray-500">Library</a>
            <a href="/friends" className="flex-1 text-center text-xs font-medium py-2 text-gray-400 dark:text-gray-500">Friends</a>
            <a href="/inbox" className="flex-1 text-center text-xs font-medium py-2 text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100">Inbox</a>
            <a href="/settings" className="flex-1 text-center text-xs font-medium py-2 text-gray-400 dark:text-gray-500">Settings</a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-stone-800 rounded-lg p-1 w-fit">
          {(['all', 'saved'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white dark:bg-stone-700 shadow text-stone-900 dark:text-stone-100' : 'text-gray-500 dark:text-gray-400'}`}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-5 animate-pulse h-32" />)}</div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-3">📬</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{tab === 'saved' ? 'No saved articles yet.' : 'Your inbox is empty.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((share) => {
              const isSaved = saved.has(share.id) || share.status === 'saved'
              const isUnread = share.status === 'unread'
              return (
                <div key={share.id} className={`bg-white dark:bg-stone-900 rounded-xl border p-5 space-y-4 ${isUnread ? 'border-l-4 border-l-amber-400 border-gray-200 dark:border-stone-700' : 'border-gray-200 dark:border-stone-700'}`}>
                  {/* Sender + time */}
                  <div className="flex items-center gap-2">
                    {share.sender && <Avatar profile={share.sender} />}
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{share.sender?.display_name ?? 'Someone'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(share.sent_at)}</p>
                    </div>
                  </div>

                  {/* Article preview */}
                  <div className="space-y-2">
                    <a href={share.payload.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-stone-900 dark:text-stone-100 text-sm hover:underline hover:text-amber-800 dark:hover:text-amber-400 leading-snug block">{share.payload.title}</a>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{share.payload.source}{share.payload.published_date ? ` · ${share.payload.published_date}` : ''}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {share.payload.category && <span className="text-xs bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{share.payload.category}</span>}
                      {share.payload.subcategory && <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-full">{share.payload.subcategory}</span>}
                    </div>
                    {share.payload.bullets?.length > 0 && (
                      <ul className="space-y-0.5">
                        {share.payload.bullets.slice(0, 3).map((b, i) => (
                          <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex gap-1.5"><span className="text-gray-300 dark:text-gray-600 shrink-0">–</span>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Note */}
                  {share.note && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic bg-stone-50 dark:bg-stone-800 rounded-lg px-3 py-2">&ldquo;{share.note}&rdquo;</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    {isSaved ? (
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved to Library</span>
                    ) : (
                      <button onClick={() => handleSave(share.id)} className="text-sm font-medium bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700">Save to Library</button>
                    )}
                    <button onClick={() => handleDismiss(share.id)} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">Dismiss</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
