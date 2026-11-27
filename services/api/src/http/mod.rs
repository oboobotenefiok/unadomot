use crate::application::auth::UserRepository;
use crate::application::calls::CallRepository;
use crate::application::comments::CommentRepository;
use crate::application::email::EmailSender;
use crate::application::listings::ListingRepository;
use crate::application::media::MediaSigner;
use crate::application::messaging::MessagingRepository;
use crate::application::profiles::ProfileRepository;
use crate::application::reports::ReportRepository;
use crate::application::verification::VerificationRepository;
use crate::extract::AdminUser;
use axum::{
    extract::{Path, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use redis::AsyncCommands;
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration as StdDuration, Instant};
use tower_http::set_header::SetResponseHeaderLayer;
use uuid::Uuid;

pub mod auth;
pub mod listings;
pub mod messaging;
pub mod public_pages;
pub mod reports;
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
    pub app_base_url: Arc<String>,
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

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/ready", get(ready_handler))
        .merge(auth::router())
        .merge(listings::router())
        .merge(messaging::router())
        .merge(reports::router())
        .route("/api/admin/users/{id}/suspend", post(admin_suspend_user_handler))
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
    let suspended = state.users.suspend_user(id).await.map_err(|_| {
        ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "service_unavailable",
            "The service is temporarily unavailable",
        )
    })?;
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
