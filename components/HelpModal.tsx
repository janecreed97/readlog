'use client'

interface Props {
  onClose: () => void
}

const sections = [
  {
    title: 'Adding an article',
    items: [
      'Click + (or + Add article) in the top bar.',
      'Paste any article URL and hit Fetch & summarize — Alexandria will pull the text and generate key takeaways automatically.',
      'Paywalled? Alexandria will extract what it can from the page (title, source, date). You can then paste the article text, upload a screenshot, or save without a summary.',
      'Optional Direction field: tell the summary engine how to approach the article before fetching — e.g. "Surface counterarguments" or "Facts and stats only". You can also re-summarize from the preview screen after changing the direction.',
    ],
  },
  {
    title: 'Library',
    items: [
      'All saved articles appear here as cards.',
      'Click the article title to open it in a new tab.',
      'Click anywhere else on a card to open the detail view.',
      'Filter by category or subcategory using the pills at the top. Click All to reset.',
      'Use the search bar to find articles by keyword.',
    ],
  },
  {
    title: 'Editing an article',
    items: [
      'Open a card, then click any field (title, source, date, category, subcategory) to edit it inline.',
      'Key takeaways can be edited, reordered by dragging, or deleted individually.',
      'Hit Save changes when done — the modal closes automatically.',
    ],
  },
  {
    title: 'Categories & subcategories',
    items: [
      'Alexandria auto-assigns a category and subcategory when summarising.',
      'Once you\'ve used a category or subcategory, it appears as a suggestion when adding or editing future articles — so your taxonomy stays consistent over time.',
    ],
  },
  {
    title: 'Outline view',
    items: [
      'Switch to Outline in the nav to see all your articles grouped by category.',
      'Each group can be synthesised by AI into a coherent summary of everything you\'ve read in that area.',
      'Article titles in the outline link directly to the original source.',
    ],
  },
]

export default function HelpModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-stone-900">How to use Alexandria</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-stone-900 mb-2">{section.title}</h3>
              <ul className="space-y-1.5">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-600">
                    <span className="text-gray-300 shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
