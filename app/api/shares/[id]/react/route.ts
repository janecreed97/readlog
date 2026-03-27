import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

// POST — upsert reaction (replaces any existing reaction by this user on this share)
export async function POST(request: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { emoji } = await request.json()
  if (!emoji) return NextResponse.json({ error: 'emoji required' }, { status: 400 })

  // Verify caller is a participant (sender or recipient)
  const { data: share } = await supabase
    .from('shares').select('sender_id, recipient_id').eq('id', id).maybeSingle()
  if (!share || (share.sender_id !== user.id && share.recipient_id !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('share_reactions')
    .upsert({ share_id: id, user_id: user.id, emoji }, { onConflict: 'share_id,user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — remove this user's reaction from a share
export async function DELETE(_request: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('share_reactions')
    .delete()
    .eq('share_id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
