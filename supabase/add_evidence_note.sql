-- Run in Supabase SQL editor to add an evidence note field to staff logs.
alter table logs add column if not exists evidence_note text;
