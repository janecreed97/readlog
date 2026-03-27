import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTaxonomy, buildCategoryPromptSection } from '@/lib/taxonomy'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
const MAX_TEXT_LENGTH = 100_000

// Allow requests from the iOS Shortcuts app and any origin
function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Bookmarklet-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() })
}

export async function POST(request: Request) {
  const bookmarkletKey = request.headers.get('x-bookmarklet-key')
  if (!bookmarkletKey) {
    return NextResponse.json({ error: 'Missing API key. Check your Shortcut setup in Alexandria Settings.' }, { status: 401, headers: cors() })
  }

  const admin = createAdminClient()
  const { data: keyRow } = await admin
    .from('user_keys')
    .select('user_id')
    .eq('bookmarklet_key', bookmarkletKey)
    .single()

  if (!keyRow) {
    return NextResponse.json({ error: 'Invalid API key — regenerate it from Alexandria Settings.' }, { status: 401, headers: cors() })
  }

  let body: { text?: string; url?: string; source?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400, headers: cors() })
  }

  const { text, url, source } = body

  if (!text || text.trim().length < 100) {
    return NextResponse.json(
      { error: 'Text too short — please select more of the article before sharing (at least a few paragraphs).' },
      { status: 422, headers: cors() },
    )
  }

  const truncated = text.slice(0, MAX_TEXT_LENGTH)
  const taxonomy = await getUserTaxonomy(admin, keyRow.user_id)
  const taxonomyClause = buildCategoryPromptSection(taxonomy)

  const prompt = `Given the following article text, return a JSON object with exactly these fields:
- title (string): the article title
- source (string): publication name (e.g. NYT, Bloomberg, FT, The Economist)${source ? ` — use "${source}" unless clearly wrong` : ' — infer from text'}
- published_date (string | null): date in YYYY-MM-DD format, or null if not found
- category (string): top-level category (e.g. Energy, Finance, Technology, Policy, Health)
- subcategory (string): more specific sub-topic (e.g. Nuclear, Private Credit, AI, Climate)
- bullets (array of 2-5 strings): key takeaways as concise bullet points
${taxonomyClause}
Return only valid JSON, no markdown, no explanation.
${url ? `\nArticle URL: ${url}` : ''}

Article text:
${truncated}`

  let parsed: {
    title?: string
    source?: string
    published_date?: string | null
    category?: string
    subcategory?: string
    bullets?: string[]
  }

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const stripped = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const start = stripped.indexOf('{')
    const end = stripped.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON found in Gemini response')
    const sanitized = stripped.slice(start, end + 1).replace(/[\u0000-\u001F]/g, ' ')
    parsed = JSON.parse(sanitized)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Summarization failed: ${message}` }, { status: 500, headers: cors() })
  }

  const { data: article, error } = await admin
    .from('articles')
    .insert({
      user_id: keyRow.user_id,
      url: url ?? null,
      title: parsed.title ?? 'Untitled',
      source: parsed.source ?? source ?? null,
      published_date: parsed.published_date ?? null,
      category: parsed.category ?? null,
      subcategory: parsed.subcategory ?? null,
      bullets: parsed.bullets ?? [],
      is_private: false,
      is_paywalled: true,
    })
    .select('id, title, category, subcategory')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: cors() })
  }

  return NextResponse.json({ success: true, article }, { headers: cors() })
}
