'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

export default function SettingsPage() {
  const router = useRouter()
  const [origin, setOrigin] = useState('')
  const [bookmarkletKey, setBookmarkletKey] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      // Fetch (or auto-create) the personal bookmarklet key
      fetch('/api/user/key').then((r) => r.json()).then((d) => {
        if (d.key) setBookmarkletKey(d.key)
      })
    })
  }, [router])

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  // Minified bookmarklet — embeds personal API key so it works cross-origin without cookies
  const bookmarklet = (origin && bookmarkletKey)
    ? `javascript:(function(){var u=window.location.href;var t=document.body.innerText;fetch('${origin}/api/fetch/bookmarklet',{method:'POST',headers:{'Content-Type':'application/json','X-Bookmarklet-Key':'${bookmarkletKey}'},body:JSON.stringify({url:u,text:t})}).then(function(r){return r.json()}).then(function(d){if(d.error){alert('Alexandria: '+d.error);return;}window.open('${origin}/add?token='+d.token,'alexandria','width=520,height=700,resizable=yes');}).catch(function(){alert('Alexandria: could not connect.');});})();`
    : '#'

  const ready = origin && bookmarkletKey

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="h-12 sm:h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2">
                <Logo size={22} />
                <span className="font-bold text-stone-900">ALEXANDRIA</span>
              </div>
              <nav className="hidden sm:flex gap-4 text-sm">
                <a href="/" className="text-gray-500 hover:text-gray-800">Library</a>
                <a href="/outline" className="text-gray-500 hover:text-gray-800">Outline</a>
                <a href="/settings" className="text-stone-900 font-medium">Settings</a>
              </nav>
            </div>
            <button onClick={handleSignOut} className="hidden sm:block text-sm text-gray-400 hover:text-gray-700">
              Sign out
            </button>
          </div>
          <div className="sm:hidden flex border-t border-gray-100">
            <a href="/" className="flex-1 text-center text-xs font-medium py-2 text-gray-400">Library</a>
            <a href="/outline" className="flex-1 text-center text-xs font-medium py-2 text-gray-400">Outline</a>
            <a href="/settings" className="flex-1 text-center text-xs font-medium py-2 text-stone-900 border-b-2 border-stone-900">Settings</a>
            <button onClick={handleSignOut} className="px-4 text-xs text-gray-400 hover:text-gray-600 border-l border-gray-100">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div>
          <h1 className="text-xl font-bold text-stone-900 mb-1">Settings</h1>
          <p className="text-sm text-gray-500">Configure Alexandria for your workflow.</p>
        </div>

        {/* Bookmarklet section */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-stone-900 mb-1">Save from Browser</h2>
            <p className="text-sm text-gray-500">
              The Alexandria bookmarklet lets you save articles directly from your browser — even from sites you subscribe to, like the FT or WSJ. It reads the full article text from your already-authenticated browser session.
            </p>
          </div>

          {/* Draggable bookmarklet button */}
          <div className="space-y-3">
            <div className="flex items-start gap-4">
              {!ready ? (
                <div className="inline-flex items-center gap-2 bg-gray-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg shrink-0 animate-pulse">
                  <span className="w-20 h-4 bg-white/30 rounded" />
                </div>
              ) : (
                <a
                  href={bookmarklet}
                  onClick={(e) => e.preventDefault()}
                  draggable
                  className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg cursor-grab active:cursor-grabbing select-none shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
                    <polygon points="16,2 4,9 28,9" fill="white"/>
                    <rect x="4" y="9" width="24" height="2.5" fill="white"/>
                    <rect x="5" y="11.5" width="2.5" height="10" fill="white"/>
                    <rect x="10" y="11.5" width="2.5" height="10" fill="white"/>
                    <rect x="14.75" y="11.5" width="2.5" height="10" fill="white"/>
                    <rect x="19.5" y="11.5" width="2.5" height="10" fill="white"/>
                    <rect x="24.5" y="11.5" width="2.5" height="10" fill="white"/>
                    <rect x="3" y="21.5" width="26" height="2" fill="white"/>
                    <rect x="1.5" y="23.5" width="29" height="2" fill="white"/>
                    <rect x="0" y="25.5" width="32" height="2.5" fill="white"/>
                  </svg>
                  Save to Alexandria
                </a>
              )}
              <div className="text-sm text-gray-500 pt-1">
                <p className="font-medium text-stone-900 mb-1">Drag this button to your bookmarks bar.</p>
                <p>Then click it on any article you want to save — including paywalled ones you're already logged in to.</p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-lg border border-stone-200 px-4 py-3 space-y-1.5 text-sm text-gray-600">
              <p className="font-medium text-stone-900 text-xs uppercase tracking-wide">How it works</p>
              <ol className="space-y-1 list-decimal list-inside text-xs">
                <li>Open any article in your browser — including paywalled ones you subscribe to</li>
                <li>Click <span className="font-medium text-stone-900">Save to Alexandria</span> in your bookmarks bar</li>
                <li>A small Alexandria window opens with the article already summarised</li>
                <li>Review, edit if needed, and click Save — then return to reading</li>
              </ol>
            </div>

            <p className="text-xs text-gray-400">
              The bookmarklet only runs when you click it. It has no background access and cannot see other tabs.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
