import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.toLowerCase().trim()
  if (!q || q.length < 3) return NextResponse.json([])
  const { data } = await supabase.from('profiles').select('id, display_name, username, avatar_url').ilike('username', `%${q}%`).neq('id', user.id).limit(10)
  return NextResponse.json(data ?? [])
}
