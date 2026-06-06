-- ============================================================================
-- AIRI Impact OS — Postgres / Supabase schema
-- Run in the Supabase SQL editor. Models programs, grants, agreement
-- commitments, staff logs, expenses, reports and evidence — with role-based
-- Row-Level Security so staff, managers and funders only see their own data.
-- ============================================================================

-- ---------- enums ----------
create type user_role     as enum ('manager','staff','funder');
create type metric_kind   as enum ('number','yesno','text');
create type log_status    as enum ('pending','approved','changes','rejected');
create type commit_kind   as enum ('count','percent','budget');
create type report_type   as enum ('overview','specific');
create type report_status as enum ('draft','pending','approved','rejected','sent');

-- ---------- people ----------
-- profiles extends Supabase auth.users with a role.
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  role        user_role not null default 'staff',
  funder_id   uuid,                 -- set when role = 'funder'
  created_at  timestamptz default now()
);

create table funders (
  id     uuid primary key default gen_random_uuid(),
  org    text not null,
  email  text
);
alter table profiles
  add constraint profiles_funder_fk foreign key (funder_id) references funders(id);

-- ---------- programs & their configurable metrics ----------
create table programs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  aim        text,
  audience   text,
  created_at timestamptz default now()
);

create table metrics (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references programs(id) on delete cascade,
  label         text not null,
  kind          metric_kind not null default 'number',
  target        numeric,            -- null for text / non-goal metrics
  on_dashboard  boolean not null default true,
  base          numeric not null default 0,   -- historical baseline
  sort_order    int default 0
);

-- ---------- grants & agreement commitments ----------
create table grants (
  id             uuid primary key default gen_random_uuid(),
  program_id     uuid references programs(id) on delete set null,  -- a grant may start unlinked
  name           text not null,
  funder_id      uuid references funders(id),
  funder_name    text,
  funder_email   text,
  amount         numeric not null default 0,
  term_start     date,
  term_end       date,
  next_report    date,
  agreement_text text,
  created_at     timestamptz default now()
);

create table commitments (
  id         uuid primary key default gen_random_uuid(),
  grant_id   uuid not null references grants(id) on delete cascade,
  label      text not null,
  kind       commit_kind not null,
  target     numeric not null,
  metric_id  uuid references metrics(id) on delete set null  -- which staff field measures it
);

-- ---------- the activity ledger (staff logs) ----------
create table logs (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references programs(id) on delete cascade,
  staff_id      uuid not null references profiles(id),
  log_date      date not null default current_date,
  narrative     text,
  -- metric_id -> value, e.g. {"<uuid>": 24, "<uuid>": true, "<uuid>": "sheet.pdf"}
  values        jsonb not null default '{}',
  status        log_status not null default 'pending',
  manager_note  text,
  created_at    timestamptz default now()
);

-- ---------- the money ledger (manager-logged expenses) ----------
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  grant_id     uuid not null references grants(id) on delete cascade,
  expense_date date not null default current_date,
  category     text,
  amount       numeric not null,
  invoice_ref  text,
  note         text,
  created_by   uuid references profiles(id),
  created_at   timestamptz default now()
);
-- "Spent" for a grant = sum(amount) of its expenses.
create view grant_spend as
  select grant_id, coalesce(sum(amount),0) as spent
  from expenses group by grant_id;

-- ---------- evidence (Supabase Storage objects) ----------
create table attachments (
  id           uuid primary key default gen_random_uuid(),
  log_id       uuid references logs(id) on delete cascade,
  expense_id   uuid references expenses(id) on delete cascade,
  file_name    text not null,
  storage_path text not null,       -- path in the Supabase Storage bucket
  kind         text                 -- 'image' | 'pdf' | ...
);

-- ---------- reports ----------
create table reports (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid references programs(id) on delete set null,
  grant_id        uuid references grants(id) on delete set null,
  type            report_type not null,
  title           text not null,
  period_from     date,
  period_to       date,
  format          text,
  body            text,
  qa              jsonb,            -- [{q,a}] for funder Q&A reports
  recipient_email text,
  status          report_status not null default 'draft',
  created_at      timestamptz default now()
);

-- ---------- audit trail ----------
create table activity (
  id         uuid primary key default gen_random_uuid(),
  actor      text not null,
  text       text not null,
  created_at timestamptz default now()
);

-- ---------- helpful indexes ----------
create index on metrics(program_id);
create index on grants(program_id);
create index on commitments(grant_id);
create index on logs(program_id, status);
create index on logs(staff_id);
create index on expenses(grant_id);
create index on reports(grant_id, status);

-- ============================================================================
-- Row-Level Security — the real enforcement of the role model
-- ============================================================================
alter table logs       enable row level security;
alter table expenses   enable row level security;
alter table reports    enable row level security;
alter table programs   enable row level security;
alter table grants     enable row level security;

create or replace function current_role_of() returns user_role
  language sql stable as $$ select role from profiles where id = auth.uid() $$;

-- Staff: can create logs and see only their own; managers see all.
create policy "staff insert own logs" on logs for insert
  with check ( staff_id = auth.uid() );
create policy "staff read own logs" on logs for select
  using ( staff_id = auth.uid() or current_role_of() = 'manager' );
create policy "managers update logs" on logs for update
  using ( current_role_of() = 'manager' );

-- Expenses: manager-only (staff never touch finance).
create policy "managers manage expenses" on expenses for all
  using ( current_role_of() = 'manager' )
  with check ( current_role_of() = 'manager' );

-- Funders: read approved reports for grants they fund; nothing else.
create policy "funders read their approved reports" on reports for select
  using (
    status = 'sent' and grant_id in (
      select g.id from grants g
      join profiles p on p.id = auth.uid()
      where g.funder_id = p.funder_id
    )
  );
create policy "managers manage reports" on reports for all
  using ( current_role_of() = 'manager' );

-- Programs / grants: managers manage; staff & funders read what they need.
create policy "managers manage programs" on programs for all
  using ( current_role_of() = 'manager' ) with check ( current_role_of() = 'manager' );
create policy "all read programs" on programs for select using ( true );
create policy "managers manage grants" on grants for all
  using ( current_role_of() = 'manager' ) with check ( current_role_of() = 'manager' );
