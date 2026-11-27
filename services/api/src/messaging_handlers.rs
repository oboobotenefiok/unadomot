use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use unadomot_api::application::auth::{bearer_token, require_active, verify_session};
use unadomot_api::application::messaging::MessagingError;
use unadomot_api::http::AppState;
use uuid::Uuid;

static TYPING: OnceLock<Mutex<HashMap<(Uuid, Uuid), Instant>>> = OnceLock::new();

fn typing_store() -> &'static Mutex<HashMap<(Uuid, Uuid), Instant>> {
    TYPING.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route(
            "/api/conversations/{id}/rich-messages",
            get(list_rich_messages_handler).post(send_rich_message_handler),
        )
        .route("/api/messages/{id}/reactions", post(react_handler))
        .route(
            "/api/conversations/{id}/typing",
            post(typing_ping_handler).get(typing_status_handler),
        )
        .route(
            "/api/conversations/presence",
            get(conversations_presence_handler),
        )
        .with_state(state)
}

#[derive(Deserialize)]
struct RichMessageRequest {
    body: Option<String>,
    media_url: Option<String>,
    media_type: Option<String>,
    duration_seconds: Option<i32>,
    reply_to_id: Option<Uuid>,
}

#[derive(Deserialize)]
struct ReactionRequest {
    emoji: String,
}

#[derive(Deserialize, Default)]
struct RichMessageQuery {
    before: Option<String>,
    limit: Option<i64>,
}

fn error(status: StatusCode, message: &str) -> axum::response::Response {
    (status, Json(json!({ "error": { "message": message } }))).into_response()
}

fn valid_media_url(url: &str) -> bool {
    url.starts_with("https://")
        && url.len() <= 2048
        && !url.contains(' ')
        && !url.contains('\n')
        && !url.contains('\r')
}

async fn authorize(state: &AppState, headers: &HeaderMap) -> Result<Uuid, axum::response::Response> {
    let token = bearer_token(headers)
        .map_err(|_| error(StatusCode::UNAUTHORIZED, "Please sign in"))?;

    let user = verify_session(token, &state.jwt_secret)
        .map_err(|_| error(StatusCode::UNAUTHORIZED, "Session expired"))?;

    require_active(state.users.as_ref(), user.id)
        .await
        .map_err(|_| error(StatusCode::FORBIDDEN, "This account is suspended"))?;

    Ok(user.id)
}

fn messaging_error(error_value: MessagingError) -> axum::response::Response {
    match error_value {
        MessagingError::NotFound => error(StatusCode::NOT_FOUND, "Conversation not found"),
        MessagingError::Forbidden => error(StatusCode::FORBIDDEN, "Not allowed"),
        MessagingError::InvalidInput(message) => error(StatusCode::BAD_REQUEST, &message),
        MessagingError::Repository(_) => error(
            StatusCode::SERVICE_UNAVAILABLE,
            "The service is temporarily unavailable",
        ),
    }
}

async fn require_participant(
    state: &AppState,
    conversation_id: Uuid,
    user_id: Uuid,
) -> Result<(), axum::response::Response> {
    state
        .messaging
        .list_rich_messages(conversation_id, user_id, None, 1)
        .await
        .map(|_| ())
        .map_err(messaging_error)
}

async fn conversations_presence_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers).await {
        Ok(id) => id,
        Err(response) => return response,
    };

    match state.messaging.list_conversations(user_id).await {
        Ok(items) => Json(
            items
                .into_iter()
                .map(|conversation| {
                    json!({
                        "id": conversation.id,
                        "listing_id": conversation.listing_id,
                        "listing_title": conversation.listing_title,
                        "listing_photo_url": conversation.listing_photo_url,
                        "counterpart_id": conversation.counterpart_id,
                        "counterpart_name": conversation.counterpart_name,
                        "counterpart_verified": conversation.counterpart_verified,
                        "counterpart_last_active": conversation.counterpart_last_active,
                        "last_message_preview": conversation.last_message_preview,
                        "last_message_at": conversation.last_message_at,
                        "unread_count": conversation.unread_count,
                        "created_at": conversation.created_at,
                    })
                })
                .collect::<Vec<_>>(),
        )
        .into_response(),
        Err(error_value) => messaging_error(error_value),
    }
}

async fn typing_ping_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(conversation_id): Path<Uuid>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers).await {
        Ok(id) => id,
        Err(response) => return response,
    };

    if let Err(response) = require_participant(&state, conversation_id, user_id).await {
        return response;
    }

    if let Ok(mut store) = typing_store().lock() {
        store.insert((conversation_id, user_id), Instant::now());
        store.retain(|_, at| at.elapsed() < Duration::from_secs(30));
    }
    StatusCode::NO_CONTENT.into_response()
}

async fn typing_status_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(conversation_id): Path<Uuid>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers).await {
        Ok(id) => id,
        Err(response) => return response,
    };

    if let Err(response) = require_participant(&state, conversation_id, user_id).await {
        return response;
    }

    let typing = typing_store()
        .lock()
        .map(|store| {
            store.iter().any(|((cid, uid), at)| {
                *cid == conversation_id
                    && *uid != user_id
                    && at.elapsed() < Duration::from_secs(5)
            })
        })
        .unwrap_or(false);

    Json(json!({ "typing": typing })).into_response()
}

async fn list_rich_messages_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(conversation_id): Path<Uuid>,
    Query(query): Query<RichMessageQuery>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers).await {
        Ok(id) => id,
        Err(response) => return response,
    };

    match state
        .messaging
        .list_rich_messages(
            conversation_id,
            user_id,
            query.before,
            query.limit.unwrap_or(50).clamp(1, 50),
        )
        .await
    {
        Ok(messages) => Json(messages).into_response(),
        Err(error_value) => messaging_error(error_value),
    }
}

async fn send_rich_message_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(conversation_id): Path<Uuid>,
    Json(request): Json<RichMessageRequest>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers).await {
        Ok(id) => id,
        Err(response) => return response,
    };

    let body = request.body.as_deref().map(str::trim).filter(|value| !value.is_empty());
    if body.is_none() && request.media_url.is_none() {
        return error(StatusCode::BAD_REQUEST, "A message or attachment is required");
    }
    if body.is_some_and(|value| value.len() > 2000) {
        return error(StatusCode::BAD_REQUEST, "Message is too long");
    }

    if let Some(url) = request.media_url.as_deref() {
        if !valid_media_url(url) {
            return error(StatusCode::BAD_REQUEST, "Attachment URL must be a valid HTTPS URL");
        }
    }

    if let Some(kind) = request.media_type.as_deref() {
        if !matches!(kind, "image" | "video" | "audio" | "file") {
            return error(StatusCode::BAD_REQUEST, "Unsupported attachment type");
        }
    }

    if let Some(duration) = request.duration_seconds {
        if !(0..=600).contains(&duration) {
            return error(StatusCode::BAD_REQUEST, "Attachment duration is out of range");
        }
    }

    match state
        .messaging
        .send_rich_message(
            conversation_id,
            user_id,
            body,
            request.media_url.as_deref(),
            request.media_type.as_deref(),
            request.duration_seconds,
            request.reply_to_id,
        )
        .await
    {
        Ok(message) => (StatusCode::CREATED, Json(message)).into_response(),
        Err(error_value) => messaging_error(error_value),
    }
}

async fn react_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(message_id): Path<Uuid>,
    Json(request): Json<ReactionRequest>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers).await {
        Ok(id) => id,
        Err(response) => return response,
    };

    let emoji = request.emoji.trim();
    if emoji.is_empty() || emoji.chars().count() > 8 {
        return error(StatusCode::BAD_REQUEST, "Invalid reaction");
    }

    match state
        .messaging
        .react_to_message(message_id, user_id, emoji)
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error_value) => messaging_error(error_value),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_https_media_urls() {
        assert!(!valid_media_url("http://example.com/a.jpg"));
        assert!(!valid_media_url("javascript:alert(1)"));
        assert!(!valid_media_url("https://example.com/a b.jpg"));
        assert!(valid_media_url("https://res.cloudinary.com/demo/image/upload/a.jpg"));
    }
}
