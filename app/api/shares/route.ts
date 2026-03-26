import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { article_id, recipient_ids, note } = await request.json()
  if (!article_id || !recipient_ids?.length) return NextResponse.json({ error: 'article_id and recipient_ids required' }, { status: 400 })

  const { data: senderProfile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (!senderProfile) return NextResponse.json({ error: 'Complete your profile before sharing' }, { status: 403 })

  const { data: article } = await supabase.from('articles').select('*, bullets(content, position)').eq('id', article_id).eq('user_id', user.id).maybeSingle()
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  const payload = {
    title: article.title,
    source: article.source,
    url: article.url,
    published_date: article.published_date ?? null,
    category: article.category ?? '',
    subcategory: article.subcategory ?? '',
    bullets: (article.bullets ?? [])
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((b: { content: string }) => b.content),
  }

  const rows = (recipient_ids as string[]).map((rid) => ({
    article_id,
    sender_id: user.id,
    recipient_id: rid,
    note: note?.trim() || null,
    status: 'unread',
    payload,
  }))

  const { error } = await supabase.from('shares').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
