CREATE TABLE IF NOT EXISTS refresh_sessions (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    token_hash BYTEA NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_owner_id ON refresh_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_family_id ON refresh_sessions(family_id);
