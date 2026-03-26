import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — fetch existing key or auto-create one for the logged-in user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch existing key
  const { data: existing } = await admin
    .from('user_keys')
    .select('bookmarklet_key')
    .eq('user_id', user.id)
    .single()

  if (existing) return NextResponse.json({ key: existing.bookmarklet_key })

  // Create new key
  const { data: created, error } = await admin
    .from('user_keys')
    .insert({ user_id: user.id })
    .select('bookmarklet_key')
    .single()

  if (error || !created) return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })

  return NextResponse.json({ key: created.bookmarklet_key })
}

// DELETE — regenerate key
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('user_keys')
    .upsert({ user_id: user.id, bookmarklet_key: crypto.randomUUID() })
    .select('bookmarklet_key')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Failed to regenerate key' }, { status: 500 })

  return NextResponse.json({ key: data.bookmarklet_key })
}
