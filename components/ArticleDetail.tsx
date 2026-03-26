'use client'

import { useState } from 'react'
import BulletList from './BulletList'
import type { Article } from '@/lib/types'

interface Props {
  article: Article
  onClose: () => void
  onUpdated: (article: Article) => void
  onDeleted: (id: string) => void
  existingCategories: string[]
  existingSubcategories: Record<string, string[]>
}

export default function ArticleDetail({ article, onClose, onUpdated, onDeleted, existingCategories, existingSubcategories }: Props) {
  const [fields, setFields] = useState({
    title: article.title,
    source: article.source,
    published_date: article.published_date ?? '',
    category: article.category,
    subcategory: article.subcategory,
  })
  const [bullets, setBullets] = useState(article.bullets?.map((b) => b.content) ?? [])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, published_date: fields.published_date || null, bullets }),
    })
    setSaving(false)
    onUpdated({
      ...article,
      ...fields,
      published_date: fields.published_date || null,
      bullets: bullets.map((content, position) => ({
        id: article.bullets?.[position]?.id ?? String(position),
        article_id: article.id,
        content,
        position,
      })),
    })
  }

  async function handleDelete() {
    await fetch(`/api/articles/${article.id}`, { method: 'DELETE' })
    onDeleted(article.id)
  }

  function field(name: keyof typeof fields) {
    return {
      value: fields[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setFields((f) => ({ ...f, [name]: e.target.value })),
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-700 hover:underline truncate max-w-[80%]"
          >
            {article.url}
          </a>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-2">✕</button>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-5 space-y-5">
          {/* Metadata fields */}
          <div className="space-y-3">
            {[
              { label: 'Title', name: 'title' as const },
              { label: 'Source', name: 'source' as const },
              { label: 'Published date', name: 'published_date' as const },
            ].map(({ label, name }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  type={name === 'published_date' ? 'date' : 'text'}
                  {...field(name)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <input
                type="text"
                {...field('category')}
                list="detail-categories-list"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
              <datalist id="detail-categories-list">
                {existingCategories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subcategory</label>
              <input
                type="text"
                {...field('subcategory')}
                list="detail-subcategories-list"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
              <datalist id="detail-subcategories-list">
                {(fields.category && existingSubcategories[fields.category]
                  ? existingSubcategories[fields.category]
                  : Object.values(existingSubcategories).flat().filter((v, i, a) => a.indexOf(v) === i)
                ).map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          {/* Bullets */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Key takeaways</label>
            <BulletList bullets={bullets} onChange={setBullets} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t flex items-center justify-between gap-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Delete this article?</span>
              <button onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-800">
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-500">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              Delete article
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="ml-auto bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
