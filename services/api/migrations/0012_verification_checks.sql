CREATE TABLE verification_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  id_type TEXT NOT NULL,
  id_last4 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX verification_checks_user_idx ON verification_checks (user_id);
CREATE INDEX verification_checks_status_idx ON verification_checks (status);
CREATE INDEX verification_checks_provider_ref_idx ON verification_checks (provider_reference);
