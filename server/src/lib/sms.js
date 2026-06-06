/**
 * SMS sender — provider-agnostic interface.
 *
 * Configure ONE of the following in server/.env:
 *   - SMS_PROVIDER=hubtel   + SMS_API_KEY=...  + SMS_SENDER_ID=COSSA-CHED
 *   - SMS_PROVIDER=twilio   + TWILIO_*         (not implemented below — add if needed)
 *
 * Without a provider, sendSms() logs the message and returns silently so the
 * caller never breaks.  Failures are caught and logged.
 */

const HUBTEL_ENDPOINT = 'https://devp-sms03726-api.hubtel.com/v1/messages/send'

function normalisePhone(p) {
  if (!p) return ''
  let s = String(p).trim().replace(/[\s-]/g, '')
  // Convert local Ghana "0XXX..." to "+233XXX..."
  if (s.startsWith('0'))        s = '+233' + s.slice(1)
  if (s.startsWith('233'))      s = '+' + s
  if (!s.startsWith('+'))       s = '+' + s
  return s
}

export async function sendSms({ to, message }) {
  if (!to) return
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase().trim()
  const phone    = normalisePhone(to)

  if (!provider || !process.env.SMS_API_KEY) {
    console.log(`[sms] No SMS provider configured — would have sent to ${phone}:\n  ${message}\n`)
    return
  }

  try {
    if (provider === 'hubtel') {
      // Hubtel SMS — https://developers.hubtel.com/reference/sendmessage
      const url = new URL(HUBTEL_ENDPOINT)
      url.searchParams.set('clientsecret', process.env.SMS_API_KEY)
      url.searchParams.set('clientid',     process.env.SMS_CLIENT_ID || '')
      url.searchParams.set('from',         process.env.SMS_SENDER_ID || 'COSSA-CHED')
      url.searchParams.set('to',           phone)
      url.searchParams.set('content',      message)

      const res = await fetch(url, { method: 'GET' })
      if (!res.ok) {
        console.error('[sms] Hubtel send failed:', res.status, await res.text().catch(() => ''))
      }
      return
    }

    console.warn(`[sms] Unknown provider "${provider}" — message not sent.`)
  } catch (err) {
    console.error('[sms] Send failed:', err.message)
  }
}
