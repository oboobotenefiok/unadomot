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
        viewer_id: Uuid,
        before: Option<DateTime<Utc>>,
        limit: i64,
    ) -> Result<Vec<Message>, MessagingError>;
    async fn send_message(
        &self,
        conversation_id: Uuid,
        sender_id: Uuid,
        body: Option<&str>,
        media_url: Option<&str>,
        media_type: Option<&str>,
        duration_seconds: Option<i32>,
        reply_to_id: Option<Uuid>,
    ) -> Result<Message, MessagingError>;
    async fn react_to_message(
        &self,
        message_id: Uuid,
        user_id: Uuid,
        emoji: &str,
    ) -> Result<(), MessagingError>;
    async fn mark_read(&self, conversation_id: Uuid, user_id: Uuid) -> Result<(), MessagingError>;
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
        .list_messages(conversation.id, user_id, before, limit.clamp(1, 50))
        .await
}

pub async fn send_message(
    repository: &dyn MessagingRepository,
    user_id: Uuid,
    conversation_id: Uuid,
    body: Option<&str>,
    media_url: Option<&str>,
    media_type: Option<&str>,
    duration_seconds: Option<i32>,
    reply_to_id: Option<Uuid>,
) -> Result<Message, MessagingError> {
    let body = body.map(str::trim).filter(|value| !value.is_empty());
    if body.is_none() && media_url.is_none() {
        return Err(MessagingError::InvalidInput(
            "A message or attachment is required".into(),
        ));
    }
    if body.is_some_and(|value| value.len() > 2000) {
        return Err(MessagingError::InvalidInput(
            "Message must be 2000 characters or fewer".into(),
        ));
    }

    repository
        .find_conversation(conversation_id, user_id)
        .await?
        .ok_or(MessagingError::NotFound)?;

    repository
        .send_message(
            conversation_id,
            user_id,
            body,
            media_url,
            media_type,
            duration_seconds,
            reply_to_id,
        )
        .await
}

pub async fn react_to_message(
    repository: &dyn MessagingRepository,
    user_id: Uuid,
    message_id: Uuid,
    emoji: &str,
) -> Result<(), MessagingError> {
    let emoji = emoji.trim();
    if emoji.is_empty() || emoji.chars().count() > 8 {
        return Err(MessagingError::InvalidInput("Invalid reaction".into()));
    }
    repository.react_to_message(message_id, user_id, emoji).await
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
