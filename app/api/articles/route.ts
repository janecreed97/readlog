import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ArticlePreview } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: articles, error } = await supabase
    .from('articles')
    .select('*, bullets(id, content, position)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'bullets', ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(articles)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const preview: ArticlePreview = await request.json()

  const { data: article, error: articleError } = await supabase
    .from('articles')
    .insert({
      user_id: user.id,
      url: preview.url,
      title: preview.title,
      source: preview.source,
      published_date: preview.published_date,
      category: preview.category,
      subcategory: preview.subcategory,
      is_paywalled: preview.is_paywalled,
      article_type: 'article',
    })
    .select()
    .single()

  if (articleError) return NextResponse.json({ error: articleError.message }, { status: 500 })

  if (preview.bullets.length > 0) {
    const { error: bulletsError } = await supabase.from('bullets').insert(
      preview.bullets.map((content, position) => ({
        article_id: article.id,
        content,
        position,
      }))
    )
    if (bulletsError) return NextResponse.json({ error: bulletsError.message }, { status: 500 })
  }

  return NextResponse.json(article, { status: 201 })
}
