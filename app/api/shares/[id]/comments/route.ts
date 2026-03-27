import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

// GET — list comments for a share
export async function GET(_request: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: comments } = await supabase
    .from('share_comments')
    .select('*')
    .eq('share_id', id)
    .order('created_at', { ascending: true })

  if (!comments?.length) return NextResponse.json([])

  const userIds = [...new Set(comments.map((c: { user_id: string }) => c.user_id))]
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p: { id: string }) => [p.id, p]))

  return NextResponse.json(comments.map((c: { user_id: string }) => ({ ...c, author: profileMap[c.user_id] })))
}

// POST — add a comment
export async function POST(request: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  // Verify caller is a participant
  const { data: share } = await supabase
    .from('shares').select('sender_id, recipient_id').eq('id', id).maybeSingle()
  if (!share || (share.sender_id !== user.id && share.recipient_id !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: comment, error } = await supabase
    .from('share_comments')
    .insert({ share_id: id, user_id: user.id, content: content.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return NextResponse.json({ ...comment, author: profile }, { status: 201 })
}
