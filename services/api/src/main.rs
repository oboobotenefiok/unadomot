#![allow(clippy::result_large_err)]

mod call_handlers;
mod comment_handlers;
mod messaging_handlers;
mod profile_handlers;

use axum::{
    extract::{DefaultBodyLimit, Request},
    http::{header, HeaderName, HeaderValue, StatusCode},
    middleware::{self, Next},
    response::Response,
};
use sqlx::postgres::PgPoolOptions;
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use tower_http::set_header::SetResponseHeaderLayer;
use unadomot_api::adapters::{
    UnconfiguredCallRepository, UnconfiguredMediaSigner, UnconfiguredMessagingRepository,
    UnconfiguredReportRepository, UnconfiguredRepository, UnconfiguredUserRepository,
    UnconfiguredVerificationRepository,
};
use unadomot_api::application::auth::UserRepository;
use unadomot_api::application::calls::CallRepository;
use unadomot_api::application::listings::ListingRepository;
use unadomot_api::application::media::MediaSigner;
use unadomot_api::application::messaging::MessagingRepository;
use unadomot_api::application::reports::ReportRepository;
use unadomot_api::application::verification::VerificationRepository;
use unadomot_api::http::{public_pages, router, verification, AppState, RateLimiter};
use unadomot_api::infrastructure::cloudinary::CloudinarySigner;
use unadomot_api::infrastructure::postgres::{
    call_repository::PostgresCallRepository, listing_repository::PostgresListingRepository,
    messaging_repository::PostgresMessagingRepository, report_repository::PostgresReportRepository,
    user_repository::PostgresUserRepository,
    verification_repository::PostgresVerificationRepository,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

type Repositories = (
    Arc<dyn UserRepository>,
    Arc<dyn ListingRepository>,
    Arc<dyn MessagingRepository>,
    Arc<dyn ReportRepository>,
    Arc<dyn VerificationRepository>,
    Arc<dyn CallRepository>,
);

static GLOBAL_LIMIT: OnceLock<Mutex<HashMap<String, (Instant, u32)>>> = OnceLock::new();

fn global_limit_store() -> &'static Mutex<HashMap<String, (Instant, u32)>> {
    GLOBAL_LIMIT.get_or_init(|| Mutex::new(HashMap::new()))
}

fn is_placeholder_secret(value: &str) -> bool {
    let lower = value.to_lowercase();
    lower.contains("changeme")
        || lower.contains("change-me")
        || lower.contains("test-secret")
        || lower.contains("your-secret")
        || lower.contains("example")
        || lower == "secret"
        || lower == "password"
}

async fn global_rate_limit(request: Request, next: Next) -> Result<Response, StatusCode> {
    let key = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(|value| value.trim().to_string())
        .unwrap_or_else(|| "unknown".into());

    let limit = std::env::var("RATE_LIMIT_PER_MINUTE")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .unwrap_or(120);

    let allowed = {
        let mut store = global_limit_store().lock().expect("rate limiter lock");
        let now = Instant::now();
        let entry = store.entry(key).or_insert((now, 0));
        if now.duration_since(entry.0) > Duration::from_secs(60) {
            *entry = (now, 0);
        }
        entry.1 += 1;
        entry.1 <= limit
    };

    if !allowed {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    Ok(next.run(request).await)
}

async fn request_log(request: Request, next: Next) -> Response {
    let method = request.method().clone();
    let path = request.uri().path().to_string();
    let request_id = Uuid::new_v4().to_string();
    let started = Instant::now();
    let mut response = next.run(request).await;
    let latency_ms = started.elapsed().as_millis();

    if response.status().is_server_error() {
        tracing::error!(
            %method,
            %path,
            status = %response.status(),
            latency_ms = %latency_ms,
            request_id = %request_id,
            "request failed"
        );
    } else {
        tracing::info!(
            %method,
            %path,
            status = %response.status(),
            latency_ms = %latency_ms,
            request_id = %request_id,
            "request"
        );
    }

    if let Ok(value) = HeaderValue::from_str(&request_id) {
        response.headers_mut().insert("x-request-id", value);
    }
    response
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info,tower_http=info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let migrate_only = std::env::args().any(|arg| arg == "migrate");
    let is_production = std::env::var("FLY_APP_NAME").is_ok()
        || std::env::var("APP_ENV").ok().as_deref() == Some("production");

    let jwt_secret = std::env::var("JWT_SECRET")
        .map_err(|_| "JWT_SECRET is required and must be at least 32 bytes")?;
    if jwt_secret.len() < 32 {
        return Err("JWT_SECRET must be at least 32 bytes".into());
    }
    if is_placeholder_secret(&jwt_secret) {
        return Err("JWT_SECRET must not be a placeholder value".into());
    }

    let refresh_secret = std::env::var("REFRESH_TOKEN_SECRET")
        .map_err(|_| "REFRESH_TOKEN_SECRET is required and must be at least 32 bytes")?;
    if refresh_secret.len() < 32 {
        return Err("REFRESH_TOKEN_SECRET must be at least 32 bytes".into());
    }
    if is_placeholder_secret(&refresh_secret) {
        return Err("REFRESH_TOKEN_SECRET must not be a placeholder value".into());
    }
    if refresh_secret == jwt_secret {
        return Err("REFRESH_TOKEN_SECRET must differ from JWT_SECRET".into());
    }

    if std::env::var("PASSWORD_RESET_DEBUG").ok().as_deref() == Some("1") && is_production {
        return Err("PASSWORD_RESET_DEBUG must not be enabled in production".into());
    }

    let jwt_secret = Arc::new(jwt_secret);
    let database_url = std::env::var("DATABASE_URL").ok();

    if database_url.is_none() && is_production {
        return Err("DATABASE_URL is required in production".into());
    }

    let mut profile_pool: Option<sqlx::PgPool> = None;

    let (users, listings, messaging, reports, verification_repo, calls): Repositories =
        match database_url {
            Some(url) => {
                let pool = PgPoolOptions::new()
                    .max_connections(10)
                    .connect(&url)
                    .await?;

                if migrate_only {
                    sqlx::migrate!("./migrations").run(&pool).await?;
                    tracing::info!("database migrations applied");
                    return Ok(());
                }

                profile_pool = Some(pool.clone());

                (
                    Arc::new(PostgresUserRepository::new(pool.clone())),
                    Arc::new(PostgresListingRepository::new(pool.clone())),
                    Arc::new(PostgresMessagingRepository::new(pool.clone())),
                    Arc::new(PostgresReportRepository::new(pool.clone())),
                    Arc::new(PostgresVerificationRepository::new(pool.clone())),
                    Arc::new(PostgresCallRepository::new(pool)),
                )
            }
            None => {
                if migrate_only {
                    return Err("DATABASE_URL is required to run migrations".into());
                }
                (
                    Arc::new(UnconfiguredUserRepository),
                    Arc::new(UnconfiguredRepository),
                    Arc::new(UnconfiguredMessagingRepository),
                    Arc::new(UnconfiguredReportRepository),
                    Arc::new(UnconfiguredVerificationRepository),
                    Arc::new(UnconfiguredCallRepository),
                )
            }
        };

    let media: Arc<dyn MediaSigner> = match (
        std::env::var("CLOUDINARY_CLOUD_NAME"),
        std::env::var("CLOUDINARY_API_KEY"),
        std::env::var("CLOUDINARY_API_SECRET"),
    ) {
        (Ok(cloud), Ok(key), Ok(secret)) => Arc::new(CloudinarySigner::new(cloud, key, secret)),
        _ if is_production => {
            return Err("CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required in production".into())
        }
        _ => Arc::new(UnconfiguredMediaSigner),
    };

    let allowed_origins = Arc::new(
        std::env::var("ALLOWED_ORIGINS")
            .unwrap_or_default()
            .split(',')
            .map(|origin| origin.trim().to_string())
            .filter(|origin| !origin.is_empty())
            .collect::<Vec<_>>(),
    );

    let state = AppState {
        users: users.clone(),
        listings,
        messaging,
        reports,
        audit: verification_repo.clone(),
        media,
        jwt_secret: jwt_secret.clone(),
        limiter: Arc::new(RateLimiter::new()),
        allowed_origins,
    };

    let verification_state = verification::VerificationState {
        repository: verification_repo,
        users: users.clone(),
        jwt_secret: jwt_secret.clone(),
    };

    let call_state = call_handlers::CallState {
        calls,
        users: users.clone(),
        jwt_secret: jwt_secret.clone(),
    };

    let mut app = router(state.clone())
        .merge(public_pages::router(state.clone()))
        .merge(verification::router(verification_state))
        .merge(messaging_handlers::router(state.clone()))
        .merge(call_handlers::router(call_state));

    if let Some(pool) = profile_pool {
        app = app
            .merge(profile_handlers::router(profile_handlers::ProfileState {
                pool: pool.clone(),
                jwt_secret: jwt_secret.clone(),
            }))
            .merge(comment_handlers::router(comment_handlers::CommentState {
                pool,
                jwt_secret: jwt_secret.clone(),
            }));
    }

    let app = app
        .layer(DefaultBodyLimit::max(2 * 1024 * 1024))
        .layer(middleware::from_fn(global_rate_limit))
        .layer(middleware::from_fn(request_log))
        .layer(SetResponseHeaderLayer::overriding(
            header::STRICT_TRANSPORT_SECURITY,
            HeaderValue::from_static("max-age=31536000; includeSubDomains; preload"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("content-security-policy"),
            HeaderValue::from_static(
                "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
            ),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("permissions-policy"),
            HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("cross-origin-opener-policy"),
            HeaderValue::from_static("same-origin"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("cross-origin-resource-policy"),
            HeaderValue::from_static("same-origin"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("x-permitted-cross-domain-policies"),
            HeaderValue::from_static("none"),
        ))
        .layer(middleware::from_fn(origin_guard));

    let address = std::env::var("BIND_ADDR")
        .or_else(|_| std::env::var("PORT").map(|port| format!("0.0.0.0:{port}")))
        .unwrap_or_else(|_| "127.0.0.1:3000".into());
    let listener = tokio::net::TcpListener::bind(address).await?;
    tracing::info!("UnaDomot API listening on {}", listener.local_addr()?);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn origin_guard(request: Request, next: Next) -> Result<Response, StatusCode> {
    if let Some(origin) = request.headers().get(header::ORIGIN) {
        let origin = origin.to_str().unwrap_or_default();
        let allowed = std::env::var("ALLOWED_ORIGINS").unwrap_or_default();
        let is_allowed = allowed
            .split(',')
            .map(|value| value.trim())
            .any(|value| !value.is_empty() && value == origin);
        if !is_allowed {
            return Err(StatusCode::FORBIDDEN);
        }
    }
    Ok(next.run(request).await)
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_common_placeholder_secrets() {
        assert!(is_placeholder_secret("changeme"));
        assert!(is_placeholder_secret("test-secret-that-is-long-enough"));
        assert!(is_placeholder_secret("your-secret-value"));
        assert!(is_placeholder_secret("example-secret"));
        assert!(is_placeholder_secret("secret"));
        assert!(is_placeholder_secret("password"));
        assert!(!is_placeholder_secret("a-real-random-production-secret"));
    }
}
