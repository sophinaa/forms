# Back to Basics: How Do I Pray? (sign-up site)

Sign-up form for the Shared Light @ The Faith Project salah & wudu workshop
(Wednesday 2nd December), with a password-protected organiser view.
Built the same way as the Shared Light Café RSVP site.

- **Form:** React + Vite (`src/`). A step-by-step form with a prayer-mat progress illustration. Works on phones, tablets and desktop.
- **Server:** Node 22 + Express (`server/`). It serves the built form and saves sign-ups.
- **Data:** SQLite. Locally that's a file in `data/`. When hosted, it's a free [Turso](https://turso.tech) database, in a table called `workshop_registrations`, so it can share the café's database.

## Run it locally

```bash
npm install
cp .env.example .env    # set ORGANISER_PASSWORD (12+ characters)
npm run dev             # http://localhost:3000, organiser view at /organiser
```

For hot reload while changing the design, run `npm run dev` in one terminal and `npm run dev:ui` in another, then use the Vite address.

## Getting the sign-ups

Go to **`/organiser`** and sign in with `ORGANISER_PASSWORD`. You'll see:

- totals: everyone, Sisters, Brothers, and who's happy to get a reminder
- wudu and salah confidence levels, and the most-requested topics, for the teacher
- the **anonymous questions**, shown without names because the form promises that
- a searchable attendee list, with an option to remove a sign-up
- **Download CSV** (attendees) and **Questions CSV** (questions only, no names). Both open in Excel and Google Sheets.

The site doesn't send emails. "Reminder OK" means the person agreed to be contacted, so organisers can message them from the CSV.

## Deploy on Render (free)

1. Push this folder to a GitHub repo.
2. In Render: **New → Blueprint**, then pick the repo. `render.yaml` sets everything up.
3. When asked, enter `ORGANISER_PASSWORD`, `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. You can copy the Turso values from the café service's **Environment** tab.
4. The form is live at `https://back-to-basics-….onrender.com`, and the organiser view is at `/organiser`.

## Spam and duplicate protection

These work the same way as on the café site:
- a hidden honeypot field, a signed form token, and a per-IP rate limit
- cross-site posts are blocked
- a retried submission doesn't create a second sign-up
- the same name and email can't register twice, but one email can register several family members
