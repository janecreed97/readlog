'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Article, Profile } from '@/lib/types'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function Avatar({ profile, size = 48 }: { profile: Profile; size?: number }) {
  const initials = profile.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <div
      className="rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-semibold text-stone-600 dark:text-stone-300"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      fetch(`/api/profile/${username}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) { setNotFound(true); setLoading(false); return }
          setProfile(data.profile)
          setArticles(data.articles ?? [])
          setLoading(false)
        })
        .catch(() => { setNotFound(true); setLoading(false) })
    })
  }, [username, router])

  async function handleSave(article: Article) {
    setSaving(article.id)
    const bullets = (article.bullets ?? [])
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
        shared_by_id: profile?.id,
        shared_by_name: profile?.display_name,
      }),
    })
    setSavedIds(s => new Set([...s, article.id]))
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-stone-800" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-100 dark:bg-stone-800 rounded" />
                <div className="h-3 w-20 bg-gray-100 dark:bg-stone-800 rounded" />
              </div>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 dark:bg-stone-800 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-4xl">👤</p>
          <p className="font-medium text-stone-900 dark:text-stone-100">User not found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">@{username} doesn&apos;t exist or has no public profile.</p>
          <button onClick={() => router.back()} className="text-sm text-amber-700 dark:text-amber-400 hover:underline mt-2">← Go back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Profile header */}
        {profile && (
          <div className="flex items-center gap-4">
            <Avatar profile={profile} size={52} />
            <div>
              <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">{profile.display_name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{profile.username}</p>
            </div>
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
              {articles.length} public article{articles.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Articles */}
        {articles.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">📚</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No public articles yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => {
              const isSaved = savedIds.has(article.id)
              const bullets = (article.bullets ?? []).sort((a, b) => a.position - b.position)
              return (
                <div
                  key={article.id}
                  className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-stone-900 dark:text-stone-100 text-sm leading-snug hover:underline hover:text-amber-800 dark:hover:text-amber-400 block"
                      >
                        {article.title}
                      </a>
                      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                        {article.source && <span>{article.source}</span>}
                        {article.published_date && <span>· {article.published_date}</span>}
                        <span>· {timeAgo(article.created_at)}</span>
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
                    <button
                      onClick={() => handleSave(article)}
                      disabled={isSaved || saving === article.id}
                      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        isSaved
                          ? 'text-green-600 dark:text-green-400'
                          : 'bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50'
                      }`}
                    >
                      {isSaved ? '✓ Saved' : saving === article.id ? '…' : 'Save'}
                    </button>
                  </div>

                  {bullets.length > 0 && (
                    <ul className="space-y-1">
                      {bullets.slice(0, 3).map((b) => (
                        <li key={b.id} className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="text-gray-300 dark:text-gray-600 shrink-0">–</span>
                          <span>{b.content}</span>
                        </li>
                      ))}
                      {bullets.length > 3 && (
                        <li className="text-xs text-gray-400 dark:text-gray-500 pl-4">
                          +{bullets.length - 3} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
