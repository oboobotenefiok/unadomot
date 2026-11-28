use crate::application::verification::{
    my_request, pending_requests, submit_request, VerificationError,
};
use crate::domain::verification::VerificationRequest;
use crate::extract::{AdminUser, AuthUser};
use crate::http::{ApiError, AppState};
use axum::{
    extract::{Path, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
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
    /// Signed URL. Only populated by the dedicated document endpoint.
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
        .route(
            "/api/admin/verification/{id}/document",
            get(admin_document_handler),
        )
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
    _admin: AdminUser,
) -> Result<Json<Vec<VerificationResponse>>, ApiError> {
    let requests = pending_requests(state.audit.as_ref())
        .await
        .map_err(verification_error)?;

    Ok(Json(
        requests
            .into_iter()
            .map(|request| VerificationResponse::from_request(request, None))
            .collect(),
    ))
}

async fn admin_document_handler(
    State(state): State<AppState>,
    AdminUser { id: admin_id }: AdminUser,
    Path(id): Path<Uuid>,
) -> Result<Response, ApiError> {
    let request = state
        .audit
        .find_by_id(id)
        .await
        .map_err(verification_error)?
        .ok_or_else(|| {
            ApiError::new(
                StatusCode::NOT_FOUND,
                "not_found",
                "Verification request not found",
            )
        })?;

    let public_id = request.document_public_id.ok_or_else(|| {
        ApiError::new(
            StatusCode::NOT_FOUND,
            "not_found",
            "No document is attached to this request",
        )
    })?;

    state
        .audit
        .record_audit(
            admin_id,
            "verification.document.view",
            id,
            json!({}),
        )
        .await
        .map_err(verification_error)?;

    let url = state
        .media
        .signed_delivery_url(&public_id)
        .map_err(media_error)?;

    let mut response = Json(json!({ "document_url": url })).into_response();
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    Ok(response)
}

async fn admin_review_handler(
    State(state): State<AppState>,
    AdminUser { id: admin_id }: AdminUser,
    Path(id): Path<Uuid>,
    Json(request): Json<ReviewRequest>,
) -> Result<Json<VerificationResponse>, ApiError> {
    let status = if request.approve {
        "approved"
    } else {
        "rejected"
    };
    let reviewed = state
        .audit
        .review_with_audit(
            id,
            status,
            request.review_notes.as_deref(),
            admin_id,
            json!({"approve": request.approve, "status": status}),
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
