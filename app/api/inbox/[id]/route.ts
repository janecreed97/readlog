import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  const updates: Record<string, string> = { status: body.status }
  if (body.status === 'read') updates.read_at = new Date().toISOString()
  if (body.status === 'saved') updates.saved_at = new Date().toISOString()

  const { error } = await supabase.from('shares').update(updates).eq('id', id).eq('recipient_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.status === 'saved') {
    const { data: share } = await supabase.from('shares').select('payload, sender_id').eq('id', id).maybeSingle()
    if (share) {
      const { data: senderProfile } = await supabase.from('profiles').select('display_name').eq('id', share.sender_id).maybeSingle()
      const p = share.payload as { title: string; source: string; url: string; published_date: string | null; category: string; subcategory: string; bullets: string[] }
      const { data: article } = await supabase.from('articles').insert({
        user_id: user.id,
        url: p.url,
        title: p.title,
        source: p.source,
        published_date: p.published_date,
        category: p.category,
        subcategory: p.subcategory,
        is_paywalled: false,
        article_type: 'article',
        shared_by: share.sender_id,
        shared_by_name: senderProfile?.display_name ?? null,
      }).select().maybeSingle()
      if (article && p.bullets?.length) {
        await supabase.from('bullets').insert(p.bullets.map((content: string, position: number) => ({ article_id: article.id, content, position })))
      }
    }
  }

  return NextResponse.json({ ok: true })
}
