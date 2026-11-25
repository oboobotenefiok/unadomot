use crate::application::messaging::{MessagingError, MessagingRepository};
use crate::domain::messaging::{Conversation, Message};
use async_trait::async_trait;
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
    async fn find_or_create_conversation(
        &self,
        listing_id: Uuid,
        initiator: Uuid,
        other: Uuid,
    ) -> Result<Conversation, MessagingError> {
        let existing = sqlx::query_as::<_, ConversationRow>(
            "SELECT id, listing_id, participant_a, participant_b, last_message_at, created_at FROM conversations WHERE listing_id = $1 AND ((participant_a = $2 AND participant_b = $3) OR (participant_a = $3 AND participant_b = $2))",
        )
        .bind(listing_id)
        .bind(initiator)
        .bind(other)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        if let Some(conversation) = existing {
            return Ok(conversation.into());
        }

        let conversation = sqlx::query_as::<_, ConversationRow>(
            "INSERT INTO conversations (listing_id, participant_a, participant_b) VALUES ($1, $2, $3) RETURNING id, listing_id, participant_a, participant_b, last_message_at, created_at",
        )
        .bind(listing_id)
        .bind(initiator)
        .bind(other)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        Ok(conversation.into())
    }

    async fn list_conversations(&self, user_id: Uuid) -> Result<Vec<Conversation>, MessagingError> {
        let rows = sqlx::query_as::<_, ConversationRow>(
            "SELECT id, listing_id, participant_a, participant_b, last_message_at, created_at FROM conversations WHERE participant_a = $1 OR participant_b = $1 ORDER BY COALESCE(last_message_at, created_at) DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| MessagingError::Repository(e.to_string()))?;

        Ok(rows.into_iter().map(Conversation::from).collect())
    }

    async fn find_conversation(
        &self,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Conversation>, MessagingError> {
        let row = sqlx::query_as::<_, ConversationRow>(
            "SELECT id, listing_id, participant_a, participant_b, last_message_at, created_at FROM conversations WHERE id = $1 AND (participant_a = $2 OR participant_b = $2)",
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
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Message>, MessagingError> {
        let rows = sqlx::query_as::<_, MessageRow>(
            "SELECT id, conversation_id, sender_id, body, created_at, read_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3",
        )
        .bind(conversation_id)
        .bind(limit)
        .bind(offset)
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

        sqlx::query("UPDATE conversations SET last_message_at = now() WHERE id = $1")
            .bind(conversation_id)
            .execute(&mut *transaction)
            .await
            .map_err(|e| MessagingError::Repository(e.to_string()))?;

        transaction
            .commit()
            .await
            .map_err(|e| MessagingError::Repository(e.to_string()))?;

        Ok(row.into())
    }
}

#[derive(sqlx::FromRow)]
struct ConversationRow {
    id: Uuid,
    listing_id: Uuid,
    participant_a: Uuid,
    participant_b: Uuid,
    last_message_at: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<ConversationRow> for Conversation {
    fn from(row: ConversationRow) -> Self {
        Self {
            id: row.id,
            listing_id: row.listing_id,
            participant_a: row.participant_a,
            participant_b: row.participant_b,
            last_message_at: row.last_message_at,
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
