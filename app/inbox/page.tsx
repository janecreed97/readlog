'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ShareRecord, Profile } from '@/lib/types'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function Avatar({ profile, size = 36 }: { profile: Profile; size?: number }) {
  const initials = profile.display_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  }
  return (
    <div
      className="rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-medium text-stone-600 dark:text-stone-300 shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

type Direction = 'received' | 'sent'

interface ConvMessage extends ShareRecord {
  direction: Direction
  otherPerson: Profile
}

interface Conversation {
  otherPersonId: string
  otherPerson: Profile
  messages: ConvMessage[]
  unreadCount: number
  latestAt: string
}

export default function InboxPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      Promise.all([
        fetch('/api/inbox').then(r => r.json()),
        fetch('/api/shares/sent').then(r => r.json()),
      ]).then(([received, sent]: [ShareRecord[], ShareRecord[]]) => {
        const convMap = new Map<string, Conversation>()

        function upsert(personId: string, person: Profile, msg: ConvMessage) {
          if (!convMap.has(personId)) {
            convMap.set(personId, {
              otherPersonId: personId,
              otherPerson: person,
              messages: [],
              unreadCount: 0,
              latestAt: msg.sent_at,
            })
          }
          const c = convMap.get(personId)!
          c.messages.push(msg)
          if (msg.direction === 'received' && msg.status === 'unread') c.unreadCount++
          if (msg.sent_at > c.latestAt) c.latestAt = msg.sent_at
        }

        for (const item of (Array.isArray(received) ? received : [])) {
          if (!item.sender) continue
          upsert(item.sender_id, item.sender, { ...item, direction: 'received', otherPerson: item.sender })
        }
        for (const item of (Array.isArray(sent) ? sent : [])) {
          if (!item.recipient) continue
          upsert(item.recipient_id, item.recipient, { ...item, direction: 'sent', otherPerson: item.recipient })
        }

        // Sort each conversation's messages chronologically (oldest first)
        convMap.forEach(c => {
          c.messages.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
        })

        // Sort conversations by most recent
        const sorted = [...convMap.values()].sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())
        setConversations(sorted)
        setLoading(false)

        // Mark unread as read
        const unread = (Array.isArray(received) ? received : []).filter((s: ShareRecord) => s.status === 'unread')
        unread.forEach((s: ShareRecord) => {
          fetch(`/api/inbox/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'read' }) })
        })
      })
    })
  }, [router])

  async function handleSave(id: string) {
    const res = await fetch(`/api/inbox/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'saved' }) })
    if (res.ok) {
      setSaved(s => new Set([...s, id]))
      // Update in-memory state
      setConversations(convs => convs.map(c => ({
        ...c,
        messages: c.messages.map(m => m.id === id ? { ...m, status: 'saved' as const } : m),
      })))
    }
  }

  async function handleDismiss(id: string) {
    await fetch(`/api/inbox/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'dismissed' }) })
    setDismissed(d => new Set([...d, id]))
  }

  const selectedConv = selectedId ? conversations.find(c => c.otherPersonId === selectedId) : null

  // ── Conversation list ──────────────────────────────────────────────────
  if (!selectedConv) {
    return (
      <div className="min-h-screen">
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          <h1 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Conversations</h1>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No conversations yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Share an article with a friend to start one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const lastMsg = conv.messages[conv.messages.length - 1]
                const hasUnread = conv.messages.some(m => m.direction === 'received' && m.status === 'unread' && !dismissed.has(m.id))
                return (
                  <button
                    key={conv.otherPersonId}
                    onClick={() => setSelectedId(conv.otherPersonId)}
                    className="w-full text-left bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 px-4 py-3 flex items-center gap-3 hover:border-gray-300 dark:hover:border-stone-600 transition-colors"
                  >
                    <Link
                      href={`/profile/${conv.otherPerson.username}`}
                      onClick={e => e.stopPropagation()}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <Avatar profile={conv.otherPerson} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm ${hasUnread ? 'font-semibold text-stone-900 dark:text-stone-100' : 'font-medium text-stone-800 dark:text-stone-200'}`}>
                          {conv.otherPerson.display_name}
                        </p>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{timeAgo(conv.latestAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {lastMsg.direction === 'sent' ? 'You: ' : ''}{lastMsg.payload.title}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 min-w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-medium flex items-center justify-center px-1.5">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── Thread view ────────────────────────────────────────────────────────
  const visibleMessages = selectedConv.messages.filter(m => !(m.direction === 'received' && dismissed.has(m.id)))

  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {/* Thread header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedId(null)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1"
          >
            ← Back
          </button>
          <Link href={`/profile/${selectedConv.otherPerson.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar profile={selectedConv.otherPerson} size={28} />
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{selectedConv.otherPerson.display_name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">@{selectedConv.otherPerson.username}</span>
          </Link>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {visibleMessages.map((msg) => {
            const isSent = msg.direction === 'sent'
            const isSaved = saved.has(msg.id) || msg.status === 'saved'

            return (
              <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] space-y-2 ${isSent ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* Article card */}
                  <div className={`rounded-2xl border p-4 space-y-3 w-full ${
                    isSent
                      ? 'bg-stone-900 dark:bg-stone-700 border-stone-800 dark:border-stone-600 text-white'
                      : 'bg-white dark:bg-stone-900 border-gray-200 dark:border-stone-700'
                  }`}>
                    <div className="space-y-1">
                      <a
                        href={msg.payload.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`font-semibold text-sm leading-snug block hover:underline ${isSent ? 'text-white' : 'text-stone-900 dark:text-stone-100 hover:text-amber-800 dark:hover:text-amber-400'}`}
                      >
                        {msg.payload.title}
                      </a>
                      <p className={`text-xs ${isSent ? 'text-stone-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {msg.payload.source}{msg.payload.published_date ? ` · ${msg.payload.published_date}` : ''}
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {msg.payload.category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isSent ? 'bg-stone-700 dark:bg-stone-600 text-stone-200' : 'bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-gray-300'}`}>
                            {msg.payload.category}
                          </span>
                        )}
                        {msg.payload.subcategory && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isSent ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400'}`}>
                            {msg.payload.subcategory}
                          </span>
                        )}
                      </div>
                      {msg.payload.bullets?.length > 0 && (
                        <ul className="space-y-0.5 pt-1">
                          {msg.payload.bullets.slice(0, 3).map((b, i) => (
                            <li key={i} className={`text-xs flex gap-1.5 ${isSent ? 'text-stone-300' : 'text-gray-500 dark:text-gray-400'}`}>
                              <span className={`shrink-0 ${isSent ? 'text-stone-500' : 'text-gray-300 dark:text-gray-600'}`}>–</span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Note */}
                    {msg.note && (
                      <p className={`text-sm italic border-t pt-2 ${isSent ? 'text-stone-300 border-stone-700' : 'text-gray-500 dark:text-gray-400 border-gray-100 dark:border-stone-700'}`}>
                        &ldquo;{msg.note}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions (received only) */}
                  {!isSent && (
                    <div className="flex items-center gap-3">
                      {isSaved ? (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Saved to Library</span>
                      ) : (
                        <button
                          onClick={() => handleSave(msg.id)}
                          className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700"
                        >
                          Save to Library
                        </button>
                      )}
                      <button
                        onClick={() => handleDismiss(msg.id)}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-1">{timeAgo(msg.sent_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
