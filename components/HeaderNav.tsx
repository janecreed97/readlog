'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import HelpModal from '@/components/HelpModal'
import TutorialOverlay from '@/components/TutorialOverlay'

// Pages that render their own full-screen layout (no shared nav)
const HIDDEN_PATHS = ['/login', '/profile/setup', '/add']

export default function HeaderNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [inboxCount, setInboxCount] = useState(0)
  const [friendsCount, setFriendsCount] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  // Refresh badges on each navigation
  useEffect(() => {
    fetch('/api/inbox?unread=true')
      .then(r => r.json())
      .then(data => { if (typeof data?.count === 'number') setInboxCount(data.count) })
      .catch(() => {})
    fetch('/api/friends/requests')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setFriendsCount(data.length) })
      .catch(() => {})
  }, [pathname])

  // Show tutorial on first ever visit
  useEffect(() => {
    try {
      if (!localStorage.getItem('alexandria-tutorial-seen')) {
        setShowTutorial(true)
      }
    } catch {}
  }, [])

  // Listen for help events dispatched by other pages
  useEffect(() => {
    const onHelp = () => setShowHelp(true)
    window.addEventListener('alexandria:help', onHelp)
    return () => window.removeEventListener('alexandria:help', onHelp)
  }, [])

  function handleTutorialDone() {
    try { localStorage.setItem('alexandria-tutorial-seen', '1') } catch {}
    setShowTutorial(false)
  }

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  if (HIDDEN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return null

  const isLibrary  = pathname === '/'
  const isFeed     = pathname === '/feed'
  const isFriends  = pathname === '/friends'
  const isInbox    = pathname === '/inbox'
  const isSettings = pathname === '/settings'

  function navCls(active: boolean) {
    return active
      ? 'text-stone-900 dark:text-stone-100 font-medium'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
  }

  function tabCls(active: boolean) {
    return `flex-1 text-center text-xs font-medium py-2.5 ${
      active
        ? 'text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100'
        : 'text-gray-400 dark:text-gray-500'
    }`
  }

  return (
    <>
      <header className="bg-white dark:bg-stone-900 border-b border-gray-200 dark:border-stone-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-12 sm:h-14 flex items-center justify-between gap-2">
            {/* Left: logo + desktop nav */}
            <div className="flex items-center gap-3 sm:gap-6">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Logo size={22} />
                <span className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">ALEXANDRIA</span>
              </Link>
              <nav className="hidden sm:flex gap-4 text-sm">
                <Link href="/" className={navCls(isLibrary)}>Library</Link>
                <Link href="/feed" className={navCls(isFeed)}>Feed</Link>
                <Link href="/friends" className={navCls(isFriends)}>
                  Friends
                  {friendsCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 font-medium leading-none">
                      {friendsCount}
                    </span>
                  )}
                </Link>
                <Link href="/inbox" className={navCls(isInbox)}>
                  Inbox
                  {inboxCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 font-medium leading-none">
                      {inboxCount}
                    </span>
                  )}
                </Link>
              </nav>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {isLibrary && (
                <button
                  onClick={() => window.dispatchEvent(new Event('alexandria:add'))}
                  className="bg-gray-900 text-white text-sm font-medium px-3 sm:px-4 py-1.5 rounded-lg hover:bg-gray-700"
                >
                  <span className="sm:hidden">+</span>
                  <span className="hidden sm:inline">+ Add article</span>
                </button>
              )}
              {/* Settings gear */}
              <Link
                href="/settings"
                aria-label="Settings"
                className={`flex items-center justify-center w-7 h-7 rounded-md border transition-colors ${
                  isSettings
                    ? 'border-stone-400 dark:border-stone-500 text-stone-700 dark:text-stone-300'
                    : 'border-gray-300 dark:border-stone-600 text-gray-400 dark:text-gray-500 hover:border-gray-500 dark:hover:border-stone-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </Link>
              {/* Help */}
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-300 dark:border-stone-600 text-xs text-gray-400 dark:text-gray-500 hover:border-gray-500 dark:hover:border-stone-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Help"
              >
                ?
              </button>
              <button
                onClick={handleSignOut}
                className="hidden sm:block text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Mobile tab bar — Library / Feed / Friends / Inbox */}
          <div className="sm:hidden flex border-t border-gray-100 dark:border-stone-800">
            <Link href="/" className={tabCls(isLibrary)}>Library</Link>
            <Link href="/feed" className={tabCls(isFeed)}>Feed</Link>
            <Link href="/friends" className={tabCls(isFriends)}>
              Friends{friendsCount > 0 && <span className="ml-0.5 text-amber-500">·</span>}
            </Link>
            <Link href="/inbox" className={tabCls(isInbox)}>
              Inbox{inboxCount > 0 && <span className="ml-0.5 text-amber-500">·</span>}
            </Link>
          </div>
        </div>
      </header>

      {showHelp && (
        <HelpModal
          onClose={() => setShowHelp(false)}
          onReplayTutorial={() => setShowTutorial(true)}
        />
      )}
      {showTutorial && <TutorialOverlay onDone={handleTutorialDone} />}
    </>
  )
}
