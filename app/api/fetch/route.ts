import { NextResponse } from 'next/server'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import type { ArticlePreview } from '@/lib/types'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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

  const result = await model.generateContent(prompt)
  const responseText = result.response.text().trim()

  // Strip markdown code fences if Gemini wraps the response
  const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, pasteText } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // If the user pasted text directly, skip fetching and summarize immediately
  if (pasteText?.trim()) {
    try {
      const summary = await summarizeWithGemini(pasteText.trim(), url)
      return NextResponse.json({
        ...summary,
        is_paywalled: true,
        url,
      } satisfies ArticlePreview)
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
    return NextResponse.json({
      ...summary,
      is_paywalled: false,
      url,
    } satisfies ArticlePreview)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Gemini summarization error:', message)
    return NextResponse.json({ error: `Summarization failed: ${message}` }, { status: 500 })
  }
}
