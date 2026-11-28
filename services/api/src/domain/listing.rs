use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Listing {
    pub id: Uuid,
    pub landlord_id: Uuid,
    pub landlord_name: String,
    pub landlord_verified: bool,
    pub landlord_photo_url: Option<String>,
    pub title: String,
    pub description: String,
    pub price: Decimal,
    pub address: String,
    pub state: String,
    pub lga: String,
    pub is_agent_listing: bool,
    pub status: ListingStatus,
    pub bedrooms: Option<i32>,
    pub bathrooms: Option<i32>,
    pub property_type: Option<String>,
    pub furnishing: Option<String>,
    #[serde(default)]
    pub amenities: Vec<String>,
    pub code: Option<String>,
    pub created_at: DateTime<Utc>,
    #[serde(default)]
    pub media: Vec<ListingMedia>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ListingStatus {
    Available,
    Rented,
    RemovedByAdmin,
}

impl ListingStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::Rented => "rented",
            Self::RemovedByAdmin => "removed_by_admin",
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ListingMedia {
    pub id: Uuid,
    pub cloudinary_public_id: String,
    pub url: String,
    pub alt_text: Option<String>,
    pub position: i32,
}

#[derive(Clone, Debug)]
pub struct NewListingMedia {
    pub cloudinary_public_id: String,
    pub url: String,
    pub alt_text: Option<String>,
    pub position: i32,
}

#[derive(Clone, Debug, Default)]
pub struct ListingFilter {
    pub state: Option<String>,
    pub lga: Option<String>,
    pub property_type: Option<String>,
    pub min_price: Option<Decimal>,
    pub max_price: Option<Decimal>,
    pub bedrooms: Option<i32>,
    pub furnishing: Option<String>,
}

#[derive(Clone, Debug)]
pub struct NewListing {
    pub landlord_id: Uuid,
    pub title: String,
    pub description: String,
    pub price: Decimal,
    pub address: String,
    pub state: String,
    pub lga: String,
    pub is_agent_listing: bool,
    pub bedrooms: Option<i32>,
    pub bathrooms: Option<i32>,
    pub property_type: Option<String>,
    pub furnishing: Option<String>,
    pub amenities: Vec<String>,
}

#[derive(Clone, Debug, Default)]
pub struct ListingUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub price: Option<Decimal>,
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
