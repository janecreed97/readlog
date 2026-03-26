import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category } = await request.json()
  if (!category) return NextResponse.json({ error: 'Category required' }, { status: 400 })

  const { data: articles, error } = await supabase
    .from('articles')
    .select('title, source, bullets(content)')
    .eq('user_id', user.id)
    .eq('category', category)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!articles || articles.length === 0) {
    return NextResponse.json({ synthesis: 'No articles found in this category.' })
  }

  const bulletText = articles
    .map((a) => {
      const bullets = (a.bullets as { content: string }[]) ?? []
      return `${a.title} (${a.source}):\n${bullets.map((b) => `- ${b.content}`).join('\n')}`
    })
    .join('\n\n')

  const prompt = `Based on the following article summaries in the "${category}" category, write a concise 2-4 sentence synthesis paragraph summarizing the key themes and insights across all articles. Write in plain prose, no bullet points.

${bulletText}`

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const synthesis = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return NextResponse.json({ synthesis: synthesis.trim() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Gemini synthesis error:', message)
    return NextResponse.json({ error: `Synthesis failed: ${message}` }, { status: 500 })
  }
}
