import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
const MAX_TEXT_LENGTH = 100_000

function cors(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Not logged in to Alexandria. Please log in first, then try again.' },
      { status: 401, headers: cors(request) },
    )
  }

  const { url, text } = await request.json()

  if (!text || text.trim().length < 200) {
    return NextResponse.json(
      { error: 'Article text too short — the page may not have loaded fully. Try refreshing and clicking the bookmarklet again.' },
      { status: 422, headers: cors(request) },
    )
  }

  const truncated = text.slice(0, MAX_TEXT_LENGTH)

  const prompt = `Given the following article text (extracted from a browser page — may include some navigation or footer boilerplate, focus on the main article body), return a JSON object with exactly these fields:
- title (string): the article title
- source (string): publication name (e.g. NYT, Bloomberg, FT) — infer from URL if needed
- published_date (string | null): date in YYYY-MM-DD format, or null if not found
- category (string): top-level category (e.g. Energy, Finance, Technology, Policy, Health)
- subcategory (string): more specific sub-topic (e.g. Nuclear, Private Credit, AI, Climate)
- bullets (array of 2-5 strings): key takeaways as concise bullet points

Return only valid JSON, no markdown, no explanation.

Article URL: ${url}

Article text:
${truncated}`

  let payload
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    payload = { ...JSON.parse(cleaned), url, is_paywalled: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Summarization failed: ${message}` },
      { status: 500, headers: cors(request) },
    )
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const { data: token, error } = await supabase
    .from('tokens')
    .insert({ user_id: user.id, payload, expires_at: expiresAt, used: false })
    .select('id')
    .single()

  if (error || !token) {
    return NextResponse.json(
      { error: 'Failed to create session token' },
      { status: 500, headers: cors(request) },
    )
  }

  return NextResponse.json({ token: token.id }, { headers: cors(request) })
}
