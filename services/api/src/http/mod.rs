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
pub mod calls;
pub mod chat;
pub mod comments;
pub mod listings;
pub mod messaging;
pub mod profile;
pub mod public_pages;
pub mod reports;
pub mod verification;

use self::listings::listing_error;

/// Maximum number of in-memory buckets kept before expired entries are pruned.
const MAX_BUCKETS: usize = 10_000;

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

    pub fn default_limit(&self) -> u32 {
        self.limit
    }

    pub async fn allow(&self, key: &str) -> bool {
        self.allow_with(key, self.limit, StdDuration::from_secs(60))
            .await
    }

    /// Counts a request against `key` with an explicit budget and window.
    /// Redis expiry is set atomically on key creation so a crash between
    /// `INCR` and `EXPIRE` can never leave a permanent block.
    pub async fn allow_with(&self, key: &str, limit: u32, window: StdDuration) -> bool {
        if let Some(client) = &self.redis {
            if let Ok(mut connection) = client.get_multiplexed_async_connection().await {
                let redis_key = format!("ratelimit:{key}");
                let _: Result<bool, _> = redis::cmd("SET")
                    .arg(&redis_key)
                    .arg(0)
                    .arg("EX")
                    .arg(window.as_secs())
                    .arg("NX")
                    .query_async(&mut connection)
                    .await;
                let count: Result<i64, _> = connection.incr(&redis_key, 1).await;
                if let Ok(count) = count {
                    return count <= limit as i64;
                }
            }
        }

        let mut buckets = self
            .buckets
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let now = Instant::now();

        if buckets.len() >= MAX_BUCKETS {
            buckets.retain(|_, bucket| now.duration_since(bucket.window_start) <= window);
        }

        let bucket = buckets.entry(key.to_string()).or_insert(Bucket {
            window_start: now,
            count: 0,
        });

        if now.duration_since(bucket.window_start) > window {
            bucket.window_start = now;
            bucket.count = 0;
        }

        bucket.count += 1;
        bucket.count <= limit
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

/// Builds the complete application router. Every route is mounted regardless
/// of whether a database is configured; handlers return 503 when a repository
/// is absent. Exposed from the library so integration tests can exercise every
/// route without binding a socket.
pub fn app(state: AppState) -> Router {
    router(state.clone())
        .merge(public_pages::router(state.clone()))
        .merge(verification::router(state.clone()))
        .merge(chat::router(state.clone()))
        .merge(calls::router(state.clone()))
        .merge(profile::router(state.clone()))
        .merge(comments::router(state.clone()))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn enforces_per_key_budgets() {
        let limiter = RateLimiter::new(2);
        let window = StdDuration::from_secs(60);
        assert!(limiter.allow_with("a", 2, window).await);
        assert!(limiter.allow_with("a", 2, window).await);
        assert!(!limiter.allow_with("a", 2, window).await);
        assert!(limiter.allow_with("b", 2, window).await);
    }

    #[tokio::test]
    async fn separate_budgets_do_not_share_counters() {
        let limiter = RateLimiter::new(10);
        let window = StdDuration::from_secs(60);
        assert!(limiter.allow_with("auth:1.2.3.4", 1, window).await);
        assert!(!limiter.allow_with("auth:1.2.3.4", 1, window).await);
        assert!(limiter.allow_with("global:1.2.3.4", 10, window).await);
    }
}
