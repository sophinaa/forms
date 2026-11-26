import express from 'express'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { validateRegistration } from '../src/shared.js'
import { DuplicateError } from './db.js'
import { registrationsCsv, questionsCsv } from './csv.js'
import { loginPage, organiserPage } from './views.js'
import {
  createSigner, formToken, checkFormToken, SESSION_COOKIE, passwordMatches, createSession,
  sessionIsValid, parseCookies, createRateLimiter, securityHeaders, sameOriginOnly,
} from './security.js'

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))
const SUBMISSION_ID_RE = /^[A-Za-z0-9-]{8,64}$/
const PUBLIC_ID_RE = /^[0-9a-f-]{36}$/
const WINDOW = 15 * 60 * 1000

// options: { db, appSecret, organiserPassword, production, trustProxy, minSubmitMs }
export function createApp({ db, appSecret, organiserPassword, production = false, trustProxy, minSubmitMs = 3000 }) {
  const signer = createSigner(appSecret)
  const registerLimiter = createRateLimiter({ windowMs: WINDOW, max: 10 })
  const loginLimiter = createRateLimiter({ windowMs: WINDOW, max: 8 })

  const app = express()
  app.disable('x-powered-by')
  if (trustProxy) app.set('trust proxy', trustProxy)
  app.use(securityHeaders({ production }))
  app.use(express.json({ limit: '16kb' }))
  app.use(express.urlencoded({ extended: false, limit: '4kb' }))
  app.use(sameOriginOnly)

  const noStore = (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' })
    next()
  }

  app.get('/healthz', (req, res) => res.json({ ok: true }))

  // ---- Registration API ---------------------------------------------------------

  app.get('/api/form-token', noStore, (req, res) => res.json({ formToken: formToken(signer) }))

  app.post('/api/registrations', noStore, async (req, res) => {
    const { allowed, retryAfterSec } = registerLimiter.hit(`reg:${req.ip}`)
    if (!allowed) {
      res.set('Retry-After', String(retryAfterSec))
      return res.status(429).json({ error: 'Too many sign-ups from this connection. Please wait a few minutes and try again.' })
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {}

    // A retried submission (e.g. lost response on a bad connection) returns the existing booking.
    const submissionId = typeof body.submissionId === 'string' && SUBMISSION_ID_RE.test(body.submissionId) ? body.submissionId : null
    if (submissionId && (await db.findBySubmissionId(submissionId))) return res.status(200).json({ ok: true, replayed: true })

    if (typeof body.website === 'string' && body.website.trim()) {
      return res.status(400).json({ error: 'We couldn’t accept this submission. Please refresh the page and try again.' })
    }
    const token = checkFormToken(signer, body.formToken, { minAgeMs: minSubmitMs })
    if (token === 'invalid') return res.status(400).json({ error: 'This form has expired. Please try again.', code: 'invalid_form' })
    if (token === 'too_fast') return res.status(400).json({ error: 'That was quick! Please press the button again.' })

    const { value, errors } = validateRegistration(body)
    if (Object.keys(errors).length) return res.status(422).json({ error: Object.values(errors)[0], fields: errors })

    try {
      const { replayed } = await db.create(value, submissionId)
      res.status(replayed ? 200 : 201).json({ ok: true, replayed })
    } catch (err) {
      if (err instanceof DuplicateError) {
        return res.status(409).json({
          error: 'You’re already registered with this name and email, so there’s nothing more to do. See you there!',
          code: 'duplicate',
        })
      }
      throw err
    }
  })

  // ---- Organiser area -----------------------------------------------------------

  const isOrganiser = (req) =>
    sessionIsValid(signer, organiserPassword, parseCookies(req.get('cookie'))[SESSION_COOKIE], Date.now())
  const requireOrganiser = (req, res, next) => (isOrganiser(req) ? next() : res.redirect(303, '/organiser/login'))
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: production, path: '/' }

  app.use('/organiser', noStore)

  app.get('/organiser/login', (req, res) => {
    if (isOrganiser(req)) return res.redirect(303, '/organiser')
    res.type('html').send(loginPage({ configured: Boolean(organiserPassword) }))
  })

  app.post('/organiser/login', (req, res) => {
    if (!organiserPassword) return res.status(503).type('html').send(loginPage({ configured: false }))
    const key = `login:${req.ip}`
    if (!loginLimiter.hit(key).allowed) {
      return res.status(429).type('html').send(loginPage({ configured: true, error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' }))
    }
    if (!passwordMatches(organiserPassword, req.body?.password)) {
      return res.status(401).type('html').send(loginPage({ configured: true, error: 'That password isn’t right. Please try again.' }))
    }
    loginLimiter.reset(key)
    const session = createSession(signer, organiserPassword)
    res.cookie(SESSION_COOKIE, session.value, { ...cookieOptions, maxAge: session.maxAge })
    res.redirect(303, '/organiser')
  })

  app.post('/organiser/logout', (req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions)
    res.redirect(303, '/organiser/login')
  })

  app.get('/organiser', requireOrganiser, async (req, res) => {
    res.type('html').send(organiserPage(await db.list()))
  })

  const csv = (name, build) => async (req, res) => {
    const day = new Date().toISOString().slice(0, 10)
    res.set('Content-Disposition', `attachment; filename="back-to-basics-${name}-${day}.csv"`)
    res.type('text/csv; charset=utf-8').send(build(await db.list()))
  }
  app.get('/organiser/export.csv', requireOrganiser, csv('registrations', registrationsCsv))
  app.get('/organiser/questions.csv', requireOrganiser, csv('questions', questionsCsv))

  app.post('/organiser/registrations/:id/delete', requireOrganiser, async (req, res) => {
    if (PUBLIC_ID_RE.test(req.params.id)) await db.delete(req.params.id)
    res.redirect(303, '/organiser')
  })

  // ---- The React form -----------------------------------------------------------

  if (existsSync(DIST)) {
    app.use(express.static(DIST, { maxAge: production ? '1h' : 0, index: 'index.html' }))
  } else {
    app.get('/', (req, res) => res.status(503).type('text').send('Run `npm run build` first.'))
  }

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }))
  app.use((req, res) => res.status(404).type('html').send('<!doctype html><title>Not found</title><p>Page not found. <a href="/">Go to the sign-up form</a></p>'))

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(400).json({ error: 'We couldn’t read that submission. Please try again.' })
    }
    console.error(err)
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ error: 'Something went wrong on our side and your sign-up was not saved. Please try again in a moment.' })
    }
    res.status(500).type('text').send('Something went wrong. Please try again in a moment.')
  })

  return app
}
