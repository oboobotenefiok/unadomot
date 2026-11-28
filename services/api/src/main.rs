#![allow(clippy::result_large_err)]

mod call_handlers;
mod comment_handlers;
mod messaging_handlers;
mod profile_handlers;

use axum::{
    extract::{DefaultBodyLimit, Request, State},
    http::{header, HeaderName, HeaderValue, Method, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use std::time::Instant;
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
use unadomot_api::application::email::{
    EmailSender, ResendEmailSender, UnconfiguredEmailSender,
};
use unadomot_api::application::listings::ListingRepository;
use unadomot_api::application::media::MediaSigner;
use unadomot_api::application::messaging::MessagingRepository;
use unadomot_api::application::profiles::ProfileRepository;
use unadomot_api::application::reports::ReportRepository;
use unadomot_api::application::verification::VerificationRepository;
use unadomot_api::config::Config;
use unadomot_api::http::{public_pages, router, verification, ApiError, AppState, RateLimiter};
use unadomot_api::infrastructure::cloudinary::CloudinarySigner;
use unadomot_api::infrastructure::postgres::{
    call_repository::PostgresCallRepository, comment_repository::PostgresCommentRepository,
    listing_repository::PostgresListingRepository,
    messaging_repository::PostgresMessagingRepository,
    profile_repository::PostgresProfileRepository,
    report_repository::PostgresReportRepository, user_repository::PostgresUserRepository,
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

/// Resolve the real client IP. Behind Fly's proxy the leftmost
/// `X-Forwarded-For` value is attacker-controlled, so prefer `Fly-Client-IP`
/// and fall back to the last (proxy-appended) hop.
fn client_ip(request: &Request) -> String {
    request
        .headers()
        .get("fly-client-ip")
        .and_then(|value| value.to_str().ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| {
            request
                .headers()
                .get("x-forwarded-for")
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.split(',').last())
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
        })
        .unwrap_or_else(|| "unknown".into())
}

async fn global_rate_limit(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let (bucket, limit, window_secs) = match request.uri().path() {
        "/api/auth/login" | "/api/auth/register" => ("auth", 10, 60),
        "/api/auth/password-reset/request" => ("password-reset", 3, 3600),
        "/api/media/signature" => ("media-signature", 30, 60),
        "/api/verification" => ("verification", 10, 3600),
        _ => ("global", state.limiter.default_limit(), 60),
    };

    let key = format!("{bucket}:{}", client_ip(&request));
    if !state
        .limiter
        .allow_with(&key, limit, std::time::Duration::from_secs(window_secs))
        .await
    {
        let mut response = ApiError::new(
            StatusCode::TOO_MANY_REQUESTS,
            "rate_limited",
            "Too many requests. Please try again shortly.",
        )
        .into_response();
        response.headers_mut().insert(
            header::RETRY_AFTER,
            HeaderValue::from_str(&window_secs.to_string())
                .unwrap_or_else(|_| HeaderValue::from_static("60")),
        );
        return response;
    }

    next.run(request).await
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
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    let migrate_only = std::env::args().any(|arg| arg == "migrate");
    let config = Config::from_env()?;
    let jwt_secret = config.jwt_secret.clone();
    let database_url = config.database_url.clone();

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

    let media: Arc<dyn MediaSigner> = match config.cloudinary.clone() {
        Some(cloudinary) => Arc::new(CloudinarySigner::new(
            cloudinary.cloud_name,
            cloudinary.api_key,
            cloudinary.api_secret,
        )),
        None => Arc::new(UnconfiguredMediaSigner),
    };

    let email: Arc<dyn EmailSender> = match config.resend.clone() {
        Some(resend) => Arc::new(ResendEmailSender::new(resend.api_key, resend.from)),
        None => Arc::new(UnconfiguredEmailSender),
    };

    let comments = profile_pool
        .as_ref()
        .map(|pool| Arc::new(PostgresCommentRepository::new(pool.clone())) as Arc<dyn unadomot_api::application::comments::CommentRepository>);

    let profiles = profile_pool
        .as_ref()
        .map(|pool| Arc::new(PostgresProfileRepository::new(pool.clone())) as Arc<dyn ProfileRepository>);

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
        comments,
        profiles,
        jwt_secret: jwt_secret.clone(),
        limiter: Arc::new(RateLimiter::new(config.rate_limit_per_minute)),
        allowed_origins: config.allowed_origins.clone(),
        app_base_url: Arc::new(config.app_base_url.clone()),
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
        .layer(middleware::from_fn_with_state(
            state.clone(),
            global_rate_limit,
        ))
        .layer(middleware::from_fn(request_log))
        .layer(SetResponseHeaderLayer::overriding(
            header::STRICT_TRANSPORT_SECURITY,
            HeaderValue::from_static("max-age=31536000; includeSubDomains"),
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
        .layer(middleware::from_fn_with_state(state.clone(), origin_guard));

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

async fn origin_guard(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if let Some(origin) = request.headers().get(header::ORIGIN) {
        let origin = origin.to_str().unwrap_or_default();
        let is_allowed = state
            .allowed_origins
            .iter()
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
