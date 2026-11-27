use crate::application::messaging::{
    list_conversations, list_messages, mark_read, send_message, start_conversation, MessagingError,
};
use crate::domain::messaging::{Conversation, ConversationSummary, Message};
use crate::extract::AuthUser;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::{ApiError, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/conversations", get(conversations_handler))
        .route(
            "/api/conversations/{id}/messages",
            get(messages_handler).post(send_message_handler),
        )
        .route("/api/conversations/{id}/read", post(mark_read_handler))
        .route(
            "/api/listings/{id}/conversations",
            post(start_conversation_handler),
        )
}

#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub body: String,
}

#[derive(Deserialize, Default)]
pub struct MessageQuery {
    pub before: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct ConversationResponse {
    pub id: Uuid,
    pub listing_id: Uuid,
    pub participant_a: Uuid,
    pub participant_b: Uuid,
    pub last_message_preview: Option<String>,
    pub last_message_at: Option<chrono::DateTime<Utc>>,
    pub last_sender_id: Option<Uuid>,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Serialize)]
pub struct ConversationSummaryResponse {
    pub id: Uuid,
    pub listing_id: Uuid,
    pub listing_title: String,
    pub listing_photo_url: Option<String>,
    pub counterpart_id: Uuid,
    pub counterpart_name: String,
    pub counterpart_verified: bool,
    pub last_message_preview: Option<String>,
    pub last_message_at: Option<chrono::DateTime<Utc>>,
    pub unread_count: i64,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Serialize)]
pub struct MessageResponse {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub sender_id: Uuid,
    pub body: String,
    pub created_at: chrono::DateTime<Utc>,
    pub read_at: Option<chrono::DateTime<Utc>>,
}

impl From<Conversation> for ConversationResponse {
    fn from(conversation: Conversation) -> Self {
        Self {
            id: conversation.id,
            listing_id: conversation.listing_id,
            participant_a: conversation.participant_a,
            participant_b: conversation.participant_b,
            last_message_preview: conversation.last_message_preview,
            last_message_at: conversation.last_message_at,
            last_sender_id: conversation.last_sender_id,
            created_at: conversation.created_at,
        }
    }
}

impl From<ConversationSummary> for ConversationSummaryResponse {
    fn from(conversation: ConversationSummary) -> Self {
        Self {
            id: conversation.id,
            listing_id: conversation.listing_id,
            listing_title: conversation.listing_title,
            listing_photo_url: conversation.listing_photo_url,
            counterpart_id: conversation.counterpart_id,
            counterpart_name: conversation.counterpart_name,
            counterpart_verified: conversation.counterpart_verified,
            last_message_preview: conversation.last_message_preview,
            last_message_at: conversation.last_message_at,
            unread_count: conversation.unread_count,
            created_at: conversation.created_at,
        }
    }
}

impl From<Message> for MessageResponse {
    fn from(message: Message) -> Self {
        Self {
            id: message.id,
            conversation_id: message.conversation_id,
            sender_id: message.sender_id,
            body: message.body,
            created_at: message.created_at,
            read_at: message.read_at,
        }
    }
}

async fn conversations_handler(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<ConversationSummaryResponse>>, ApiError> {
    list_conversations(state.messaging.as_ref(), user.id)
        .await
        .map(|items| Json(items.into_iter().map(ConversationSummaryResponse::from).collect()))
        .map_err(messaging_error)
}

async fn start_conversation_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ConversationResponse>, ApiError> {
    start_conversation(state.messaging.as_ref(), id, user.id)
        .await
        .map(|conversation| Json(ConversationResponse::from(conversation)))
        .map_err(messaging_error)
}

async fn messages_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Query(query): Query<MessageQuery>,
) -> Result<Json<Vec<MessageResponse>>, ApiError> {
    let before = query
        .before
        .as_deref()
        .map(|value| {
            chrono::DateTime::parse_from_rfc3339(value)
                .map(|value| value.with_timezone(&Utc))
                .map_err(|_| {
                    ApiError::new(
                        StatusCode::BAD_REQUEST,
                        "validation_error",
                        "Invalid before cursor",
                    )
                })
        })
        .transpose()?;

    list_messages(
        state.messaging.as_ref(),
        user.id,
        id,
        before,
        query.limit.unwrap_or(50),
    )
    .await
    .map(|items| Json(items.into_iter().map(MessageResponse::from).collect()))
    .map_err(messaging_error)
}

async fn send_message_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<SendMessageRequest>,
) -> Result<Json<MessageResponse>, ApiError> {
    send_message(state.messaging.as_ref(), user.id, id, &request.body)
        .await
        .map(|message| Json(MessageResponse::from(message)))
        .map_err(messaging_error)
}

async fn mark_read_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    mark_read(state.messaging.as_ref(), user.id, id)
        .await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(messaging_error)
}

fn messaging_error(error: MessagingError) -> ApiError {
    match error {
        MessagingError::NotFound => {
            ApiError::new(StatusCode::NOT_FOUND, "not_found", "Conversation not found")
        }
        MessagingError::Forbidden => ApiError::new(
            StatusCode::FORBIDDEN,
            "forbidden",
            "You are not a participant in this conversation",
        ),
        MessagingError::InvalidInput(message) => {
            ApiError::new(StatusCode::BAD_REQUEST, "validation_error", message)
        }
        MessagingError::Repository(_) => ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "service_unavailable",
            "The service is temporarily unavailable",
        ),
    }
}
