use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use unadomot_api::adapters::{
    UnconfiguredMediaSigner, UnconfiguredRepository, UnconfiguredUserRepository,
};
use unadomot_api::application::auth::UserRepository;
use unadomot_api::application::listings::ListingRepository;
use unadomot_api::application::media::MediaSigner;
use unadomot_api::http::{public_pages, router, AppState};
use unadomot_api::infrastructure::cloudinary::CloudinarySigner;
use unadomot_api::infrastructure::postgres::{
    listing_repository::PostgresListingRepository, user_repository::PostgresUserRepository,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info,tower_http=info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let jwt_secret = std::env::var("JWT_SECRET")
        .map_err(|_| "JWT_SECRET is required and must be at least 32 bytes")?;
    if jwt_secret.len() < 32 {
        return Err("JWT_SECRET must be at least 32 bytes".into());
    }
    let jwt_secret = Arc::new(jwt_secret);

    let (users, listings): (Arc<dyn UserRepository>, Arc<dyn ListingRepository>) =
        match std::env::var("DATABASE_URL").ok() {
            Some(url) => {
                let pool = PgPoolOptions::new()
                    .max_connections(10)
                    .connect(&url)
                    .await?;
                sqlx::migrate!("./migrations").run(&pool).await?;
                (
                    Arc::new(PostgresUserRepository::new(pool.clone())),
                    Arc::new(PostgresListingRepository::new(pool)),
                )
            }
            None => (
                Arc::new(UnconfiguredUserRepository),
                Arc::new(UnconfiguredRepository),
            ),
        };

    let media: Arc<dyn MediaSigner> = match (
        std::env::var("CLOUDINARY_CLOUD_NAME"),
        std::env::var("CLOUDINARY_API_KEY"),
        std::env::var("CLOUDINARY_API_SECRET"),
    ) {
        (Ok(cloud), Ok(key), Ok(secret)) => Arc::new(CloudinarySigner::new(cloud, key, secret)),
        _ => Arc::new(UnconfiguredMediaSigner),
    };

    let state = AppState {
        users,
        listings,
        media,
        jwt_secret,
    };

    let app = router(state.clone()).merge(public_pages::router(state));

    let address = std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:3000".into());
    let listener = tokio::net::TcpListener::bind(address).await?;
    tracing::info!("UnaDomot API listening on {}", listener.local_addr()?);
    axum::serve(listener, app).await?;
    Ok(())
}
