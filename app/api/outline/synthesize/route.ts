import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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
    const result = await model.generateContent(prompt)
    return NextResponse.json({ synthesis: result.response.text().trim() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Gemini synthesis error:', message)
    return NextResponse.json({ error: `Synthesis failed: ${message}` }, { status: 500 })
  }
}
