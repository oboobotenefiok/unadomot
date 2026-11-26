use crate::domain::messaging::{Conversation, ConversationSummary, Message};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug)]
pub enum MessagingError {
    NotFound,
    Forbidden,
    InvalidInput(String),
    Repository(String),
}

#[async_trait]
pub trait MessagingRepository: Send + Sync {
    async fn start_conversation(
        &self,
        listing_id: Uuid,
        initiator: Uuid,
    ) -> Result<Conversation, MessagingError>;
    async fn list_conversations(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<ConversationSummary>, MessagingError>;
    async fn find_conversation(
        &self,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Conversation>, MessagingError>;
    async fn list_messages(
        &self,
        conversation_id: Uuid,
        before: Option<DateTime<Utc>>,
        limit: i64,
    ) -> Result<Vec<Message>, MessagingError>;
    async fn send_message(
        &self,
        conversation_id: Uuid,
        sender_id: Uuid,
        body: &str,
    ) -> Result<Message, MessagingError>;
    async fn mark_read(&self, conversation_id: Uuid, user_id: Uuid) -> Result<(), MessagingError>;

    async fn list_rich_messages(
        &self,
        _conversation_id: Uuid,
        _viewer_id: Uuid,
        _before: Option<String>,
        _limit: i64,
    ) -> Result<Vec<serde_json::Value>, MessagingError> {
        Ok(Vec::new())
    }

    #[allow(clippy::too_many_arguments)]
    async fn send_rich_message(
        &self,
        _conversation_id: Uuid,
        _sender_id: Uuid,
        _body: Option<&str>,
        _media_url: Option<&str>,
        _media_type: Option<&str>,
        _duration_seconds: Option<i32>,
        _reply_to_id: Option<Uuid>,
    ) -> Result<serde_json::Value, MessagingError> {
        Err(MessagingError::InvalidInput(
            "Rich messages are not supported".into(),
        ))
    }

    async fn react_to_message(
        &self,
        _message_id: Uuid,
        _user_id: Uuid,
        _emoji: &str,
    ) -> Result<(), MessagingError> {
        Err(MessagingError::InvalidInput(
            "Reactions are not supported".into(),
        ))
    }
}

pub async fn start_conversation(
    repository: &dyn MessagingRepository,
    listing_id: Uuid,
    initiator: Uuid,
) -> Result<Conversation, MessagingError> {
    repository.start_conversation(listing_id, initiator).await
}

pub async fn list_conversations(
    repository: &dyn MessagingRepository,
    user_id: Uuid,
) -> Result<Vec<ConversationSummary>, MessagingError> {
    repository.list_conversations(user_id).await
}

pub async fn list_messages(
    repository: &dyn MessagingRepository,
    user_id: Uuid,
    conversation_id: Uuid,
    before: Option<DateTime<Utc>>,
    limit: i64,
) -> Result<Vec<Message>, MessagingError> {
    let conversation = repository
        .find_conversation(conversation_id, user_id)
        .await?
        .ok_or(MessagingError::NotFound)?;
    repository
        .list_messages(conversation.id, before, limit.clamp(1, 50))
        .await
}

pub async fn send_message(
    repository: &dyn MessagingRepository,
    user_id: Uuid,
    conversation_id: Uuid,
    body: &str,
) -> Result<Message, MessagingError> {
    let body = body.trim();
    if body.is_empty() || body.len() > 2000 {
        return Err(MessagingError::InvalidInput(
            "Message must be between 1 and 2000 characters".into(),
        ));
    }

    repository
        .find_conversation(conversation_id, user_id)
        .await?
        .ok_or(MessagingError::NotFound)?;

    repository
        .send_message(conversation_id, user_id, body)
        .await
}

pub async fn mark_read(
    repository: &dyn MessagingRepository,
    user_id: Uuid,
    conversation_id: Uuid,
) -> Result<(), MessagingError> {
    repository
        .find_conversation(conversation_id, user_id)
        .await?
        .ok_or(MessagingError::NotFound)?;
    repository.mark_read(conversation_id, user_id).await
}
