'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const [origin, setOrigin] = useState('')
  const [bookmarkletKey, setBookmarkletKey] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [profile, setProfile] = useState<{ display_name: string; username: string; email_notifications?: boolean } | null>(null)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [savingNotif, setSavingNotif] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      // Fetch (or auto-create) the personal bookmarklet key
      fetch('/api/user/key').then((r) => r.json()).then((d) => {
        if (d.key) setBookmarkletKey(d.key)
      })
      // Fetch profile
      fetch('/api/profile').then(r => r.json()).then(p => {
        if (p?.id) {
          setProfile(p)
          setEmailNotifications(p.email_notifications ?? false)
        }
      })
    })
  }, [router])

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') setTheme('dark')
    else if (stored === 'light') setTheme('light')
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark')
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    if (next === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  async function toggleEmailNotifications() {
    const next = !emailNotifications
    setEmailNotifications(next)
    setSavingNotif(true)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_notifications: next }),
      })
    } catch {
      // Revert on failure
      setEmailNotifications(!next)
    } finally {
      setSavingNotif(false)
    }
  }

  // Minified bookmarklet — domain blocking is handled server-side so the href stays short and readable
  const bookmarklet = (origin && bookmarkletKey)
    ? `javascript:(function(){var u=window.location.href;if(!confirm('Save to Alexandria?')){return;}var t=document.body.innerText;fetch('${origin}/api/fetch/bookmarklet',{method:'POST',headers:{'Content-Type':'application/json','X-Bookmarklet-Key':'${bookmarkletKey}'},body:JSON.stringify({url:u,text:t})}).then(function(r){return r.json()}).then(function(d){if(d.error){alert('Alexandria: '+d.error);return;}var w=window.open('${origin}/add?token='+d.token,'alexandria','width=520,height=700,resizable=yes');if(!w){alert('Alexandria: popup was blocked. Please allow popups for this site, then try again.');}}).catch(function(){alert('Alexandria: could not connect.');});})();`
    : '#'

  const ready = origin && bookmarkletKey

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-1">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure Alexandria for your workflow.</p>
        </div>

        {/* Profile section */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-gray-200 dark:border-stone-700 p-6">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-4">Profile</h2>
          {profile ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{profile.display_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">@{profile.username}</p>
              </div>
              <a href="/profile/setup" className="text-sm text-amber-700 dark:text-amber-400 hover:underline font-medium">Edit</a>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">No profile set up yet.</p>
              <a href="/profile/setup" className="text-sm text-amber-700 dark:text-amber-400 hover:underline font-medium">Set up profile →</a>
            </div>
          )}
        </section>

        {/* Notifications section */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-gray-200 dark:border-stone-700 p-6">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-4">Notifications</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Email when someone shares an article</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Get an email at your account address whenever a friend sends you something
              </p>
            </div>
            <button
              onClick={toggleEmailNotifications}
              disabled={savingNotif || !profile}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                emailNotifications ? 'bg-amber-500' : 'bg-gray-200 dark:bg-stone-700'
              }`}
              aria-label="Toggle email notifications"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Bookmarklet section */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-gray-200 dark:border-stone-700 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">Save from Browser</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3v11m0 0l-4-4m4 4l4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Save to Alexandria
                </a>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400 pt-1">
                <p className="font-medium text-stone-900 dark:text-stone-100 mb-1">Drag this button to your bookmarks bar.</p>
                <p>Then click it on any article you want to save — including paywalled ones you&apos;re already logged in to.</p>
              </div>
            </div>

            <div className="bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
              <p className="font-medium text-stone-900 dark:text-stone-100 text-xs uppercase tracking-wide">How it works</p>
              <ol className="space-y-1 list-decimal list-inside text-xs">
                <li>Open any article in your browser — including paywalled ones you subscribe to</li>
                <li>Click <span className="font-medium text-stone-900 dark:text-stone-100">Save to Alexandria</span> in your bookmarks bar</li>
                <li>A small Alexandria window opens with the article already summarised</li>
                <li>Review, edit if needed, and click Save — then return to reading</li>
              </ol>
            </div>

            {/* Popup permission notice */}
            <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
              <span className="text-amber-500 text-base shrink-0">⚠️</span>
              <div className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                <p className="font-semibold">Allow popups for Alexandria</p>
                <p>The bookmarklet opens a small save window. Your browser may block it by default. When prompted, choose <span className="font-medium">"Always allow popups from [your Alexandria URL]"</span>.</p>
                <p className="text-amber-600 dark:text-amber-400">If nothing appears after clicking the bookmarklet, check for a blocked popup icon in your browser&apos;s address bar.</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              The bookmarklet only runs when you click it. It has no background access and cannot see other tabs. Sensitive sites (banking, email, health) are automatically blocked.
            </p>
          </div>
        </section>

        {/* Appearance section */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-gray-200 dark:border-stone-700 p-6">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Dark mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Switch between light and dark interface</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                theme === 'dark' ? 'bg-stone-700' : 'bg-gray-200'
              }`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
