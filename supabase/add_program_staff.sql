-- Run in Supabase SQL editor to enable staff-to-program assignments.

create table if not exists program_staff (
  program_id  uuid not null references programs(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (program_id, profile_id)
);

create index if not exists program_staff_profile_idx on program_staff(profile_id);

-- RLS: managers can manage all assignments; staff can read their own.
alter table program_staff enable row level security;

create policy "managers manage program_staff" on program_staff for all
  using ( current_role_of() = 'manager' )
  with check ( current_role_of() = 'manager' );

create policy "staff read own program_staff" on program_staff for select
  using ( profile_id = auth.uid() );
