import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { action } = await request.json()
  if (action === 'decline') {
    await supabase.from('friendships').delete().eq('id', id).eq('addressee_id', user.id)
    return NextResponse.json({ ok: true })
  }
  const { error } = await supabase.from('friendships').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', id).eq('addressee_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
