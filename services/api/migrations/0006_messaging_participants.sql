ALTER TABLE conversations ADD COLUMN participant_a UUID REFERENCES users(id);
ALTER TABLE conversations ADD COLUMN participant_b UUID REFERENCES users(id);

UPDATE conversations c
SET participant_a = p.first_user,
    participant_b = p.second_user
FROM (
  SELECT conversation_id,
         (array_agg(user_id ORDER BY user_id))[1] AS first_user,
         (array_agg(user_id ORDER BY user_id))[2] AS second_user
  FROM conversation_participants
  GROUP BY conversation_id
  HAVING COUNT(*) >= 2
) p
WHERE c.id = p.conversation_id;

DELETE FROM conversations WHERE participant_a IS NULL OR participant_b IS NULL;

ALTER TABLE conversations ALTER COLUMN participant_a SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN participant_b SET NOT NULL;
ALTER TABLE conversations ADD CONSTRAINT conversations_participants_distinct CHECK (participant_a <> participant_b);

CREATE UNIQUE INDEX conversations_listing_pair_idx
  ON conversations (listing_id, LEAST(participant_a, participant_b), GREATEST(participant_a, participant_b));
CREATE INDEX conversations_participant_a_idx ON conversations (participant_a);
CREATE INDEX conversations_participant_b_idx ON conversations (participant_b);

ALTER TABLE conversations ADD COLUMN last_message_preview TEXT;
ALTER TABLE conversations ADD COLUMN last_read_at_a TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN last_read_at_b TIMESTAMPTZ;

CREATE INDEX messages_conversation_created_idx ON messages (conversation_id, created_at DESC, id);

DROP TABLE conversation_participants;
