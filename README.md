# Job Search Copilot

An automated daily job-application assistant. Every morning it scrapes new job listings,
filters them by H1B sponsorship history and tech-stack fit, uses Claude to generate a
tailored one-page resume (PDF + Word) per matching role, and emails you the results —
with a small web dashboard to review everything and track what you've applied to.

Built as a personal project to learn AI-assisted full-stack development. It's a real,
working pipeline, not a demo — it runs on a daily schedule in production.

## What it actually does

```
Apify (LinkedIn scraper)
        |
        v
Match & filter  ---- H1B sponsor check (DOL LCA data + job-text disclaimer detection)
        |          -- tech-stack match score against your profile
        |          -- allowed-location check (US states only, by default)
        v
Claude API  ---- generates a tailored, one-page resume as structured JSON,
        |        using your real resume as a factual + structural template
        v
PDF + DOCX export  ---- Puppeteer (real one-page shrink-to-fit) + the `docx` library
        |
        v
Postgres  ---- job + resume history saved
        |
        v
Email (Resend)  ---- one email per matched job, resume attached, subject:
                      "JobCoPilot: {company} - {title}"

Dashboard (Angular) -- browse jobs, view/download resumes, mark as applied,
                        trigger a run manually
```

Runs automatically every day via a scheduled job on the backend — no need to keep a
laptop open once deployed.

## Tech stack

| Piece | Choice |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Frontend | Angular (standalone components, signals) |
| Database | PostgreSQL |
| AI generation | Claude API (`claude-sonnet-5`) |
| Job scraping | Apify (`curious_coder/linkedin-jobs-scraper`) |
| H1B sponsor data | DOL LCA public disclosure data (`.xlsx`, downloaded manually per quarter) |
| Email | Resend |
| PDF export | Puppeteer (headless Chromium) |
| DOCX export | `docx` (built directly from structured data, not an HTML conversion) |
| Scheduling | `node-cron` |
| Hosting | Railway (backend + Postgres), Vercel (frontend) — both free/hobby tier |

## Repo layout

```
backend/
  src/
    config/         env loading, constants (location allow-list, thresholds)
    db/              schema.sql, pg client, one-time init script
    middleware/      basic auth
    models/          (reserved for future use)
    routes/          Express API (profile, jobs, applications, digest)
    scheduler/       node-cron daily job config
    services/        the actual pipeline — apify, claude, lca matching, stack
                      matching, resume rendering (HTML/PDF/DOCX), email
    scripts/         one-off/manual-trigger scripts (import LCA data, run a
                      digest manually, render a sample resume for testing)
frontend/
  src/app/
    pages/           job-list, job-detail, login
    services/        API client, auth service/guard/interceptor
    models/          TypeScript interfaces mirroring the backend's data shapes
```

## Setting this up yourself

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL (local install, e.g. via Homebrew: `brew install postgresql@16`)
- Angular CLI: `npm install -g @angular/cli`
- Accounts (all have usable free tiers): [Anthropic](https://console.anthropic.com),
  [Apify](https://apify.com), [Resend](https://resend.com), and — only if you want to
  deploy — [Railway](https://railway.com) and [Vercel](https://vercel.com)

### 1. Database

```bash
createdb job_search_copilot
cd backend
npm install
cp .env.example .env   # fill in the values described below
npm run db:init         # applies schema.sql
```

### 2. Fill in `backend/.env`

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | `postgres://localhost:5432/job_search_copilot` for local dev |
| `APIFY_TOKEN` | Apify → Settings → API & Integrations |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (needs a funded balance) |
| `RESEND_API_KEY` | Resend → API Keys (use "Sending access" scope, not "Full access") |
| `DIGEST_TO_EMAIL` | the email address the daily digest should go to |
| `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` | whatever you want — protects the dashboard and API with Basic Auth |

**Never commit this file.** It's already in `.gitignore`; keep it that way.

### 3. Add your profile

The app tailors resumes from a profile row stored in Postgres — there's no signup UI for
this, it's meant for one person. Insert a row directly:

```sql
INSERT INTO profile (name, email, skills, experience, education, master_resume_text, target_stack, target_locations, profile_label)
VALUES (
  'Your Name',
  'you@example.com',
  ARRAY['TypeScript', 'Node.js', '...'],
  '[]'::jsonb,      -- not currently used by generation, safe to leave empty
  '[]'::jsonb,       -- same
  $$paste your full real resume text here$$,
  ARRAY['Node', 'React', '...'],           -- keywords used for stack matching
  ARRAY['Connecticut', 'New York', 'US'],   -- informational; the real location
                                             -- filter lives in config/constants.ts
  'Software Developer'
);
```

`master_resume_text` matters most — Claude uses it both as the factual source of truth
(so it doesn't invent your work history) and as a structural template (bullet density,
section organization, skills categorization). Use dollar-quoting (`$$...$$`) so you don't
have to escape apostrophes.

You can insert more than one profile row (different `profile_label`s) if you want
different resume "angles" — e.g. one emphasizing backend work, one emphasizing mobile.

### 4. H1B sponsor data (optional but recommended)

Download the current quarter's LCA disclosure file from
[dol.gov/agencies/eta/foreign-labor/performance](https://www.dol.gov/agencies/eta/foreign-labor/performance)
(an `.xlsx`, not a CSV — DOL's own naming is inconsistent about this) into `backend/data/`,
then:

```bash
npm run lca:import
```

This streams the file (it can be 200MB+ with a million-plus rows, so it's read row-by-row,
not loaded into memory) and populates the `lca_employers` table. Without this step, the
H1B match check will rely only on the job posting's own text (the sponsorship-disclaimer
detector in `lcaMatcher.ts`), not historical filings.

### 5. Run it

```bash
# backend
cd backend
npm run dev              # http://localhost:3000

# frontend, in another terminal
cd frontend
npm install
ng serve                  # http://localhost:4200
```

Log in with the `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD` you set. To test the pipeline
without waiting for the schedule:

```bash
npx tsx src/scripts/runDigest.ts "Your Profile Label" "software engineer" "New York, United States" 15 5
#                                  profile label        search keywords    location              raw pool  target matches
```

### 6. Customize the schedule

Edit `backend/src/scheduler/cron.ts` — the `DAILY_JOBS` array controls which profiles run,
what keywords/location they search, how large a raw candidate pool to scrape, and how many
matches to aim for per profile. The cron expression and timezone are set separately in the
same file.

### 7. Deploy (optional)

Both platforms deploy straight from the local CLI, no GitHub connection required:

```bash
# Backend -> Railway
npm install -g @railway/cli
railway login
cd backend
railway init
railway add --database postgres
railway add --service backend
railway service backend
railway variables --service backend --set "DATABASE_URL=\${{<your-postgres-service-name>.DATABASE_URL}}" \
  --set "APIFY_TOKEN=..." --set "ANTHROPIC_API_KEY=..." --set "RESEND_API_KEY=..." \
  --set "DIGEST_TO_EMAIL=..." --set "DASHBOARD_USERNAME=..." --set "DASHBOARD_PASSWORD=..."
railway up --service backend
railway domain --service backend    # get your public URL
```

Migrate your local data over with `railway connect <postgres-service-name> --tunnel-only`
(prints a local port/URL), then `pg_dump`/`psql` against it — see the git history of this
project for the exact commands if needed, or just re-run `db:init` + `lca:import` against
the fresh production database instead of migrating.

```bash
# Frontend -> Vercel
npm install -g vercel
vercel login
# set frontend/src/environments/environment.prod.ts's apiBaseUrl to your Railway URL first
cd frontend
vercel --prod
```

**Watch out for `.railwayignore`** — without one, `railway up` will try to upload
everything in the directory, including anything in `backend/data/` (the LCA file can be
200MB+, well past Railway's upload limit). One's already included in this repo.

## Security notes

- `.env` (backend secrets) is git-ignored — never commit it. `.env.example` is the
  committed template with no real values.
- The dashboard and its entire API (except `/api/health`) sit behind HTTP Basic Auth.
  This is deliberately simple (a single shared username/password, credentials do live in
  the frontend's shipped JS since they're auto-attached to every request) — fine for
  keeping casual visitors out of a personal single-user tool, not a substitute for real
  auth if this were ever multi-user or handling more sensitive data.
- The `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD` env vars are required with no
  hardcoded fallback in source — the app won't start without them being set explicitly.

## Known limitations

- **LCA data is whatever quarter you last imported.** DOL publishes cumulative
  fiscal-year files quarterly; a company that sponsored H1B in an earlier fiscal year but
  hasn't filed yet in the current one will show as a false-negative non-match unless you
  import multiple years.
- **DOCX one-page fit is best-effort, not guaranteed.** The PDF export uses a real
  shrink-to-fit measured in an actual browser; the DOCX export uses calibrated static
  sizing since there's no headless Word renderer available to measure against. A denser
  resume than usual can occasionally spill onto a second page.
- **Matched-job count per day is not deterministic** — it depends on how many real
  postings that day pass the H1B/stack/location filters. `targetMatches` + a generous raw
  scrape pool makes hitting your target *likely*, not guaranteed.
- Everything is single-user by design — no auth beyond the shared Basic Auth credential,
  no multi-tenant support.

## Approximate running cost

At ~10-11 generated resumes/day: Claude API ~$2-3/month, Apify comfortably within its
free $5/month credit, Railway's $5/month Hobby plan, Vercel free tier. Roughly **$7-8/month**
total once deployed.
