CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_navigator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expected_resolution_date TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS complaints_user_id_idx ON complaints (user_id);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints (status);
CREATE INDEX IF NOT EXISTS complaints_assigned_navigator_id_idx ON complaints (assigned_navigator_id);
CREATE INDEX IF NOT EXISTS complaints_expected_resolution_date_idx ON complaints (expected_resolution_date);

