/**
 * SMS sender — provider-agnostic interface.
 *
 * Configure ONE of the following in server/.env:
 *   - SMS_PROVIDER=hubtel  + SMS_API_KEY=...  + SMS_CLIENT_ID=...  + SMS_SENDER_ID=COSSA-CHED
 *   - SMS_PROVIDER=twilio  + TWILIO_ACCOUNT_SID=...  + TWILIO_AUTH_TOKEN=...  + TWILIO_FROM_NUMBER=+1...
 *
 * Without a provider, sendSms() logs the message and returns silently so the
 * caller never breaks.  Failures are caught and logged.
 */

const HUBTEL_ENDPOINT = 'https://devp-sms03726-api.hubtel.com/v1/messages/send'

function normalisePhone(p) {
  if (!p) return ''
  let s = String(p).trim().replace(/[\s-]/g, '')
  // Convert local Ghana "0XXX..." to "+233XXX..."
  if (s.startsWith('0'))   s = '+233' + s.slice(1)
  if (s.startsWith('233')) s = '+' + s
  if (!s.startsWith('+'))  s = '+' + s
  return s
}

export async function sendSms({ to, message }) {
  if (!to) return
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase().trim()
  const phone    = normalisePhone(to)

  if (!provider) {
    console.log(`[sms] No SMS provider configured — would have sent to ${phone}:\n  ${message}\n`)
    return
  }

  try {
    if (provider === 'hubtel') {
      const url = new URL(HUBTEL_ENDPOINT)
      url.searchParams.set('clientsecret', process.env.SMS_API_KEY || '')
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

    if (provider === 'twilio') {
      const sid   = process.env.TWILIO_ACCOUNT_SID
      const token = process.env.TWILIO_AUTH_TOKEN
      const from  = process.env.TWILIO_FROM_NUMBER

      if (!sid || !token || !from) {
        console.error('[sms] Twilio credentials missing — check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in .env')
        return
      }

      const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
      const body = new URLSearchParams({ From: from, To: phone, Body: message })
      const auth = Buffer.from(`${sid}:${token}`).toString('base64')

      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[sms] Twilio send failed:', res.status, err.message || '')
      } else {
        console.log(`[sms] Twilio sent to ${phone}`)
      }
      return
    }

    console.warn(`[sms] Unknown provider "${provider}" — message not sent.`)
  } catch (err) {
    console.error('[sms] Send failed:', err.message)
  }
}
