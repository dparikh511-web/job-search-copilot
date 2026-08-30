-- Job Search Copilot schema (Phase 1)

CREATE TABLE IF NOT EXISTS profile (
  id                  SERIAL PRIMARY KEY,
  profile_label       TEXT NOT NULL DEFAULT 'general',
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  skills              TEXT[] NOT NULL DEFAULT '{}',
  experience          JSONB NOT NULL DEFAULT '[]',
  education           JSONB NOT NULL DEFAULT '[]',
  master_resume_text  TEXT NOT NULL,
  target_stack        TEXT[] NOT NULL DEFAULT '{}',
  target_locations     TEXT[] NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lca_employers (
  id                        SERIAL PRIMARY KEY,
  employer_name_normalized TEXT NOT NULL,
  raw_employer_name        TEXT NOT NULL,
  case_status               TEXT,
  worksite_state             TEXT,
  most_recent_decision_date DATE,
  UNIQUE (employer_name_normalized, worksite_state)
);
CREATE INDEX IF NOT EXISTS idx_lca_employers_normalized ON lca_employers (employer_name_normalized);

CREATE TABLE IF NOT EXISTS jobs (
  id                    SERIAL PRIMARY KEY,
  external_id           TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  company               TEXT NOT NULL,
  company_normalized    TEXT NOT NULL,
  location              TEXT,
  description           TEXT NOT NULL,
  url                   TEXT NOT NULL,
  posted_date           DATE,
  scraped_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  stack_match_score     REAL,
  h1b_match             BOOLEAN NOT NULL DEFAULT false,
  h1b_match_confidence  REAL,
  status                TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','matched','generated','digested','applied','rejected'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_company_normalized ON jobs (company_normalized);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);

CREATE TABLE IF NOT EXISTS applications (
  id                SERIAL PRIMARY KEY,
  job_id            INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id        INTEGER REFERENCES profile(id),
  resume_text       TEXT NOT NULL,
  cover_letter_text TEXT,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  digest_date       DATE
);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications (job_id);

CREATE TABLE IF NOT EXISTS digest_log (
  id           SERIAL PRIMARY KEY,
  digest_date  DATE NOT NULL,
  job_ids      INTEGER[] NOT NULL DEFAULT '{}',
  sent_at      TIMESTAMPTZ,
  email_status TEXT
);
