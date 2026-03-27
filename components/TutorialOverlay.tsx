'use client'

import { useState, useEffect } from 'react'

interface Props {
  onDone: () => void
}

// Domain blocking is handled server-side — keeps the bookmarklet href short and readable
function buildBookmarkletHref(origin: string, key: string): string {
  return `javascript:(function(){var u=window.location.href;if(!confirm('Save to Alexandria?')){return;}var t=document.body.innerText;fetch('${origin}/api/fetch/bookmarklet',{method:'POST',headers:{'Content-Type':'application/json','X-Bookmarklet-Key':'${key}'},body:JSON.stringify({url:u,text:t})}).then(function(r){return r.json()}).then(function(d){if(d.error){alert('Alexandria: '+d.error);return;}var w=window.open('${origin}/add?token='+d.token,'alexandria','width=520,height=700,resizable=yes');if(!w){alert('Alexandria: allow popups for this site, then try again.');}}).catch(function(){alert('Alexandria: could not connect.');});})();`
}

const STEPS = [
  {
    title: 'Welcome to Alexandria',
    body: 'Alexandria is your personal article knowledge base — save anything from the web, summarise it with AI, and share it with friends. This tour covers everything in about a minute.',
  },
  {
    title: 'Two ways to save articles',
    body: 'There are two ways to add articles:\n\n1. Paste a link — click + Add article in the top bar and paste any URL. Great for articles you\'ve already found.\n\n2. Bookmarklet — a one-click browser button that saves articles as you\'re reading them, including paywalled ones you subscribe to. You\'ll install it in the next step.',
  },
  {
    title: 'Install the bookmarklet',
    body: 'Drag the button below to your bookmarks bar. Then whenever you\'re reading an article, just click it — Alexandria will fetch the full text and summarise it automatically, even on paywalled sites like the FT or WSJ.',
  },
  {
    title: 'Browse your library',
    body: 'Switch between three views — Cards, Chronological, and By Topic — using the toggle above the grid. Filter by category or subcategory using the pills, or search by keyword. Your last-used view is remembered.',
  },
  {
    title: 'Friends & sharing',
    body: 'Go to Friends to find people by username and send a request. Once connected, open any article card and click the share icon to send it with an optional note.',
  },
  {
    title: 'Inbox',
    body: 'Articles shared with you appear in your Inbox, grouped by conversation. React with an emoji, leave a comment, save an article to your library, or dismiss it. If you later delete a saved article, the Save button reappears.',
  },
  {
    title: 'Stay in the loop',
    body: 'Turn on email notifications to get an email at your account address whenever a friend shares an article with you. You can change this any time in Settings.',
  },
]

export default function TutorialOverlay({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const [bookmarkletHref, setBookmarkletHref] = useState('#')
  const [bookmarkletReady, setBookmarkletReady] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [savingNotif, setSavingNotif] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)

  // Fetch bookmarklet key and current notification preference
  useEffect(() => {
    const origin = window.location.origin
    fetch('/api/user/key')
      .then(r => r.json())
      .then(d => {
        if (d.key) {
          setBookmarkletHref(buildBookmarkletHref(origin, d.key))
          setBookmarkletReady(true)
        }
      })
      .catch(() => {})

    fetch('/api/profile')
      .then(r => r.json())
      .then(p => {
        if (p?.id) setEmailNotifications(p.email_notifications ?? false)
      })
      .catch(() => {})
  }, [])

  async function toggleNotifications() {
    const next = !emailNotifications
    setEmailNotifications(next)
    setSavingNotif(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_notifications: next }),
      })
      if (res.ok) {
        setNotifSaved(true)
      } else {
        setEmailNotifications(!next)
      }
    } catch {
      setEmailNotifications(!next)
    } finally {
      setSavingNotif(false)
    }
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-8 bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`inline-block rounded-full transition-all ${
                i === step
                  ? 'w-4 h-1.5 bg-stone-900 dark:bg-stone-100'
                  : i < step
                  ? 'w-1.5 h-1.5 bg-stone-400 dark:bg-stone-500'
                  : 'w-1.5 h-1.5 bg-gray-200 dark:bg-stone-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            {STEPS[step].title}
          </h2>

          {/* Step 1: two methods — render with styled callouts */}
          {step === 1 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                There are two ways to add articles:
              </p>
              <div className="flex gap-3 bg-stone-50 dark:bg-stone-800 rounded-xl p-3 border border-stone-200 dark:border-stone-700">
                <span className="text-lg leading-none mt-0.5">🔗</span>
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Paste a link</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Click <strong>+ Add article</strong> in the top bar and paste any URL. Great for articles you&apos;ve already found.</p>
                </div>
              </div>
              <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                <span className="text-lg leading-none mt-0.5">🔖</span>
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Bookmarklet</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">A one-click browser button that saves as you read — including paywalled sites you subscribe to. Install it in the next step.</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {STEPS[step].body}
            </p>
          )}

          {/* Bookmarklet install — step 2 only */}
          {step === 2 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-stone-700 space-y-2">
              {bookmarkletReady ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Drag this button to your bookmarks bar:
                  </p>
                  <a
                    href={bookmarkletHref}
                    onClick={(e) => e.preventDefault()}
                    draggable
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg text-sm font-medium text-amber-800 dark:text-amber-300 cursor-grab active:cursor-grabbing select-none"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 8.5h10M8 3.5v10M3 3.5h10v9a1 1 0 01-1 1H4a1 1 0 01-1-1v-9z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Save to Alexandria
                  </a>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    On mobile, you can find this button in Settings → Save from Browser.
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span className="animate-spin inline-block w-3 h-3 border border-gray-300 border-t-stone-500 rounded-full" />
                  Loading bookmarklet…
                </div>
              )}
            </div>
          )}

          {/* Email notifications toggle — last step only */}
          {step === STEPS.length - 1 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-stone-700">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Email notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {notifSaved && emailNotifications
                      ? '✓ Saved — you\'ll get an email when friends share articles'
                      : 'Get an email when a friend shares an article with you'}
                  </p>
                </div>
                <button
                  onClick={toggleNotifications}
                  disabled={savingNotif}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
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
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onDone}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                Back
              </button>
            )}
            <button
              onClick={() => isLast ? onDone() : setStep(s => s + 1)}
              className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 font-medium"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
