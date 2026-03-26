import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: requests } = await supabase
    .from('friendships')
    .select('id, requester_id, created_at')
    .eq('addressee_id', user.id)
    .eq('status', 'pending')

  if (!requests || requests.length === 0) return NextResponse.json([])

  const requesterIds = requests.map((r: { requester_id: string }) => r.requester_id)
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', requesterIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p: { id: string }) => [p.id, p]))

  return NextResponse.json(requests.map((r: { id: string; requester_id: string; created_at: string }) => ({ ...r, profile: profileMap[r.requester_id] })))
}
