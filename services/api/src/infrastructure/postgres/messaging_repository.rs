use crate::application::messaging::{MessagingError, MessagingRepository};
use crate::domain::messaging::{Conversation, ConversationSummary, Message, MessageReaction};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

pub struct PostgresMessagingRepository {
    pool: PgPool,
}

impl PostgresMessagingRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl MessagingRepository for PostgresMessagingRepository {
    async fn start_conversation(
        &self,
        listing_id: Uuid,
        initiator: Uuid,
    ) -> Result<Conversation, MessagingError> {
        let listing = sqlx::query_as::<_, (Uuid, String)>(
            "SELECT landlord_id, status FROM listings WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(listing_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        let (landlord_id, status) = listing.ok_or(MessagingError::NotFound)?;
        if status != "available" {
            return Err(MessagingError::NotFound);
        }
        if landlord_id == initiator {
            return Err(MessagingError::InvalidInput(
                "You cannot start a conversation on your own listing".into(),
            ));
        }

        let (participant_a, participant_b) = if initiator < landlord_id {
            (initiator, landlord_id)
        } else {
            (landlord_id, initiator)
        };

        sqlx::query(
            "INSERT INTO conversations (listing_id, participant_a, participant_b) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        )
        .bind(listing_id)
        .bind(participant_a)
        .bind(participant_b)
        .execute(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        let row = sqlx::query_as::<_, ConversationRow>(
            "SELECT id, listing_id, participant_a, participant_b, last_message_preview, last_message_at, last_sender_id, created_at FROM conversations WHERE listing_id = $1 AND participant_a = $2 AND participant_b = $3",
        )
        .bind(listing_id)
        .bind(participant_a)
        .bind(participant_b)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        Ok(row.into())
    }

    async fn list_conversations(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<ConversationSummary>, MessagingError> {
        let rows = sqlx::query_as::<_, ConversationSummaryRow>(
            "SELECT c.id, c.listing_id, l.title AS listing_title,
                    (SELECT lm.url FROM listing_media lm WHERE lm.listing_id = c.listing_id ORDER BY lm.position LIMIT 1) AS listing_photo_url,
                    CASE WHEN c.participant_a = $1 THEN c.participant_b ELSE c.participant_a END AS counterpart_id,
                    up.name AS counterpart_name, up.verified AS counterpart_verified,
                    c.last_message_preview, c.last_message_at,
                    CASE WHEN c.participant_a = $1 THEN
                      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND (c.last_read_at_a IS NULL OR m.created_at > c.last_read_at_a))
                    ELSE
                      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND (c.last_read_at_b IS NULL OR m.created_at > c.last_read_at_b))
                    END AS unread_count,
                    c.created_at
             FROM conversations c
             JOIN listings l ON l.id = c.listing_id
             JOIN user_profiles up ON up.user_id = CASE WHEN c.participant_a = $1 THEN c.participant_b ELSE c.participant_a END
             WHERE c.participant_a = $1 OR c.participant_b = $1
             ORDER BY COALESCE(c.last_message_at, c.created_at) DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        Ok(rows.into_iter().map(ConversationSummary::from).collect())
    }

    async fn find_conversation(
        &self,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Conversation>, MessagingError> {
        let row = sqlx::query_as::<_, ConversationRow>(
            "SELECT id, listing_id, participant_a, participant_b, last_message_preview, last_message_at, last_sender_id, created_at FROM conversations WHERE id = $1 AND (participant_a = $2 OR participant_b = $2)",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        Ok(row.map(Conversation::from))
    }

    async fn list_messages(
        &self,
        conversation_id: Uuid,
        viewer_id: Uuid,
        before: Option<DateTime<Utc>>,
        limit: i64,
    ) -> Result<Vec<Message>, MessagingError> {
        let rows = sqlx::query_as::<_, MessageRow>(
            "SELECT m.id, m.conversation_id, m.sender_id, m.body, m.media_url, m.media_type,
                    m.duration_seconds, m.reply_to_id, r.body AS reply_to_body,
                    COALESCE((
                      SELECT jsonb_agg(jsonb_build_object('emoji', x.emoji, 'count', x.count, 'reacted_by_me', x.reacted_by_me))
                      FROM (
                        SELECT emoji, COUNT(*) AS count, BOOL_OR(user_id = $2) AS reacted_by_me
                        FROM message_reactions WHERE message_id = m.id GROUP BY emoji
                      ) x
                    ), '[]'::jsonb) AS reactions,
                    m.created_at, m.read_at
             FROM messages m
             LEFT JOIN messages r ON r.id = m.reply_to_id
             WHERE m.conversation_id = $1 AND ($3::timestamptz IS NULL OR m.created_at < $3)
             ORDER BY m.created_at DESC, m.id DESC LIMIT $4",
        )
        .bind(conversation_id)
        .bind(viewer_id)
        .bind(before)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        Ok(rows.into_iter().map(Message::from).collect())
    }

    async fn send_message(
        &self,
        conversation_id: Uuid,
        sender_id: Uuid,
        body: Option<&str>,
        media_url: Option<&str>,
        media_type: Option<&str>,
        duration_seconds: Option<i32>,
        reply_to_id: Option<Uuid>,
    ) -> Result<Message, MessagingError> {
        let mut transaction = self
            .pool
            .begin()
            .await
            .map_err(|e| MessagingError::Repository(e.to_string()))?;

        let row = sqlx::query_as::<_, MessageRow>(
            "INSERT INTO messages (conversation_id, sender_id, body, media_url, media_type, duration_seconds, reply_to_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, conversation_id, sender_id, body, media_url, media_type, duration_seconds, reply_to_id,
                       NULL::text AS reply_to_body, '[]'::jsonb AS reactions, created_at, read_at",
        )
        .bind(conversation_id)
        .bind(sender_id)
        .bind(body)
        .bind(media_url)
        .bind(media_type)
        .bind(duration_seconds)
        .bind(reply_to_id)
        .fetch_one(&mut *transaction)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        let preview_source = body
            .map(str::to_string)
            .or_else(|| media_type.map(|kind| format!("Sent a {kind}")))
            .unwrap_or_else(|| "New message".into());
        let preview: String = preview_source.chars().take(120).collect();

        sqlx::query(
            "UPDATE conversations SET last_message_at = now(), last_message = $2, last_message_preview = $3, last_sender_id = $4 WHERE id = $1",
        )
        .bind(conversation_id)
        .bind(&preview_source)
        .bind(preview)
        .bind(sender_id)
        .execute(&mut *transaction)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        transaction
            .commit()
            .await
            .map_err(|e| MessagingError::Repository(e.to_string()))?;

        Ok(row.into())
    }

    async fn react_to_message(
        &self,
        message_id: Uuid,
        user_id: Uuid,
        emoji: &str,
    ) -> Result<(), MessagingError> {
        let allowed = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS (
               SELECT 1 FROM messages m
               JOIN conversations c ON c.id = m.conversation_id
               WHERE m.id = $1 AND (c.participant_a = $2 OR c.participant_b = $2)
             )",
        )
        .bind(message_id)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        if !allowed {
            return Err(MessagingError::NotFound);
        }

        sqlx::query(
            "INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
             ON CONFLICT (message_id, user_id, emoji) DO NOTHING",
        )
        .bind(message_id)
        .bind(user_id)
        .bind(emoji)
        .execute(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        Ok(())
    }

    async fn mark_read(&self, conversation_id: Uuid, user_id: Uuid) -> Result<(), MessagingError> {
        let mut transaction = self
            .pool
            .begin()
            .await
            .map_err(|e| MessagingError::Repository(e.to_string()))?;

        sqlx::query(
            "UPDATE messages SET read_at = now() WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL",
        )
        .bind(conversation_id)
        .bind(user_id)
        .execute(&mut *transaction)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        let result = sqlx::query(
            "UPDATE conversations SET last_read_at_a = CASE WHEN participant_a = $2 THEN now() ELSE last_read_at_a END, last_read_at_b = CASE WHEN participant_b = $2 THEN now() ELSE last_read_at_b END WHERE id = $1 AND (participant_a = $2 OR participant_b = $2)",
        )
        .bind(conversation_id)
        .bind(user_id)
        .execute(&mut *transaction)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(MessagingError::NotFound);
        }

        transaction
            .commit()
            .await
            .map_err(|e| MessagingError::Repository(e.to_string()))?;

        Ok(())
    }
}

#[derive(sqlx::FromRow)]
struct ConversationRow {
    id: Uuid,
    listing_id: Uuid,
    participant_a: Uuid,
    participant_b: Uuid,
    last_message_preview: Option<String>,
    last_message_at: Option<chrono::DateTime<chrono::Utc>>,
    last_sender_id: Option<Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<ConversationRow> for Conversation {
    fn from(row: ConversationRow) -> Self {
        Self {
            id: row.id,
            listing_id: row.listing_id,
            participant_a: row.participant_a,
            participant_b: row.participant_b,
            last_message_preview: row.last_message_preview,
            last_message_at: row.last_message_at,
            last_sender_id: row.last_sender_id,
            created_at: row.created_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct ConversationSummaryRow {
    id: Uuid,
    listing_id: Uuid,
    listing_title: String,
    listing_photo_url: Option<String>,
    counterpart_id: Uuid,
    counterpart_name: String,
    counterpart_verified: bool,
    last_message_preview: Option<String>,
    last_message_at: Option<chrono::DateTime<chrono::Utc>>,
    unread_count: i64,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<ConversationSummaryRow> for ConversationSummary {
    fn from(row: ConversationSummaryRow) -> Self {
        Self {
            id: row.id,
            listing_id: row.listing_id,
            listing_title: row.listing_title,
            listing_photo_url: row.listing_photo_url,
            counterpart_id: row.counterpart_id,
            counterpart_name: row.counterpart_name,
            counterpart_verified: row.counterpart_verified,
            last_message_preview: row.last_message_preview,
            last_message_at: row.last_message_at,
            unread_count: row.unread_count,
            created_at: row.created_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct MessageRow {
    id: Uuid,
    conversation_id: Uuid,
    sender_id: Uuid,
    body: Option<String>,
    media_url: Option<String>,
    media_type: Option<String>,
    duration_seconds: Option<i32>,
    reply_to_id: Option<Uuid>,
    reply_to_body: Option<String>,
    reactions: serde_json::Value,
    created_at: chrono::DateTime<chrono::Utc>,
    read_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl From<MessageRow> for Message {
    fn from(row: MessageRow) -> Self {
        let reactions = row
            .reactions
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| {
                        Some(MessageReaction {
                            emoji: item.get("emoji")?.as_str()?.to_string(),
                            count: item.get("count")?.as_i64()?,
                            reacted_by_me: item.get("reacted_by_me")?.as_bool()?,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        Self {
            id: row.id,
            conversation_id: row.conversation_id,
            sender_id: row.sender_id,
            body: row.body,
            media_url: row.media_url,
            media_type: row.media_type,
            duration_seconds: row.duration_seconds,
            reply_to_id: row.reply_to_id,
            reply_to_body: row.reply_to_body,
            reactions,
            created_at: row.created_at,
            read_at: row.read_at,
        }
    }
}
