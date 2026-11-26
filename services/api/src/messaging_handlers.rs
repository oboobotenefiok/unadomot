use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use unadomot_api::application::auth::verify_session;
use unadomot_api::application::messaging::MessagingError;
use unadomot_api::http::AppState;
use uuid::Uuid;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route(
            "/api/conversations/{id}/rich-messages",
            get(list_rich_messages_handler).post(send_rich_message_handler),
        )
        .route("/api/messages/{id}/reactions", post(react_handler))
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

fn authorize(state: &AppState, headers: &HeaderMap) -> Result<Uuid, axum::response::Response> {
    let header = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or_else(|| error(StatusCode::UNAUTHORIZED, "Please sign in"))?;

    verify_session(header, &state.jwt_secret)
        .map(|user| user.id)
        .map_err(|_| error(StatusCode::UNAUTHORIZED, "Session expired"))
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

async fn list_rich_messages_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(conversation_id): Path<Uuid>,
    Query(query): Query<RichMessageQuery>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers) {
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
    let user_id = match authorize(&state, &headers) {
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
    let user_id = match authorize(&state, &headers) {
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
