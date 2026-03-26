'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

// Pages that render their own full-screen layout (no shared nav)
const HIDDEN_PATHS = ['/login', '/profile/setup', '/add']

export default function HeaderNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [inboxCount, setInboxCount] = useState(0)
  const [friendsCount, setFriendsCount] = useState(0)

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

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  if (HIDDEN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return null

  const isLibrary = pathname === '/'
  const isFriends = pathname === '/friends'
  const isInbox = pathname === '/inbox'
  const isSettings = pathname === '/settings'

  function navCls(active: boolean) {
    return active
      ? 'text-stone-900 dark:text-stone-100 font-medium'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
  }

  function tabCls(active: boolean) {
    return `flex-1 text-center text-xs font-medium py-2 ${
      active
        ? 'text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100'
        : 'text-gray-400 dark:text-gray-500'
    }`
  }

  return (
    <header className="bg-white dark:bg-stone-900 border-b border-gray-200 dark:border-stone-700 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-12 sm:h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Logo size={22} />
              <span className="font-bold text-stone-900 dark:text-stone-100">ALEXANDRIA</span>
            </Link>
            <nav className="hidden sm:flex gap-4 text-sm">
              <Link href="/" className={navCls(isLibrary)}>Library</Link>
              <Link href="/friends" className={`relative ${navCls(isFriends)}`}>
                Friends
                {friendsCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 font-medium leading-none">
                    {friendsCount}
                  </span>
                )}
              </Link>
              <Link href="/inbox" className={`relative ${navCls(isInbox)}`}>
                Inbox
                {inboxCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 font-medium leading-none">
                    {inboxCount}
                  </span>
                )}
              </Link>
              <Link href="/settings" className={navCls(isSettings)}>Settings</Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLibrary && (
              <>
                <button
                  onClick={() => window.dispatchEvent(new Event('alexandria:add'))}
                  className="bg-gray-900 text-white text-sm font-medium px-3 sm:px-4 py-1.5 rounded-lg hover:bg-gray-700"
                >
                  <span className="sm:hidden">+</span>
                  <span className="hidden sm:inline">+ Add article</span>
                </button>
                <button
                  onClick={() => window.dispatchEvent(new Event('alexandria:help'))}
                  className="hidden sm:flex items-center justify-center w-6 h-6 rounded-md border border-gray-300 dark:border-stone-600 text-xs text-gray-400 dark:text-gray-500 hover:border-gray-500 dark:hover:border-stone-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Help"
                >
                  ?
                </button>
              </>
            )}
            <button
              onClick={handleSignOut}
              className="hidden sm:block text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="sm:hidden flex border-t border-gray-100 dark:border-stone-800">
          <Link href="/" className={tabCls(isLibrary)}>Library</Link>
          <Link href="/friends" className={tabCls(isFriends)}>
            Friends{friendsCount > 0 && <span className="ml-0.5 text-amber-500">·</span>}
          </Link>
          <Link href="/inbox" className={tabCls(isInbox)}>
            Inbox{inboxCount > 0 && <span className="ml-0.5 text-amber-500">·</span>}
          </Link>
          <Link href="/settings" className={tabCls(isSettings)}>Settings</Link>
          <button
            onClick={handleSignOut}
            className="px-3 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border-l border-gray-100 dark:border-stone-800"
          >
            Out
          </button>
        </div>
      </div>
    </header>
  )
}
