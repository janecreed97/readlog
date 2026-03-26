'use client'

interface Props {
  onClose: () => void
  onReplayTutorial: () => void
}

const sections = [
  {
    title: 'Adding an article',
    items: [
      'Click + Add article in the top bar. Paste any URL and hit Fetch & summarize — Alexandria pulls the text and generates key takeaways automatically.',
      'Use the Direction field to steer the AI before fetching — e.g. "Surface counterarguments" or "Facts and stats only". You can also re-summarize from the preview screen.',
      'Paywalled? Alexandria extracts what it can. You can paste the article text, upload a screenshot, or save without a summary.',
    ],
  },
  {
    title: 'Save from your browser (bookmarklet)',
    items: [
      'Go to Settings → Save from Browser and drag the button to your bookmarks bar.',
      'Click it on any article you\'re already reading — including paywalled ones you subscribe to — and a small window opens with the article pre-summarised.',
      'Sensitive sites (banking, email, health) are automatically blocked. The bookmarklet only runs when you click it and has no background access.',
      'Allow popups for Alexandria when your browser prompts you — the bookmarklet opens a save window.',
    ],
  },
  {
    title: 'Library views',
    items: [
      'Cards: the default grid view — each article as a card with category, takeaways, and a share button.',
      'Chronological: a timeline of everything you\'ve saved, newest first.',
      'By Topic: articles grouped by category and subcategory, useful for reviewing a theme.',
      'Your last-used view is remembered. Switch using the toggle above the article grid.',
    ],
  },
  {
    title: 'Filtering & search',
    items: [
      'Filter by category or subcategory using the pills at the top of the library. Click the active pill again (or All) to reset.',
      'Use the search bar to find articles by keyword — searches titles and key takeaways.',
    ],
  },
  {
    title: 'Editing an article',
    items: [
      'Click anywhere on a card (except the title link) to open the detail view.',
      'Click any field — title, source, date, category, subcategory — to edit it inline. A dropdown shows all existing values.',
      'Key takeaways can be edited, reordered by dragging, or deleted individually.',
      'Hit Save changes when done.',
    ],
  },
  {
    title: 'Friends & sharing',
    items: [
      'Go to Friends to find people by username (min 3 characters) and send a friend request.',
      'Once connected, open any article card and click the share icon to send it to one or more friends with an optional note.',
      'A badge on the Friends tab shows pending requests. Accept or decline directly on the Friends page.',
    ],
  },
  {
    title: 'Inbox',
    items: [
      'Articles shared with you by friends appear here. Unread items have an amber left border.',
      'Click Save to Library to add a shared article to your own collection.',
      'If you later delete that article, the Save to Library button reappears in your Inbox so you can save it again.',
      'Dismiss removes the item from your inbox without saving it.',
    ],
  },
  {
    title: 'Categories & subcategories',
    items: [
      'Alexandria auto-assigns a category and subcategory when summarising.',
      'Once you\'ve used a category or subcategory, it appears as a suggestion when adding or editing future articles — keeping your taxonomy consistent.',
    ],
  },
]

export default function HelpModal({ onClose, onReplayTutorial }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-stone-700">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">How to use Alexandria</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6 flex-1">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-2">{section.title}</h3>
              <ul className="space-y-1.5">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-gray-300 dark:text-gray-500 shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t dark:border-stone-700">
          <button
            onClick={() => { onClose(); onReplayTutorial() }}
            className="text-sm text-amber-700 dark:text-amber-400 hover:underline font-medium"
          >
            Replay getting started tutorial →
          </button>
        </div>
      </div>
    </div>
  )
}
