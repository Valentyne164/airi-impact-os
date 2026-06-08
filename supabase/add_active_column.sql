-- Run in Supabase SQL editor to enable staff deactivation.
alter table profiles add column if not exists active boolean not null default true;
