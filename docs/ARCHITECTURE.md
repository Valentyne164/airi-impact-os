# Architecture & Build Plan

This document explains how AIRI Impact OS is designed and the path from the
interactive prototype (`demo/index.html`) to a deployed production app.

## 1. The conceptual model

Three entities, each with a clear job:

- **Program** — the *impact engine*. The ongoing work AIRI runs (e.g. AI Literacy). Staff log activities here; approved logs roll up into impact metrics. Answers *"what good are we doing?"*
- **Grant** — the *money + promises + clock*. Funding from one funder, with a budget, reporting deadlines, and the commitments from the agreement. Answers *"are we keeping our promise to this funder, spending responsibly, reporting on time?"*
- **Agreement** — the *scorecard*. The funder's document. The **Agreement Engine** extracts its commitments into tracked KPIs.

How they connect:

```
Program produces outcomes  ─┐
                            ├─►  Grant Dashboard (accountability)  ─►  Funder reports
Agreement defines targets  ─┘            ▲
Manager logs expenses ─► Spent ──────────┘
```

- Impact commitments pull their **actual** from staff logs (via the program).
- Budget commitments pull their **actual** from the expense ledger.
- The agreement supplies the **target** for both.

## 2. Two verified ledgers

Everything trustworthy in the system comes from two append-only, human-verified streams:

| Ledger | Who enters it | Rolls up into |
|--------|---------------|---------------|
| **Activity** (`logs`) | Staff, approved by a manager | Program impact metrics |
| **Money** (`expenses`) | Manager / finance only | Grant "Spent" |

The staff daily-log fields are the program's `metrics`, and those same metrics are what commitments are *measured from* — so the questions staff answer are always the questions the dashboard and funders care about.

## 3. The approval safeguard

Nothing unverified reaches a funder. A submitted log is `pending`; a manager can **accept**, **request changes** (with a note the staff member sees and can resubmit against), or **deny**. Only `approved` data counts. Reports follow the same gate before they can be emailed.

## 4. Production stack

- **Next.js (App Router) + TypeScript + Tailwind** — UI, deployed on **Vercel**.
- **Supabase** — Postgres, Auth, Row-Level Security, Storage.
  - Auth replaces the demo PINs with real accounts.
  - **RLS** (see `supabase/schema.sql`) enforces the role model at the database level: staff see only their logs, funders see only approved reports for grants they fund, managers manage everything.
  - Storage holds evidence files and invoices (`attachments`).
- **Resend + cron** — the deadline engine (scheduled function checks `next_report` and emails staged reminders) and approved-report delivery.
- **Claude API** — optional step to parse arbitrary agreement PDFs into commitments (the prototype uses regex extraction, which the LLM step augments).

## 5. Build order

1. `npx create-next-app` (TypeScript + Tailwind), add the Supabase client.
2. Run `supabase/schema.sql` in the Supabase SQL editor; seed a manager account.
3. Auth + a `profiles` row with `role`; gate routes by role.
4. Port screens to React components, reading/writing Supabase instead of the in-memory store. The prototype's pure logic (aggregation, commitment matching, agreement extraction, deadline stages, finance math) moves almost unchanged into `/lib`.
5. Wire Supabase Storage for evidence uploads.
6. Add the cron function for deadline reminders + report email via Resend.
7. (Optional) Add the Claude parsing endpoint for agreement PDFs.

## 6. Mapping prototype → production

| Prototype | Production |
|-----------|-----------|
| in-memory `db` object | Supabase Postgres tables |
| demo PIN login | Supabase Auth + `profiles.role` |
| role/screen gating in JS | Row-Level Security policies |
| `URL.createObjectURL` evidence | Supabase Storage bucket |
| `mailto:` report send | Resend via a server action |
| regex `extractCommitments()` | same, plus optional Claude PDF parsing |
| `grantSpent()` over `db.expenses` | `grant_spend` SQL view |

The prototype is intentionally a faithful blueprint: each piece has a direct production counterpart.
