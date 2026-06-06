import { prisma } from './prisma.js'
import { sendMail } from './mailer.js'

/**
 * Create an in-app notification for one user, and optionally send an email.
 * Failures are logged but never thrown — notifications must never break the
 * action that produced them.
 */
export async function notify({ userId, type, title, body, link, email = false }) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, link },
    })
  } catch (err) {
    console.error('[notify] DB write failed:', err.message)
  }

  if (email) {
    try {
      const user = await prisma.user.findUnique({
        where:  { id: userId },
        select: { email: true, name: true },
      })
      if (user?.email) {
        sendMail({
          to:      user.email,
          subject: `[COSSA-CHED] ${title}`,
          text:    `Hello ${user.name},\n\n${title}${body ? `\n\n${body}` : ''}\n\nLog in to the COSSA-CHED portal to view: http://localhost:5173/portal\n\n— COSSA-CHED Secretariat`,
          html:    `<p>Hello ${user.name},</p>
                    <p><strong>${title}</strong></p>
                    ${body ? `<p>${body.replace(/\n/g, '<br>')}</p>` : ''}
                    <p><a href="http://localhost:5173/portal">Open the COSSA-CHED portal</a></p>
                    <p style="color:#888;font-size:12px">— COSSA-CHED Secretariat</p>`,
        }).catch(err => console.error('[notify-mail]', err.message))
      }
    } catch (err) {
      console.error('[notify] email lookup failed:', err.message)
    }
  }
}

/**
 * Notify every active member (used for new announcements, events, resources).
 * Excludes one user id (typically the actor who created the thing).
 */
export async function notifyAllActive({ exceptUserId, type, title, body, link, email = false }) {
  try {
    const users = await prisma.user.findMany({
      where:  { active: true, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
      select: { id: true },
    })
    await Promise.all(
      users.map(u => notify({ userId: u.id, type, title, body, link, email }))
    )
  } catch (err) {
    console.error('[notify-all] failed:', err.message)
  }
}
