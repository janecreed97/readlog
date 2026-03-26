import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { data: f } = await supabase.from('friendships').select('id')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`)
    .eq('status', 'accepted')
    .maybeSingle()
  if (!f) return NextResponse.json({ error: 'Friendship not found' }, { status: 404 })

  await supabase.from('friendships').delete().eq('id', f.id)
  return NextResponse.json({ ok: true })
}
