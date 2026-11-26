use crate::application::auth::{verify_session, UserRepository};
use crate::application::verification::{
    my_request, pending_requests, review_request, submit_request, VerificationError,
    VerificationRepository,
};
use crate::domain::verification::VerificationRequest;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct VerificationState {
    pub repository: Arc<dyn VerificationRepository>,
    pub users: Arc<dyn UserRepository>,
    pub jwt_secret: Arc<String>,
}

pub struct VerificationApiError {
    status: StatusCode,
    code: &'static str,
    message: String,
}

impl VerificationApiError {
    fn new(status: StatusCode, code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status,
            code,
            message: message.into(),
        }
    }
}

impl IntoResponse for VerificationApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(json!({"error": {"code": self.code, "message": self.message}})),
        )
            .into_response()
    }
}

#[derive(Deserialize)]
pub struct SubmitRequest {
    pub document_url: String,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct ReviewRequest {
    pub approve: bool,
    pub review_notes: Option<String>,
}

#[derive(Serialize)]
pub struct VerificationResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub document_url: String,
    pub notes: Option<String>,
    pub status: String,
    pub review_notes: Option<String>,
    pub reviewed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<VerificationRequest> for VerificationResponse {
    fn from(request: VerificationRequest) -> Self {
        Self {
            id: request.id,
            user_id: request.user_id,
            document_url: request.document_url,
            notes: request.notes,
            status: request.status,
            review_notes: request.review_notes,
            reviewed_at: request.reviewed_at,
            created_at: request.created_at,
        }
    }
}

pub fn router(state: VerificationState) -> Router {
    Router::new()
        .route("/api/verification", post(submit_handler))
        .route("/api/verification/me", get(my_handler))
        .route("/api/admin/verification", get(admin_list_handler))
        .route("/api/admin/verification/{id}/review", post(admin_review_handler))
        .with_state(state)
}

fn authorize(
    state: &VerificationState,
    headers: &HeaderMap,
) -> Result<crate::application::auth::AuthenticatedUser, VerificationApiError> {
    let token = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or_else(|| {
            VerificationApiError::new(
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                "Missing bearer token",
            )
        })?;

    verify_session(token, &state.jwt_secret).map_err(|_| {
        VerificationApiError::new(
            StatusCode::UNAUTHORIZED,
            "unauthorized",
            "Invalid or expired token",
        )
    })
}

async fn authorize_admin(
    state: &VerificationState,
    headers: &HeaderMap,
) -> Result<crate::application::auth::AuthenticatedUser, VerificationApiError> {
    let user = authorize(state, headers)?;
    let is_db_admin = state.users.is_admin(user.id).await.unwrap_or(false);

    if !is_db_admin {
        return Err(VerificationApiError::new(
            StatusCode::FORBIDDEN,
            "forbidden",
            "Administrator access required",
        ));
    }
    Ok(user)
}

async fn submit_handler(
    State(state): State<VerificationState>,
    headers: HeaderMap,
    Json(request): Json<SubmitRequest>,
) -> Result<Json<VerificationResponse>, VerificationApiError> {
    let user = authorize(&state, &headers)?;
    submit_request(
        state.repository.as_ref(),
        user.id,
        &request.document_url,
        request.notes.as_deref(),
    )
    .await
    .map(|request| Json(VerificationResponse::from(request)))
    .map_err(verification_error)
}

async fn my_handler(
    State(state): State<VerificationState>,
    headers: HeaderMap,
) -> Result<Json<Option<VerificationResponse>>, VerificationApiError> {
    let user = authorize(&state, &headers)?;
    my_request(state.repository.as_ref(), user.id)
        .await
        .map(|request| Json(request.map(VerificationResponse::from)))
        .map_err(verification_error)
}

async fn admin_list_handler(
    State(state): State<VerificationState>,
    headers: HeaderMap,
) -> Result<Json<Vec<VerificationResponse>>, VerificationApiError> {
    authorize_admin(&state, &headers).await?;
    pending_requests(state.repository.as_ref())
        .await
        .map(|requests| Json(requests.into_iter().map(VerificationResponse::from).collect()))
        .map_err(verification_error)
}

async fn admin_review_handler(
    State(state): State<VerificationState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(request): Json<ReviewRequest>,
) -> Result<Json<VerificationResponse>, VerificationApiError> {
    let admin = authorize_admin(&state, &headers).await?;
    let reviewed = review_request(
        state.repository.as_ref(),
        id,
        request.approve,
        request.review_notes.as_deref(),
    )
    .await
    .map_err(verification_error)?;

    state
        .repository
        .record_audit(
            admin.id,
            "verification.review",
            id,
            json!({"approve": request.approve, "status": reviewed.status}),
        )
        .await
        .map_err(verification_error)?;

    Ok(Json(VerificationResponse::from(reviewed)))
}

fn verification_error(error: VerificationError) -> VerificationApiError {
    match error {
        VerificationError::NotFound => VerificationApiError::new(
            StatusCode::NOT_FOUND,
            "not_found",
            "Verification request not found",
        ),
        VerificationError::Conflict(message) => {
            VerificationApiError::new(StatusCode::CONFLICT, "conflict", message)
        }
        VerificationError::InvalidInput(message) => {
            VerificationApiError::new(StatusCode::BAD_REQUEST, "validation_error", message)
        }
        VerificationError::Repository(_) => VerificationApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "service_unavailable",
            "The service is temporarily unavailable",
        ),
    }
}
