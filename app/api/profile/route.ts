import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return NextResponse.json(data ?? null)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  // Only allow patching safe preference fields
  const allowed = ['email_notifications'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { display_name, username, email_notifications } = body
  if (!display_name?.trim() || !username?.trim()) {
    return NextResponse.json({ error: 'display_name and username are required' }, { status: 400 })
  }
  const updates: Record<string, unknown> = {
    id: user.id,
    display_name: display_name.trim(),
    username: username.toLowerCase().trim(),
    avatar_url: user.user_metadata?.avatar_url ?? null,
  }
  if (typeof email_notifications === 'boolean') {
    updates.email_notifications = email_notifications
  }
  const { data, error } = await supabase
    .from('profiles')
    .upsert(updates, { onConflict: 'id' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
