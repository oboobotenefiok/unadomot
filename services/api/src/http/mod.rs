use crate::application::auth::{issue_session, login, register, verify_session, AuthError, UserRepository};
use crate::application::listings::{
    add_listing_media, browse_listings, create_listing, delete_listing, get_listing,
    update_listing, ListingError, ListingRepository,
};
use crate::domain::listing::{
    Listing, ListingFilter, ListingStatus, ListingUpdate, NewListing, NewListingMedia,
};
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{delete, get, patch, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub users: Arc<dyn UserRepository>,
    pub listings: Arc<dyn ListingRepository>,
    pub jwt_secret: Arc<String>,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct SessionResponse {
    pub token: String,
    pub expires_at: i64,
}

#[derive(Deserialize)]
pub struct CreateListingRequest {
    pub title: String,
    pub description: String,
    pub price: f64,
    pub address: String,
    pub state: String,
    pub lga: String,
    #[serde(default)]
    pub is_agent_listing: bool,
    pub bedrooms: Option<i32>,
    pub bathrooms: Option<i32>,
    pub property_type: Option<String>,
    pub furnishing: Option<String>,
}

#[derive(Deserialize, Default)]
pub struct UpdateListingRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub price: Option<f64>,
    pub address: Option<String>,
    pub state: Option<String>,
    pub lga: Option<String>,
    pub is_agent_listing: Option<bool>,
    pub status: Option<ListingStatus>,
    pub bedrooms: Option<Option<i32>>,
    pub bathrooms: Option<Option<i32>>,
    pub property_type: Option<Option<String>>,
    pub furnishing: Option<Option<String>>,
}

#[derive(Deserialize)]
pub struct AddMediaRequest {
    pub cloudinary_public_id: String,
    pub url: String,
    pub alt_text: Option<String>,
    #[serde(default)]
    pub position: i32,
}

#[derive(Serialize)]
pub struct ListingResponse {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub address: String,
    pub state: String,
    pub lga: String,
    pub is_agent_listing: bool,
    pub status: String,
    pub bedrooms: Option<i32>,
    pub bathrooms: Option<i32>,
    pub property_type: Option<String>,
    pub furnishing: Option<String>,
    pub media: Vec<MediaResponse>,
}

#[derive(Serialize)]
pub struct MediaResponse {
    pub id: Uuid,
    pub cloudinary_public_id: String,
    pub url: String,
    pub alt_text: Option<String>,
    pub position: i32,
}

impl From<Listing> for ListingResponse {
    fn from(listing: Listing) -> Self {
        Self {
            id: listing.id,
            title: listing.title,
            description: listing.description,
            price: listing.price,
            address: listing.address,
            state: listing.state,
            lga: listing.lga,
            is_agent_listing: listing.is_agent_listing,
            status: listing.status.as_str().into(),
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            property_type: listing.property_type,
            furnishing: listing.furnishing,
            media: listing.media.into_iter().map(MediaResponse::from).collect(),
        }
    }
}

impl From<crate::domain::listing::ListingMedia> for MediaResponse {
    fn from(media: crate::domain::listing::ListingMedia) -> Self {
        Self {
            id: media.id,
            cloudinary_public_id: media.cloudinary_public_id,
            url: media.url,
            alt_text: media.alt_text,
            position: media.position,
        }
    }
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/login", post(login_handler))
        .route(
            "/api/listings",
            get(list_listings).post(create_listing_handler),
        )
        .route(
            "/api/listings/{id}",
            get(get_listing_handler)
                .patch(update_listing_handler)
                .delete(delete_listing_handler),
        )
        .route(
            "/api/listings/{id}/media",
            post(add_media_handler),
        )
        .with_state(state)
}

async fn register_handler(
    State(state): State<AppState>,
    Json(request): Json<RegisterRequest>,
) -> Result<Json<SessionResponse>, (StatusCode, String)> {
    let user = register(
        state.users.as_ref(),
        &request.email,
        &request.password,
        &request.name,
    )
    .map_err(auth_error)?;

    let session = issue_session(user.id, user.email, &state.jwt_secret).map_err(auth_error)?;

    Ok(Json(SessionResponse {
        token: session.token,
        expires_at: session.expires_at,
    }))
}

async fn login_handler(
    State(state): State<AppState>,
    Json(request): Json<LoginRequest>,
) -> Result<Json<SessionResponse>, (StatusCode, String)> {
    let session = login(
        state.users.as_ref(),
        &request.email,
        &request.password,
        &state.jwt_secret,
    )
    .map_err(auth_error)?;

    Ok(Json(SessionResponse {
        token: session.token,
        expires_at: session.expires_at,
    }))
}

#[derive(Deserialize, Default)]
struct ListingQuery {
    state: Option<String>,
    lga: Option<String>,
    property_type: Option<String>,
    min_price: Option<f64>,
    max_price: Option<f64>,
    bedrooms: Option<i32>,
    furnishing: Option<String>,
}

async fn list_listings(
    State(state): State<AppState>,
    Query(query): Query<ListingQuery>,
) -> Result<Json<Vec<ListingResponse>>, (StatusCode, String)> {
    let filter = ListingFilter {
        state: query.state,
        lga: query.lga,
        property_type: query.property_type,
        min_price: query.min_price,
        max_price: query.max_price,
        bedrooms: query.bedrooms,
        furnishing: query.furnishing,
    };

    browse_listings(state.listings.as_ref(), &filter)
        .map(|items| Json(items.into_iter().map(ListingResponse::from).collect()))
        .map_err(listing_error)
}

async fn create_listing_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateListingRequest>,
) -> Result<Json<ListingResponse>, (StatusCode, String)> {
    let user = authorize(&state, &headers)?;
    let input = NewListing {
        landlord_id: user.id,
        title: request.title,
        description: request.description,
        price: request.price,
        address: request.address,
        state: request.state,
        lga: request.lga,
        is_agent_listing: request.is_agent_listing,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        property_type: request.property_type,
        furnishing: request.furnishing,
    };

    create_listing(state.listings.as_ref(), user.id, &input)
        .map(|listing| Json(ListingResponse::from(listing)))
        .map_err(listing_error)
}

async fn get_listing_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ListingResponse>, (StatusCode, String)> {
    get_listing(state.listings.as_ref(), id)
        .map_err(listing_error)?
        .map(ListingResponse::from)
        .map(Json)
        .ok_or((StatusCode::NOT_FOUND, "Listing not found".into()))
}

async fn update_listing_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateListingRequest>,
) -> Result<Json<ListingResponse>, (StatusCode, String)> {
    let user = authorize(&state, &headers)?;
    let update = ListingUpdate {
        title: request.title,
        description: request.description,
        price: request.price,
        address: request.address,
        state: request.state,
        lga: request.lga,
        is_agent_listing: request.is_agent_listing,
        status: request.status,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        property_type: request.property_type,
        furnishing: request.furnishing,
    };

    update_listing(state.listings.as_ref(), id, user.id, &update)
        .map(|listing| Json(ListingResponse::from(listing)))
        .map_err(listing_error)
}

async fn delete_listing_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let user = authorize(&state, &headers)?;
    delete_listing(state.listings.as_ref(), id, user.id)
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(listing_error)
}

async fn add_media_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(request): Json<AddMediaRequest>,
) -> Result<Json<MediaResponse>, (StatusCode, String)> {
    let user = authorize(&state, &headers)?;
    let media = NewListingMedia {
        cloudinary_public_id: request.cloudinary_public_id,
        url: request.url,
        alt_text: request.alt_text,
        position: request.position,
    };

    add_listing_media(state.listings.as_ref(), id, user.id, &media)
        .map(|media| Json(MediaResponse::from(media)))
        .map_err(listing_error)
}

fn authorize(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<crate::application::auth::AuthenticatedUser, (StatusCode, String)> {
    let token = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or((StatusCode::UNAUTHORIZED, "Missing bearer token".into()))?;

    verify_session(token, &state.jwt_secret).map_err(auth_error)
}

fn auth_error(error: AuthError) -> (StatusCode, String) {
    match error {
        AuthError::InvalidCredentials => (StatusCode::UNAUTHORIZED, "Invalid credentials".into()),
        AuthError::EmailTaken => (StatusCode::CONFLICT, "Email already registered".into()),
        AuthError::Repository(message) => (StatusCode::SERVICE_UNAVAILABLE, message),
    }
}

fn listing_error(error: ListingError) -> (StatusCode, String) {
    match error {
        ListingError::NotFound => (StatusCode::NOT_FOUND, "Listing not found".into()),
        ListingError::Forbidden => (StatusCode::FORBIDDEN, "Not allowed".into()),
        ListingError::InvalidInput(message) => (StatusCode::BAD_REQUEST, message),
        ListingError::Repository(message) => (StatusCode::SERVICE_UNAVAILABLE, message),
    }
}
