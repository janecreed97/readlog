import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { addressee_username } = await request.json()
  const { data: addressee } = await supabase.from('profiles').select('id').eq('username', addressee_username.toLowerCase()).maybeSingle()
  if (!addressee) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (addressee.id === user.id) return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 })

  const { data: existing } = await supabase.from('friendships').select('id, status')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addressee.id}),and(requester_id.eq.${addressee.id},addressee_id.eq.${user.id})`)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: existing.status === 'accepted' ? 'Already friends' : 'Request already sent' }, { status: 409 })

  const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: addressee.id, status: 'pending' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
