-- ============================================================================
-- Migration: commitment classification
-- Adds a `type` discriminator and per-type data columns to commitments.
-- Run in the Supabase SQL editor.
-- ============================================================================

-- 1. Discriminator column (all existing rows become 'measurable')
alter table commitments
  add column type text not null default 'measurable';

-- 2. Per-type nullable columns
--    activity_count  — running tally for activity commitments
--    evidence_target — how many evidence items complete an outcome commitment
--    milestones      — ordered checklist for milestone commitments
--                      shape: [{label, status, due_date}]
alter table commitments
  add column activity_count  int,
  add column evidence_target int,
  add column milestones      jsonb;

-- 3. Guard against invalid type values
alter table commitments
  add constraint commitments_type_check
    check (type in ('measurable', 'activity', 'outcome', 'milestone'));

-- Note: `kind` (commit_kind enum NOT NULL) and `target` (numeric NOT NULL)
-- remain non-null for now. When insertion logic for activity/outcome/milestone
-- is added, run a follow-up migration to drop those NOT NULL constraints.
