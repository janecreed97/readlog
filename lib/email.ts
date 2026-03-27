import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL ?? 'notifications@example.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com'

export async function sendShareNotification({
  recipientEmail,
  recipientName,
  senderName,
  articleTitle,
  articleSource,
  publishedDate,
  bullets,
  note,
}: {
  recipientEmail: string
  recipientName: string
  senderName: string
  articleTitle: string
  articleSource: string
  publishedDate?: string | null
  bullets: string[]
  note?: string | null
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping notification')
    return
  }

  const bulletItems = bullets
    .map(b => `
      <tr>
        <td style="padding:4px 0 4px 0;vertical-align:top;color:#78716c;font-size:15px;line-height:1.5">
          <span style="color:#d97706;margin-right:8px">•</span>${b}
        </td>
      </tr>`)
    .join('')

  const noteBlock = note
    ? `<tr><td style="padding:16px 0 0 0">
        <div style="background:#fef3c7;border-left:3px solid #d97706;padding:12px 16px;border-radius:4px;font-size:14px;color:#78350f;line-height:1.5">
          <strong style="display:block;margin-bottom:4px">Note from ${senderName}:</strong>
          ${note}
        </div>
      </td></tr>`
    : ''

  const dateStr = publishedDate
    ? new Date(publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Header -->
        <tr><td style="padding-bottom:24px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:18px;font-weight:700;color:#1c1917;letter-spacing:-0.3px">Alexandria</span>
              </td>
              <td align="right">
                <span style="font-size:13px;color:#a8a29e">Reading list</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e7e5e4;overflow:hidden">

          <!-- Card top bar -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#fafaf9;border-bottom:1px solid #e7e5e4;padding:16px 24px">
              <p style="margin:0;font-size:13px;color:#78716c">
                <strong style="color:#1c1917">${senderName}</strong> shared an article with you
              </p>
            </td></tr>
          </table>

          <!-- Article content -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:24px 24px 8px 24px">
              <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#d97706;text-transform:uppercase;letter-spacing:0.8px">${articleSource}${dateStr ? ` · ${dateStr}` : ''}</p>
              <h1 style="margin:0 0 20px 0;font-size:20px;font-weight:700;color:#1c1917;line-height:1.3">${articleTitle}</h1>
            </td></tr>

            <!-- Bullets -->
            <tr><td style="padding:0 24px 8px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${bulletItems}
              </table>
            </td></tr>

            <!-- Note (if any) -->
            ${noteBlock}

            <!-- CTA -->
            <tr><td style="padding:24px 24px 24px 24px">
              <table cellpadding="0" cellspacing="0">
                <tr><td style="background:#1c1917;border-radius:8px">
                  <a href="${APP_URL}/inbox" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">
                    View in Alexandria →
                  </a>
                </td></tr>
              </table>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 0 0 0;text-align:center">
          <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6">
            You're receiving this because you have email notifications turned on.<br>
            <a href="${APP_URL}/settings" style="color:#a8a29e">Manage notification settings</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to: recipientEmail,
    subject: `${senderName} shared "${articleTitle}" with you`,
    html,
  })

  if (error) {
    console.error('[email] Failed to send share notification:', error)
  }
}
