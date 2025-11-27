-- Migration: Add escalation fields to complaints table
-- Run this after the status_history migration

ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

CREATE INDEX IF NOT EXISTS complaints_escalated_at_idx ON complaints (escalated_at);

-- Note: The status enum already supports 'escalated' via application code

