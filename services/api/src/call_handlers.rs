use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use base64::Engine;
use chrono::Utc;
use hmac::{Hmac, Mac};
use serde::Deserialize;
use serde_json::json;
use sha1::Sha1;
use unadomot_api::application::calls::CallError;
use unadomot_api::extract::AuthUser;
use unadomot_api::http::AppState;
use uuid::Uuid;

const MAX_SDP_BYTES: usize = 64 * 1024;
const TURN_TTL_SECONDS: i64 = 3600;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/conversations/{id}/calls", post(start_call_handler))
        .route("/api/conversations/{id}/calls/history", get(call_history_handler))
        .route("/api/calls/incoming", get(incoming_calls_handler))
        .route("/api/calls/ice", get(ice_servers_handler))
        .route("/api/calls/{id}", get(get_call_handler))
        .route("/api/calls/{id}/answer", post(answer_call_handler))
        .route("/api/calls/{id}/end", post(end_call_handler))
        .with_state(state)
}

#[derive(Deserialize)]
struct StartCallRequest {
    kind: String,
    offer_sdp: String,
}

#[derive(Deserialize)]
struct AnswerCallRequest {
    answer_sdp: String,
}

fn error(status: StatusCode, message: &str) -> axum::response::Response {
    (status, Json(json!({ "error": { "message": message } }))).into_response()
}

fn turn_credential(secret: &str, username: &str) -> String {
    let mut mac = Hmac::<Sha1>::new_from_slice(secret.as_bytes())
        .expect("HMAC accepts keys of any size");
    mac.update(username.as_bytes());
    base64::engine::general_purpose::STANDARD.encode(mac.finalize().into_bytes())
}

fn call_error(error_value: CallError) -> axum::response::Response {
    match error_value {
        CallError::NotFound => error(StatusCode::NOT_FOUND, "Call not found"),
        CallError::Forbidden => error(StatusCode::FORBIDDEN, "Not allowed"),
        CallError::InvalidInput(message) => error(StatusCode::BAD_REQUEST, &message),
        CallError::Repository(_) => error(
            StatusCode::SERVICE_UNAVAILABLE,
            "The service is temporarily unavailable",
        ),
    }
}

async fn ice_servers_handler(
    State(state): State<AppState>,
    user: AuthUser,
) -> axum::response::Response {
    let mut servers = vec![json!({
        "urls": "stun:stun.l.google.com:19302"
    })];

    if let (Ok(urls), Ok(secret)) = (
        std::env::var("TURN_URLS"),
        std::env::var("TURN_SECRET"),
    ) {
        if !urls.trim().is_empty() && !secret.trim().is_empty() {
            let expiry = Utc::now().timestamp() + TURN_TTL_SECONDS;
            let username = format!("{expiry}:{}", user.id);
            let credential = turn_credential(&secret, &username);

            servers.push(json!({
                "urls": urls,
                "username": username,
                "credential": credential,
            }));
        }
    }

    Json(json!({ "ice_servers": servers })).into_response()
}

async fn start_call_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(conversation_id): Path<Uuid>,
    Json(request): Json<StartCallRequest>,
) -> axum::response::Response {
    let kind = request.kind.trim();
    if !matches!(kind, "audio" | "video") {
        return error(StatusCode::BAD_REQUEST, "Call kind must be audio or video");
    }

    if request.offer_sdp.trim().is_empty() {
        return error(StatusCode::BAD_REQUEST, "Call offer is required");
    }
    if request.offer_sdp.len() > MAX_SDP_BYTES {
        return error(StatusCode::BAD_REQUEST, "Call offer is too large");
    }

    match state
        .calls
        .create(
            conversation_id,
            user.id,
            kind,
            request.offer_sdp.trim(),
        )
        .await
    {
        Ok(call) => (StatusCode::CREATED, Json(call)).into_response(),
        Err(error_value) => call_error(error_value),
    }
}

async fn call_history_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(conversation_id): Path<Uuid>,
) -> axum::response::Response {
    match state.calls.history(conversation_id, user.id).await {
        Ok(calls) => Json(calls).into_response(),
        Err(error_value) => call_error(error_value),
    }
}

async fn incoming_calls_handler(
    State(state): State<AppState>,
    user: AuthUser,
) -> axum::response::Response {
    match state.calls.incoming(user.id).await {
        Ok(calls) => Json(calls).into_response(),
        Err(error_value) => call_error(error_value),
    }
}

async fn get_call_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> axum::response::Response {
    match state.calls.get(id, user.id).await {
        Ok(Some(call)) => Json(call).into_response(),
        Ok(None) => error(StatusCode::NOT_FOUND, "Call not found"),
        Err(error_value) => call_error(error_value),
    }
}

async fn answer_call_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<AnswerCallRequest>,
) -> axum::response::Response {
    if request.answer_sdp.trim().is_empty() {
        return error(StatusCode::BAD_REQUEST, "Call answer is required");
    }
    if request.answer_sdp.len() > MAX_SDP_BYTES {
        return error(StatusCode::BAD_REQUEST, "Call answer is too large");
    }

    match state
        .calls
        .answer(id, user.id, request.answer_sdp.trim())
        .await
    {
        Ok(call) => Json(call).into_response(),
        Err(error_value) => call_error(error_value),
    }
}

async fn end_call_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> axum::response::Response {
    match state.calls.end(id, user.id).await {
        Ok(call) => Json(call).into_response(),
        Err(error_value) => call_error(error_value),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn turn_credentials_are_deterministic_and_secret_bound() {
        let first = turn_credential("turn-secret", "1700000000:user-id");
        let second = turn_credential("turn-secret", "1700000000:user-id");
        let other = turn_credential("other-secret", "1700000000:user-id");

        assert_eq!(first, second);
        assert_ne!(first, other);
        assert!(!first.is_empty());
    }
}
