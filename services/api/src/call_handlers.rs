use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use unadomot_api::application::auth::verify_session;
use unadomot_api::application::calls::{CallError, CallRepository};
use uuid::Uuid;

#[derive(Clone)]
pub struct CallState {
    pub calls: Arc<dyn CallRepository>,
    pub jwt_secret: Arc<String>,
}

pub fn router(state: CallState) -> Router {
    Router::new()
        .route("/api/conversations/{id}/calls", post(start_call_handler))
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

fn authorize(state: &CallState, headers: &HeaderMap) -> Result<Uuid, axum::response::Response> {
    let header = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or_else(|| error(StatusCode::UNAUTHORIZED, "Please sign in"))?;

    verify_session(header, &state.jwt_secret)
        .map(|user| user.id)
        .map_err(|_| error(StatusCode::UNAUTHORIZED, "Session expired"))
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

async fn start_call_handler(
    State(state): State<CallState>,
    headers: HeaderMap,
    Path(conversation_id): Path<Uuid>,
    Json(request): Json<StartCallRequest>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers) {
        Ok(id) => id,
        Err(response) => return response,
    };

    if request.offer_sdp.trim().is_empty() {
        return error(StatusCode::BAD_REQUEST, "Call offer is required");
    }

    match state
        .calls
        .create(
            conversation_id,
            user_id,
            request.kind.trim(),
            request.offer_sdp.trim(),
        )
        .await
    {
        Ok(call) => (StatusCode::CREATED, Json(call)).into_response(),
        Err(error_value) => call_error(error_value),
    }
}

async fn get_call_handler(
    State(state): State<CallState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers) {
        Ok(id) => id,
        Err(response) => return response,
    };

    match state.calls.get(id, user_id).await {
        Ok(Some(call)) => Json(call).into_response(),
        Ok(None) => error(StatusCode::NOT_FOUND, "Call not found"),
        Err(error_value) => call_error(error_value),
    }
}

async fn answer_call_handler(
    State(state): State<CallState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(request): Json<AnswerCallRequest>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers) {
        Ok(id) => id,
        Err(response) => return response,
    };

    if request.answer_sdp.trim().is_empty() {
        return error(StatusCode::BAD_REQUEST, "Call answer is required");
    }

    match state
        .calls
        .answer(id, user_id, request.answer_sdp.trim())
        .await
    {
        Ok(call) => Json(call).into_response(),
        Err(error_value) => call_error(error_value),
    }
}

async fn end_call_handler(
    State(state): State<CallState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers) {
        Ok(id) => id,
        Err(response) => return response,
    };

    match state.calls.end(id, user_id).await {
        Ok(call) => Json(call).into_response(),
        Err(error_value) => call_error(error_value),
    }
}
