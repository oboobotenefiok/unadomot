ALTER TABLE listing_media ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image';

ALTER TABLE messages ADD COLUMN media_url TEXT;
ALTER TABLE messages ADD COLUMN media_type TEXT;
ALTER TABLE messages ADD COLUMN duration_seconds INTEGER;
ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

ALTER TABLE messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_body_check;
ALTER TABLE messages ADD CONSTRAINT messages_body_check
  CHECK (body IS NULL OR char_length(body) <= 5000);

CREATE TABLE message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX message_reactions_message_idx ON message_reactions (message_id);
CREATE INDEX messages_reply_to_idx ON messages (reply_to_id);
