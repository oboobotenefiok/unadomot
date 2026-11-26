use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use unadomot_api::adapters::{
    UnconfiguredMediaSigner, UnconfiguredMessagingRepository, UnconfiguredReportRepository,
    UnconfiguredRepository, UnconfiguredUserRepository, UnconfiguredVerificationRepository,
};
use unadomot_api::application::auth::UserRepository;
use unadomot_api::application::listings::ListingRepository;
use unadomot_api::application::media::MediaSigner;
use unadomot_api::application::messaging::MessagingRepository;
use unadomot_api::application::reports::ReportRepository;
use unadomot_api::application::verification::VerificationRepository;
use unadomot_api::http::{public_pages, router, verification, AppState, RateLimiter};
use unadomot_api::infrastructure::cloudinary::CloudinarySigner;
use unadomot_api::infrastructure::postgres::{
    listing_repository::PostgresListingRepository,
    messaging_repository::PostgresMessagingRepository,
    report_repository::PostgresReportRepository,
    user_repository::PostgresUserRepository,
    verification_repository::PostgresVerificationRepository,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

type Repositories = (
    Arc<dyn UserRepository>,
    Arc<dyn ListingRepository>,
    Arc<dyn MessagingRepository>,
    Arc<dyn ReportRepository>,
    Arc<dyn VerificationRepository>,
);

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info,tower_http=info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let migrate_only = std::env::args().any(|arg| arg == "migrate");

    let jwt_secret = std::env::var("JWT_SECRET")
        .map_err(|_| "JWT_SECRET is required and must be at least 32 bytes")?;
    if jwt_secret.len() < 32 {
        return Err("JWT_SECRET must be at least 32 bytes".into());
    }

    let refresh_secret = std::env::var("REFRESH_TOKEN_SECRET")
        .map_err(|_| "REFRESH_TOKEN_SECRET is required and must be at least 32 bytes")?;
    if refresh_secret.len() < 32 {
        return Err("REFRESH_TOKEN_SECRET must be at least 32 bytes".into());
    }
    if refresh_secret == jwt_secret {
        return Err("REFRESH_TOKEN_SECRET must differ from JWT_SECRET".into());
    }

    if std::env::var("PASSWORD_RESET_DEBUG").ok().as_deref() == Some("1")
        && std::env::var("APP_ENV").ok().as_deref() == Some("production")
    {
        return Err("PASSWORD_RESET_DEBUG must not be enabled in production".into());
    }

    let jwt_secret = Arc::new(jwt_secret);
    let database_url = std::env::var("DATABASE_URL").ok();

    if database_url.is_none() && std::env::var("FLY_APP_NAME").is_ok() {
        return Err("DATABASE_URL is required in production".into());
    }

    let (users, listings, messaging, reports, verification_repo): Repositories =
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

                (
                    Arc::new(PostgresUserRepository::new(pool.clone())),
                    Arc::new(PostgresListingRepository::new(pool.clone())),
                    Arc::new(PostgresMessagingRepository::new(pool.clone())),
                    Arc::new(PostgresReportRepository::new(pool.clone())),
                    Arc::new(PostgresVerificationRepository::new(pool)),
                )
            }
            None => {
                if migrate_only {
                    return Err("DATABASE_URL is required to run migrations".into());
                }
                (
                    Arc::new(UnconfiguredUserRepository),
                    Arc::new(UnconfiguredListingRepository),
                    Arc::new(UnconfiguredMessagingRepository),
                    Arc::new(UnconfiguredReportRepository),
                    Arc::new(UnconfiguredVerificationRepository),
                )
            }
        };

    let media: Arc<dyn MediaSigner> = match (
        std::env::var("CLOUDINARY_CLOUD_NAME"),
        std::env::var("CLOUDINARY_API_KEY"),
        std::env::var("CLOUDINARY_API_SECRET"),
    ) {
        (Ok(cloud), Ok(key), Ok(secret)) => Arc::new(CloudinarySigner::new(cloud, key, secret)),
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
        users,
        jwt_secret,
    };

    let app = router(state.clone())
        .merge(public_pages::router(state.clone()))
        .merge(verification::router(verification_state))
        .merge(messaging_handlers::router(state));

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
