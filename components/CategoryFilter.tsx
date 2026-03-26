'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  categories: string[]
  subcategories: Record<string, string[]>
}

export default function CategoryFilter({ categories, subcategories }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const activeCategory = params.get('category') ?? ''
  const activeSub = params.get('sub') ?? ''

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    if (key === 'category') next.delete('sub')
    router.push(`?${next.toString()}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => router.push('?')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            !activeCategory
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-stone-700'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setParam('category', cat)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-stone-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      {activeCategory && subcategories[activeCategory]?.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-2">
          {subcategories[activeCategory].map((sub) => (
            <button
              key={sub}
              onClick={() => setParam('sub', activeSub === sub ? '' : sub)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeSub === sub
                  ? 'bg-stone-700 text-white'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
