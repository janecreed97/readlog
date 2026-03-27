'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ShareRecord, ShareReaction, ShareComment, Profile } from '@/lib/types'

const EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '👎']

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

// ── Reaction bar ─────────────────────────────────────────────────────────────
// Rendered inside the article card. Shows existing reactions as pills + a
// small "+" button that opens a floating emoji picker above it.
function ReactionBar({
  shareId,
  reactions,
  myUserId,
  isSent,
  onToggle,
}: {
  shareId: string
  reactions: ShareReaction[]
  myUserId: string
  isSent: boolean
  onToggle: (shareId: string, emoji: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerStyle, setPickerStyle] = useState<{ bottom: number; left: number }>({ bottom: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  // Group: emoji → count, whether I have it
  const counts: Record<string, number> = {}
  let myEmoji: string | null = null
  for (const r of reactions) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1
    if (r.user_id === myUserId) myEmoji = r.emoji
  }
  const active = Object.entries(counts).filter(([, c]) => c > 0)

  function openPicker() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const pickerWidth = 232 // 6 × 32px buttons + gaps + padding ≈ 232px
      // Center picker on button, clamped 8px from either edge
      const left = Math.max(8, Math.min(
        rect.left + rect.width / 2 - pickerWidth / 2,
        window.innerWidth - pickerWidth - 8
      ))
      setPickerStyle({
        bottom: window.innerHeight - rect.top + 8,
        left,
      })
    }
    setPickerOpen(o => !o)
  }

  function pick(emoji: string) {
    onToggle(shareId, emoji)
    setPickerOpen(false)
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Existing reaction pills */}
      {active.map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onToggle(shareId, emoji)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors ${
            myEmoji === emoji
              ? isSent
                ? 'bg-stone-600 border-stone-500 text-white'
                : 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-stone-900 dark:text-stone-100'
              : isSent
              ? 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
              : 'bg-gray-100 dark:bg-stone-700 border-gray-200 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-600'
          }`}
        >
          <span>{emoji}</span>
          <span className="text-xs font-medium">{count}</span>
        </button>
      ))}

      {/* + trigger */}
      <button
        ref={btnRef}
        onClick={openPicker}
        aria-label="Add reaction"
        className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm leading-none transition-colors ${
          isSent
            ? 'border-stone-600 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            : 'border-gray-300 dark:border-stone-600 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-stone-700 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        +
      </button>

      {/* Picker rendered in a portal so it's never clipped by parent overflow */}
      {pickerOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setPickerOpen(false)} />
          <div
            className="fixed z-[91] flex gap-1 bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-600 rounded-2xl px-2 py-1.5 shadow-xl"
            style={{ bottom: pickerStyle.bottom, left: pickerStyle.left }}
          >
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => pick(emoji)}
                className={`w-8 h-8 rounded-full text-lg flex items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-stone-700 ${
                  myEmoji === emoji ? 'bg-amber-50 dark:bg-amber-900/30' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ── Comment thread ────────────────────────────────────────────────────────────
function CommentThread({
  shareId,
  comments,
  myUserId,
  isSent,
  onAdd,
  onDelete,
}: {
  shareId: string
  comments: ShareComment[]
  myUserId: string
  isSent: boolean
  onAdd: (shareId: string, content: string) => Promise<void>
  onDelete: (shareId: string, commentId: string) => void
}) {
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit() {
    const trimmed = input.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    await onAdd(shareId, trimmed)
    setInput('')
    setSubmitting(false)
  }

  return (
    <div className="space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2 group">
          {c.author && <Avatar profile={c.author} size={22} />}
          <div className="flex-1 min-w-0">
            <div className={`inline-block rounded-2xl px-3 py-1.5 text-sm max-w-full break-words ${
              isSent
                ? 'bg-stone-700 dark:bg-stone-600 text-stone-100'
                : 'bg-gray-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
            }`}>
              {c.author && (
                <span className={`font-medium text-xs mr-1 ${isSent ? 'text-stone-300' : 'text-gray-500 dark:text-gray-400'}`}>
                  {c.author.display_name.split(' ')[0]}
                </span>
              )}
              {c.content}
            </div>
            <div className="flex items-center gap-2 mt-0.5 pl-1">
              <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(c.created_at)}</span>
              {c.user_id === myUserId && (
                <button
                  onClick={() => onDelete(shareId, c.id)}
                  className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add comment */}
      <div className="flex items-center gap-2 pt-1">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="Add a comment…"
          maxLength={500}
          className={`flex-1 text-sm px-3 py-1.5 rounded-full border focus:outline-none focus:ring-1 ${
            isSent
              ? 'bg-stone-800 dark:bg-stone-700 border-stone-600 text-stone-100 placeholder-stone-500 focus:ring-stone-500'
              : 'bg-gray-50 dark:bg-stone-800 border-gray-200 dark:border-stone-600 text-stone-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500 focus:ring-stone-400'
          }`}
        />
        {input.trim() && (
          <button
            onClick={submit}
            disabled={submitting}
            className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
              isSent
                ? 'bg-stone-600 text-white hover:bg-stone-500'
                : 'bg-gray-900 text-white hover:bg-gray-700'
            } disabled:opacity-40`}
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface InteractionState {
  reactions: ShareReaction[]
  comments: ShareComment[]
}

// ── Shared article modal ──────────────────────────────────────────────────────
function SharedArticleModal({
  msg,
  interactions,
  myUserId,
  isSaved,
  onClose,
  onSave,
  onDismiss,
  onToggleReaction,
  onAddComment,
  onDeleteComment,
}: {
  msg: ConvMessage
  interactions: InteractionState
  myUserId: string
  isSaved: boolean
  onClose: () => void
  onSave: (id: string) => void
  onDismiss: (id: string) => void
  onToggleReaction: (shareId: string, emoji: string) => void
  onAddComment: (shareId: string, content: string) => Promise<void>
  onDeleteComment: (shareId: string, commentId: string) => void
}) {
  const isSent = msg.direction === 'sent'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b dark:border-stone-700 gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {msg.payload.source}{msg.payload.published_date ? ` · ${msg.payload.published_date}` : ''}
            </div>
            {msg.direction === 'received' && msg.otherPerson && (
              <div className="text-xs text-gray-400 dark:text-gray-500">
                Shared by{' '}
                <Link href={`/profile/${msg.otherPerson.username}`} onClick={onClose} className="hover:underline text-stone-600 dark:text-stone-400">
                  {msg.otherPerson.display_name}
                </Link>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shrink-0">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-4">
          {/* Title */}
          <a
            href={msg.payload.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug hover:underline hover:text-amber-800 dark:hover:text-amber-400 block"
          >
            {msg.payload.title} ↗
          </a>

          {/* Category tags */}
          <div className="flex gap-2 flex-wrap">
            {msg.payload.category && (
              <span className="text-xs bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-full">
                {msg.payload.category}
              </span>
            )}
            {msg.payload.subcategory && (
              <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 px-2.5 py-1 rounded-full">
                {msg.payload.subcategory}
              </span>
            )}
          </div>

          {/* All bullets */}
          {msg.payload.bullets?.length > 0 && (
            <ul className="space-y-2.5">
              {msg.payload.bullets.map((b, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                  <span className="text-gray-300 dark:text-gray-500 shrink-0 mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Note */}
          {msg.note && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic bg-stone-50 dark:bg-stone-800 rounded-xl px-4 py-3">
              &ldquo;{msg.note}&rdquo;
            </p>
          )}

          {/* Reactions + comments */}
          <div className="border-t dark:border-stone-700 pt-4 space-y-4">
            <ReactionBar
              shareId={msg.id}
              reactions={interactions.reactions}
              myUserId={myUserId}
              isSent={false}
              onToggle={onToggleReaction}
            />
            <CommentThread
              shareId={msg.id}
              comments={interactions.comments}
              myUserId={myUserId}
              isSent={false}
              onAdd={onAddComment}
              onDelete={onDeleteComment}
            />
          </div>
        </div>

        {/* Footer — save/dismiss for received messages */}
        {!isSent && (
          <div className="px-6 py-4 border-t dark:border-stone-700 flex items-center gap-3">
            {isSaved ? (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved to Library</span>
            ) : (
              <button
                onClick={() => { onSave(msg.id); onClose() }}
                className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Save to Library
              </button>
            )}
            <button
              onClick={() => { onDismiss(msg.id); onClose() }}
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InboxPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null)
  const [myUserId, setMyUserId] = useState('')
  // interactions keyed by share id
  const [interactions, setInteractions] = useState<Record<string, InteractionState>>({})
  const [interactionsLoading, setInteractionsLoading] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setMyUserId(user.id)

      Promise.all([
        fetch('/api/inbox').then(r => r.json()),
        fetch('/api/shares/sent').then(r => r.json()),
      ]).then(([received, sent]: [ShareRecord[], ShareRecord[]]) => {
        const convMap = new Map<string, Conversation>()

        function upsert(personId: string, person: Profile, msg: ConvMessage) {
          if (!convMap.has(personId)) {
            convMap.set(personId, { otherPersonId: personId, otherPerson: person, messages: [], unreadCount: 0, latestAt: msg.sent_at })
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

        convMap.forEach(c => c.messages.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()))
        const sorted = [...convMap.values()].sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())
        setConversations(sorted)
        setLoading(false)

        const unread = (Array.isArray(received) ? received : []).filter((s: ShareRecord) => s.status === 'unread')
        unread.forEach((s: ShareRecord) => {
          fetch(`/api/inbox/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'read' }) })
        })
      })
    })
  }, [router])

  // Load interactions when conversation opens
  useEffect(() => {
    if (!selectedId) return
    const conv = conversations.find(c => c.otherPersonId === selectedId)
    if (!conv) return
    const ids = conv.messages.map(m => m.id).join(',')
    if (!ids) return
    setInteractionsLoading(true)
    fetch(`/api/shares/interactions?ids=${ids}`)
      .then(r => r.json())
      .then((data: { reactions: ShareReaction[]; comments: ShareComment[] }) => {
        const next: Record<string, InteractionState> = {}
        for (const msg of conv.messages) {
          next[msg.id] = {
            reactions: data.reactions.filter(r => r.share_id === msg.id),
            comments: data.comments.filter(c => c.share_id === msg.id),
          }
        }
        setInteractions(next)
        setInteractionsLoading(false)
      })
      .catch(() => setInteractionsLoading(false))
  }, [selectedId, conversations])

  async function handleSave(id: string) {
    const res = await fetch(`/api/inbox/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'saved' }) })
    if (res.ok) {
      setSaved(s => new Set([...s, id]))
      setConversations(convs => convs.map(c => ({ ...c, messages: c.messages.map(m => m.id === id ? { ...m, status: 'saved' as const } : m) })))
    }
  }

  async function handleDismiss(id: string) {
    await fetch(`/api/inbox/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'dismissed' }) })
    setDismissed(d => new Set([...d, id]))
  }

  async function toggleReaction(shareId: string, emoji: string) {
    const current = interactions[shareId]?.reactions ?? []
    const myReaction = current.find(r => r.user_id === myUserId)

    // Optimistic update
    setInteractions(prev => {
      const prevList = prev[shareId]?.reactions ?? []
      let next: ShareReaction[]
      if (myReaction?.emoji === emoji) {
        next = prevList.filter(r => r.user_id !== myUserId)
      } else {
        const filtered = prevList.filter(r => r.user_id !== myUserId)
        next = [...filtered, { id: 'tmp', share_id: shareId, user_id: myUserId, emoji, created_at: new Date().toISOString() }]
      }
      return { ...prev, [shareId]: { ...prev[shareId], reactions: next } }
    })

    if (myReaction?.emoji === emoji) {
      await fetch(`/api/shares/${shareId}/react`, { method: 'DELETE' })
    } else {
      await fetch(`/api/shares/${shareId}/react`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }) })
    }
  }

  async function addComment(shareId: string, content: string) {
    const res = await fetch(`/api/shares/${shareId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
    if (!res.ok) return
    const comment: ShareComment = await res.json()
    setInteractions(prev => ({
      ...prev,
      [shareId]: { ...prev[shareId], comments: [...(prev[shareId]?.comments ?? []), comment] },
    }))
  }

  function deleteComment(shareId: string, commentId: string) {
    fetch(`/api/shares/${shareId}/comments/${commentId}`, { method: 'DELETE' })
    setInteractions(prev => ({
      ...prev,
      [shareId]: { ...prev[shareId], comments: (prev[shareId]?.comments ?? []).filter(c => c.id !== commentId) },
    }))
  }

  const selectedConv = selectedId ? conversations.find(c => c.otherPersonId === selectedId) : null

  // ── Conversation list ────────────────────────────────────────────────────
  if (!selectedConv) {
    return (
      <div className="min-h-screen">
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          <h1 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Conversations</h1>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 animate-pulse h-20" />)}
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
                    <Link href={`/profile/${conv.otherPerson.username}`} onClick={e => e.stopPropagation()} className="hover:opacity-80 transition-opacity">
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

  // ── Thread view ──────────────────────────────────────────────────────────
  const visibleMessages = selectedConv.messages.filter(m => !(m.direction === 'received' && dismissed.has(m.id)))

  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {/* Thread header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedId(null)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1">
            ← Back
          </button>
          <Link href={`/profile/${selectedConv.otherPerson.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar profile={selectedConv.otherPerson} size={28} />
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{selectedConv.otherPerson.display_name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">@{selectedConv.otherPerson.username}</span>
          </Link>
        </div>

        {interactionsLoading && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center animate-pulse">Loading…</p>
        )}

        {/* Messages */}
        <div className="space-y-6">
          {visibleMessages.map((msg) => {
            const isSent = msg.direction === 'sent'
            const isSaved = saved.has(msg.id) || msg.status === 'saved'
            const msgInteractions = interactions[msg.id] ?? { reactions: [], comments: [] }

            return (
              <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                <div className={`w-full max-w-[85%] space-y-2 flex flex-col ${isSent ? 'items-end' : 'items-start'}`}>
                  {/* Article card — click anywhere (except the title link) to expand */}
                  <div
                    onClick={() => setExpandedMsgId(msg.id)}
                    className={`rounded-2xl border p-4 space-y-3 w-full cursor-pointer transition-shadow hover:shadow-md ${
                      isSent
                        ? 'bg-stone-900 dark:bg-stone-700 border-stone-800 dark:border-stone-600 text-white'
                        : 'bg-white dark:bg-stone-900 border-gray-200 dark:border-stone-700'
                    }`}
                  >
                    <a
                      href={msg.payload.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
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
                      <ul className="space-y-0.5">
                        {msg.payload.bullets.slice(0, 3).map((b, i) => (
                          <li key={i} className={`text-xs flex gap-1.5 ${isSent ? 'text-stone-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            <span className={isSent ? 'text-stone-500' : 'text-gray-300 dark:text-gray-600'}>–</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {msg.note && (
                      <p className={`text-sm italic border-t pt-2 ${isSent ? 'text-stone-300 border-stone-700' : 'text-gray-500 dark:text-gray-400 border-gray-100 dark:border-stone-700'}`}>
                        &ldquo;{msg.note}&rdquo;
                      </p>
                    )}

                    {/* Reactions — inside card; stop propagation so clicks don't open the modal */}
                    <div
                      onClick={e => e.stopPropagation()}
                      className={`flex items-center justify-between pt-2 border-t ${isSent ? 'border-stone-700 dark:border-stone-600' : 'border-gray-100 dark:border-stone-700'}`}
                    >
                      <ReactionBar
                        shareId={msg.id}
                        reactions={msgInteractions.reactions}
                        myUserId={myUserId}
                        isSent={isSent}
                        onToggle={toggleReaction}
                      />
                    </div>
                  </div>

                  {/* Save / Dismiss (received only) */}
                  {!isSent && (
                    <div className="flex items-center gap-3 px-1">
                      {isSaved ? (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Saved to Library</span>
                      ) : (
                        <button onClick={() => handleSave(msg.id)} className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700">
                          Save to Library
                        </button>
                      )}
                      <button onClick={() => handleDismiss(msg.id)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Comments */}
                  <div className="w-full px-1">
                    <CommentThread
                      shareId={msg.id}
                      comments={msgInteractions.comments}
                      myUserId={myUserId}
                      isSent={isSent}
                      onAdd={addComment}
                      onDelete={deleteComment}
                    />
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-1">{timeAgo(msg.sent_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Expanded article modal */}
      {expandedMsgId && (() => {
        const expandedMsg = visibleMessages.find(m => m.id === expandedMsgId)
        if (!expandedMsg) return null
        return (
          <SharedArticleModal
            msg={expandedMsg}
            interactions={interactions[expandedMsgId] ?? { reactions: [], comments: [] }}
            myUserId={myUserId}
            isSaved={saved.has(expandedMsgId) || expandedMsg.status === 'saved'}
            onClose={() => setExpandedMsgId(null)}
            onSave={handleSave}
            onDismiss={handleDismiss}
            onToggleReaction={toggleReaction}
            onAddComment={addComment}
            onDeleteComment={deleteComment}
          />
        )
      })()}
    </div>
  )
}
