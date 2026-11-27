#![allow(clippy::result_large_err)]

mod call_handlers;
mod comment_handlers;
mod messaging_handlers;
mod profile_handlers;

use axum::{
    extract::{DefaultBodyLimit, Request},
    http::{header, HeaderName, HeaderValue, Method, StatusCode},
    middleware::{self, Next},
    response::Response,
};
use sqlx::postgres::PgPoolOptions;
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};
use unadomot_api::adapters::{
    UnconfiguredCallRepository, UnconfiguredMediaSigner, UnconfiguredMessagingRepository,
    UnconfiguredReportRepository, UnconfiguredRepository, UnconfiguredUserRepository,
    UnconfiguredVerificationRepository,
};
use unadomot_api::application::auth::UserRepository;
use unadomot_api::application::calls::CallRepository;
use unadomot_api::application::email;
use unadomot_api::application::listings::ListingRepository;
use unadomot_api::application::media::MediaSigner;
use unadomot_api::application::messaging::MessagingRepository;
use unadomot_api::application::reports::ReportRepository;
use unadomot_api::application::verification::VerificationRepository;
use unadomot_api::config::Config;
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
    let config = Config::from_env()?;
    let is_production = config.is_production;
    let jwt_secret = config.jwt_secret.clone();
    let database_url = config.database_url.clone();

    if std::env::var("PASSWORD_RESET_DEBUG").ok().as_deref() == Some("1") && is_production {
        return Err("PASSWORD_RESET_DEBUG must not be enabled in production".into());
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

    if is_production
        && (std::env::var("RESEND_API_KEY").map_or(true, |value| value.trim().is_empty())
            || std::env::var("EMAIL_FROM").map_or(true, |value| value.trim().is_empty()))
    {
        return Err("RESEND_API_KEY and EMAIL_FROM are required in production".into());
    }

    let email = email::from_env();
    let allowed_origins = config.allowed_origins.clone();

    let state = AppState {
        users: users.clone(),
        listings,
        messaging,
        reports,
        audit: verification_repo,
        media,
        email,
        pool: profile_pool.clone(),
        calls,
        jwt_secret: jwt_secret.clone(),
        limiter: Arc::new(RateLimiter::new()),
        allowed_origins,
    };

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

    let mut app = router(state.clone())
        .merge(public_pages::router(state.clone()))
        .merge(verification::router(state.clone()))
        .merge(messaging_handlers::router(state.clone()))
        .merge(call_handlers::router(state.clone()));

    if profile_pool.is_some() {
        app = app
            .merge(profile_handlers::router(state.clone()))
            .merge(comment_handlers::router(state.clone()));
    }

    let app = app
        .layer(DefaultBodyLimit::max(2 * 1024 * 1024))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
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
