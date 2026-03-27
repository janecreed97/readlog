'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

interface Bullet { id: string; content: string; position: number }
interface FeedArticle {
  id: string
  url: string
  title: string
  source: string | null
  published_date: string | null
  category: string | null
  subcategory: string | null
  created_at: string
  bullets: Bullet[]
  profiles: Profile
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function Avatar({ profile, size = 32 }: { profile: Profile; size?: number }) {
  const initials = profile.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  }
  return (
    <div
      className="rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-semibold text-stone-600 dark:text-stone-300 shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

function ArticleModal({
  article,
  isSaved,
  saving,
  onSave,
  onClose,
}: {
  article: FeedArticle
  isSaved: boolean
  saving: boolean
  onSave: () => void
  onClose: () => void
}) {
  const bullets = [...(article.bullets ?? [])].sort((a, b) => a.position - b.position)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white dark:bg-stone-900 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-stone-700 shrink-0">
          <div className="flex items-center gap-2">
            <Avatar profile={article.profiles} size={28} />
            <Link
              href={`/profile/${article.profiles.username}`}
              onClick={e => e.stopPropagation()}
              className="text-sm font-medium text-stone-700 dark:text-stone-300 hover:underline"
            >
              {article.profiles.display_name}
            </Link>
            <span className="text-xs text-gray-400">· {timeAgo(article.created_at)}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none ml-3 shrink-0">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
            {article.source && <span className="font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">{article.source}</span>}
            {article.published_date && <><span>·</span><span>{article.published_date}</span></>}
            {(article.category || article.subcategory) && <span>·</span>}
            {article.category && (
              <span className="bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{article.category}</span>
            )}
            {article.subcategory && (
              <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-full">{article.subcategory}</span>
            )}
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">{article.title}</h2>
          {bullets.length > 0 && (
            <ul className="space-y-2">
              {bullets.map(b => (
                <li key={b.id} className="flex gap-2.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                  <span>{b.content}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-stone-700 flex items-center gap-3 shrink-0">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-sm font-medium border border-gray-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            Read original ↗
          </a>
          <button
            onClick={onSave}
            disabled={isSaved || saving}
            className={`flex-1 text-sm font-medium py-2.5 rounded-xl transition-colors ${
              isSaved
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-gray-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-gray-700 dark:hover:bg-stone-200 disabled:opacity-50'
            }`}
          >
            {isSaved ? '✓ Saved to library' : saving ? 'Saving…' : 'Save to library'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FeedPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<FeedArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<FeedArticle | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      fetch('/api/feed')
        .then(r => r.json())
        .then(data => { setArticles(Array.isArray(data) ? data : []); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [router])

  async function handleSave(article: FeedArticle) {
    setSaving(article.id)
    const bullets = [...(article.bullets ?? [])]
      .sort((a, b) => a.position - b.position)
      .map(b => b.content)
    await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: article.url,
        title: article.title,
        source: article.source,
        published_date: article.published_date,
        category: article.category,
        subcategory: article.subcategory,
        is_paywalled: false,
        is_private: false,
        bullets,
        shared_by_id: article.profiles?.id,
        shared_by_name: article.profiles?.display_name,
      }),
    })
    setSavedIds(s => new Set([...s, article.id]))
    setSaving(null)
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-6">Friend Activity</h1>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-stone-800" />
                  <div className="h-3 w-28 bg-gray-100 dark:bg-stone-800 rounded" />
                </div>
                <div className="h-4 w-3/4 bg-gray-100 dark:bg-stone-800 rounded" />
                <div className="space-y-1.5">
                  <div className="h-3 bg-gray-100 dark:bg-stone-800 rounded" />
                  <div className="h-3 w-5/6 bg-gray-100 dark:bg-stone-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="text-4xl">📰</p>
            <p className="font-medium text-stone-900 dark:text-stone-100">Nothing here yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              When your friends save public articles, they&apos;ll show up here.
            </p>
            <Link href="/friends" className="inline-block mt-2 text-sm text-amber-700 dark:text-amber-400 hover:underline">
              Find friends →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map(article => {
              const isSaved = savedIds.has(article.id)
              const bullets = [...(article.bullets ?? [])].sort((a, b) => a.position - b.position)
              return (
                <div
                  key={article.id}
                  onClick={() => setSelected(article)}
                  className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-xl p-5 space-y-3 cursor-pointer hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-sm transition-all"
                >
                  {/* Who saved it */}
                  <div className="flex items-center gap-2">
                    <Avatar profile={article.profiles} size={26} />
                    <Link
                      href={`/profile/${article.profiles?.username}`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs font-medium text-stone-600 dark:text-stone-400 hover:underline"
                    >
                      {article.profiles?.display_name}
                    </Link>
                    <span className="text-xs text-gray-400 dark:text-gray-500">saved this · {timeAgo(article.created_at)}</span>
                  </div>

                  {/* Article */}
                  <div className="space-y-1">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="font-semibold text-stone-900 dark:text-stone-100 text-sm leading-snug hover:underline hover:text-amber-800 dark:hover:text-amber-400 block"
                    >
                      {article.title}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      {article.source && <span>{article.source}</span>}
                      {article.published_date && <><span>·</span><span>{article.published_date}</span></>}
                    </div>
                    <div className="flex gap-1.5 flex-wrap pt-0.5">
                      {article.category && (
                        <span className="text-xs bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {article.category}
                        </span>
                      )}
                      {article.subcategory && (
                        <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-full">
                          {article.subcategory}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bullets preview */}
                  {bullets.length > 0 && (
                    <ul className="space-y-1">
                      {bullets.slice(0, 3).map(b => (
                        <li key={b.id} className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="text-gray-300 dark:text-gray-600 shrink-0">–</span>
                          <span>{b.content}</span>
                        </li>
                      ))}
                      {bullets.length > 3 && (
                        <li className="text-xs text-gray-400 dark:text-gray-500 pl-4">
                          +{bullets.length - 3} more — click to expand
                        </li>
                      )}
                    </ul>
                  )}

                  {/* Save button */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={e => { e.stopPropagation(); handleSave(article) }}
                      disabled={isSaved || saving === article.id}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        isSaved
                          ? 'text-green-600 dark:text-green-400'
                          : 'bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50'
                      }`}
                    >
                      {isSaved ? '✓ Saved' : saving === article.id ? '…' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {selected && (
        <ArticleModal
          article={selected}
          isSaved={savedIds.has(selected.id)}
          saving={saving === selected.id}
          onSave={() => handleSave(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
