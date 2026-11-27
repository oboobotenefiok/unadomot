use crate::application::auth::UserRepository;
use crate::application::calls::CallRepository;
use crate::application::comments::CommentRepository;
use crate::application::email::EmailSender;
use crate::application::listings::{
    add_listing_media, admin_remove_listing, admin_restore_listing, browse_listings,
    create_listing, delete_listing, get_public_listing, list_my_listings, update_listing,
    ListingError, ListingRepository,
};
use crate::application::media::{MediaError, MediaSigner};
use crate::application::messaging::{
    list_conversations, list_messages, mark_read, send_message, start_conversation, MessagingError,
    MessagingRepository,
};
use crate::application::profiles::ProfileRepository;
use crate::application::reports::{
    create_report, list_reports, resolve_report, ReportError, ReportRepository,
};
use crate::application::verification::VerificationRepository;
use crate::domain::listing::{
    Listing, ListingFilter, ListingStatus, ListingUpdate, NewListing, NewListingMedia,
};
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
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::time::{Duration as StdDuration, Instant};
use tower_http::set_header::SetResponseHeaderLayer;
use uuid::Uuid;

pub mod auth;
pub mod public_pages;
pub mod verification;

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
pub struct CreateListingRequest {
    pub title: String,
    pub description: String,
    pub price: String,
    pub address: String,
    pub state: String,
    pub lga: String,
    #[serde(default)]
    pub is_agent_listing: bool,
    pub bedrooms: Option<i32>,
    pub bathrooms: Option<i32>,
    pub property_type: Option<String>,
    pub furnishing: Option<String>,
}

#[derive(Deserialize, Default)]
pub struct UpdateListingRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub price: Option<String>,
    pub address: Option<String>,
    pub state: Option<String>,
    pub lga: Option<String>,
    pub is_agent_listing: Option<bool>,
    pub status: Option<ListingStatus>,
    pub bedrooms: Option<Option<i32>>,
    pub bathrooms: Option<Option<i32>>,
    pub property_type: Option<Option<String>>,
    pub furnishing: Option<Option<String>>,
}

#[derive(Deserialize)]
pub struct AddMediaRequest {
    pub cloudinary_public_id: String,
    pub url: String,
    pub alt_text: Option<String>,
    #[serde(default)]
    pub position: i32,
}

#[derive(Deserialize, Default)]
pub struct SignatureRequest {
    pub folder: Option<String>,
}

#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub body: String,
}

#[derive(Deserialize)]
pub struct AdminRemoveRequest {
    pub reason: String,
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
pub struct ListingResponse {
    pub id: Uuid,
    pub landlord_id: Uuid,
    pub landlord_name: String,
    pub landlord_verified: bool,
    pub landlord_photo_url: Option<String>,
    pub title: String,
    pub description: String,
    pub price: String,
    pub address: String,
    pub state: String,
    pub lga: String,
    pub is_agent_listing: bool,
    pub status: String,
    pub bedrooms: Option<i32>,
    pub bathrooms: Option<i32>,
    pub property_type: Option<String>,
    pub furnishing: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
    pub media: Vec<MediaResponse>,
}

#[derive(Serialize)]
pub struct ListingPageResponse {
    pub items: Vec<ListingResponse>,
    pub has_more: bool,
    pub next_offset: i64,
}

#[derive(Serialize)]
pub struct MediaResponse {
    pub id: Uuid,
    pub cloudinary_public_id: String,
    pub url: String,
    pub alt_text: Option<String>,
    pub position: i32,
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

impl From<Listing> for ListingResponse {
    fn from(listing: Listing) -> Self {
        Self {
            id: listing.id,
            landlord_id: listing.landlord_id,
            landlord_name: listing.landlord_name,
            landlord_verified: listing.landlord_verified,
            landlord_photo_url: listing.landlord_photo_url,
            title: listing.title,
            description: listing.description,
            price: listing.price.to_string(),
            address: listing.address,
            state: listing.state,
            lga: listing.lga,
            is_agent_listing: listing.is_agent_listing,
            status: listing.status.as_str().into(),
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            property_type: listing.property_type,
            furnishing: listing.furnishing,
            created_at: listing.created_at,
            media: listing.media.into_iter().map(MediaResponse::from).collect(),
        }
    }
}

impl From<crate::domain::listing::ListingMedia> for MediaResponse {
    fn from(media: crate::domain::listing::ListingMedia) -> Self {
        Self {
            id: media.id,
            cloudinary_public_id: media.cloudinary_public_id,
            url: media.url,
            alt_text: media.alt_text,
            position: media.position,
        }
    }
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
        .route(
            "/api/listings",
            get(list_listings).post(create_listing_handler),
        )
        .route("/api/me/listings", get(my_listings_handler))
        .route(
            "/api/listings/{id}",
            get(get_listing_handler)
                .patch(update_listing_handler)
                .delete(delete_listing_handler),
        )
        .route("/api/listings/{id}/media", post(add_media_handler))
        .route("/api/listings/{id}/reports", post(create_report_handler))
        .route("/api/listings/{id}/conversations", post(start_conversation_handler))
        .route("/api/admin/listings/{id}/remove", post(admin_remove_listing_handler))
        .route("/api/admin/listings/{id}/restore", post(admin_restore_listing_handler))
        .route("/api/admin/users/{id}/suspend", post(admin_suspend_user_handler))
        .route("/api/admin/reports", get(admin_list_reports_handler))
        .route("/api/admin/reports/{id}/resolve", post(admin_resolve_report_handler))
        .route("/api/media/signature", post(signature_handler))
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

fn valid_media_url(url: &str) -> bool {
    url.starts_with("https://res.cloudinary.com/")
        && url.contains("/upload/")
        && url.len() <= 2048
        && !url.contains(char::is_whitespace)
}

fn valid_cloudinary_public_id(public_id: &str) -> bool {
    public_id.starts_with("unadomot/")
        && !public_id.contains("..")
        && public_id.len() <= 255
        && public_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '_' | '-' | '.'))
}

#[derive(Deserialize, Default)]
struct ListingQuery {
    state: Option<String>,
    lga: Option<String>,
    property_type: Option<String>,
    min_price: Option<String>,
    max_price: Option<String>,
    bedrooms: Option<i32>,
    furnishing: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
}

async fn list_listings(
    State(state): State<AppState>,
    Query(query): Query<ListingQuery>,
) -> Result<Json<ListingPageResponse>, ApiError> {
    let filter = ListingFilter {
        state: query.state,
        lga: query.lga,
        property_type: query.property_type,
        min_price: parse_optional_decimal(query.min_price)?,
        max_price: parse_optional_decimal(query.max_price)?,
        bedrooms: query.bedrooms,
        furnishing: query.furnishing,
    };

    let page = browse_listings(
        state.listings.as_ref(),
        &filter,
        query.limit.unwrap_or(20),
        query.offset.unwrap_or(0),
    )
    .await
    .map_err(listing_error)?;

    Ok(Json(ListingPageResponse {
        items: page.items.into_iter().map(ListingResponse::from).collect(),
        has_more: page.has_more,
        next_offset: page.next_offset,
    }))
}

async fn my_listings_handler(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<ListingResponse>>, ApiError> {
    list_my_listings(state.listings.as_ref(), user.id)
        .await
        .map(|items| Json(items.into_iter().map(ListingResponse::from).collect()))
        .map_err(listing_error)
}

async fn create_listing_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Json(request): Json<CreateListingRequest>,
) -> Result<Json<ListingResponse>, ApiError> {
    let input = NewListing {
        landlord_id: user.id,
        title: request.title,
        description: request.description,
        price: parse_decimal(&request.price)?,
        address: request.address,
        state: request.state,
        lga: request.lga,
        is_agent_listing: request.is_agent_listing,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        property_type: request.property_type,
        furnishing: request.furnishing,
    };

    create_listing(state.listings.as_ref(), user.id, &input)
        .await
        .map(|listing| Json(ListingResponse::from(listing)))
        .map_err(listing_error)
}

async fn get_listing_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ListingResponse>, ApiError> {
    get_public_listing(state.listings.as_ref(), id)
        .await
        .map_err(listing_error)?
        .map(ListingResponse::from)
        .map(Json)
        .ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "not_found", "Listing not found"))
}

async fn update_listing_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateListingRequest>,
) -> Result<Json<ListingResponse>, ApiError> {
    let update = ListingUpdate {
        title: request.title,
        description: request.description,
        price: parse_optional_decimal(request.price)?,
        address: request.address,
        state: request.state,
        lga: request.lga,
        is_agent_listing: request.is_agent_listing,
        status: request.status,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        property_type: request.property_type,
        furnishing: request.furnishing,
    };

    update_listing(state.listings.as_ref(), id, user.id, &update)
        .await
        .map(|listing| Json(ListingResponse::from(listing)))
        .map_err(listing_error)
}

async fn delete_listing_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    delete_listing(state.listings.as_ref(), id, user.id)
        .await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(listing_error)
}

async fn admin_remove_listing_handler(
    State(state): State<AppState>,
    AdminUser { id: user_id }: AdminUser,
    Path(id): Path<Uuid>,
    Json(request): Json<AdminRemoveRequest>,
) -> Result<Json<ListingResponse>, ApiError> {
    let listing = admin_remove_listing(state.listings.as_ref(), id, user_id, &request.reason)
        .await
        .map_err(listing_error)?;
    state
        .audit
        .record_audit(
            user_id,
            "listing.remove",
            id,
            json!({"reason": request.reason}),
        )
        .await
        .map_err(|_| {
            ApiError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                "Could not record the moderation action",
            )
        })?;

    Ok(Json(ListingResponse::from(listing)))
}

async fn admin_restore_listing_handler(
    State(state): State<AppState>,
    AdminUser { id: user_id }: AdminUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ListingResponse>, ApiError> {
    let listing = admin_restore_listing(state.listings.as_ref(), id, user_id)
        .await
        .map_err(listing_error)?;
    state
        .audit
        .record_audit(user_id, "listing.restore", id, json!({}))
        .await
        .map_err(|_| {
            ApiError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                "Could not record the moderation action",
            )
        })?;

    Ok(Json(ListingResponse::from(listing)))
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

async fn add_media_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<AddMediaRequest>,
) -> Result<Json<MediaResponse>, ApiError> {
    if !valid_cloudinary_public_id(&request.cloudinary_public_id) {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "validation_error",
            "Media must be uploaded to the UnaDomot Cloudinary folder",
        ));
    }
    if !valid_media_url(&request.url) {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "validation_error",
            "Media URL must be a Cloudinary HTTPS upload URL",
        ));
    }

    let media = NewListingMedia {
        cloudinary_public_id: request.cloudinary_public_id,
        url: request.url,
        alt_text: request.alt_text,
        position: request.position,
    };

    add_listing_media(state.listings.as_ref(), id, user.id, &media)
        .await
        .map(|media| Json(MediaResponse::from(media)))
        .map_err(listing_error)
}

async fn signature_handler(
    State(state): State<AppState>,
    _user: AuthUser,
    Json(request): Json<SignatureRequest>,
) -> Result<Json<crate::application::media::UploadSignature>, ApiError> {
    let folder = request
        .folder
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "unadomot/listings".into());

    state
        .media
        .sign_upload(&folder)
        .map(Json)
        .map_err(media_error)
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

fn parse_decimal(value: &str) -> Result<Decimal, ApiError> {
    Decimal::from_str(value.trim()).map_err(|_| {
        ApiError::new(
            StatusCode::BAD_REQUEST,
            "validation_error",
            "Price must be a valid decimal number",
        )
    })
}

fn parse_optional_decimal(value: Option<String>) -> Result<Option<Decimal>, ApiError> {
    value.map(|value| parse_decimal(&value)).transpose()
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

fn listing_error(error: ListingError) -> ApiError {
    match error {
        ListingError::NotFound => {
            ApiError::new(StatusCode::NOT_FOUND, "not_found", "Listing not found")
        }
        ListingError::Forbidden => ApiError::new(
            StatusCode::FORBIDDEN,
            "forbidden",
            "You are not allowed to perform this action",
        ),
        ListingError::InvalidInput(message) => {
            ApiError::new(StatusCode::BAD_REQUEST, "validation_error", message)
        }
        ListingError::Repository(_) => ApiError::new(
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

fn media_error(error: MediaError) -> ApiError {
    match error {
        MediaError::NotConfigured => ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "media_not_configured",
            "Media uploads are not configured",
        ),
        MediaError::Signing(_) => ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "media_signing_failed",
            "Could not sign the upload",
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_cloudinary_https_media() {
        assert!(valid_media_url(
            "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"
        ));
    }

    #[test]
    fn rejects_non_cloudinary_or_http_media() {
        assert!(!valid_media_url("http://res.cloudinary.com/demo/image/upload/a.jpg"));
        assert!(!valid_media_url("https://evil.example/image/upload/a.jpg"));
        assert!(!valid_media_url("https://res.cloudinary.com/demo/image/a.jpg"));
        assert!(!valid_media_url("https://res.cloudinary.com/demo/image/upload/a b.jpg"));
    }

    #[test]
    fn requires_unadomot_folder_for_public_id() {
        assert!(valid_cloudinary_public_id("unadomot/listings/photo-1"));
        assert!(!valid_cloudinary_public_id("other/listings/photo-1"));
        assert!(!valid_cloudinary_public_id("unadomot/listings/../secret"));
    }
}
