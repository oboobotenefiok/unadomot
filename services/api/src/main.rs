use axum::{extract::{Query, State}, http::StatusCode, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use unadomot_api::application::listings::{browse_listings, ListingError, ListingRepository};
use unadomot_api::domain::listing::ListingFilter;

#[derive(Clone)]
struct AppState {
    listings: Arc<dyn ListingRepository>,
}

#[derive(Deserialize, Default)]
struct BrowseQuery {
    state: Option<String>,
    lga: Option<String>,
    property_type: Option<String>,
}

#[derive(Serialize)]
struct ListingResponse {
    id: uuid::Uuid,
    title: String,
    price: f64,
    state: String,
    lga: String,
}

async fn listings(
    State(state): State<AppState>,
    Query(query): Query<BrowseQuery>,
) -> Result<Json<Vec<ListingResponse>>, (StatusCode, String)> {
    let filter = ListingFilter {
        state: query.state,
        lga: query.lga,
        property_type: query.property_type,
        ..Default::default()
    };

    browse_listings(state.listings.as_ref(), &filter)
        .map(|items| {
            Json(
                items
                    .into_iter()
                    .map(|listing| ListingResponse {
                        id: listing.id,
                        title: listing.title,
                        price: listing.price,
                        state: listing.state,
                        lga: listing.lga,
                    })
                    .collect(),
            )
        })
        .map_err(|error| match error {
            ListingError::Repository(message) => (StatusCode::SERVICE_UNAVAILABLE, message),
        })
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = std::env::var("DATABASE_URL").ok();
    let repository: Arc<dyn ListingRepository> = match database_url {
        Some(url) => {
            let pool = sqlx::postgres::PgPoolOptions::new()
                .max_connections(10)
                .connect(&url)
                .await?;
            Arc::new(unadomot_api::infrastructure::postgres::listing_repository::PostgresListingRepository::new(pool))
        }
        None => Arc::new(unadomot_api::adapters::UnconfiguredRepository),
    };

    let app = Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/api/listings", get(listings))
        .with_state(AppState { listings: repository });

    let address = std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:3000".into());
    let listener = tokio::net::TcpListener::bind(address).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
