import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return NextResponse.json(data ?? null)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { display_name, username } = body
  if (!display_name?.trim() || !username?.trim()) {
    return NextResponse.json({ error: 'display_name and username are required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, display_name: display_name.trim(), username: username.toLowerCase().trim(), avatar_url: user.user_metadata?.avatar_url ?? null }, { onConflict: 'id' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
