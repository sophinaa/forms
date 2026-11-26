import { SESSIONS, TOPICS, LEVELS } from '../src/shared.js'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const layout = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Antonio:wght@500;700&family=Roboto+Condensed:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/organiser.css">
</head>
<body>
${body}
<script src="/organiser.js" defer></script>
</body>
</html>`

export function loginPage({ configured, error } = {}) {
  return layout(
    'Organiser sign in · Back to Basics',
    `<main class="login">
  <p class="eyebrow">Organisers</p>
  <h1 class="display">Back to Basics</h1>
  ${
    configured
      ? `<form method="post" action="/organiser/login">
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
    ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <button class="btn">Sign in</button>
  </form>`
      : '<p class="error">The organiser view is turned off. Set ORGANISER_PASSWORD on the server to use it.</p>'
  }
</main>`
  )
}

const bar = (n, max) => `<span class="bar"><span style="width:${max ? Math.round((n / max) * 100) : 0}%"></span></span>`

export function organiserPage(list) {
  const count = (fn) => list.filter(fn).length
  const bySession = SESSIONS.map((s) => ({ ...s, n: count((r) => r.session === s.id) }))

  const levelRows = (key) =>
    LEVELS.map((lvl, i) => {
      const n = count((r) => r[key] === i + 1)
      return `<li><span>${i + 1}. ${esc(lvl)}</span>${bar(n, list.length)}<b>${n}</b></li>`
    }).join('')

  const topicCounts = TOPICS.map((t) => [t, count((r) => r.topics.includes(t))]).sort((a, b) => b[1] - a[1])
  const topMax = topicCounts[0]?.[1] || 0

  const questions = list.filter((r) => r.question)
  const sessionLabel = (id) => SESSIONS.find((s) => s.id === id)?.label || id

  const rows = list
    .map(
      (r) => `<tr data-search="${esc(`${r.name} ${r.email} ${r.phone} ${r.session}`.toLowerCase())}">
  <td data-label="Name"><b>${esc(r.name)}</b></td>
  <td data-label="Session"><span class="tag tag--${r.session}">${esc(sessionLabel(r.session))}</span></td>
  <td data-label="Email"><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
  <td data-label="Phone">${r.phone ? `<a href="tel:${esc(r.phone.replace(/\s/g, ''))}">${esc(r.phone)}</a>` : '—'}</td>
  <td data-label="Wudu / Salah">${r.wudu} / ${r.salah}</td>
  <td data-label="Focus">${esc(r.topics.join(', ')) || '—'}</td>
  <td data-label="Registered">${esc(new Date(r.createdAt).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</td>
  <td><form method="post" action="/organiser/registrations/${esc(r.id)}/delete" class="js-confirm" data-confirm="Remove ${esc(r.name)}'s registration?"><button class="link">Remove</button></form></td>
</tr>`
    )
    .join('')

  return layout(
    'Registrations · Back to Basics',
    `<main class="dash">
  <header class="dash__head">
    <div>
      <p class="eyebrow">Organiser view</p>
      <h1 class="display">Back to Basics</h1>
      <p class="sub">Wednesday 2nd December · Shared Light @ The Faith Project</p>
    </div>
    <div class="dash__actions">
      <a class="btn" href="/organiser/export.csv">Download CSV</a>
      <a class="btn btn--ghost" href="/organiser/questions.csv">Questions CSV</a>
      <form method="post" action="/organiser/logout"><button class="btn btn--ghost">Sign out</button></form>
    </div>
  </header>

  <section class="stats">
    <div class="stat"><span class="stat__n">${list.length}</span><span class="stat__k">Registered</span></div>
    ${bySession.map((s) => `<div class="stat"><span class="stat__n">${s.n}</span><span class="stat__k">${esc(s.label)} · ${esc(s.time)}</span></div>`).join('')}
  </section>

  <section class="grid">
    <div class="panel"><h2>Wudu confidence</h2><ul class="bars">${levelRows('wudu')}</ul></div>
    <div class="panel"><h2>Salah confidence</h2><ul class="bars">${levelRows('salah')}</ul></div>
    <div class="panel"><h2>What to focus on</h2><ul class="bars">${topicCounts.map(([t, n]) => `<li><span>${esc(t)}</span>${bar(n, topMax)}<b>${n}</b></li>`).join('')}</ul></div>
  </section>

  <section class="panel">
    <h2>Anonymous questions <small>(${questions.length})</small></h2>
    <p class="sub">Shown without names, as the form promised.</p>
    ${
      questions.length
        ? `<ul class="questions">${questions.map((r) => `<li><span class="tag tag--${r.session}">${esc(sessionLabel(r.session))}</span> ${esc(r.question)}</li>`).join('')}</ul>`
        : '<p class="empty">No questions yet.</p>'
    }
  </section>

  <section class="panel">
    <div class="panel__head">
      <h2>Attendees</h2>
      <input type="search" id="search" placeholder="Search name, email, phone…" aria-label="Search attendees">
    </div>
    ${
      list.length
        ? `<table class="table"><thead><tr><th>Name</th><th>Session</th><th>Email</th><th>Phone</th><th>Wudu / Salah</th><th>Focus</th><th>Registered</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
        : '<p class="empty">No registrations yet. Share the link!</p>'
    }
  </section>
</main>`
  )
}
