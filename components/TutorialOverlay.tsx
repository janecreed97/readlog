'use client'

import { useState, useEffect } from 'react'

interface Props {
  onDone: () => void
}

// Domain blocking is handled server-side — keeps the bookmarklet href short and readable
function buildBookmarkletHref(origin: string, key: string): string {
  return `javascript:(function(){var u=window.location.href;if(!confirm('Save to Alexandria?')){return;}var t=document.body.innerText;fetch('${origin}/api/fetch/bookmarklet',{method:'POST',headers:{'Content-Type':'application/json','X-Bookmarklet-Key':'${key}'},body:JSON.stringify({url:u,text:t})}).then(function(r){return r.json()}).then(function(d){if(d.error){alert('Alexandria: '+d.error);return;}var w=window.open('${origin}/add?token='+d.token,'alexandria','width=520,height=700,resizable=yes');if(!w){alert('Alexandria: allow popups for this site, then try again.');}}).catch(function(){alert('Alexandria: could not connect.');});})();`
}

const STEP_TITLES = [
  'Welcome to Alexandria',
  'Save articles',
  'Install the bookmarklet',
  'Browse your library',
  'Friends & sharing',
  'Inbox',
]

const STEP_BODIES = [
  'Alexandria is your personal article knowledge base — save anything from the web, summarise it with AI, and share it with friends. This tour covers everything in about a minute.',
  'Click + Add article in the top bar and paste any URL. Alexandria fetches the text and generates a summary and key takeaways automatically. Use the Direction field to steer the AI — e.g. "Surface counterarguments" or "Facts and stats only".',
  'The bookmarklet lets you save articles directly while reading them — including paywalled ones you subscribe to. Drag the button below to your bookmarks bar, then click it on any article page.',
  'Switch between three views — Cards, Chronological, and By Topic — using the toggle above the grid. Filter by category or subcategory using the pills, or search by keyword. Your last-used view is remembered.',
  'Go to Friends to find people by username and send a request. Once connected, open any article card and click the share icon to send it with an optional note.',
  'Articles shared with you appear in your Inbox, grouped by conversation. Save an article to your library, or dismiss it. If you later delete a saved article, the Save button reappears so you can save it again.',
]

export default function TutorialOverlay({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const [bookmarkletHref, setBookmarkletHref] = useState('#')
  const [bookmarkletReady, setBookmarkletReady] = useState(false)

  // Fetch bookmarklet key as early as possible
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
  }, [])

  const isLast = step === STEP_TITLES.length - 1

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-8 bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center">
          {STEP_TITLES.map((_, i) => (
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
            {STEP_TITLES[step]}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {STEP_BODIES[step]}
          </p>

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
