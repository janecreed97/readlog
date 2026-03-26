import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import type { ArticlePreview } from '@/lib/types'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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
  const mimeType = (image.type || 'image/jpeg') as string

  const prompt = `This is a screenshot of an article. Extract the article text and return a JSON object with:
- title (string)
- source (string): publication name
- published_date (string | null): YYYY-MM-DD or null
- category (string): top-level category (Energy, Finance, Technology, Policy, Health, etc.)
- subcategory (string): more specific sub-topic
- bullets (array of 2-5 strings): key takeaways

Return only valid JSON, no markdown.${url ? `\nArticle URL: ${url}` : ''}`

  try {
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType } },
      prompt,
    ])
    const responseText = result.response.text().trim()
    const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const summary = JSON.parse(cleaned)
    return NextResponse.json({ ...summary, is_paywalled: true, url } satisfies ArticlePreview)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Gemini screenshot error:', message)
    return NextResponse.json({ error: `Failed to process screenshot: ${message}` }, { status: 500 })
  }
}
