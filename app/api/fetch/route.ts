import { NextResponse } from 'next/server'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { ArticlePreview } from '@/lib/types'

const anthropic = new Anthropic()

const PAYWALL_STRINGS = [
  'subscribe to read',
  'subscribe to continue',
  'sign in to read',
  'sign in to continue',
  'members only',
  'subscriber only',
  'create a free account',
  'to continue reading',
  'premium content',
]

function detectPaywall(text: string, html: string): boolean {
  if (text.split(/\s+/).length < 300) return true
  const lower = html.toLowerCase()
  return PAYWALL_STRINGS.some((s) => lower.includes(s))
}

async function summarizeWithClaude(text: string, url: string): Promise<Omit<ArticlePreview, 'is_paywalled' | 'url'>> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Given the following article text, return a JSON object with exactly these fields:
- title (string): the article title
- source (string): publication name (e.g. NYT, Bloomberg, TechCrunch) — infer from URL if not in text
- published_date (string | null): date in YYYY-MM-DD format, or null if not found
- category (string): top-level category (e.g. Energy, Finance, Technology, Policy, Health)
- subcategory (string): more specific sub-topic (e.g. Nuclear, Private Credit, AI, Climate)
- bullets (array of 2-5 strings): key takeaways as concise bullet points

Return only valid JSON, no markdown, no explanation.

Article URL: ${url}

Article text:
${text.slice(0, 8000)}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  return JSON.parse(content.text)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  let articleText = ''
  let articleHtml = ''
  let isPaywalled = false

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReadLog/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    })
    articleHtml = await res.text()

    const dom = new JSDOM(articleHtml, { url })
    const reader = new Readability(dom.window.document)
    const parsed = reader.parse()
    articleText = parsed?.textContent ?? ''
    isPaywalled = detectPaywall(articleText, articleHtml)
  } catch {
    isPaywalled = true
  }

  if (!articleText || isPaywalled) {
    // Return a minimal preview so the user can provide text manually
    return NextResponse.json({
      title: '',
      source: new URL(url).hostname.replace('www.', ''),
      published_date: null,
      category: '',
      subcategory: '',
      bullets: [],
      is_paywalled: true,
      url,
    } satisfies ArticlePreview)
  }

  try {
    const summary = await summarizeWithClaude(articleText, url)
    return NextResponse.json({
      ...summary,
      is_paywalled: false,
      url,
    } satisfies ArticlePreview)
  } catch (err) {
    console.error('Claude summarization error:', err)
    return NextResponse.json({ error: 'Summarization failed' }, { status: 500 })
  }
}
