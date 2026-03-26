import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tokenId = searchParams.get('token')
  if (!tokenId) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: token, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('id', tokenId)
    .eq('user_id', user.id)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !token) {
    return NextResponse.json({ error: 'Token invalid, expired, or already used' }, { status: 404 })
  }

  // Mark single-use
  await supabase.from('tokens').update({ used: true }).eq('id', tokenId)

  return NextResponse.json(token.payload)
}
