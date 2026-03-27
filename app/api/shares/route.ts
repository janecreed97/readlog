import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendShareNotification } from '@/lib/email'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { article_id, recipient_ids, note } = await request.json()
  if (!article_id || !recipient_ids?.length) return NextResponse.json({ error: 'article_id and recipient_ids required' }, { status: 400 })

  const { data: senderProfile } = await supabase.from('profiles').select('id, display_name').eq('id', user.id).maybeSingle()
  if (!senderProfile) return NextResponse.json({ error: 'Complete your profile before sharing' }, { status: 403 })

  const { data: article } = await supabase.from('articles').select('*, bullets(content, position)').eq('id', article_id).eq('user_id', user.id).maybeSingle()
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  const sortedBullets = (article.bullets ?? [])
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((b: { content: string }) => b.content)

  const payload = {
    title: article.title,
    source: article.source,
    url: article.url,
    published_date: article.published_date ?? null,
    category: article.category ?? '',
    subcategory: article.subcategory ?? '',
    bullets: sortedBullets,
  }

  const rows = (recipient_ids as string[]).map((rid) => ({
    article_id,
    sender_id: user.id,
    recipient_id: rid,
    note: note?.trim() || null,
    status: 'unread',
    payload,
  }))

  const { error } = await supabase.from('shares').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email notifications to opted-in recipients (fire-and-forget)
  sendEmailNotifications({
    recipientIds: recipient_ids as string[],
    senderName: senderProfile.display_name,
    articleTitle: article.title,
    articleSource: article.source,
    publishedDate: article.published_date ?? null,
    bullets: sortedBullets,
    note: note?.trim() || null,
  }).catch(err => console.error('[email] Notification error:', err))

  return NextResponse.json({ ok: true })
}

async function sendEmailNotifications({
  recipientIds,
  senderName,
  articleTitle,
  articleSource,
  publishedDate,
  bullets,
  note,
}: {
  recipientIds: string[]
  senderName: string
  articleTitle: string
  articleSource: string
  publishedDate: string | null
  bullets: string[]
  note: string | null
}) {
  if (!process.env.RESEND_API_KEY) return

  // Use admin client to look up auth emails (not available via regular client)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch profiles with email_notifications = true for these recipients
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, email_notifications')
    .in('id', recipientIds)
    .eq('email_notifications', true)

  if (!profiles?.length) return

  // Look up their auth emails
  await Promise.all(
    profiles.map(async (profile) => {
      const { data } = await admin.auth.admin.getUserById(profile.id)
      const email = data?.user?.email
      if (!email) return

      await sendShareNotification({
        recipientEmail: email,
        recipientName: profile.display_name,
        senderName,
        articleTitle,
        articleSource,
        publishedDate,
        bullets,
        note,
      })
    })
  )
}
