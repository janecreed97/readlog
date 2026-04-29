'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import BulletList from '@/components/BulletList'
import Logo from '@/components/Logo'
import type { ArticlePreview } from '@/lib/types'

function AddContent() {
  const params = useSearchParams()
  const token = params.get('token')

  const [preview, setPreview] = useState<ArticlePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!token) { setError('No token provided.'); setLoading(false); return }
    fetch(`/api/fetch/token?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setPreview(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  function updatePreview(key: keyof ArticlePreview, value: string | string[] | boolean) {
    setPreview((p) => p ? { ...p, [key]: value } : p)
  }

  async function handleSave() {
    if (!preview) return
    setSaving(true)
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preview), // _tokenId included in preview, articles route strips it
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => window.close(), 1500)
    } else {
      setError('Failed to save — please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 dark:border-stone-700 dark:bg-stone-900">
        <Logo size={18} />
        <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">ALEXANDRIA</span>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="animate-spin w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Summarizing article…</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={() => window.close()} className="text-sm text-gray-400 hover:text-gray-700">
              Close window
            </button>
          </div>
        </div>
      )}

      {!loading && saved && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <p className="text-2xl text-stone-900 dark:text-stone-100">✓</p>
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Saved to Alexandria</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">This window will close shortly.</p>
          </div>
        </div>
      )}

      {!loading && !error && !saved && preview && (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {([
              { label: 'Title', key: 'title', type: 'text' },
              { label: 'Source', key: 'source', type: 'text' },
              { label: 'Category', key: 'category', type: 'text' },
              { label: 'Subcategory', key: 'subcategory', type: 'text' },
              { label: 'Published date', key: 'published_date', type: 'date' },
            ] as const).map(({ label, key, type }) => (
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
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Key takeaways</label>
              <BulletList
                bullets={preview.bullets}
                onChange={(b) => updatePreview('bullets', b)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="px-5 py-4 border-t border-gray-200 dark:border-stone-700 dark:bg-stone-950">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save to Alexandria'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function AddPage() {
  return (
    <Suspense>
      <AddContent />
    </Suspense>
  )
}
