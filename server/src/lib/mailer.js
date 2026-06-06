import nodemailer from 'nodemailer'

let _transporter = null

function getTransporter() {
  if (_transporter) return _transporter
  if (!process.env.SMTP_HOST) return null // no SMTP configured

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return _transporter
}

/**
 * Send an email. If SMTP_HOST is not configured the message is logged instead
 * of sent — messages are still stored in the database regardless.
 */
export async function sendMail({ to, subject, text, html }) {
  const t = getTransporter()
  if (!t) {
    console.log('[mailer] No SMTP configured — would have sent:', { to, subject })
    return
  }
  await t.sendMail({
    from: process.env.SMTP_FROM || 'COSSA-CHED <noreply@cocobod.gh>',
    to,
    subject,
    text,
    html,
  })
}
