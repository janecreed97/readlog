'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Article } from '@/lib/types'
import CategoryFilter from '@/components/CategoryFilter'
import OutlineView from '@/components/OutlineView'
import AddArticleModal from '@/components/AddArticleModal'

function OutlineContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const activeCategory = params.get('category') ?? ''
  const activeSub = params.get('sub') ?? ''

  const fetchArticles = useCallback(async () => {
    const res = await fetch('/api/articles')
    if (res.ok) setArticles(await res.json())
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

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-gray-900">ReadLog</span>
            <nav className="flex gap-4 text-sm">
              <a href="/" className="text-gray-500 hover:text-gray-800">Library</a>
              <a href="/outline" className="text-gray-900 font-medium">Outline</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdd(true)}
              className="bg-gray-900 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-gray-700"
            >
              + Add article
            </button>
            <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-700">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <CategoryFilter categories={categories} subcategories={subcategories} />

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/4" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <p className="text-4xl">📚</p>
            <p className="text-gray-500 font-medium">No articles saved yet.</p>
            <button onClick={() => setShowAdd(true)} className="text-sm text-blue-600 hover:underline">
              Add your first article
            </button>
          </div>
        ) : (
          <OutlineView
            articles={articles}
            activeCategory={activeCategory}
            activeSub={activeSub}
          />
        )}
      </main>

      {showAdd && (
        <AddArticleModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchArticles() }}
          existingCategories={categories}
        />
      )}
    </div>
  )
}

export default function OutlinePage() {
  return (
    <Suspense>
      <OutlineContent />
    </Suspense>
  )
}
