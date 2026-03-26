'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Article } from '@/lib/types'
import ArticleCard from '@/components/ArticleCard'
import ArticleDetail from '@/components/ArticleDetail'
import CategoryFilter from '@/components/CategoryFilter'
import AddArticleModal from '@/components/AddArticleModal'
import HelpModal from '@/components/HelpModal'
import ShareModal from '@/components/ShareModal'
import OutlineView from '@/components/OutlineView'

type ViewMode = 'cards' | 'chronological' | 'topic'

function LibraryContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [shareArticle, setShareArticle] = useState<Article | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('cards')

  const activeCategory = params.get('category') ?? ''
  const activeSub = params.get('sub') ?? ''

  // Restore persisted view on mount
  useEffect(() => {
    const stored = localStorage.getItem('alex-view') as ViewMode | null
    if (stored && ['cards', 'chronological', 'topic'].includes(stored)) setView(stored)
  }, [])

  // Listen for header button events
  useEffect(() => {
    const onAdd = () => setShowAdd(true)
    const onHelp = () => setShowHelp(true)
    window.addEventListener('alexandria:add', onAdd)
    window.addEventListener('alexandria:help', onHelp)
    return () => {
      window.removeEventListener('alexandria:add', onAdd)
      window.removeEventListener('alexandria:help', onHelp)
    }
  }, [])

  function changeView(v: ViewMode) {
    setView(v)
    localStorage.setItem('alex-view', v)
  }

  const fetchArticles = useCallback(async () => {
    const res = await fetch('/api/articles')
    if (res.ok) setArticles(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchArticles()
    fetch('/api/profile').then(r => r.json()).then(profile => {
      if (profile === null) router.push('/profile/setup')
    })
  }, [fetchArticles, router])

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const categories = Array.from(new Set(articles.map((a) => a.category).filter(Boolean))).sort()
  const subcategories: Record<string, string[]> = {}
  for (const a of articles) {
    if (!a.category || !a.subcategory) continue
    if (!subcategories[a.category]) subcategories[a.category] = []
    if (!subcategories[a.category].includes(a.subcategory)) {
      subcategories[a.category].push(a.subcategory)
    }
  }

  const filtered = articles.filter((a) => {
    if (activeCategory && a.category !== activeCategory) return false
    if (activeSub && a.subcategory !== activeSub) return false
    if (search) {
      const q = search.toLowerCase()
      const inTitle = a.title.toLowerCase().includes(q)
      const inBullets = a.bullets?.some((b) => b.content.toLowerCase().includes(q))
      if (!inTitle && !inBullets) return false
    }
    return true
  })

  const maxW = view === 'cards' ? 'max-w-6xl' : 'max-w-4xl'

  return (
    <div className="min-h-screen">
      <main className={`${maxW} mx-auto px-4 sm:px-6 py-6 space-y-5`}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1">
            <CategoryFilter categories={categories} subcategories={subcategories} />
          </div>
          <input
            type="search"
            placeholder="Search titles and bullets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 dark:border-stone-700 rounded-lg px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'article' : 'articles'}
            {(activeCategory || activeSub || search) ? ' matching filters' : ' saved'}
          </p>
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-stone-800 rounded-lg p-1">
            {([['cards', 'Cards'], ['chronological', 'Chronological'], ['topic', 'By Topic']] as [ViewMode, string][]).map(([v, label]) => (
              <button
                key={v}
                onClick={() => changeView(v)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  view === v
                    ? 'bg-white dark:bg-stone-700 shadow text-stone-900 dark:text-stone-100'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 space-y-3 animate-pulse">
                <div className="h-3 bg-gray-100 dark:bg-stone-700 rounded w-1/3" />
                <div className="h-4 bg-gray-100 dark:bg-stone-700 rounded w-4/5" />
                <div className="h-4 bg-gray-100 dark:bg-stone-700 rounded w-2/3" />
                <div className="h-3 bg-gray-100 dark:bg-stone-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <p className="text-4xl">📰</p>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {articles.length === 0 ? 'No articles yet.' : 'No articles match your filters.'}
            </p>
            {articles.length === 0 && (
              <button onClick={() => setShowAdd(true)} className="text-sm text-amber-700 hover:underline">
                Add your first article
              </button>
            )}
          </div>
        ) : view === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => setSelectedArticle(article)}
                onShare={() => setShareArticle(article)}
              />
            ))}
          </div>
        ) : (
          <OutlineView
            articles={filtered}
            activeCategory={activeCategory}
            activeSub={activeSub}
            mode={view}
          />
        )}
      </main>

      {selectedArticle && (
        <ArticleDetail
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onUpdated={(updated) => {
            setArticles((prev) => prev.map((a) => a.id === updated.id ? updated : a))
            setSelectedArticle(updated)
          }}
          onDeleted={(id) => {
            setArticles((prev) => prev.filter((a) => a.id !== id))
            setSelectedArticle(null)
          }}
          existingCategories={categories}
          existingSubcategories={subcategories}
        />
      )}

      {showAdd && (
        <AddArticleModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchArticles() }}
          existingCategories={categories}
          existingSubcategories={subcategories}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {shareArticle && <ShareModal article={shareArticle} onClose={() => setShareArticle(null)} />}
    </div>
  )
}

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryContent />
    </Suspense>
  )
}
