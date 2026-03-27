'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import BulletList from '@/components/BulletList'
import Logo from '@/components/Logo'
import type { ArticlePreview } from '@/lib/types'

type Step = 'loading' | 'preview' | 'paywall' | 'saving' | 'saved' | 'error'

function ShareContent() {
  const params = useSearchParams()
  const router = useRouter()

  // Web Share Target sends url, text, title as GET params.
  // Some apps put the URL in "text" instead of "url".
  const rawUrl = params.get('url') || ''
  const rawText = params.get('text') || ''
  const sharedUrl = rawUrl || (rawText.startsWith('http') ? rawText : '')

  const [step, setStep] = useState<Step>('loading')
  const [preview, setPreview] = useState<ArticlePreview | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  useEffect(() => {
    if (!sharedUrl) {
      setError('No URL received. Try sharing again from your browser.')
      setStep('error')
      return
    }
    fetchArticle(sharedUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedUrl])

  async function fetchArticle(url: string) {
    setStep('loading')
    setError('')
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch article')
      setPreview(data)
      setStep(data.is_paywalled ? 'paywall' : 'preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('error')
    }
  }

  async function handlePasteSubmit() {
    if (!pasteText.trim()) return
    setStep('loading')
    setError('')
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sharedUrl, pasteText: pasteText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to summarize')
      setPreview({ ...data, is_paywalled: true })
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('paywall')
    }
  }

  async function handleSave() {
    if (!preview) return
    setStep('saving')
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...preview, is_private: isPrivate }),
    })
    if (res.ok) {
      setStep('saved')
      setTimeout(() => router.push('/'), 1800)
    } else {
      setError('Failed to save. Please try again.')
      setStep('preview')
    }
  }

  function updatePreview(key: keyof ArticlePreview, value: string | string[] | boolean) {
    setPreview((p) => p ? { ...p, [key]: value } : p)
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-stone-900 border-b border-gray-200 dark:border-stone-700 sticky top-0 z-40">
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">ALEXANDRIA</span>
          </div>
          <a href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            Library
          </a>
        </div>
      </header>

      {/* Loading */}
      {step === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-12">
          <div className="animate-spin w-8 h-8 border-2 border-stone-900 dark:border-stone-300 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Fetching and summarizing…</p>
          <div className="w-full max-w-sm space-y-2 mt-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-4 bg-gray-100 dark:bg-stone-800 rounded animate-pulse"
                style={{ width: `${60 + i * 9}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {step === 'error' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-xs">
            <p className="text-stone-900 dark:text-stone-100 font-medium">Something went wrong</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-amber-700 dark:text-amber-400 hover:underline"
            >
              Go to Library
            </button>
          </div>
        </div>
      )}

      {/* Saved */}
      {step === 'saved' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto">
              <span className="text-2xl text-stone-900 dark:text-stone-100">✓</span>
            </div>
            <p className="text-base font-semibold text-stone-900 dark:text-stone-100">Saved to Library</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Taking you back…</p>
          </div>
        </div>
      )}

      {/* Paywall — paste screen */}
      {step === 'paywall' && (
        <div className="flex-1 flex flex-col px-4 py-5 max-w-xl mx-auto w-full space-y-4">
          {/* Extracted metadata card */}
          {preview && (preview.title || preview.source) && (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 px-4 py-3 space-y-0.5">
              {preview.title && (
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-snug">{preview.title}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {preview.source}{preview.published_date ? ` · ${preview.published_date}` : ''}
              </p>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Paywalled article</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Open the article in its publisher app, select all the text, copy it, then paste it below.
            </p>
          </div>

          <div className="flex-1 flex flex-col space-y-3">
            <label className="text-sm font-medium text-stone-900 dark:text-stone-100">
              Paste article text
            </label>
            <textarea
              autoFocus
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the full article text here…"
              className="w-full min-h-[220px] border border-gray-300 dark:border-stone-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="space-y-2 pb-4">
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="w-full bg-gray-900 text-white font-medium py-3.5 rounded-xl hover:bg-gray-700 disabled:opacity-40 text-sm"
            >
              Summarize &amp; preview
            </button>
            <button
              onClick={() => {
                if (!preview) setPreview({ title: '', source: '', published_date: null, category: '', subcategory: '', bullets: [], is_paywalled: true, is_private: false, url: sharedUrl })
                setStep('preview')
              }}
              className="w-full text-sm text-gray-500 dark:text-gray-400 py-3 rounded-xl border border-gray-200 dark:border-stone-700 hover:border-gray-400 dark:hover:border-stone-500"
            >
              Save without summary
            </button>
          </div>
        </div>
      )}

      {/* Preview / saving */}
      {(step === 'preview' || step === 'saving') && preview && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 px-4 py-5 space-y-4 max-w-xl mx-auto w-full overflow-y-auto">
            {preview.is_paywalled && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                Paywalled — content extracted manually
              </div>
            )}

            {([
              { label: 'Title', key: 'title', type: 'text' },
              { label: 'Source', key: 'source', type: 'text' },
              { label: 'Published date', key: 'published_date', type: 'date' },
              { label: 'Category', key: 'category', type: 'text' },
              { label: 'Subcategory', key: 'subcategory', type: 'text' },
            ] as const).map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {label}
                </label>
                <input
                  type={type}
                  value={(preview[key] as string) ?? ''}
                  onChange={(e) => updatePreview(key, e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Key takeaways
              </label>
              <BulletList
                bullets={preview.bullets}
                onChange={(b) => updatePreview('bullets', b)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {/* Sticky save button */}
          <div className="sticky bottom-0 px-4 pb-6 pt-3 bg-stone-50 dark:bg-stone-950 border-t border-gray-200 dark:border-stone-700">
            <div className="max-w-xl mx-auto space-y-3">
              {/* Privacy toggle */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {isPrivate ? '🔒 Private' : '🌐 Public'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {isPrivate ? 'Only you can see this' : 'Visible on your profile'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivate(p => !p)}
                  className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none ${isPrivate ? 'bg-stone-300 dark:bg-stone-600' : 'bg-amber-500'}`}
                  aria-label={isPrivate ? 'Make public' : 'Make private'}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isPrivate ? 'left-1' : 'left-5'}`} />
                </button>
              </div>
              <button
                onClick={handleSave}
                disabled={step === 'saving'}
                className="w-full bg-gray-900 text-white font-semibold py-4 rounded-xl hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                {step === 'saving' ? 'Saving…' : 'Save to Library'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SharePage() {
  return (
    <Suspense>
      <ShareContent />
    </Suspense>
  )
}
