import { useEffect, useRef, useState } from 'react'
import PrayerMat from './PrayerMat.jsx'

const SESSIONS = [
  { id: 'sisters', label: 'Sisters', time: '6–7 PM', start: '180000', end: '190000' },
  { id: 'brothers', label: 'Brothers', time: '7–8 PM', start: '190000', end: '200000' },
]

const TOPICS = [
  'Steps of wudu',
  'What breaks wudu',
  'Positions of salah',
  'What to recite',
  "Number of rak'ahs",
  'Prayer times',
  'Making up missed prayers',
  'Praying at work / uni',
]

const LEVELS = ['Starting fresh', 'A little rusty', 'Getting there', 'Fairly confident', 'Just a refresher']

const initial = {
  name: '',
  session: '',
  wudu: 0,
  salah: 0,
  topics: [],
  email: '',
  phone: '',
  question: '',
  reminder: true,
}

// Each step: what it asks, and whether it's complete enough to move on.
const STEPS = [
  { id: 'welcome' },
  { id: 'name', valid: (f) => f.name.trim().length > 1 },
  { id: 'session', valid: (f) => !!f.session },
  { id: 'confidence', valid: (f) => f.wudu > 0 && f.salah > 0 },
  { id: 'topics', valid: () => true },
  { id: 'contact', valid: (f) => /^\S+@\S+\.\S+$/.test(f.email) },
  { id: 'question', valid: () => true },
  { id: 'review' },
]

function downloadICS(session, name) {
  const s = SESSIONS.find((x) => x.id === session)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shared Light//Back to Basics//EN',
    'BEGIN:VEVENT',
    `UID:back-to-basics-${session}-${Date.now()}@sharedlight`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:20261202T${s.start}`,
    `DTEND:20261202T${s.end}`,
    `SUMMARY:Back to Basics: How Do I Pray? (${s.label})`,
    'LOCATION:The Faith Project',
    `DESCRIPTION:Salah & wudu workshop. See you there${name ? ', ' + name : ''}!`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'back-to-basics.ics'
  a.click()
  URL.revokeObjectURL(url)
}

/* ---------- small pieces ---------- */

function Beads({ value, onChange, label }) {
  return (
    <div className="beads" role="radiogroup" aria-label={label}>
      <div className="beads__label">{label}</div>
      <div className="beads__row">
        <span className="beads__string" />
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl}
            type="button"
            role="radio"
            aria-checked={value === i + 1}
            aria-label={lvl}
            className={`bead ${value >= i + 1 ? 'bead--on' : ''}`}
            style={{ '--i': i }}
            onClick={() => onChange(i + 1)}
          />
        ))}
      </div>
      <div className="beads__caption">{value ? LEVELS[value - 1] : 'Tap a bead'}</div>
    </div>
  )
}

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

/* ---------- app ---------- */

export default function App() {
  const [form, setForm] = useState(() => {
    try {
      return { ...initial, ...JSON.parse(localStorage.getItem('btb-draft') || '{}') }
    } catch {
      return initial
    }
  })
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [shake, setShake] = useState(false)
  const firstInput = useRef(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const current = STEPS[step]
  const canNext = current.valid ? current.valid(form) : true
  const progress = submitted ? 1 : step / (STEPS.length - 1)

  useEffect(() => {
    localStorage.setItem('btb-draft', JSON.stringify(form))
  }, [form])

  useEffect(() => {
    firstInput.current?.focus()
  }, [step])

  const next = () => {
    if (!canNext) {
      setShake(true)
      setTimeout(() => setShake(false), 450)
      return
    }
    setDir(1)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => {
    setDir(-1)
    setStep((s) => Math.max(s - 1, 0))
  }
  const goTo = (i) => {
    setDir(i > step ? 1 : -1)
    setStep(i)
  }

  const submit = async () => {
    const payload = { ...form, submittedAt: new Date().toISOString() }
    // TODO: send `payload` to your backend / Google Sheet / Formspree here.
    const all = JSON.parse(localStorage.getItem('btb-submissions') || '[]')
    localStorage.setItem('btb-submissions', JSON.stringify([...all, payload]))
    localStorage.removeItem('btb-draft')
    console.log('Registration:', payload)
    setSubmitted(true)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !submitted && current.id !== 'review') {
      e.preventDefault()
      next()
    }
  }

  const session = SESSIONS.find((s) => s.id === form.session)
  const firstName = form.name.trim().split(' ')[0]

  const renderStep = () => {
    switch (current.id) {
      case 'welcome':
        return (
          <>
            <p className="eyebrow">How do I pray?</p>
            <h1 className="display">
              Back to
              <br />
              Basics
            </h1>
            <p className="condensed">Workshop</p>
            <hr />
            <div className="welcome-row">
              <div>
                <div className="meta">
                  <span>Wed 2nd December</span>
                  <span>Sisters 6–7 PM</span>
                  <span>Brothers 7–8 PM</span>
                </div>
                <p className="lede">
                  When was the last time you learned how to pray and perform wudu? Save your spot. It takes about a
                  minute.
                </p>
              </div>
              <PrayerMat progress={0} className="mat--welcome" />
            </div>
            <button ref={firstInput} className="btn btn--primary" onClick={next}>
              Bismillah, let’s begin →
            </button>
          </>
        )

      case 'name':
        return (
          <>
            <p className="step-num">01</p>
            <h2 className="q">What should we call you?</h2>
            <input
              ref={firstInput}
              className="big-input"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoComplete="name"
            />
          </>
        )

      case 'session':
        return (
          <>
            <p className="step-num">02</p>
            <h2 className="q">{firstName ? `Salaam ${firstName}! ` : ''}Which session are you joining?</h2>
            <div className="sessions">
              {SESSIONS.map((s, i) => (
                <button
                  key={s.id}
                  ref={i === 0 ? firstInput : undefined}
                  type="button"
                  className={`session ${form.session === s.id ? 'session--on' : ''}`}
                  onClick={() => {
                    set('session', s.id)
                    setTimeout(() => {
                      setDir(1)
                      setStep((st) => st + 1)
                    }, 350)
                  }}
                >
                  <span className="session__label">{s.label}</span>
                  <span className="session__time">{s.time}</span>
                  <span className="session__check">✓</span>
                </button>
              ))}
            </div>
          </>
        )

      case 'confidence':
        return (
          <>
            <p className="step-num">03</p>
            <h2 className="q">How confident do you feel right now?</h2>
            <p className="sub">No judgement. This just helps us pitch the session right.</p>
            <Beads label="Wudu" value={form.wudu} onChange={(v) => set('wudu', v)} />
            <Beads label="Salah" value={form.salah} onChange={(v) => set('salah', v)} />
          </>
        )

      case 'topics':
        return (
          <>
            <p className="step-num">04</p>
            <h2 className="q">What would you like us to focus on?</h2>
            <p className="sub">Pick as many as you like.</p>
            <div className="chips">
              {TOPICS.map((t, i) => {
                const on = form.topics.includes(t)
                return (
                  <button
                    key={t}
                    ref={i === 0 ? firstInput : undefined}
                    type="button"
                    aria-pressed={on}
                    className={`chip ${on ? 'chip--on' : ''}`}
                    onClick={() => set('topics', on ? form.topics.filter((x) => x !== t) : [...form.topics, t])}
                  >
                    {on ? '✓ ' : '+ '}
                    {t}
                  </button>
                )
              })}
            </div>
          </>
        )

      case 'contact':
        return (
          <>
            <p className="step-num">05</p>
            <h2 className="q">Where can we reach you?</h2>
            <Field label="Email">
              <input
                ref={firstInput}
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                autoComplete="email"
              />
            </Field>
            <Field label="Phone (optional)">
              <input
                type="tel"
                className="input"
                placeholder="07…"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                autoComplete="tel"
              />
            </Field>
            <label className="toggle">
              <input type="checkbox" checked={form.reminder} onChange={(e) => set('reminder', e.target.checked)} />
              <span className="toggle__track" />
              Send me a reminder the day before
            </label>
          </>
        )

      case 'question':
        return (
          <>
            <p className="step-num">06</p>
            <h2 className="q">Anything you’ve always wanted to ask?</h2>
            <p className="sub">
              Optional. Questions are passed on to the teacher without your name, so nothing is too basic.
            </p>
            <textarea
              ref={firstInput}
              className="input textarea"
              rows={5}
              maxLength={500}
              placeholder="e.g. What do I do if I forget how many rak'ahs I've prayed?"
              value={form.question}
              onChange={(e) => set('question', e.target.value)}
            />
            <div className="counter">{form.question.length}/500</div>
          </>
        )

      case 'review':
        return (
          <>
            <p className="step-num">07</p>
            <h2 className="q">All good?</h2>
            <dl className="review">
              {[
                ['Name', form.name, 1],
                ['Session', session && `${session.label} · ${session.time}`, 2],
                ['Wudu', LEVELS[form.wudu - 1], 3],
                ['Salah', LEVELS[form.salah - 1], 3],
                ['Focus', form.topics.join(', ') || 'Anything', 4],
                ['Email', form.email, 5],
                ['Question', form.question || '—', 6],
              ].map(([k, v, i]) => (
                <div key={k} className="review__row">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                  <button type="button" className="link" onClick={() => goTo(i)}>
                    Edit
                  </button>
                </div>
              ))}
            </dl>
            <button ref={firstInput} className="btn btn--primary" onClick={submit}>
              Reserve my spot
            </button>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="page" onKeyDown={onKeyDown}>
      <main className="card">
        <section className="form-side">
          {submitted ? (
            <div className="done" key="done">
              <p className="eyebrow">You’re in{firstName ? `, ${firstName}` : ''}!</p>
              <h1 className="display display--sm">See you on Wednesday</h1>
              <hr />
              <div className="ticket">
                <div>
                  <span className="ticket__k">Session</span>
                  <span className="ticket__v">{session?.label}</span>
                </div>
                <div>
                  <span className="ticket__k">Time</span>
                  <span className="ticket__v">{session?.time}</span>
                </div>
                <div>
                  <span className="ticket__k">Date</span>
                  <span className="ticket__v">2 Dec</span>
                </div>
              </div>
              <p className="lede">
                Come as you are. Bring a friend who might want a refresher too. In shā’ Allāh it’ll be a beautiful
                evening.
              </p>
              <div className="actions">
                <button className="btn btn--primary" onClick={() => downloadICS(form.session, firstName)}>
                  Add to calendar
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    setForm(initial)
                    setSubmitted(false)
                    setStep(0)
                  }}
                >
                  Register someone else
                </button>
              </div>
            </div>
          ) : (
            <>
              {step > 0 && (
                <div className="progress" aria-hidden>
                  {STEPS.slice(1).map((s, i) => (
                    <span key={s.id} className={i < step ? 'on' : ''} />
                  ))}
                </div>
              )}
              <div key={step} className={`step ${dir > 0 ? 'step--fwd' : 'step--back'} ${shake ? 'shake' : ''}`}>
                {renderStep()}
              </div>
              {step > 0 && current.id !== 'review' && (
                <div className="nav">
                  <button className="btn btn--ghost" onClick={back}>
                    ← Back
                  </button>
                  <button className={`btn btn--primary ${canNext ? '' : 'btn--disabled'}`} onClick={next}>
                    {current.id === 'topics' && form.topics.length === 0
                      ? 'Skip'
                      : current.id === 'question' && !form.question
                        ? 'Skip'
                        : 'Next'}
                    <kbd>↵</kbd>
                  </button>
                </div>
              )}
              {current.id === 'review' && (
                <button className="btn btn--ghost back-solo" onClick={back}>
                  ← Back
                </button>
              )}
            </>
          )}
        </section>

        <aside className={`mat-side ${step === 0 && !submitted ? 'mat-side--welcome' : ''}`}>
          <PrayerMat progress={progress} done={submitted} />
          <p className="mat-caption">
            {!submitted && step > 0 && <span className="mat-caption__step">Step {step} of {STEPS.length - 1} · </span>}
            {submitted ? 'Mat laid out. Your place is ready.' : step === 0 ? 'Your place is waiting' : `${Math.round(progress * 100)}% there`}
          </p>
        </aside>

        <footer className="footer">
          <span className="footer__a">Shared Light</span>
          <span className="footer__b">@The Faith Project</span>
        </footer>
      </main>
    </div>
  )
}
