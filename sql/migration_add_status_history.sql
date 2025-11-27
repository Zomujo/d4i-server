-- Migration: Add status_history table to track complaint status changes
-- Run this after the navigator fields migration

CREATE TABLE IF NOT EXISTS status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    updated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS status_history_complaint_id_idx ON status_history (complaint_id);
CREATE INDEX IF NOT EXISTS status_history_updated_by_idx ON status_history (updated_by);
CREATE INDEX IF NOT EXISTS status_history_updated_at_idx ON status_history (updated_at DESC);

