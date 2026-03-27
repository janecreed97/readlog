import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: articles } = await supabase
    .from('articles')
    .select('*, bullets(id, content, position)')
    .eq('user_id', profile.id)
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'bullets', ascending: true })

  return NextResponse.json({ profile, articles: articles ?? [] })
}
