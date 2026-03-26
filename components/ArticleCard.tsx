'use client'

import type { Article } from '@/lib/types'

interface Props {
  article: Article
  onClick: () => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ArticleCard({ article, onClick }: Props) {
  const firstBullet = article.bullets?.[0]?.content

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-400 hover:shadow-sm transition-all space-y-3 w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <img
          src={`https://www.google.com/s2/favicons?domain=${new URL(article.url).hostname}&sz=16`}
          alt=""
          className="w-4 h-4 rounded"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <span className="text-xs text-gray-500 font-medium">{article.source}</span>
        {article.is_paywalled && (
          <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Paywalled
          </span>
        )}
      </div>

      {/* Title */}
      <p className="font-semibold text-stone-900 text-sm leading-snug line-clamp-2">
        {article.title}
      </p>

      {/* Dates */}
      <div className="flex gap-3 text-xs text-gray-400">
        {article.published_date && <span>{formatDate(article.published_date)}</span>}
        <span>Saved {formatDate(article.created_at)}</span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {article.category && (
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
            {article.category}
          </span>
        )}
        {article.subcategory && (
          <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
            {article.subcategory}
          </span>
        )}
      </div>

      {/* Teaser bullet */}
      {firstBullet && (
        <p className="text-xs text-gray-500 italic line-clamp-1">{firstBullet}</p>
      )}
    </button>
  )
}
