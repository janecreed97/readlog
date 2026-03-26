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
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="group cursor-pointer text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-400 hover:shadow-md transition-all space-y-3 w-full"
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

      {/* Title — links to article, rest of card opens detail drawer */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="block font-semibold text-stone-900 text-sm leading-snug line-clamp-2 hover:underline hover:text-amber-800"
      >
        {article.title}
      </a>

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

      {/* Teaser bullet — visible normally, hidden on desktop hover */}
      {firstBullet && (
        <p className="text-xs text-gray-500 italic line-clamp-1 md:group-hover:hidden">
          {firstBullet}
        </p>
      )}

      {/* All bullets — only shown on desktop hover */}
      {article.bullets && article.bullets.length > 0 && (
        <div className="hidden md:group-hover:block space-y-1.5 border-t border-gray-100 pt-3">
          {article.bullets.map((b) => (
            <p key={b.id} className="text-xs text-gray-600 leading-relaxed flex gap-1.5">
              <span className="text-gray-300 shrink-0">•</span>
              <span>{b.content}</span>
            </p>
          ))}
          <p className="text-xs text-gray-400 pt-1 italic">Click to edit</p>
        </div>
      )}
    </div>
  )
}
