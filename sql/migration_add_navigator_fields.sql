-- Migration: Add navigator assignment and resolution tracking fields
-- Run this after the initial schema

ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS assigned_navigator_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS expected_resolution_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS complaints_assigned_navigator_id_idx ON complaints (assigned_navigator_id);
CREATE INDEX IF NOT EXISTS complaints_expected_resolution_date_idx ON complaints (expected_resolution_date);

