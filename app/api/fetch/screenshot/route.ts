import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { ArticlePreview } from '@/lib/types'

const anthropic = new Anthropic()

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
  const mediaType = (image.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `This is a screenshot of an article. Extract the article text and return a JSON object with:
- title (string)
- source (string): publication name
- published_date (string | null): YYYY-MM-DD or null
- category (string): top-level category (Energy, Finance, Technology, Policy, Health, etc.)
- subcategory (string): more specific sub-topic
- bullets (array of 2-5 strings): key takeaways

Return only valid JSON, no markdown.${url ? `\nArticle URL: ${url}` : ''}`,
          },
        ],
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
  }

  try {
    const summary = JSON.parse(content.text)
    return NextResponse.json({
      ...summary,
      is_paywalled: true,
      url,
    } satisfies ArticlePreview)
  } catch {
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
