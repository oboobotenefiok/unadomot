-- Consolidated baseline schema for the unadomot API.
-- Represents the cumulative state of all migrations as of 2026-11-28.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'password',
  status TEXT NOT NULL DEFAULT 'active',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  photo_url TEXT,
  user_type TEXT NOT NULL DEFAULT 'renter',
  verified BOOLEAN NOT NULL DEFAULT false,
  reply_rate NUMERIC,
  response_time TEXT,
  last_active TIMESTAMPTZ,
  username TEXT
);

CREATE UNIQUE INDEX user_profiles_username_lower_unique
  ON user_profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE TABLE admin_roles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK (price > 0),
  address TEXT NOT NULL,
  state TEXT NOT NULL,
  lga TEXT NOT NULL,
  is_agent_listing BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'available',
  expires_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  bedrooms INTEGER,
  bathrooms INTEGER,
  size_sqm NUMERIC(10,2),
  property_type TEXT,
  furnishing TEXT,
  amenities TEXT[] NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES users(id),
  removed_reason TEXT,
  legacy_id TEXT UNIQUE,
  code TEXT DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 8))
);

CREATE INDEX listings_search_idx ON listings (state, lga, property_type, status) WHERE deleted_at IS NULL;
CREATE INDEX listings_owner_idx ON listings (landlord_id);
CREATE UNIQUE INDEX listings_code_unique_idx ON listings (code);

CREATE TABLE listing_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  media_type TEXT NOT NULL DEFAULT 'image',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX favorites_listing_id_idx ON favorites (listing_id);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  participant_a UUID NOT NULL REFERENCES users(id),
  participant_b UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  last_sender_id UUID REFERENCES users(id),
  last_message_preview TEXT,
  last_read_at_a TIMESTAMPTZ,
  last_read_at_b TIMESTAMPTZ,
  CONSTRAINT conversations_participants_distinct CHECK (participant_a <> participant_b)
);

CREATE UNIQUE INDEX conversations_listing_pair_idx
  ON conversations (listing_id, LEAST(participant_a, participant_b), GREATEST(participant_a, participant_b));
CREATE INDEX conversations_participant_a_idx ON conversations (participant_a);
CREATE INDEX conversations_participant_b_idx ON conversations (participant_b);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  media_type TEXT,
  duration_seconds INTEGER,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_check CHECK (body IS NULL OR char_length(body) <= 5000)
);

CREATE INDEX messages_conversation_created_idx ON messages (conversation_id, created_at DESC, id);
CREATE INDEX messages_reply_to_idx ON messages (reply_to_id);

CREATE TABLE message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX message_reactions_message_idx ON message_reactions (message_id);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'user')),
  target_id UUID NOT NULL,
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE checkout_notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  property_address TEXT NOT NULL,
  move_out_date DATE NOT NULL,
  reason TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_active_idx ON refresh_tokens (token_hash) WHERE revoked_at IS NULL;

CREATE TABLE verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_public_id TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX verification_requests_user_idx ON verification_requests (user_id);
CREATE INDEX verification_requests_status_idx ON verification_requests (status);
CREATE INDEX verification_requests_reviewed_at_idx
  ON verification_requests (reviewed_at)
  WHERE reviewed_at IS NOT NULL;
CREATE INDEX verification_requests_document_public_id_idx
  ON verification_requests (document_public_id);

CREATE TABLE legacy_map (
  entity TEXT NOT NULL,
  legacy_id TEXT NOT NULL,
  new_id UUID NOT NULL,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity, legacy_id)
);

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_created_idx ON admin_audit_log (created_at DESC);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_user
  ON password_reset_tokens (user_id, created_at DESC);

CREATE TABLE call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'declined', 'ended')),
  offer_sdp TEXT NOT NULL,
  answer_sdp TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_sessions_conversation
  ON call_sessions (conversation_id, created_at DESC);

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

CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX email_verifications_user_id_idx ON email_verifications (user_id);

CREATE TABLE listing_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX listing_comments_listing_idx
  ON listing_comments (listing_id, created_at);

CREATE TABLE listing_comment_reactions (
  comment_id UUID NOT NULL REFERENCES listing_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id, emoji)
);

CREATE OR REPLACE FUNCTION purge_reviewed_verification_documents(retain_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  purged integer;
BEGIN
  IF retain_days < 1 THEN
    RAISE EXCEPTION 'retain_days must be at least 1';
  END IF;

  UPDATE verification_requests
  SET document_public_id = NULL
  WHERE document_public_id IS NOT NULL
    AND reviewed_at IS NOT NULL
    AND reviewed_at < now() - make_interval(days => retain_days);

  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;

COMMENT ON FUNCTION purge_reviewed_verification_documents(integer)
  IS 'Clears verification document public ids after the retention window. Schedule daily; rows and audit history are preserved.';
