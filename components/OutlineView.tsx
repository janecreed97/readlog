'use client'

import { useState } from 'react'
import type { Article } from '@/lib/types'

interface Props {
  articles: Article[]
  activeCategory: string
  activeSub: string
}

function formatMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Badge({ label, color }: { label: string; color: 'gray' | 'blue' }) {
  const cls = color === 'blue'
    ? 'bg-amber-50 text-amber-800'
    : 'bg-gray-100 text-gray-600'
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

function ArticleEntry({ article }: { article: Article }) {
  return (
    <div className="py-3 border-l-2 border-gray-200 pl-4 space-y-1.5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-stone-900 hover:text-amber-800 hover:underline text-sm"
        >
          {article.title}
        </a>
        <div className="flex gap-1 flex-wrap shrink-0">
          {article.category && <Badge label={article.category} color="gray" />}
          {article.subcategory && <Badge label={article.subcategory} color="blue" />}
        </div>
      </div>
      <p className="text-xs text-gray-400">{article.source}{article.published_date ? ` · ${formatDate(article.published_date)}` : ''}</p>
      {article.bullets && article.bullets.length > 0 && (
        <ul className="space-y-0.5 mt-1">
          {article.bullets.map((b) => (
            <li key={b.id} className="text-sm text-gray-600 flex gap-2">
              <span className="text-gray-400 shrink-0">–</span>
              <span>{b.content}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CollapsibleSection({ title, children, defaultOpen = true }: {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 bg-stone-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 py-3 space-y-4">{children}</div>}
    </div>
  )
}

function ChronologicalView({ articles }: { articles: Article[] }) {
  // Group by month of created_at
  const groups: Record<string, Article[]> = {}
  for (const a of articles) {
    const month = formatMonth(a.created_at)
    if (!groups[month]) groups[month] = []
    groups[month].push(a)
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([month, monthArticles]) => (
        <CollapsibleSection key={month} title={month}>
          <div className="space-y-4">
            {monthArticles.map((a) => <ArticleEntry key={a.id} article={a} />)}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  )
}

function TopicView({ articles, activeCategory }: { articles: Article[]; activeCategory: string }) {
  const [syntheses, setSyntheses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  // Group by category → subcategory
  const categories: Record<string, Record<string, Article[]>> = {}
  for (const a of articles) {
    const cat = a.category || 'Uncategorized'
    const sub = a.subcategory || 'General'
    if (!categories[cat]) categories[cat] = {}
    if (!categories[cat][sub]) categories[cat][sub] = []
    categories[cat][sub].push(a)
  }

  async function synthesize(category: string) {
    setLoading((l) => ({ ...l, [category]: true }))
    const res = await fetch('/api/outline/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    })
    const data = await res.json()
    setSyntheses((s) => ({ ...s, [category]: data.synthesis }))
    setLoading((l) => ({ ...l, [category]: false }))
  }

  return (
    <div className="space-y-4">
      {Object.entries(categories).map(([cat, subs]) => {
        const isCollapsed = activeCategory && activeCategory !== cat
        return (
          <CollapsibleSection
            key={cat}
            title={cat}
            defaultOpen={!isCollapsed}
          >
            {/* AI synthesis */}
            {syntheses[cat] ? (
              <p className="text-sm text-gray-600 italic bg-blue-50 rounded-lg px-4 py-3">{syntheses[cat]}</p>
            ) : (
              <button
                onClick={() => synthesize(cat)}
                disabled={loading[cat]}
                className="text-xs text-amber-700 hover:text-amber-900 font-medium disabled:opacity-50"
              >
                {loading[cat] ? 'Generating synthesis…' : '✦ Generate AI synthesis'}
              </button>
            )}

            {/* Articles by subcategory */}
            {Object.entries(subs).map(([sub, subArticles]) => (
              <div key={sub}>
                {Object.keys(subs).length > 1 && (
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{sub}</p>
                )}
                <div className="space-y-3">
                  {subArticles.map((a) => <ArticleEntry key={a.id} article={a} />)}
                </div>
              </div>
            ))}
          </CollapsibleSection>
        )
      })}
    </div>
  )
}

export default function OutlineView({ articles, activeCategory, activeSub }: Props) {
  const [mode, setMode] = useState<'chronological' | 'topic'>('chronological')

  const filtered = articles.filter((a) => {
    if (activeCategory && a.category !== activeCategory) return false
    if (activeSub && a.subcategory !== activeSub) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['chronological', 'topic'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              mode === m ? 'bg-white shadow text-stone-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {m === 'chronological' ? 'Chronological' : 'By Topic'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm">No articles match the current filter.</p>
        </div>
      ) : mode === 'chronological' ? (
        <ChronologicalView articles={filtered} />
      ) : (
        <TopicView articles={filtered} activeCategory={activeCategory} />
      )}
    </div>
  )
}
