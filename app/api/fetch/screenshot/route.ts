import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ArticlePreview } from '@/lib/types'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const image = formData.get('image') as File | null
  const url = (formData.get('url') as string) ?? ''

  if (!image) return NextResponse.json({ error: 'Image required' }, { status: 400 })

  const bytes = await image.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mimeType = image.type || 'image/jpeg'

  const prompt = `This is a screenshot of an article. Extract the article text and return a JSON object with:
- title (string)
- source (string): publication name
- published_date (string | null): YYYY-MM-DD or null
- category (string): top-level category (Energy, Finance, Technology, Policy, Health, etc.)
- subcategory (string): more specific sub-topic
- bullets (array of 2-5 strings): key takeaways

Return only valid JSON, no markdown.${url ? `\nArticle URL: ${url}` : ''}`

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: prompt },
          ],
        }],
      }),
    })
    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const summary = JSON.parse(cleaned)
    return NextResponse.json({ ...summary, is_paywalled: true, url } satisfies ArticlePreview)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Gemini screenshot error:', message)
    return NextResponse.json({ error: `Failed to process screenshot: ${message}` }, { status: 500 })
  }
}
