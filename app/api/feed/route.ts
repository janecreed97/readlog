import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

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

  // Fetch articles and profiles in parallel
  const [{ data: articles }, { data: profiles }] = await Promise.all([
    supabase
      .from('articles')
      .select('id, url, title, source, published_date, category, subcategory, created_at, user_id, bullets(id, content, position)')
      .in('user_id', friendIds)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', friendIds),
  ])

  if (!articles) return NextResponse.json([])

  // Attach profile to each article
  const profileMap = Object.fromEntries((profiles ?? []).map((p: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>) => [p.id, p]))
  const feed = articles.map(a => ({ ...a, profiles: profileMap[a.user_id] ?? null }))

  return NextResponse.json(feed)
}
