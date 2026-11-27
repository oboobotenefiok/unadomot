use crate::application::auth::UserRepository;
use crate::application::calls::CallRepository;
use crate::application::comments::CommentRepository;
use crate::application::email::EmailSender;
use crate::application::listings::ListingRepository;
use crate::application::media::MediaSigner;
use crate::application::messaging::{
    list_conversations, list_messages, mark_read, send_message, start_conversation, MessagingError,
    MessagingRepository,
};
use crate::application::profiles::ProfileRepository;
use crate::application::reports::{
    create_report, list_reports, resolve_report, ReportError, ReportRepository,
};
use crate::application::verification::VerificationRepository;
use crate::domain::messaging::{Conversation, ConversationSummary, Message};
use crate::domain::report::Report;
use crate::extract::{AdminUser, AuthUser};
use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration as StdDuration, Instant};
use tower_http::set_header::SetResponseHeaderLayer;
use uuid::Uuid;

pub mod auth;
pub mod listings;
pub mod public_pages;
pub mod verification;

use self::listings::listing_error;

pub struct RateLimiter {
    redis: Option<redis::Client>,
    buckets: Mutex<HashMap<String, Bucket>>,
    limit: u32,
}

struct Bucket {
    window_start: Instant,
    count: u32,
}

impl RateLimiter {
    pub fn new(limit: u32) -> Self {
        let redis = std::env::var("REDIS_URL")
            .ok()
            .and_then(|url| redis::Client::open(url).ok());

        Self {
            redis,
            buckets: Mutex::new(HashMap::new()),
            limit,
        }
    }

    pub async fn allow(&self, key: &str) -> bool {
        if let Some(client) = &self.redis {
            if let Ok(mut connection) = client.get_multiplexed_async_connection().await {
                let redis_key = format!("ratelimit:{key}");
                let count: Result<i64, _> = connection.incr(&redis_key, 1).await;
                if let Ok(count) = count {
                    if count == 1 {
                        let _: Result<(), _> = connection.expire(&redis_key, 60).await;
                    }
                    return count <= self.limit as i64;
                }
            }
        }

        let mut buckets = self.buckets.lock().expect("rate limiter lock");
        let now = Instant::now();
        let bucket = buckets.entry(key.to_string()).or_insert(Bucket {
            window_start: now,
            count: 0,
        });

        if now.duration_since(bucket.window_start) > StdDuration::from_secs(60) {
            bucket.window_start = now;
            bucket.count = 0;
        }

        bucket.count += 1;
        bucket.count <= self.limit
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new(120)
    }
}

#[derive(Clone)]
pub struct AppState {
    pub users: Arc<dyn UserRepository>,
    pub listings: Arc<dyn ListingRepository>,
    pub messaging: Arc<dyn MessagingRepository>,
    pub reports: Arc<dyn ReportRepository>,
    pub audit: Arc<dyn VerificationRepository>,
    pub calls: Arc<dyn CallRepository>,
    pub comments: Option<Arc<dyn CommentRepository>>,
    pub profiles: Option<Arc<dyn ProfileRepository>>,
    pub media: Arc<dyn MediaSigner>,
    pub email: Arc<dyn EmailSender>,
    pub pool: Option<sqlx::PgPool>,
    pub jwt_secret: Arc<String>,
    pub limiter: Arc<RateLimiter>,
    pub allowed_origins: Arc<Vec<String>>,
}

pub struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: String,
}

impl ApiError {
    pub fn new(status: StatusCode, code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status,
            code,
            message: message.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(json!({
                "error": {
                    "code": self.code,
                    "message": self.message,
                }
            })),
        )
            .into_response()
    }
}

#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub body: String,
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

#[derive(Serialize)]
pub struct ReportResponse {
    pub id: Uuid,
    pub listing_id: Uuid,
    pub reporter_id: Uuid,
    pub reason: String,
    pub details: Option<String>,
    pub status: String,
    pub reviewed_by: Option<Uuid>,
    pub reviewed_at: Option<chrono::DateTime<Utc>>,
    pub resolution_notes: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
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

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/ready", get(ready_handler))
        .merge(auth::router())
        .merge(listings::router())
        .route("/api/listings/{id}/reports", post(create_report_handler))
        .route("/api/admin/users/{id}/suspend", post(admin_suspend_user_handler))
        .route("/api/admin/reports", get(admin_list_reports_handler))
        .route("/api/admin/reports/{id}/resolve", post(admin_resolve_report_handler))
        .route("/api/conversations", get(conversations_handler))
        .route(
            "/api/conversations/{id}/messages",
            get(messages_handler).post(send_message_handler),
        )
        .route("/api/conversations/{id}/read", post(mark_read_handler))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::REFERRER_POLICY,
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .with_state(state)
}

async fn ready_handler(State(state): State<AppState>) -> Result<StatusCode, ApiError> {
    state
        .listings
        .health_check()
        .await
        .map(|_| StatusCode::OK)
        .map_err(listing_error)
}

async fn admin_suspend_user_handler(
    State(state): State<AppState>,
    AdminUser { id: user_id }: AdminUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let suspended = state.users.suspend_user(id).await.map_err(auth_error)?;
    if !suspended {
        return Err(ApiError::new(
            StatusCode::NOT_FOUND,
            "not_found",
            "User not found or already suspended",
        ));
    }

    state
        .audit
        .record_audit(user_id, "user.suspend", id, json!({}))
        .await
        .map_err(|_| {
            ApiError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                "Could not record the moderation action",
            )
        })?;

    Ok(StatusCode::NO_CONTENT)
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

fn auth_error(error: crate::application::auth::AuthError) -> ApiError {
    match error {
        crate::application::auth::AuthError::InvalidCredentials => ApiError::new(
            StatusCode::UNAUTHORIZED,
            "invalid_credentials",
            "Invalid email or password",
        ),
        crate::application::auth::AuthError::EmailTaken => ApiError::new(
            StatusCode::CONFLICT,
            "email_taken",
            "Email already registered",
        ),
        crate::application::auth::AuthError::Validation(message) => {
            ApiError::new(StatusCode::BAD_REQUEST, "validation_error", message)
        }
        crate::application::auth::AuthError::Repository(_) => ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "service_unavailable",
            "The service is temporarily unavailable",
        ),
    }
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
