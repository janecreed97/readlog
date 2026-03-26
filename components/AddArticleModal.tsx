'use client'

import { useState, useRef } from 'react'
import BulletList from './BulletList'
import type { ArticlePreview } from '@/lib/types'

interface Props {
  onClose: () => void
  onSaved: () => void
  existingCategories: string[]
  existingSubcategories: Record<string, string[]>
}

type Step = 'url' | 'loading' | 'preview' | 'paywall'

export default function AddArticleModal({ onClose, onSaved, existingCategories, existingSubcategories }: Props) {
  const [step, setStep] = useState<Step>('url')
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<ArticlePreview | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [direction, setDirection] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFetch() {
    if (!url.trim()) return
    setError('')
    setStep('loading')
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), direction: direction.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch article')
      setPreview(data)
      if (data.is_paywalled) {
        setStep('paywall')
      } else {
        setStep('preview')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('url')
    }
  }

  async function handlePasteSubmit() {
    if (!pasteText.trim()) return
    setStep('loading')
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), pasteText: pasteText.trim(), direction: direction.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to summarize')
      setPreview({ ...data, is_paywalled: true })
      setStep('preview')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('paywall')
    }
  }

  async function handleScreenshot(file: File) {
    setStep('loading')
    const formData = new FormData()
    formData.append('image', file)
    formData.append('url', url)
    try {
      const res = await fetch('/api/fetch/screenshot', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to process screenshot')
      setPreview({ ...data, is_paywalled: true })
      setStep('preview')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('paywall')
    }
  }

  async function handleSave() {
    if (!preview) return
    setSaving(true)
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preview),
    })
    setSaving(false)
    if (res.ok) {
      onSaved()
    } else {
      setError('Failed to save article')
    }
  }

  async function handleResummarize() {
    if (!preview) return
    setStep('loading')
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), pasteText: pasteText.trim() || undefined, direction: direction.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to summarize')
      // Only update bullets — preserve any manual edits to other fields
      setPreview((p) => p ? { ...p, bullets: data.bullets } : p)
      setStep('preview')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('preview')
    }
  }

  function updatePreview(key: keyof ArticlePreview, value: string | string[] | boolean) {
    setPreview((p) => p ? { ...p, [key]: value } : p)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b dark:border-stone-700">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">
            {step === 'preview' ? 'Review & save' : 'Add article'}
          </h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>

        <div className="px-4 sm:px-6 py-5">
          {/* URL input */}
          {step === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Article URL</label>
                <input
                  autoFocus
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                  placeholder="https://..."
                  className="w-full border border-gray-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Direction <span className="font-normal text-gray-400">（optional）</span>
                </label>
                <textarea
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  rows={2}
                  placeholder={'e.g. "Surface counterarguments" or "Facts and stats only, skip the analysis"'}
                  className="w-full border border-gray-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={handleFetch}
                disabled={!url.trim()}
                className="w-full bg-gray-900 text-white font-medium py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 text-sm"
              >
                Fetch & summarize
              </button>
            </div>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <div className="py-12 text-center space-y-3">
              <div className="animate-spin w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Fetching and summarizing…</p>
              {/* Skeleton */}
              <div className="space-y-2 mt-6 text-left">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-100 dark:bg-stone-700 rounded animate-pulse" style={{ width: `${70 + i * 5}%` }} />
                ))}
              </div>
            </div>
          )}

          {/* Paywall fallback */}
          {step === 'paywall' && (
            <div className="space-y-4">
              {/* Extracted metadata */}
              {preview && (
                <div className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 space-y-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Extracted from page</p>
                  {preview.title
                    ? <p className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-snug">{preview.title}</p>
                    : <p className="text-sm text-gray-400 italic">Title not found</p>
                  }
                  <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {preview.source && <span>{preview.source}</span>}
                    {preview.published_date && <span>{preview.published_date}</span>}
                  </div>
                </div>
              )}

              {/* Bookmarklet CTA — primary recommended path */}
              <div className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 space-y-2">
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Recommended: use the bookmarklet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The Alexandria bookmarklet captures the full article text directly from your browser — including from sites you&apos;re already logged in to.
                </p>
                <a
                  href="/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
                >
                  Set up the bookmarklet →
                </a>
              </div>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-gray-200 dark:border-stone-700" />
                <span className="px-3 text-xs text-gray-400 dark:text-gray-500">or add manually</span>
                <div className="flex-1 border-t border-gray-200 dark:border-stone-700" />
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                Paste the article text or upload a screenshot below to generate a summary.
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              {/* Paste text */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paste article text</label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={5}
                  placeholder="Paste the article body here…"
                  className="w-full border border-gray-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none dark:bg-stone-800 dark:text-stone-100"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Direction <span className="font-normal text-gray-400">（optional）</span>
                  </label>
                  <textarea
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    rows={2}
                    placeholder={'e.g. "Surface counterarguments" or "Facts and stats only"'}
                    className="w-full border border-gray-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none dark:bg-stone-800 dark:text-stone-100"
                  />
                </div>
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}
                  className="w-full bg-gray-900 text-white font-medium py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 text-sm"
                >
                  Summarize pasted text
                </button>
              </div>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-gray-200 dark:border-stone-700" />
                <span className="px-3 text-xs text-gray-400 dark:text-gray-500">or</span>
                <div className="flex-1 border-t border-gray-200 dark:border-stone-700" />
              </div>

              {/* Screenshot */}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleScreenshot(file)
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-stone-600 rounded-lg py-3 text-sm text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-stone-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Upload screenshot
                </button>
              </div>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-gray-200 dark:border-stone-700" />
                <span className="px-3 text-xs text-gray-400 dark:text-gray-500">or</span>
                <div className="flex-1 border-t border-gray-200 dark:border-stone-700" />
              </div>

              {/* Save without summary */}
              <button
                onClick={() => setStep('preview')}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-stone-100 py-2 rounded-lg border border-gray-200 dark:border-stone-700 hover:border-gray-400 dark:hover:border-stone-500 transition-colors"
              >
                Save without summary →
              </button>
            </div>
          )}

          {/* Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {preview.is_paywalled && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  Paywalled article — content extracted manually
                </div>
              )}
              {[
                { label: 'Title', key: 'title' as const, type: 'text' },
                { label: 'Source', key: 'source' as const, type: 'text' },
                { label: 'Published date', key: 'published_date' as const, type: 'date' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(preview[key] as string) ?? ''}
                    onChange={(e) => updatePreview(key, e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-stone-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:bg-stone-800 dark:text-stone-100"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  value={preview.category ?? ''}
                  onChange={(e) => updatePreview('category', e.target.value)}
                  list="add-categories-list"
                  placeholder="e.g. Technology"
                  className="w-full text-sm border border-gray-200 dark:border-stone-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:bg-stone-800 dark:text-stone-100"
                />
                <datalist id="add-categories-list">
                  {existingCategories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subcategory</label>
                <input
                  type="text"
                  value={preview.subcategory ?? ''}
                  onChange={(e) => updatePreview('subcategory', e.target.value)}
                  list="add-subcategories-list"
                  placeholder="e.g. AI"
                  className="w-full text-sm border border-gray-200 dark:border-stone-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:bg-stone-800 dark:text-stone-100"
                />
                <datalist id="add-subcategories-list">
                  {(preview.category && existingSubcategories[preview.category]
                    ? existingSubcategories[preview.category]
                    : Object.values(existingSubcategories).flat().filter((v, i, a) => a.indexOf(v) === i)
                  ).map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Key takeaways</label>
                <BulletList
                  bullets={preview.bullets}
                  onChange={(b) => updatePreview('bullets', b)}
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-stone-700 space-y-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Direction <span className="font-normal text-gray-400">（optional — reshapes the bullets）</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    placeholder={'e.g. "Counterarguments" or "Stats only"'}
                    className="flex-1 text-sm border border-gray-200 dark:border-stone-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:bg-stone-800 dark:text-stone-100"
                  />
                  <button
                    onClick={handleResummarize}
                    className="shrink-0 text-sm bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-medium px-3 py-2 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600"
                  >
                    Re-summarize
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && preview && (
          <div className="px-4 sm:px-6 py-4 border-t dark:border-stone-700 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-stone-600 text-gray-700 dark:text-gray-300 font-medium py-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gray-900 text-white font-medium py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
            >
              {saving ? 'Saving…' : 'Save to Library'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
