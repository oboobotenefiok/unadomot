use crate::application::reports::{
    create_report, list_reports, resolve_report, ReportError,
};
use crate::domain::report::Report;
use crate::extract::{AdminUser, AuthUser};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use super::{ApiError, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/listings/{id}/reports", post(create_report_handler))
        .route("/api/admin/reports", get(admin_list_reports_handler))
        .route(
            "/api/admin/reports/{id}/resolve",
            post(admin_resolve_report_handler),
        )
}

#[derive(Deserialize)]
pub struct CreateReportRequest {
    pub reason: String,
    pub details: Option<String>,
}

#[derive(Deserialize)]
pub struct ResolveReportRequest {
    pub status: String,
    pub notes: Option<String>,
}

#[derive(Deserialize, Default)]
pub struct ReportQuery {
    pub status: Option<String>,
}

#[derive(Serialize)]
pub struct ReportResponse {
    pub id: Uuid,
    pub listing_id: Uuid,
    pub reporter_id: Uuid,
    pub reason: String,
    pub details: Option<String>,
    pub status: String,
    pub reviewed_by: Option<Uuid>,
    pub reviewed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub resolution_notes: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<Report> for ReportResponse {
    fn from(report: Report) -> Self {
        Self {
            id: report.id,
            listing_id: report.listing_id,
            reporter_id: report.reporter_id,
            reason: report.reason,
            details: report.details,
            status: report.status,
            reviewed_by: report.reviewed_by,
            reviewed_at: report.reviewed_at,
            resolution_notes: report.resolution_notes,
            created_at: report.created_at,
        }
    }
}

async fn create_report_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<CreateReportRequest>,
) -> Result<Json<ReportResponse>, ApiError> {
    create_report(
        state.reports.as_ref(),
        id,
        user.id,
        &request.reason,
        request.details.as_deref(),
    )
    .await
    .map(|report| Json(ReportResponse::from(report)))
    .map_err(report_error)
}

async fn admin_list_reports_handler(
    State(state): State<AppState>,
    _admin: AdminUser,
    Query(query): Query<ReportQuery>,
) -> Result<Json<Vec<ReportResponse>>, ApiError> {
    list_reports(
        state.reports.as_ref(),
        query.status.as_deref().unwrap_or("pending"),
    )
    .await
    .map(|items| Json(items.into_iter().map(ReportResponse::from).collect()))
    .map_err(report_error)
}

async fn admin_resolve_report_handler(
    State(state): State<AppState>,
    AdminUser { id: user_id }: AdminUser,
    Path(id): Path<Uuid>,
    Json(request): Json<ResolveReportRequest>,
) -> Result<Json<ReportResponse>, ApiError> {
    let report = resolve_report(
        state.reports.as_ref(),
        id,
        user_id,
        &request.status,
        request.notes.as_deref(),
    )
    .await
    .map_err(report_error)?;
    state
        .audit
        .record_audit(
            user_id,
            "report.resolve",
            id,
            json!({"status": request.status, "notes": request.notes}),
        )
        .await
        .map_err(|_| {
            ApiError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                "Could not record the moderation action",
            )
        })?;

    Ok(Json(ReportResponse::from(report)))
}

fn report_error(error: ReportError) -> ApiError {
    match error {
        ReportError::NotFound => {
            ApiError::new(StatusCode::NOT_FOUND, "not_found", "Report or listing not found")
        }
        ReportError::InvalidInput(message) => {
            ApiError::new(StatusCode::BAD_REQUEST, "validation_error", message)
        }
        ReportError::Repository(_) => ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "service_unavailable",
            "The service is temporarily unavailable",
        ),
    }
}
