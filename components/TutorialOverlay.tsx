'use client'

interface Props {
  onDone: () => void
}

const steps = [
  {
    title: 'Welcome to Alexandria',
    body: 'Alexandria is your personal article knowledge base — save anything from the web, summarise it with AI, and share it with friends. This tour covers everything in about a minute.',
  },
  {
    title: 'Saving an article',
    body: 'Click + Add article in the top bar and paste any URL. Alexandria fetches the text and generates a summary and key takeaways automatically. Use the Direction field to steer the AI — e.g. "Surface counterarguments" or "Facts and stats only".',
  },
  {
    title: 'Save from your browser',
    body: 'Install the bookmarklet from Settings → Save from Browser. Click it on any article you\'re already reading — including paywalled ones — and a small Alexandria window opens with the article pre-summarised. No copy-pasting required.',
  },
  {
    title: 'Browse your library',
    body: 'Switch between three views: Cards (grid), Chronological (timeline), and By Topic (grouped by category). Filter by category or subcategory using the pills at the top, or search by keyword. Your last-used view is remembered.',
  },
  {
    title: 'Friends & sharing',
    body: 'Go to Friends to find people by username and send requests. Once connected, open any article card and click the share icon to send it to one or more friends with an optional note.',
  },
  {
    title: 'Inbox',
    body: 'Articles shared with you appear in your Inbox. Unread items are highlighted. Click Save to Library to add an article to your own collection, or Dismiss to remove it. If you later delete a saved article, you can re-save it from Inbox anytime.',
  },
]

export default function TutorialOverlay({ onDone }: Props) {
  // step tracked in parent via index — we manage it locally here
  const [step, setStep] = useState(0)
  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-8 bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center">
          {steps.map((_, i) => (
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
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{current.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{current.body}</p>
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

// useState imported separately so the file stays self-contained
import { useState } from 'react'
