-- Migration: add commitment_id to logs for outcome evidence submissions
-- A log with commitment_id set is an evidence submission (not a daily metric log).
-- Run in the Supabase SQL editor.

alter table logs
  add column commitment_id uuid references commitments(id) on delete set null;
