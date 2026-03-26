import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sent } = await supabase.from('friendships').select('addressee_id').eq('requester_id', user.id).eq('status', 'accepted')
  const { data: received } = await supabase.from('friendships').select('requester_id').eq('addressee_id', user.id).eq('status', 'accepted')

  const friendIds = [
    ...(sent ?? []).map((r: { addressee_id: string }) => r.addressee_id),
    ...(received ?? []).map((r: { requester_id: string }) => r.requester_id),
  ]
  if (friendIds.length === 0) return NextResponse.json([])

  const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds)
  return NextResponse.json(profiles ?? [])
}
