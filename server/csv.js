import { SESSIONS, LEVELS } from '../src/shared.js'

const sessionLabel = (id) => SESSIONS.find((s) => s.id === id)?.label || id

function cell(value) {
  let s = String(value ?? '')
  // Stop spreadsheet apps from treating input as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const stamp = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})

const toCsv = (rows) => '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'

// Attendee list. Questions are deliberately left out: the form promises they
// reach the teacher without a name attached.
export function registrationsCsv(list) {
  return toCsv([
    ['Name', 'Session', 'Email', 'Phone', 'Wudu confidence', 'Salah confidence', 'Focus topics', 'Registered'],
    ...list.map((r) => [
      r.name, sessionLabel(r.session), r.email, r.phone,
      `${r.wudu} – ${LEVELS[r.wudu - 1]}`, `${r.salah} – ${LEVELS[r.salah - 1]}`, r.topics.join('; '),
      stamp.format(new Date(r.createdAt)),
    ]),
  ])
}

// Anonymous questions for the teacher: no names or contact details.
export function questionsCsv(list) {
  return toCsv([['Session', 'Question'], ...list.filter((r) => r.question).map((r) => [sessionLabel(r.session), r.question])])
}
