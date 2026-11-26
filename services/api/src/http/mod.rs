use crate::application::auth::{
    hash_refresh_token, issue_session, login, new_refresh_token, register, verify_session,
    AuthError, UserRepository,
};
use crate::application::listings::{
    add_listing_media, browse_listings, create_listing, delete_listing, get_listing,
    update_listing, ListingError, ListingRepository,
};
use crate::application::media::{MediaError, MediaSigner};
use crate::application::messaging::{
    list_conversations, list_messages, mark_read, send_message, start_conversation, MessagingError,
    MessagingRepository,
};
use crate::domain::listing::{
    Listing, ListingFilter, ListingStatus, ListingUpdate, NewListing, NewListingMedia,
};
use crate::domain::messaging::{Conversation, ConversationSummary, Message};
use axum::{
    extract::{DefaultBodyLimit, Path, Query, Request, State},
    http::{header, HeaderMap, HeaderValue, Method, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{Duration, Utc};
use redis::AsyncCommands;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::time::{Duration as StdDuration, Instant};
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};
use uuid::Uuid;

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
    pub fn new() -> Self {
        let redis = std::env::var("REDIS_URL")
            .ok()
            .and_then(|url| redis::Client::open(url).ok());
        let limit = std::env::var("RATE_LIMIT_PER_MINUTE")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(120);

        Self {
            redis,
            buckets: Mutex::new(HashMap::new()),
            limit,
        }
    }

    async fn allow(&self, key: &str) -> bool {
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
        Self::new()
    }
}

#[derive(Clone)]
pub struct AppState {
    pub users: Arc<dyn UserRepository>,
    pub listings: Arc<dyn ListingRepository>,
    pub messaging: Arc<dyn MessagingRepository>,
    pub media: Arc<dyn MediaSigner>,
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
    fn new(status: StatusCode, code: &'static str, message: impl Into<String>) -> Self {
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
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Serialize)]
pub struct SessionResponse {
    pub token: String,
    pub refresh_token: String,
    pub expires_at: i64,
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

#[derive(Deserialize, Default)]
pub struct MessageQuery {
    pub before: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct ListingResponse {
    pub id: Uuid,
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

impl From<Listing> for ListingResponse {
    fn from(listing: Listing) -> Self {
        Self {
            id: listing.id,
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

pub fn router(state: AppState) -> Router {
    let limiter_state = state.clone();
    let cors = if state.allowed_origins.is_empty() {
        CorsLayer::permissive()
    } else {
        let origins = state
            .allowed_origins
            .iter()
            .filter_map(|origin| origin.parse::<HeaderValue>().ok())
            .collect::<Vec<_>>();
        CorsLayer::new()
            .allow_origin(AllowOrigin::list(origins))
            .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
            .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
    };

    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/ready", get(ready_handler))
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/login", post(login_handler))
        .route("/api/auth/refresh", post(refresh_handler))
        .route(
            "/api/listings",
            get(list_listings).post(create_listing_handler),
        )
        .route(
            "/api/listings/{id}",
            get(get_listing_handler)
                .patch(update_listing_handler)
                .delete(delete_listing_handler),
        )
        .route("/api/listings/{id}/media", post(add_media_handler))
        .route("/api/listings/{id}/conversations", post(start_conversation_handler))
        .route("/api/media/signature", post(signature_handler))
        .route("/api/conversations", get(conversations_handler))
        .route(
            "/api/conversations/{id}/messages",
            get(messages_handler).post(send_message_handler),
        )
        .route("/api/conversations/{id}/read", post(mark_read_handler))
        .layer(DefaultBodyLimit::max(2 * 1024 * 1024))
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
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(middleware::from_fn_with_state(limiter_state, rate_limit))
        .with_state(state)
}

async fn rate_limit(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, ApiError> {
    let key = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(|value| value.trim().to_string())
        .unwrap_or_else(|| "unknown".into());

    if !state.limiter.allow(&key).await {
        return Err(ApiError::new(
            StatusCode::TOO_MANY_REQUESTS,
            "rate_limited",
            "Too many requests. Please try again shortly.",
        ));
    }

    Ok(next.run(request).await)
}

async fn ready_handler(State(state): State<AppState>) -> Result<StatusCode, ApiError> {
    state
        .listings
        .health_check()
        .await
        .map(|_| StatusCode::OK)
        .map_err(listing_error)
}

async fn register_handler(
    State(state): State<AppState>,
    Json(request): Json<RegisterRequest>,
) -> Result<Json<SessionResponse>, ApiError> {
    let user = register(
        state.users.as_ref(),
        &request.email,
        &request.password,
        &request.name,
    )
    .await
    .map_err(auth_error)?;

    let session = issue_session(user.id, user.email, &state.jwt_secret).map_err(auth_error)?;
    let refresh_token = new_refresh_token();
    state
        .users
        .store_refresh_token(
            user.id,
            &hash_refresh_token(&refresh_token),
            Utc::now() + Duration::days(30),
        )
        .await
        .map_err(auth_error)?;

    Ok(Json(SessionResponse {
        token: session.token,
        refresh_token,
        expires_at: session.expires_at,
    }))
}

async fn login_handler(
    State(state): State<AppState>,
    Json(request): Json<LoginRequest>,
) -> Result<Json<SessionResponse>, ApiError> {
    let session = login(
        state.users.as_ref(),
        &request.email,
        &request.password,
        &state.jwt_secret,
    )
    .await
    .map_err(auth_error)?;

    let user = state
        .users
        .find_by_email(&request.email)
        .await
        .map_err(auth_error)?
        .ok_or_else(|| ApiError::new(StatusCode::UNAUTHORIZED, "invalid_credentials", "Invalid email or password"))?;

    let refresh_token = new_refresh_token();
    state
        .users
        .store_refresh_token(
            user.id,
            &hash_refresh_token(&refresh_token),
            Utc::now() + Duration::days(30),
        )
        .await
        .map_err(auth_error)?;

    Ok(Json(SessionResponse {
        token: session.token,
        refresh_token,
        expires_at: session.expires_at,
    }))
}

async fn refresh_handler(
    State(state): State<AppState>,
    Json(request): Json<RefreshRequest>,
) -> Result<Json<SessionResponse>, ApiError> {
    let new_token = new_refresh_token();
    let user = state
        .users
        .rotate_refresh_token(
            &hash_refresh_token(&request.refresh_token),
            &hash_refresh_token(&new_token),
            Utc::now() + Duration::days(30),
        )
        .await
        .map_err(auth_error)?
        .ok_or_else(|| ApiError::new(StatusCode::UNAUTHORIZED, "invalid_refresh_token", "Refresh token is invalid or expired"))?;

    let session = issue_session(user.id, user.email, &state.jwt_secret).map_err(auth_error)?;

    Ok(Json(SessionResponse {
        token: session.token,
        refresh_token: new_token,
        expires_at: session.expires_at,
    }))
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

async fn create_listing_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateListingRequest>,
) -> Result<Json<ListingResponse>, ApiError> {
    let user = authorize(&state, &headers)?;
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
    get_listing(state.listings.as_ref(), id)
        .await
        .map_err(listing_error)?
        .map(ListingResponse::from)
        .map(Json)
        .ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "not_found", "Listing not found"))
}

async fn update_listing_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateListingRequest>,
) -> Result<Json<ListingResponse>, ApiError> {
    let user = authorize(&state, &headers)?;
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
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let user = authorize(&state, &headers)?;
    delete_listing(state.listings.as_ref(), id, user.id)
        .await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(listing_error)
}

async fn add_media_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(request): Json<AddMediaRequest>,
) -> Result<Json<MediaResponse>, ApiError> {
    let user = authorize(&state, &headers)?;
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
    headers: HeaderMap,
    Json(request): Json<SignatureRequest>,
) -> Result<Json<crate::application::media::UploadSignature>, ApiError> {
    authorize(&state, &headers)?;
    let folder = request
        .folder
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "unadomot/listings".into());

    state.media.sign_upload(&folder).map(Json).map_err(media_error)
}

async fn conversations_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<ConversationSummaryResponse>>, ApiError> {
    let user = authorize(&state, &headers)?;
    list_conversations(state.messaging.as_ref(), user.id)
        .await
        .map(|items| Json(items.into_iter().map(ConversationSummaryResponse::from).collect()))
        .map_err(messaging_error)
}

async fn start_conversation_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<ConversationResponse>, ApiError> {
    let user = authorize(&state, &headers)?;
    start_conversation(state.messaging.as_ref(), id, user.id)
        .await
        .map(|conversation| Json(ConversationResponse::from(conversation)))
        .map_err(messaging_error)
}

async fn messages_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Query(query): Query<MessageQuery>,
) -> Result<Json<Vec<MessageResponse>>, ApiError> {
    let user = authorize(&state, &headers)?;
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
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(request): Json<SendMessageRequest>,
) -> Result<Json<MessageResponse>, ApiError> {
    let user = authorize(&state, &headers)?;
    send_message(state.messaging.as_ref(), user.id, id, &request.body)
        .await
        .map(|message| Json(MessageResponse::from(message)))
        .map_err(messaging_error)
}

async fn mark_read_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let user = authorize(&state, &headers)?;
    mark_read(state.messaging.as_ref(), user.id, id)
        .await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(messaging_error)
}

fn authorize(state: &AppState, headers: &HeaderMap) -> Result<crate::application::auth::AuthenticatedUser, ApiError> {
    let token = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or_else(|| ApiError::new(StatusCode::UNAUTHORIZED, "unauthorized", "Missing bearer token"))?;

    verify_session(token, &state.jwt_secret).map_err(auth_error)
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

fn auth_error(error: AuthError) -> ApiError {
    match error {
        AuthError::InvalidCredentials => ApiError::new(
            StatusCode::UNAUTHORIZED,
            "invalid_credentials",
            "Invalid email or password",
        ),
        AuthError::EmailTaken => ApiError::new(
            StatusCode::CONFLICT,
            "email_taken",
            "Email already registered",
        ),
        AuthError::Validation(message) => {
            ApiError::new(StatusCode::BAD_REQUEST, "validation_error", message)
        }
        AuthError::Repository(_) => ApiError::new(
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
