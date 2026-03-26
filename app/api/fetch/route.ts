import { NextResponse } from 'next/server'
import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import { createClient } from '@/lib/supabase/server'
import type { ArticlePreview } from '@/lib/types'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

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

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function summarizeWithGemini(text: string, url: string): Promise<Omit<ArticlePreview, 'is_paywalled' | 'url'>> {
  const prompt = `Given the following article text, return a JSON object with exactly these fields:
- title (string): the article title
- source (string): publication name (e.g. NYT, Bloomberg, TechCrunch) — infer from URL if not in text
- published_date (string | null): date in YYYY-MM-DD format, or null if not found
- category (string): top-level category (e.g. Energy, Finance, Technology, Policy, Health)
- subcategory (string): more specific sub-topic (e.g. Nuclear, Private Credit, AI, Climate)
- bullets (array of 2-5 strings): key takeaways as concise bullet points

Return only valid JSON, no markdown, no explanation.

Article URL: ${url}

Article text:
${text.slice(0, 8000)}`

  const responseText = await callGemini(prompt)
  const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, pasteText } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  if (pasteText?.trim()) {
    try {
      const summary = await summarizeWithGemini(pasteText.trim(), url)
      return NextResponse.json({ ...summary, is_paywalled: true, url } satisfies ArticlePreview)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Gemini summarization error:', message)
      return NextResponse.json({ error: `Summarization failed: ${message}` }, { status: 500 })
    }
  }

  let articleText = ''
  let articleHtml = ''
  let isPaywalled = false

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReadLog/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    articleHtml = await res.text()
    const { document } = parseHTML(articleHtml)
    const reader = new Readability(document as unknown as Document)
    const parsed = reader.parse()
    articleText = parsed?.textContent ?? ''
    isPaywalled = detectPaywall(articleText, articleHtml)
  } catch {
    isPaywalled = true
  }

  if (!articleText || isPaywalled) {
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
    const summary = await summarizeWithGemini(articleText, url)
    return NextResponse.json({ ...summary, is_paywalled: false, url } satisfies ArticlePreview)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Gemini summarization error:', message)
    return NextResponse.json({ error: `Summarization failed: ${message}` }, { status: 500 })
  }
}
