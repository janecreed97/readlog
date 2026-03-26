import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.toLowerCase().trim()
  if (!username) return NextResponse.json({ available: false })
  const { data } = await supabase.from('profiles').select('id').eq('username', username).neq('id', user.id).maybeSingle()
  return NextResponse.json({ available: !data })
}
