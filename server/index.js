import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { openDatabase } from './db.js'
import { createApp } from './app.js'

const env = process.env
const production = env.NODE_ENV === 'production'

let appSecret = env.APP_SECRET
if (!appSecret || appSecret.length < 32) {
  if (production) {
    console.error('APP_SECRET must be a random string of at least 32 characters.')
    process.exit(1)
  }
  appSecret = randomBytes(32).toString('hex')
  console.warn('APP_SECRET not set: using a temporary one. Organiser sign-ins reset when the server restarts.')
}

const organiserPassword = env.ORGANISER_PASSWORD || ''
if (organiserPassword && organiserPassword.length < 12) {
  console.error('ORGANISER_PASSWORD must be at least 12 characters long.')
  process.exit(1)
}
if (!organiserPassword) console.warn('ORGANISER_PASSWORD not set: the organiser view is disabled.')

if (env.TURSO_DATABASE_URL && !env.TURSO_AUTH_TOKEN) {
  console.error('TURSO_DATABASE_URL is set but TURSO_AUTH_TOKEN is not.')
  process.exit(1)
}
// Hosted Turso database if configured, otherwise a local SQLite file.
const dbUrl = env.TURSO_DATABASE_URL || `file:${resolve(env.DATA_DIR || 'data', 'registrations.sqlite')}`
const db = await openDatabase(dbUrl, { authToken: env.TURSO_AUTH_TOKEN })

const trustProxy = env.TRUST_PROXY ? (/^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY) : false
const app = createApp({ db, appSecret, organiserPassword, production, trustProxy })
const port = Number(env.PORT) || 3000
const server = app.listen(port, () => {
  console.log(`Back to Basics sign-up running on http://localhost:${port}`)
  console.log(`Organiser view: http://localhost:${port}/organiser (database: ${env.TURSO_DATABASE_URL ? 'Turso' : dbUrl.slice(5)})`)
})

const shutdown = () => {
  server.close(() => {
    db.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 5000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
