import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get friend IDs
  const [{ data: sent }, { data: received }] = await Promise.all([
    supabase.from('friendships').select('addressee_id').eq('requester_id', user.id).eq('status', 'accepted'),
    supabase.from('friendships').select('requester_id').eq('addressee_id', user.id).eq('status', 'accepted'),
  ])

  const friendIds = [
    ...(sent ?? []).map((r: { addressee_id: string }) => r.addressee_id),
    ...(received ?? []).map((r: { requester_id: string }) => r.requester_id),
  ]

  if (friendIds.length === 0) return NextResponse.json([])

  // Get recent public articles from friends, with bullets and author profile
  const { data: articles, error } = await supabase
    .from('articles')
    .select(`
      id, url, title, source, published_date, category, subcategory, created_at,
      bullets ( id, content, position ),
      profiles!articles_user_id_fkey ( id, display_name, username, avatar_url )
    `)
    .in('user_id', friendIds)
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(60)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(articles ?? [])
}
