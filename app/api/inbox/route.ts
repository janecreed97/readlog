import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  if (unreadOnly) {
    const { count } = await supabase.from('shares').select('*', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('status', 'unread')
    return NextResponse.json({ count: count ?? 0 })
  }

  const { data: shares } = await supabase.from('shares').select('*').eq('recipient_id', user.id).neq('status', 'dismissed').order('sent_at', { ascending: false })
  if (!shares || shares.length === 0) return NextResponse.json([])

  const senderIds = [...new Set(shares.map((s: { sender_id: string }) => s.sender_id))]
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', senderIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p: { id: string }) => [p.id, p]))

  return NextResponse.json(shares.map((s: { sender_id: string }) => ({ ...s, sender: profileMap[s.sender_id] })))
}
