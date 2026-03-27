import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: shares } = await supabase
    .from('shares')
    .select('*')
    .eq('sender_id', user.id)
    .order('sent_at', { ascending: false })

  if (!shares || shares.length === 0) return NextResponse.json([])

  const recipientIds = [...new Set(shares.map((s: { recipient_id: string }) => s.recipient_id))]
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', recipientIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p: { id: string }) => [p.id, p]))

  return NextResponse.json(shares.map((s: { recipient_id: string }) => ({ ...s, recipient: profileMap[s.recipient_id] })))
}
