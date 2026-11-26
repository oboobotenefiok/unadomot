use crate::application::messaging::{MessagingError, MessagingRepository};
use crate::domain::messaging::{Conversation, ConversationSummary, Message};
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
        before: Option<DateTime<Utc>>,
        limit: i64,
    ) -> Result<Vec<Message>, MessagingError> {
        let rows = sqlx::query_as::<_, MessageRow>(
            "SELECT id, conversation_id, sender_id, body, created_at, read_at FROM messages WHERE conversation_id = $1 AND ($2::timestamptz IS NULL OR created_at < $2) ORDER BY created_at DESC, id DESC LIMIT $3",
        )
        .bind(conversation_id)
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
        body: &str,
    ) -> Result<Message, MessagingError> {
        let mut transaction = self
            .pool
            .begin()
            .await
            .map_err(|e| MessagingError::Repository(e.to_string()))?;

        let row = sqlx::query_as::<_, MessageRow>(
            "INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING id, conversation_id, sender_id, body, created_at, read_at",
        )
        .bind(conversation_id)
        .bind(sender_id)
        .bind(body)
        .fetch_one(&mut *transaction)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        let preview: String = body.chars().take(120).collect();

        sqlx::query(
            "UPDATE conversations SET last_message_at = now(), last_message = $2, last_message_preview = $3, last_sender_id = $4 WHERE id = $1",
        )
        .bind(conversation_id)
        .bind(body)
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
    body: String,
    created_at: chrono::DateTime<chrono::Utc>,
    read_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl From<MessageRow> for Message {
    fn from(row: MessageRow) -> Self {
        Self {
            id: row.id,
            conversation_id: row.conversation_id,
            sender_id: row.sender_id,
            body: row.body,
            created_at: row.created_at,
            read_at: row.read_at,
        }
    }
}
