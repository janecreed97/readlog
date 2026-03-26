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
import Logo from '@/components/Logo'

function LibraryContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [search, setSearch] = useState('')

  const activeCategory = params.get('category') ?? ''
  const activeSub = params.get('sub') ?? ''

  const fetchArticles = useCallback(async () => {
    const res = await fetch('/api/articles')
    if (res.ok) {
      const data = await res.json()
      setArticles(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
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

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-12 sm:h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2">
                <Logo size={22} />
                <span className="font-bold text-stone-900">ALEXANDRIA</span>
              </div>
              <nav className="hidden sm:flex gap-4 text-sm">
                <a href="/" className="text-stone-900 font-medium">Library</a>
                <a href="/outline" className="text-gray-500 hover:text-gray-800">Outline</a>
                <a href="/settings" className="text-gray-500 hover:text-gray-800">Settings</a>
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowAdd(true)}
                className="bg-gray-900 text-white text-sm font-medium px-3 sm:px-4 py-1.5 rounded-lg hover:bg-gray-700"
              >
                <span className="sm:hidden">+</span>
                <span className="hidden sm:inline">+ Add article</span>
              </button>
              <button onClick={() => setShowHelp(true)} className="hidden sm:flex items-center justify-center w-6 h-6 rounded-md border border-gray-300 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-600" aria-label="Help">
                ?
              </button>
              <button onClick={handleSignOut} className="hidden sm:block text-sm text-gray-400 hover:text-gray-700">
                Sign out
              </button>
            </div>
          </div>
          <div className="sm:hidden flex border-t border-gray-100">
            <a href="/" className="flex-1 text-center text-xs font-medium py-2 text-stone-900 border-b-2 border-stone-900">Library</a>
            <a href="/outline" className="flex-1 text-center text-xs font-medium py-2 text-gray-400">Outline</a>
            <a href="/settings" className="flex-1 text-center text-xs font-medium py-2 text-gray-400">Settings</a>
            <button onClick={handleSignOut} className="px-4 text-xs text-gray-400 hover:text-gray-600 border-l border-gray-100">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1">
            <CategoryFilter categories={categories} subcategories={subcategories} />
          </div>
          <input
            type="search"
            placeholder="Search titles and bullets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>

        <p className="text-xs text-gray-400">
          {filtered.length} {filtered.length === 1 ? 'article' : 'articles'}
          {(activeCategory || activeSub || search) ? ' matching filters' : ' saved'}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-4/5" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <p className="text-4xl">📰</p>
            <p className="text-gray-500 font-medium">
              {articles.length === 0 ? 'No articles yet.' : 'No articles match your filters.'}
            </p>
            {articles.length === 0 && (
              <button onClick={() => setShowAdd(true)} className="text-sm text-amber-700 hover:underline">
                Add your first article
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => setSelectedArticle(article)}
              />
            ))}
          </div>
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
