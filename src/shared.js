// Shared by the React form (browser) and the server, so both check the same rules.

export const SESSIONS = [
  { id: 'sisters', label: 'Sisters', time: '6–7 PM', start: '180000', end: '190000' },
  { id: 'brothers', label: 'Brothers', time: '7–8 PM', start: '190000', end: '200000' },
]

export const TOPICS = [
  'Steps of wudu',
  'What breaks wudu',
  'Positions of salah',
  'What to recite',
  "Number of rak'ahs",
  'Prayer times',
  'Making up missed prayers',
  'Praying at work / uni',
]

export const LEVELS = ['Starting fresh', 'A little rusty', 'Getting there', 'Fairly confident', 'Just a refresher']

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+()\s-]{7,25}$/

const str = (v) => (typeof v === 'string' ? v.trim() : '')

// Returns { value, errors }. `errors` maps field name → message.
export function validateRegistration(body = {}) {
  const errors = {}
  const name = str(body.name).replace(/\s+/g, ' ')
  const email = str(body.email).toLowerCase()
  const phone = str(body.phone)
  const question = str(body.question)
  const session = str(body.session)
  const wudu = Number(body.wudu)
  const salah = Number(body.salah)
  const topics = Array.isArray(body.topics) ? [...new Set(body.topics.filter((t) => TOPICS.includes(t)))] : []

  if (name.length < 2 || name.length > 80) errors.name = 'Please enter your name.'
  if (!SESSIONS.some((s) => s.id === session)) errors.session = 'Please choose a session.'
  if (!Number.isInteger(wudu) || wudu < 1 || wudu > 5) errors.wudu = 'Please pick a level for wudu.'
  if (!Number.isInteger(salah) || salah < 1 || salah > 5) errors.salah = 'Please pick a level for salah.'
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Please enter a valid email address.'
  if (phone && !PHONE_RE.test(phone)) errors.phone = 'Please check your phone number.'
  if (question.length > 500) errors.question = 'Please keep your question under 500 characters.'

  return {
    value: { name, email, phone, session, wudu, salah, topics, question, reminder: body.reminder === true },
    errors,
  }
}
