use crate::application::listings::{
    add_favorite, add_listing_media, admin_remove_listing, admin_restore_listing, browse_listings,
    create_listing, delete_listing, get_public_listing, get_public_listing_by_code,
    list_favorites, list_my_listings, remove_favorite, update_listing, ListingError,
};
use crate::application::media::{MediaError, UploadPurpose, UploadRequest};
use crate::domain::listing::{
    Listing, ListingFilter, ListingStatus, ListingUpdate, NewListing, NewListingMedia,
};
use crate::extract::{AdminUser, AuthUser};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;
use uuid::Uuid;

use super::{ApiError, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/listings",
            get(list_listings).post(create_listing_handler),
        )
        .route("/api/me/listings", get(my_listings_handler))
        .route("/api/favorites", get(favorites_handler))
        .route(
            "/api/favorites/{id}",
            post(add_favorite_handler).delete(remove_favorite_handler),
        )
        .route("/api/listings/code/{code}", get(get_listing_by_code_handler))
        .route(
            "/api/listings/{id}",
            get(get_listing_handler)
                .patch(update_listing_handler)
                .delete(delete_listing_handler),
        )
        .route("/api/listings/{id}/media", post(add_media_handler))
        .route("/api/admin/listings/{id}/remove", post(admin_remove_listing_handler))
        .route("/api/admin/listings/{id}/restore", post(admin_restore_listing_handler))
        .route("/api/media/signature", post(signature_handler))
}

#[derive(Deserialize)]
pub struct CreateListingRequest {
    pub title: String,
    pub description: String,
    pub price: String,
    pub address: String,
    pub state: String,
    pub lga: String,
    #[serde(default)]
    pub is_agent_listing: bool,
    pub bedrooms: Option<i32>,
    pub bathrooms: Option<i32>,
    pub property_type: Option<String>,
    pub furnishing: Option<String>,
    #[serde(default)]
    pub amenities: Vec<String>,
}

#[derive(Deserialize, Default)]
pub struct UpdateListingRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub price: Option<String>,
    pub address: Option<String>,
    pub state: Option<String>,
    pub lga: Option<String>,
    pub is_agent_listing: Option<bool>,
    pub status: Option<ListingStatus>,
    pub bedrooms: Option<Option<i32>>,
    pub bathrooms: Option<Option<i32>>,
    pub property_type: Option<Option<String>>,
    pub furnishing: Option<Option<String>>,
    pub amenities: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct AddMediaRequest {
    pub cloudinary_public_id: String,
    pub url: String,
    pub alt_text: Option<String>,
    #[serde(default)]
    pub position: i32,
}

#[derive(Deserialize, Default)]
pub struct SignatureRequest {
    pub purpose: Option<String>,
}

#[derive(Deserialize)]
pub struct AdminRemoveRequest {
    pub reason: String,
}

#[derive(Serialize)]
pub struct ListingResponse {
    pub id: Uuid,
    pub landlord_id: Uuid,
    pub landlord_name: String,
    pub landlord_username: Option<String>,
    pub landlord_verified: bool,
    pub landlord_photo_url: Option<String>,
    pub title: String,
    pub description: String,
    pub price: String,
    pub address: String,
    pub state: String,
    pub lga: String,
    pub is_agent_listing: bool,
    pub status: String,
    pub bedrooms: Option<i32>,
    pub bathrooms: Option<i32>,
    pub property_type: Option<String>,
    pub furnishing: Option<String>,
    pub amenities: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub media: Vec<MediaResponse>,
}

#[derive(Serialize)]
pub struct ListingPageResponse {
    pub items: Vec<ListingResponse>,
    pub has_more: bool,
    pub next_offset: i64,
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
            landlord_id: listing.landlord_id,
            landlord_name: listing.landlord_name,
            landlord_username: listing.landlord_username,
            landlord_verified: listing.landlord_verified,
            landlord_photo_url: listing.landlord_photo_url,
            title: listing.title,
            description: listing.description,
            price: listing.price.to_string(),
            address: listing.address,
            state: listing.state,
            lga: listing.lga,
            is_agent_listing: listing.is_agent_listing,
            status: listing.status.as_str().into(),
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            property_type: listing.property_type,
            furnishing: listing.furnishing,
            amenities: listing.amenities,
            created_at: listing.created_at,
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

#[derive(Deserialize, Default)]
struct ListingQuery {
    state: Option<String>,
    lga: Option<String>,
    property_type: Option<String>,
    min_price: Option<String>,
    max_price: Option<String>,
    bedrooms: Option<i32>,
    furnishing: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
}

async fn list_listings(
    State(state): State<AppState>,
    Query(query): Query<ListingQuery>,
) -> Result<Json<ListingPageResponse>, ApiError> {
    let filter = ListingFilter {
        state: query.state,
        lga: query.lga,
        property_type: query.property_type,
        min_price: parse_optional_decimal(query.min_price)?,
        max_price: parse_optional_decimal(query.max_price)?,
        bedrooms: query.bedrooms,
        furnishing: query.furnishing,
    };

    let page = browse_listings(
        state.listings.as_ref(),
        &filter,
        query.limit.unwrap_or(20),
        query.offset.unwrap_or(0),
    )
    .await
    .map_err(listing_error)?;

    Ok(Json(ListingPageResponse {
        items: page.items.into_iter().map(ListingResponse::from).collect(),
        has_more: page.has_more,
        next_offset: page.next_offset,
    }))
}

async fn my_listings_handler(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<ListingResponse>>, ApiError> {
    list_my_listings(state.listings.as_ref(), user.id)
        .await
        .map(|items| Json(items.into_iter().map(ListingResponse::from).collect()))
        .map_err(listing_error)
}

async fn favorites_handler(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<ListingResponse>>, ApiError> {
    list_favorites(state.listings.as_ref(), user.id)
        .await
        .map(|items| Json(items.into_iter().map(ListingResponse::from).collect()))
        .map_err(listing_error)
}

async fn add_favorite_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    add_favorite(state.listings.as_ref(), user.id, id)
        .await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(listing_error)
}

async fn remove_favorite_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    remove_favorite(state.listings.as_ref(), user.id, id)
        .await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(listing_error)
}

async fn create_listing_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Json(request): Json<CreateListingRequest>,
) -> Result<Json<ListingResponse>, ApiError> {
    let input = NewListing {
        landlord_id: user.id,
        title: request.title,
        description: request.description,
        price: parse_decimal(&request.price)?,
        address: request.address,
        state: request.state,
        lga: request.lga,
        is_agent_listing: request.is_agent_listing,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        property_type: request.property_type,
        furnishing: request.furnishing,
        amenities: clean_amenities(request.amenities),
    };

    create_listing(state.listings.as_ref(), user.id, &input)
        .await
        .map(|listing| Json(ListingResponse::from(listing)))
        .map_err(listing_error)
}

async fn get_listing_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ListingResponse>, ApiError> {
    get_public_listing(state.listings.as_ref(), id)
        .await
        .map_err(listing_error)?
        .map(ListingResponse::from)
        .map(Json)
        .ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "not_found", "Listing not found"))
}

async fn get_listing_by_code_handler(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<ListingResponse>, ApiError> {
    get_public_listing_by_code(state.listings.as_ref(), &code)
        .await
        .map_err(listing_error)?
        .map(ListingResponse::from)
        .map(Json)
        .ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "not_found", "Listing not found"))
}

async fn update_listing_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateListingRequest>,
) -> Result<Json<ListingResponse>, ApiError> {
    let update = ListingUpdate {
        title: request.title,
        description: request.description,
        price: parse_optional_decimal(request.price)?,
        address: request.address,
        state: request.state,
        lga: request.lga,
        is_agent_listing: request.is_agent_listing,
        status: request.status,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        property_type: request.property_type,
        furnishing: request.furnishing,
        amenities: request.amenities.map(clean_amenities),
    };

    update_listing(state.listings.as_ref(), id, user.id, &update)
        .await
        .map(|listing| Json(ListingResponse::from(listing)))
        .map_err(listing_error)
}

async fn delete_listing_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    delete_listing(state.listings.as_ref(), id, user.id)
        .await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(listing_error)
}

async fn admin_remove_listing_handler(
    State(state): State<AppState>,
    AdminUser { id: user_id }: AdminUser,
    Path(id): Path<Uuid>,
    Json(request): Json<AdminRemoveRequest>,
) -> Result<Json<ListingResponse>, ApiError> {
    let listing = admin_remove_listing(state.listings.as_ref(), id, user_id, &request.reason)
        .await
        .map_err(listing_error)?;
    state
        .audit
        .record_audit(
            user_id,
            "listing.remove",
            id,
            json!({"reason": request.reason}),
        )
        .await
        .map_err(|_| {
            ApiError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                "Could not record the moderation action",
            )
        })?;

    Ok(Json(ListingResponse::from(listing)))
}

async fn admin_restore_listing_handler(
    State(state): State<AppState>,
    AdminUser { id: user_id }: AdminUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ListingResponse>, ApiError> {
    let listing = admin_restore_listing(state.listings.as_ref(), id, user_id)
        .await
        .map_err(listing_error)?;
    state
        .audit
        .record_audit(user_id, "listing.restore", id, json!({}))
        .await
        .map_err(|_| {
            ApiError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                "Could not record the moderation action",
            )
        })?;

    Ok(Json(ListingResponse::from(listing)))
}

async fn add_media_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<AddMediaRequest>,
) -> Result<Json<MediaResponse>, ApiError> {
    if !valid_cloudinary_public_id(&request.cloudinary_public_id, user.id) {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "validation_error",
            "Media must be uploaded to your own UnaDomot listing folder",
        ));
    }
    if !valid_media_url(
        &request.url,
        state.media.cloud_name(),
        &request.cloudinary_public_id,
    ) {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "validation_error",
            "Media URL must point at this UnaDomot Cloudinary cloud and match the uploaded public id",
        ));
    }
    if request.alt_text.as_deref().map(str::len).unwrap_or(0) > 200 {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "validation_error",
            "Alt text must be 200 characters or less",
        ));
    }
    if !(0..=100).contains(&request.position) {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "validation_error",
            "Position must be between 0 and 100",
        ));
    }

    let media = NewListingMedia {
        cloudinary_public_id: request.cloudinary_public_id,
        url: request.url,
        alt_text: request.alt_text,
        position: request.position,
    };

    add_listing_media(state.listings.as_ref(), id, user.id, &media)
        .await
        .map(|media| Json(MediaResponse::from(media)))
        .map_err(listing_error)
}

async fn signature_handler(
    State(state): State<AppState>,
    user: AuthUser,
    Json(request): Json<SignatureRequest>,
) -> Result<Json<crate::application::media::UploadSignature>, ApiError> {
    let purpose = match request.purpose.as_deref() {
        None | Some("") => UploadPurpose::Listing,
        Some(value) => UploadPurpose::parse(value).ok_or_else(|| {
            ApiError::new(
                StatusCode::BAD_REQUEST,
                "validation_error",
                "purpose must be one of: listing, avatar, chat, verification",
            )
        })?,
    };

    let upload = UploadRequest::new(purpose, user.id);

    state
        .media
        .sign_upload(&upload)
        .map(Json)
        .map_err(media_error)
}

fn clean_amenities(amenities: Vec<String>) -> Vec<String> {
    let mut seen: Vec<String> = Vec::new();
    for amenity in amenities {
        let trimmed = amenity.trim();
        if trimmed.is_empty() {
            continue;
        }
        let already = seen
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(trimmed));
        if !already {
            seen.push(trimmed.to_string());
        }
    }
    seen
}

fn valid_media_url(url: &str, cloud_name: Option<&str>, public_id: &str) -> bool {
    let Some(cloud) = cloud_name else {
        return false;
    };
    let prefix = format!("https://res.cloudinary.com/{cloud}/image/upload/");
    url.starts_with(&prefix)
        && url.contains(public_id)
        && url.len() <= 2048
        && !url.contains(char::is_whitespace)
}

fn valid_cloudinary_public_id(public_id: &str, user_id: Uuid) -> bool {
    let prefix = format!("unadomot/listings/{user_id}/");
    public_id.starts_with(&prefix)
        && !public_id.contains("..")
        && public_id.len() <= 255
        && public_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '_' | '-' | '.'))
}

fn parse_decimal(value: &str) -> Result<Decimal, ApiError> {
    Decimal::from_str(value.trim()).map_err(|_| {
        ApiError::new(
            StatusCode::BAD_REQUEST,
            "validation_error",
            "Price must be a valid decimal number",
        )
    })
}

fn parse_optional_decimal(value: Option<String>) -> Result<Option<Decimal>, ApiError> {
    value.map(|value| parse_decimal(&value)).transpose()
}

pub(super) fn listing_error(error: ListingError) -> ApiError {
    match error {
        ListingError::NotFound => {
            ApiError::new(StatusCode::NOT_FOUND, "not_found", "Listing not found")
        }
        ListingError::Forbidden => ApiError::new(
            StatusCode::FORBIDDEN,
            "forbidden",
            "You are not allowed to perform this action",
        ),
        ListingError::InvalidInput(message) => {
            ApiError::new(StatusCode::BAD_REQUEST, "validation_error", message)
        }
        ListingError::Repository(_) => ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "service_unavailable",
            "The service is temporarily unavailable",
        ),
    }
}

fn media_error(error: MediaError) -> ApiError {
    match error {
        MediaError::NotConfigured => ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "media_not_configured",
            "Media uploads are not configured",
        ),
        MediaError::Signing(_) => ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "media_signing_failed",
            "Could not sign the upload",
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const USER: Uuid = Uuid::nil();
    const PUBLIC_ID: &str = "unadomot/listings/00000000-0000-0000-0000-000000000000/photo-1";
    const VALID_URL: &str =
        "https://res.cloudinary.com/demo/image/upload/v1/unadomot/listings/00000000-0000-0000-0000-000000000000/photo-1.jpg";

    #[test]
    fn accepts_media_from_our_cloud_with_matching_public_id() {
        assert!(valid_media_url(VALID_URL, Some("demo"), PUBLIC_ID));
    }

    #[test]
    fn rejects_foreign_clouds() {
        let url = "https://res.cloudinary.com/other/image/upload/v1/unadomot/listings/00000000-0000-0000-0000-000000000000/photo-1.jpg";
        assert!(!valid_media_url(url, Some("demo"), PUBLIC_ID));
    }

    #[test]
    fn rejects_urls_that_do_not_match_the_public_id() {
        let url = "https://res.cloudinary.com/other/image/upload/v1/unadomot/listings/other.jpg";
        assert!(!valid_media_url(url, Some("demo"), PUBLIC_ID));
    }

    #[test]
    fn rejects_media_when_cloudinary_is_not_configured() {
        assert!(!valid_media_url(VALID_URL, None, PUBLIC_ID));
    }

    #[test]
    fn rejects_non_cloudinary_or_http_media() {
        assert!(!valid_media_url(
            "http://res.cloudinary.com/demo/image/upload/a.jpg",
            Some("demo"),
            "a"
        ));
        assert!(!valid_media_url(
            "https://evil.example/image/upload/a.jpg",
            Some("demo"),
            "a"
        ));
        assert!(!valid_media_url(
            "https://res.cloudinary.com/demo/image/a.jpg",
            Some("demo"),
            "a"
        ));
        assert!(!valid_media_url(
            "https://res.cloudinary.com/demo/image/upload/a b.jpg",
            Some("demo"),
            "a b"
        ));
    }

    #[test]
    fn requires_the_owners_listing_folder() {
        assert!(valid_cloudinary_public_id(PUBLIC_ID, USER));
        assert!(!valid_cloudinary_public_id(
            "unadomot/listings/11111111-1111-1111-1111-111111111111/photo-1",
            USER
        ));
        assert!(!valid_cloudinary_public_id("unadomot/avatars/photo-1", USER));
        assert!(!valid_cloudinary_public_id(
            "unadomot/listings/00000000-0000-0000-0000-000000000000/../secret",
            USER
        ));
    }

    #[test]
    fn trims_and_dedupes_amenities() {
        let cleaned = clean_amenities(vec![
            " Borehole ".into(),
            "borehole".into(),
            "".into(),
            "Prepaid meter".into(),
        ]);
        assert_eq!(cleaned, vec!["Borehole", "Prepaid meter"]);
    }
}
