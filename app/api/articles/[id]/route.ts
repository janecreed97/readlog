import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { bullets, ...articleFields } = body

  // Update article metadata if any fields provided
  if (Object.keys(articleFields).length > 0) {
    const { error } = await supabase
      .from('articles')
      .update(articleFields)
      .eq('id', params.id)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Replace bullets if provided
  if (bullets !== undefined) {
    await supabase.from('bullets').delete().eq('article_id', params.id)

    if (bullets.length > 0) {
      const { error } = await supabase.from('bullets').insert(
        bullets.map((content: string, position: number) => ({
          article_id: params.id,
          content,
          position,
        }))
      )
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Reset any inbox share that was "saved" to this article so the user can re-save from inbox
  await supabase
    .from('shares')
    .update({ status: 'read', saved_at: null })
    .eq('article_id', params.id)
    .eq('recipient_id', user.id)
    .eq('status', 'saved')

  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
