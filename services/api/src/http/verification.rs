use crate::application::verification::{
    my_request, pending_requests, review_request, submit_request, VerificationError,
};
use crate::domain::verification::VerificationRequest;
use crate::extract::{AdminUser, AuthUser};
use crate::http::{ApiError, AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct SubmitRequest {
    pub document_public_id: String,
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
    pub document_public_id: Option<String>,
    /// Short-lived signed URL. Only populated for admin review responses.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document_url: Option<String>,
    pub notes: Option<String>,
    pub status: String,
    pub review_notes: Option<String>,
    pub reviewed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl VerificationResponse {
    fn from_request(request: VerificationRequest, document_url: Option<String>) -> Self {
        Self {
            id: request.id,
            user_id: request.user_id,
            document_public_id: request.document_public_id,
            document_url,
            notes: request.notes,
            status: request.status,
            review_notes: request.review_notes,
            reviewed_at: request.reviewed_at,
            created_at: request.created_at,
        }
    }
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/verification", post(submit_handler))
        .route("/api/verification/me", get(my_handler))
        .route("/api/admin/verification", get(admin_list_handler))
        .route("/api/admin/verification/{id}/review", post(admin_review_handler))
        .with_state(state)
}

async fn submit_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Json(request): Json<SubmitRequest>,
) -> Result<Json<VerificationResponse>, ApiError> {
    submit_request(
        state.audit.as_ref(),
        user.id,
        &request.document_public_id,
        request.notes.as_deref(),
    )
    .await
    .map(|request| Json(VerificationResponse::from_request(request, None)))
    .map_err(verification_error)
}

async fn my_handler(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Option<VerificationResponse>>, ApiError> {
    my_request(state.audit.as_ref(), user.id)
        .await
        .map(|request| {
            Json(request.map(|request| VerificationResponse::from_request(request, None)))
        })
        .map_err(verification_error)
}

async fn admin_list_handler(
    State(state): State<AppState>,
    AdminUser { id: admin_id }: AdminUser,
) -> Result<Json<Vec<VerificationResponse>>, ApiError> {
    let requests = pending_requests(state.audit.as_ref())
        .await
        .map_err(verification_error)?;

    let mut responses = Vec::with_capacity(requests.len());
    for request in requests {
        let document_url = match request.document_public_id.as_deref() {
            Some(public_id) => {
                state
                    .audit
                    .record_audit(
                        admin_id,
                        "verification.document.view",
                        request.id,
                        json!({}),
                    )
                    .await
                    .map_err(verification_error)?;
                Some(
                    state
                        .media
                        .signed_delivery_url(public_id)
                        .map_err(media_error)?,
                )
            }
            None => None,
        };
        responses.push(VerificationResponse::from_request(request, document_url));
    }

    Ok(Json(responses))
}

async fn admin_review_handler(
    State(state): State<AppState>,
    AdminUser { id: admin_id }: AdminUser,
    Path(id): Path<Uuid>,
    Json(request): Json<ReviewRequest>,
) -> Result<Json<VerificationResponse>, ApiError> {
    let reviewed = review_request(
        state.audit.as_ref(),
        id,
        request.approve,
        request.review_notes.as_deref(),
    )
    .await
    .map_err(verification_error)?;

    state
        .audit
        .record_audit(
            admin_id,
            "verification.review",
            id,
            json!({"approve": request.approve, "status": reviewed.status}),
        )
        .await
        .map_err(verification_error)?;

    Ok(Json(VerificationResponse::from_request(reviewed, None)))
}

fn media_error(error: crate::application::media::MediaError) -> ApiError {
    match error {
        crate::application::media::MediaError::NotConfigured => ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "media_not_configured",
            "Media uploads are not configured",
        ),
        crate::application::media::MediaError::Signing(_) => ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "media_signing_failed",
            "Could not sign the document URL",
        ),
    }
}

fn verification_error(error: VerificationError) -> ApiError {
    match error {
        VerificationError::NotFound => ApiError::new(
            StatusCode::NOT_FOUND,
            "not_found",
            "Verification request not found",
        ),
        VerificationError::Conflict(message) => {
            ApiError::new(StatusCode::CONFLICT, "conflict", message)
        }
        VerificationError::InvalidInput(message) => {
            ApiError::new(StatusCode::BAD_REQUEST, "validation_error", message)
        }
        VerificationError::Repository(_) => ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "service_unavailable",
            "The service is temporarily unavailable",
        ),
    }
}
