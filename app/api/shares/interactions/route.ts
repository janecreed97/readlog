import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/shares/interactions?ids=id1,id2,...
// Returns reactions and comments for a batch of share IDs — called once when opening a conversation.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean)
  if (!ids.length) return NextResponse.json({ reactions: [], comments: [] })

  const [{ data: reactions }, { data: comments }] = await Promise.all([
    supabase.from('share_reactions').select('*').in('share_id', ids),
    supabase.from('share_comments').select('*').in('share_id', ids).order('created_at', { ascending: true }),
  ])

  // Attach author profiles to comments
  const userIds = [...new Set((comments ?? []).map((c: { user_id: string }) => c.user_id))]
  const profileMap: Record<string, unknown> = {}
  if (userIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds)
    for (const p of profiles ?? []) profileMap[(p as { id: string }).id] = p
  }

  return NextResponse.json({
    reactions: reactions ?? [],
    comments: (comments ?? []).map((c: { user_id: string }) => ({ ...c, author: profileMap[c.user_id] })),
  })
}
