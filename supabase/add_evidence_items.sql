-- Migration: add evidence_items jsonb column to commitments
-- Stores evidence attached to "outcome" type commitments.
-- Shape: [{id, label, note, created_at}]
-- Run in the Supabase SQL editor.

alter table commitments add column evidence_items jsonb;
