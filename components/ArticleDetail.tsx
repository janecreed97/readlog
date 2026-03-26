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

type FieldName = 'title' | 'source' | 'published_date' | 'category' | 'subcategory'

export default function ArticleDetail({ article, onClose, onUpdated, onDeleted, existingCategories, existingSubcategories }: Props) {
  const [fields, setFields] = useState({
    title: article.title,
    source: article.source,
    published_date: article.published_date ?? '',
    category: article.category,
    subcategory: article.subcategory,
  })
  const [bullets, setBullets] = useState(article.bullets?.map((b) => b.content) ?? [])
  const [editingField, setEditingField] = useState<FieldName | null>(null)
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
    onClose()
  }

  async function handleDelete() {
    await fetch(`/api/articles/${article.id}`, { method: 'DELETE' })
    onDeleted(article.id)
  }

  const fieldConfig: {
    label: string
    name: FieldName
    type?: string
    list?: string
    datalist?: React.ReactNode
  }[] = [
    { label: 'Title', name: 'title' },
    { label: 'Source', name: 'source' },
    { label: 'Published date', name: 'published_date', type: 'date' },
    {
      label: 'Category',
      name: 'category',
      list: 'detail-categories-list',
      datalist: (
        <datalist id="detail-categories-list">
          {existingCategories.map((c) => <option key={c} value={c} />)}
        </datalist>
      ),
    },
    {
      label: 'Subcategory',
      name: 'subcategory',
      list: 'detail-subcategories-list',
      datalist: (
        <datalist id="detail-subcategories-list">
          {(fields.category && existingSubcategories[fields.category]
            ? existingSubcategories[fields.category]
            : Object.values(existingSubcategories).flat().filter((v, i, a) => a.indexOf(v) === i)
          ).map((s) => <option key={s} value={s} />)}
        </datalist>
      ),
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/40" onClick={onClose}>
      {/* Modal */}
      <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b dark:border-stone-700">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-700 dark:text-amber-400 hover:underline truncate max-w-[80%]"
          >
            {article.url}
          </a>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ml-2">✕</button>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-5 space-y-5">
          {/* Metadata — read by default, click a field to edit it */}
          <div className="divide-y divide-gray-100 dark:divide-stone-700">
            {fieldConfig.map(({ label, name, type = 'text', list, datalist }) => (
              <div key={name} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
                {editingField === name ? (
                  <>
                    <input
                      autoFocus
                      type={type}
                      value={fields[name]}
                      onChange={(e) => setFields((f) => ({ ...f, [name]: e.target.value }))}
                      onBlur={() => setTimeout(() => setEditingField(null), 200)}
                      list={list}
                      className="w-full text-sm border border-gray-200 dark:border-stone-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:bg-stone-800 dark:text-stone-100"
                    />
                    {datalist}
                  </>
                ) : (
                  <button
                    onClick={() => setEditingField(name)}
                    className="w-full text-left group flex items-center justify-between gap-2 rounded px-1 py-0.5 -ml-1 hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    <span className={`text-sm ${fields[name] ? 'text-stone-900 dark:text-stone-100' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                      {fields[name] || '—'}
                    </span>
                    <span className="text-xs text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 shrink-0">
                      Edit
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Bullets */}
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Key takeaways</p>
            <BulletList bullets={bullets} onChange={setBullets} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t dark:border-stone-700 flex items-center justify-between gap-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Delete this article?</span>
              <button onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-800">
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-500 dark:text-gray-400">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-red-500"
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
