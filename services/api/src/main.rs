use axum::{extract::State, http::StatusCode, routing::get, Json, Router};
use serde::Serialize;
use std::sync::Arc;
use unadomot_api::{
    adapters::UnconfiguredRepository,
    application::{browse_listings, ListingRepository},
};

type Repository = Arc<dyn ListingRepository>;

#[derive(Serialize)]
struct ListingResponse {
    id: String,
    title: String,
}

async fn listings(
    State(repository): State<Repository>,
) -> Result<Json<Vec<ListingResponse>>, (StatusCode, &'static str)> {
    browse_listings(repository.as_ref())
        .map(|items| {
            Json(
                items
                    .into_iter()
                    .map(|item| ListingResponse {
                        id: item.id,
                        title: item.title,
                    })
                    .collect(),
            )
        })
        .map_err(|_| (StatusCode::SERVICE_UNAVAILABLE, "Persistence not configured"))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let repository: Repository = Arc::new(UnconfiguredRepository);
    let app = Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/api/listings", get(listings))
        .with_state(repository);
    let address = std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:3000".into());
    let listener = tokio::net::TcpListener::bind(address).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
