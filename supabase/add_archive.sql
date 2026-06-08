-- Run this in your Supabase SQL editor to enable archive (soft-delete)
-- for programs and grants.

alter table programs add column if not exists archived_at timestamptz;
alter table grants   add column if not exists archived_at timestamptz;
