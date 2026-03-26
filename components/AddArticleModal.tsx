'use client'

import { useState, useRef } from 'react'
import BulletList from './BulletList'
import type { ArticlePreview } from '@/lib/types'

interface Props {
  onClose: () => void
  onSaved: () => void
  existingCategories: string[]
}

type Step = 'url' | 'loading' | 'preview' | 'paywall'

export default function AddArticleModal({ onClose, onSaved, existingCategories }: Props) {
  const [step, setStep] = useState<Step>('url')
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<ArticlePreview | null>(null)
  const [pasteText, setPasteText] = useState('')
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
        body: JSON.stringify({ url: url.trim() }),
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
        body: JSON.stringify({ url: url.trim(), pasteText: pasteText.trim() }),
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

  function updatePreview(key: keyof ArticlePreview, value: string | string[] | boolean) {
    setPreview((p) => p ? { ...p, [key]: value } : p)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">
            {step === 'preview' ? 'Review & save' : 'Add article'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>

        <div className="px-6 py-5">
          {/* URL input */}
          {step === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Article URL</label>
                <input
                  autoFocus
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              <p className="text-sm text-gray-500">Fetching and summarizing…</p>
              {/* Skeleton */}
              <div className="space-y-2 mt-6 text-left">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + i * 5}%` }} />
                ))}
              </div>
            </div>
          )}

          {/* Paywall fallback */}
          {step === 'paywall' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                This article appears to be paywalled. Paste the text or upload a screenshot to continue.
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paste article text</label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={6}
                  placeholder="Paste the article body here…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}
                  className="mt-2 w-full bg-gray-900 text-white font-medium py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 text-sm"
                >
                  Summarize pasted text
                </button>
              </div>
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-gray-200" />
                <span className="px-3 text-xs text-gray-400">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
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
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
                >
                  Upload screenshot
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {preview.is_paywalled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  Paywalled article — content extracted manually
                </div>
              )}
              {[
                { label: 'Title', key: 'title' as const, type: 'text' },
                { label: 'Source', key: 'source' as const, type: 'text' },
                { label: 'Category', key: 'category' as const, type: 'text' },
                { label: 'Subcategory', key: 'subcategory' as const, type: 'text' },
                { label: 'Published date', key: 'published_date' as const, type: 'date' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(preview[key] as string) ?? ''}
                    onChange={(e) => updatePreview(key, e.target.value)}
                    list={key === 'category' ? 'categories-list' : undefined}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              ))}
              <datalist id="categories-list">
                {existingCategories.map((c) => <option key={c} value={c} />)}
              </datalist>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Key takeaways</label>
                <BulletList
                  bullets={preview.bullets}
                  onChange={(b) => updatePreview('bullets', b)}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && preview && (
          <div className="px-6 py-4 border-t flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 text-sm"
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
