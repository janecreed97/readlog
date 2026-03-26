'use client'

import type { Article } from '@/lib/types'

interface Props {
  article: Article
  onClick: () => void
  onShare?: () => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ArticleCard({ article, onClick, onShare }: Props) {
  const firstBullet = article.bullets?.[0]?.content

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="group relative cursor-pointer text-left bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 hover:border-gray-400 dark:hover:border-stone-500 hover:shadow-sm transition-all space-y-3 w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <img
          src={`https://www.google.com/s2/favicons?domain=${new URL(article.url).hostname}&sz=16`}
          alt=""
          className="w-4 h-4 rounded"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{article.source}</span>
        {article.is_paywalled && (
          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
            Paywalled
          </span>
        )}
        {onShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare() }}
            className="ml-auto p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            aria-label="Share article"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        )}
      </div>

      {/* Title — links to article, rest of card opens detail drawer */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="block font-semibold text-stone-900 dark:text-stone-100 text-sm leading-snug line-clamp-2 hover:underline hover:text-amber-800 dark:hover:text-amber-400"
      >
        {article.title}
      </a>

      {/* Dates */}
      <div className="flex gap-3 text-xs text-gray-400 dark:text-gray-500">
        {article.published_date && <span>{formatDate(article.published_date)}</span>}
        <span>Saved {formatDate(article.created_at)}</span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
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

      {/* Shared by attribution */}
      {article.shared_by_name && (
        <p className="text-xs text-gray-400 dark:text-gray-500">Shared by {article.shared_by_name}</p>
      )}

      {/* Teaser bullet */}
      {firstBullet && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-1">{firstBullet}</p>
      )}
    </div>
  )
}
