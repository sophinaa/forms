import { createClient } from '@libsql/client'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

// Its own table name, so it can share a Turso database with other sites.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS workshop_registrations (
    id            INTEGER PRIMARY KEY,
    public_id     TEXT NOT NULL UNIQUE,
    submission_id TEXT UNIQUE,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    phone         TEXT NOT NULL DEFAULT '',
    session       TEXT NOT NULL CHECK (session IN ('sisters', 'brothers')),
    wudu          INTEGER NOT NULL,
    salah         INTEGER NOT NULL,
    topics        TEXT NOT NULL DEFAULT '[]',
    question      TEXT NOT NULL DEFAULT '',
    reminder      INTEGER NOT NULL DEFAULT 0, -- no longer asked; kept so existing databases still match
    created_at    TEXT NOT NULL
  )`,
  // The same person can't register twice, but one email can register a few family members.
  `CREATE UNIQUE INDEX IF NOT EXISTS workshop_registrations_person
     ON workshop_registrations (lower(email), lower(name))`,
]

export class DuplicateError extends Error {}

const toRecord = (row) =>
  row && {
    id: row.public_id,
    submissionId: row.submission_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    session: row.session,
    wudu: Number(row.wudu),
    salah: Number(row.salah),
    topics: JSON.parse(row.topics || '[]'),
    question: row.question,
    createdAt: row.created_at,
  }

export async function openDatabase(url, { authToken } = {}) {
  if (url.startsWith('file:')) mkdirSync(dirname(url.slice('file:'.length)), { recursive: true })
  const client = createClient({ url, authToken })
  for (const sql of SCHEMA) await client.execute(sql)

  const one = async (sql, args) => toRecord((await client.execute({ sql, args })).rows[0])
  const bySubmission = (id) => one('SELECT * FROM workshop_registrations WHERE submission_id = ?', [id])

  return {
    findBySubmissionId: bySubmission,

    list: async () =>
      (await client.execute('SELECT * FROM workshop_registrations ORDER BY created_at ASC, id ASC')).rows.map(toRecord),

    // Resolves to { registration, replayed }.
    async create(v, submissionId) {
      const publicId = randomUUID()
      try {
        await client.execute({
          sql: `INSERT INTO workshop_registrations
                  (public_id, submission_id, name, email, phone, session, wudu, salah, topics, question, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            publicId, submissionId || null, v.name, v.email, v.phone, v.session, v.wudu, v.salah,
            JSON.stringify(v.topics), v.question, new Date().toISOString(),
          ],
        })
      } catch (err) {
        const msg = err?.message || ''
        if (!/UNIQUE constraint failed/.test(msg)) throw err
        const existing = submissionId && (await bySubmission(submissionId))
        if (existing) return { registration: existing, replayed: true }
        throw new DuplicateError()
      }
      return { registration: await one('SELECT * FROM workshop_registrations WHERE public_id = ?', [publicId]), replayed: false }
    },

    delete: async (publicId) =>
      (await client.execute({ sql: 'DELETE FROM workshop_registrations WHERE public_id = ?', args: [publicId] })).rowsAffected > 0,

    close: () => client.close(),
  }
}
