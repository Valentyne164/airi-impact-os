# AIRI Impact OS

**A grant & impact management platform for nonprofits — turning daily staff work into funder-ready, verified reporting, with a human approval safeguard at every step.**

> Built for the [AIRI Foundation](https://airifoundation.org), a Canadian nonprofit advancing AI literacy. This repo contains a fully interactive product prototype plus the production architecture and database schema.

---

## The problem

Nonprofits live or die by their grant reporting, but the data behind those reports is scattered: staff track activities in notebooks and spreadsheets, finances live somewhere else, and the *promises* made to funders sit in PDF agreements nobody opens until a deadline looms. Reporting becomes a frantic, error-prone scramble.

## The idea

One system where everything connects:

```
Staff log activities ─┐
                      ├─► verified by a manager ─► Program impact ─┐
Manager logs expenses ┘                                           ├─► Grant accountability ─► Funder reports
                                                                  │
Grant agreement ──────► Agreement Engine extracts the promises ───┘   (targets for both)
```

- **Staff** log what they did each day (people reached, workshops, evidence).
- A **manager** reviews every log — accept, request changes, or deny, with a note — so only verified data ever counts.
- Each **program** rolls its approved logs into live impact metrics.
- The **Agreement Engine** reads a grant agreement and extracts its commitments ("train 500, 25 workshops, 40% women, spend under $150k") into tracked KPIs.
- Each **grant** gets its own dashboard: commitments measured against the program's verified data, finances from a manager-logged expense ledger, and an automated reporting-deadline timeline.
- **Reports** are generated from verified data and emailed to funders — but only after manager approval.

## Why it's different

Most nonprofit CRMs make you re-enter targets by hand and treat impact and finance as separate worlds. Here, the **Agreement-to-Impact Engine** turns the agreement itself into the scorecard, and both impact (from staff logs) and spend (from the expense ledger) are measured against it automatically. The human approval gate is never removed.

---

## Try the prototype

Open [`demo/index.html`](demo/index.html) in any browser — no build step. It's a complete, interactive single-file prototype of the whole system.

**Demo access codes** (shown on the login screen):
- Program Manager — `4021`
- Staff (Amara / Diego / Priya) — `1111` / `2222` / `3333`
- Funder (Gov't Partner / Community Foundation / Innovation Sponsor) — `7001` / `7002` / `7003`

**Suggested walkthrough:** sign in as Amara → submit a daily log → log out → sign in as Manager → Approvals (request changes with a note, then accept) → Programs (create a new program and paste a grant agreement) → Grants (open a grant dashboard, log an expense) → Report Generator → sign in as a Funder to see the read-only view.

---

## Features

- **Role-based workspaces** — Manager, Staff and Funder each see only what their role allows (enforced by Row-Level Security in production).
- **Configurable programs** — every program defines its own daily-log fields and dashboard metrics; nothing is hardcoded.
- **Approval workflow** — accept / request changes / deny, each with a note the staff member receives and can act on.
- **Agreement-to-Impact Engine** — extracts commitments from agreement text and tracks them against verified data.
- **Grant dashboards** — commitments + budget-vs-time + reporting deadlines per funder.
- **Expense ledger** — "Spent" is computed from manager-logged, invoice-backed entries, not guessed.
- **Deadline engine** — staged reminders (14/7/3 days, due date) so no report is missed.
- **Evidence repository** — proof (photos, attendance sheets, invoices) attached to verified work.
- **Two-part reporting** — a reusable project overview, and funder Q&A reports answered from live data.
- **Executive dashboard** — funding, reach, programs, deadlines, impact and compliance at a glance.

---

## Architecture (production)

| Layer | Choice | Why |
|------|--------|-----|
| Frontend | Next.js + TypeScript + Tailwind | Modern standard, great DX, deploys free on Vercel |
| Database | Supabase (Postgres) | Relational model fits the domain; generous free tier |
| Auth & access | Supabase Auth + Row-Level Security | Turns the role model into enforced, per-row security |
| File storage | Supabase Storage | Evidence files and invoices |
| Email & schedules | Resend + cron (deadline engine, report sending) | Automated reminders and funder emails |
| Agreement parsing | regex → Claude API | Start simple; add LLM parsing for arbitrary PDFs |
| Hosting | Vercel | One-click deploys, preview environments |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design and the database schema in [`supabase/schema.sql`](supabase/schema.sql).

---

## Status & roadmap

- [x] Complete interactive prototype (all flows working)
- [x] Production database schema + types
- [ ] Next.js app scaffold + Supabase Auth
- [ ] Port screens to React components
- [ ] Storage-backed evidence uploads
- [ ] Email + deadline cron functions
- [ ] Claude-powered agreement parsing

## Tech notes

The prototype keeps all state in memory (resets on refresh) to stay dependency-free and instantly runnable. The production build moves this state into Supabase with the schema in this repo.

---

*Built by Valentine. Prototype is original work; design system uses the AIRI Foundation brand palette.*
