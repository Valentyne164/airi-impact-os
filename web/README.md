# AIRI Impact OS — Web App (Next.js + Supabase)

The production application. The interactive prototype in [`../demo/index.html`](../demo/index.html) proved the product out; this is the real, typed, database-backed build.

## What's implemented

- **Auth** — Supabase email/password sign-in (`/login`), session refresh in `middleware.ts`, sign-out. Unauthenticated users are redirected to login.
- **Role-based shell** — `src/app/(app)/layout.tsx` reads the signed-in `profile.role` and renders the right navigation (manager / staff / funder).
- **Executive dashboard** (`/`) — funding, reach, programs, reports-due and impact score, plus a grants table — all computed from Supabase data via the logic library.
- **Grants** (`/grants`) and **Grant dashboard** (`/grants/[id]`) — per-grant accountability: agreement commitments measured against verified data, budget-vs-time burn check, and the reporting-deadline timeline.
- **Approvals** (`/approvals`) — the governance gate. Managers accept / request changes / deny staff logs via **server actions** that write to Postgres and revalidate the dashboards. Only approved data counts.
- **Logic library** (`src/lib/impact.ts`) — the verified, framework-free core: aggregation, impact score, finance/burn, agreement extraction & commitment tracking, deadline stages. Pure functions, unit-tested.
- **Database** — full schema with Row-Level Security in [`../supabase/schema.sql`](../supabase/schema.sql); demo data in `supabase/seed.sql`.

## Architecture

- Reads are centralised in `src/lib/data.ts`. **Row-Level Security** (not app code) guarantees each role only receives rows it may see, so the same query returns role-appropriate data.
- Writes are **server actions** (`src/app/(app)/approvals/actions.ts`) using the server Supabase client; RLS enforces manager-only mutation at the database.
- Domain types in `src/types/database.ts` mirror the schema for end-to-end type safety.

## Run locally

```bash
npm install
# create a Supabase project, then in its SQL editor run:
#   ../supabase/schema.sql   then   supabase/seed.sql
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Create your first user in the Supabase Auth dashboard, then add a matching row in `profiles` with `role = 'manager'`.

## Verified

- `npx tsc --noEmit` — passes (whole app type-checks)
- `npx next build` — passes (all routes compile)
- `src/lib/impact.ts` — runtime-tested; identical results to the prototype

## Next to build

Programs CRUD + create-program wizard, the Agreement Engine screen (paste → extract → lock), the daily-log form with Supabase Storage uploads for evidence, the expense-logging UI, the deadline-reminder cron + Resend email, and the report generator. Each maps directly to a piece already proven in the prototype.
