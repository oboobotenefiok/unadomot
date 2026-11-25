use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Listing {
    pub id: Uuid,
    pub landlord_id: Uuid,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub address: String,
    pub state: String,
    pub lga: String,
    pub is_agent_listing: bool,
    pub status: ListingStatus,
    pub bedrooms: Option<i32>,
    pub bathrooms: Option<i32>,
    pub property_type: Option<String>,
    pub furnishing: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ListingStatus {
    Available,
    Rented,
    RemovedByAdmin,
}

#[derive(Clone, Debug, Default)]
pub struct ListingFilter {
    pub state: Option<String>,
    pub lga: Option<String>,
    pub property_type: Option<String>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
    pub bedrooms: Option<i32>,
}

impl ListingFilter {
    pub fn is_empty(&self) -> bool {
        self.state.is_none()
            && self.lga.is_none()
            && self.property_type.is_none()
            && self.min_price.is_none()
            && self.max_price.is_none()
            && self.bedrooms.is_none()
    }
}
