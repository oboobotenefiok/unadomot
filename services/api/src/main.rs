use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use unadomot_api::adapters::{UnconfiguredRepository, UnconfiguredUserRepository};
use unadomot_api::application::auth::UserRepository;
use unadomot_api::application::listings::ListingRepository;
use unadomot_api::http::{router, AppState};
use unadomot_api::infrastructure::postgres::{
    listing_repository::PostgresListingRepository, user_repository::PostgresUserRepository,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let jwt_secret = Arc::new(
        std::env::var("JWT_SECRET").unwrap_or_else(|_| "development-only-change-me".into()),
    );

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

    let app = router(AppState {
        users,
        listings,
        jwt_secret,
    });

    let address = std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:3000".into());
    let listener = tokio::net::TcpListener::bind(address).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
