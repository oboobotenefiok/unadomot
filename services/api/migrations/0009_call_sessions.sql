CREATE TABLE IF NOT EXISTS call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('audio', 'video')),
    status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'declined', 'ended')),
    offer_sdp TEXT NOT NULL,
    answer_sdp TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_conversation
    ON call_sessions (conversation_id, created_at DESC);
