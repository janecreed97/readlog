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

async function summarizeWithGemini(text: string, url: string, direction?: string): Promise<Omit<ArticlePreview, 'is_paywalled' | 'url'>> {
  const directionClause = direction
    ? `\n  Special instruction for the bullet points: ${direction}`
    : ''
  const prompt = `Given the following article text, return a JSON object with exactly these fields:
- title (string): the article title
- source (string): publication name (e.g. NYT, Bloomberg, TechCrunch) — infer from URL if not in text
- published_date (string | null): date in YYYY-MM-DD format, or null if not found
- category (string): top-level category (e.g. Energy, Finance, Technology, Policy, Health)
- subcategory (string): more specific sub-topic (e.g. Nuclear, Private Credit, AI, Climate)
- bullets (array of 2-5 strings): key takeaways as concise bullet points${directionClause}

Return only valid JSON, no markdown, no explanation.

Article URL: ${url}

Article text:
${text.slice(0, 8000)}`

  const responseText = await callGemini(prompt)
  const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

/** Regex-based meta extraction — more reliable than querySelector on raw paywall HTML */
function extractMetaFromHtml(html: string, url: string): { title: string; source: string; published_date: string | null } {
  function getMetaContent(...attrs: string[]): string {
    for (const attr of attrs) {
      // handles both attribute orderings: property/name before content, and content before property/name
      const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${attr}["'][^>]+content=["']([^"'<>]+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+(?:property|name)=["']${attr}["']`, 'i'),
      ]
      for (const re of patterns) {
        const val = html.match(re)?.[1]?.trim()
        if (val) return val
      }
    }
    return ''
  }

  const titleTag = html.match(/<title[^>]*>([^<]{3,})<\/title>/i)?.[1]?.trim() ?? ''

  const title = getMetaContent('og:title', 'twitter:title') || titleTag

  const source = getMetaContent('og:site_name') || new URL(url).hostname.replace('www.', '')

  const rawDate = getMetaContent('article:published_time', 'datePublished', 'date', 'pubdate', 'DC.date')
  const published_date = rawDate ? rawDate.slice(0, 10) : null

  return { title, source, published_date }
}

/** Extract title and date from the URL slug itself as a last resort */
function extractFromUrl(url: string): { title: string | null; published_date: string | null } {
  try {
    const { pathname } = new URL(url)

    // Date: /2024/01/15/ or -2024-01-15 anywhere in path
    const dateMatch = pathname.match(/[\/\-](\d{4})[\/\-](0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])/)
    const published_date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null

    // Title: last path segment that looks like a slug (contains hyphens, not purely numeric)
    const segments = pathname.split('/').filter((s) => s.length > 8 && s.includes('-') && !/^\d+$/.test(s))
    const slug = segments.at(-1)?.replace(/\.(html?|php|aspx?)$/i, '') ?? ''

    if (slug.length > 8) {
      const title = slug
        .replace(/[_-][a-zA-Z0-9]{6,}$/, '')   // strip trailing IDs like -aB3f9kLm
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) // title case
      return { title: title.length > 8 ? title : null, published_date }
    }

    return { title: null, published_date }
  } catch {
    return { title: null, published_date: null }
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, pasteText, direction } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  if (pasteText?.trim()) {
    try {
      const summary = await summarizeWithGemini(pasteText.trim(), url, direction?.trim() || undefined)
      return NextResponse.json({ ...summary, is_paywalled: true, is_private: false, url } satisfies ArticlePreview)
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
    const meta = extractMetaFromHtml(articleHtml, url)
    const fromUrl = extractFromUrl(url)
    return NextResponse.json({
      title:          meta.title          || fromUrl.title          || '',
      source:         meta.source,
      published_date: meta.published_date ?? fromUrl.published_date ?? null,
      category:    '',
      subcategory: '',
      bullets:     [],
      is_paywalled: true,
      is_private: false,
      url,
    } satisfies ArticlePreview)
  }

  try {
    const summary = await summarizeWithGemini(articleText, url, direction?.trim() || undefined)
    return NextResponse.json({ ...summary, is_paywalled: false, is_private: false, url } satisfies ArticlePreview)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Gemini summarization error:', message)
    return NextResponse.json({ error: `Summarization failed: ${message}` }, { status: 500 })
  }
}
