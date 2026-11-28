use crate::domain::listing::{
    Listing, ListingFilter, ListingMedia, ListingStatus, ListingUpdate, NewListing, NewListingMedia,
};
use crate::domain::nigeria::{normalize_state, validate_lga};
use async_trait::async_trait;
use rust_decimal::Decimal;
use uuid::Uuid;

#[derive(Debug)]
pub enum ListingError {
    Repository(String),
    NotFound,
    Forbidden,
    InvalidInput(String),
}

#[derive(Debug)]
pub struct ListingPage {
    pub items: Vec<Listing>,
    pub has_more: bool,
    pub next_offset: i64,
}

#[async_trait]
pub trait ListingRepository: Send + Sync {
    async fn browse(
        &self,
        filter: &ListingFilter,
        limit: i64,
        offset: i64,
    ) -> Result<ListingPage, ListingError>;
    async fn get(&self, id: Uuid) -> Result<Option<Listing>, ListingError>;
    async fn get_public(&self, id: Uuid) -> Result<Option<Listing>, ListingError>;
    async fn list_by_owner(&self, owner_id: Uuid) -> Result<Vec<Listing>, ListingError>;
    async fn create(&self, listing: &NewListing) -> Result<Listing, ListingError>;
    async fn update(
        &self,
        id: Uuid,
        owner_id: Uuid,
        update: &ListingUpdate,
    ) -> Result<Listing, ListingError>;
    async fn delete(&self, id: Uuid, owner_id: Uuid) -> Result<(), ListingError>;
    async fn admin_remove(
        &self,
        id: Uuid,
        admin_id: Uuid,
        reason: &str,
    ) -> Result<Listing, ListingError>;
    async fn admin_restore(&self, id: Uuid, admin_id: Uuid) -> Result<Listing, ListingError>;
    async fn add_media(
        &self,
        listing_id: Uuid,
        owner_id: Uuid,
        media: &NewListingMedia,
    ) -> Result<ListingMedia, ListingError>;
    async fn health_check(&self) -> Result<(), ListingError>;
}

pub async fn browse_listings(
    repository: &dyn ListingRepository,
    filter: &ListingFilter,
    limit: i64,
    offset: i64,
) -> Result<ListingPage, ListingError> {
    let limit = limit.clamp(1, 50);
    let offset = offset.max(0);
    repository.browse(filter, limit, offset).await
}

pub async fn get_listing(
    repository: &dyn ListingRepository,
    id: Uuid,
) -> Result<Option<Listing>, ListingError> {
    repository.get(id).await
}

pub async fn get_public_listing(
    repository: &dyn ListingRepository,
    id: Uuid,
) -> Result<Option<Listing>, ListingError> {
    repository.get_public(id).await
}

pub async fn list_my_listings(
    repository: &dyn ListingRepository,
    owner_id: Uuid,
) -> Result<Vec<Listing>, ListingError> {
    repository.list_by_owner(owner_id).await
}

pub async fn create_listing(
    repository: &dyn ListingRepository,
    owner_id: Uuid,
    input: &NewListing,
) -> Result<Listing, ListingError> {
    validate_new_listing(input)?;
    if input.landlord_id != owner_id {
        return Err(ListingError::Forbidden);
    }
    repository.create(input).await
}

pub async fn update_listing(
    repository: &dyn ListingRepository,
    id: Uuid,
    owner_id: Uuid,
    update: &ListingUpdate,
) -> Result<Listing, ListingError> {
    let current = repository.get(id).await?.ok_or(ListingError::NotFound)?;
    if current.landlord_id != owner_id {
        return Err(ListingError::NotFound);
    }
    if update.status == Some(ListingStatus::RemovedByAdmin) {
        return Err(ListingError::Forbidden);
    }
    if current.status == ListingStatus::RemovedByAdmin {
        return Err(ListingError::Forbidden);
    }

    if let Some(price) = update.price {
        if price <= Decimal::ZERO {
            return Err(ListingError::InvalidInput(
                "Price must be greater than zero".into(),
            ));
        }
    }
    if let Some(title) = &update.title {
        if title.trim().is_empty() || title.len() > 120 {
            return Err(ListingError::InvalidInput(
                "Title must be between 1 and 120 characters".into(),
            ));
        }
    }
    if let Some(state) = &update.state {
        if normalize_state(state).is_none() {
            return Err(ListingError::InvalidInput(
                "State must be a valid Nigerian state or FCT".into(),
            ));
        }
    }
    if let Some(lga) = &update.lga {
        if !validate_lga(lga) {
            return Err(ListingError::InvalidInput(
                "LGA must be between 1 and 80 characters".into(),
            ));
        }
    }
    if let Some(amenities) = &update.amenities {
        validate_amenities(amenities)?;
    }
    repository.update(id, owner_id, update).await
}

pub async fn delete_listing(
    repository: &dyn ListingRepository,
    id: Uuid,
    owner_id: Uuid,
) -> Result<(), ListingError> {
    repository.delete(id, owner_id).await
}

pub async fn admin_remove_listing(
    repository: &dyn ListingRepository,
    id: Uuid,
    admin_id: Uuid,
    reason: &str,
) -> Result<Listing, ListingError> {
    let reason = reason.trim();
    if reason.is_empty() || reason.len() > 500 {
        return Err(ListingError::InvalidInput(
            "A removal reason between 1 and 500 characters is required".into(),
        ));
    }
    repository.admin_remove(id, admin_id, reason).await
}

pub async fn admin_restore_listing(
    repository: &dyn ListingRepository,
    id: Uuid,
    admin_id: Uuid,
) -> Result<Listing, ListingError> {
    repository.admin_restore(id, admin_id).await
}

pub async fn add_listing_media(
    repository: &dyn ListingRepository,
    listing_id: Uuid,
    owner_id: Uuid,
    media: &NewListingMedia,
) -> Result<ListingMedia, ListingError> {
    if media.cloudinary_public_id.trim().is_empty() || media.url.trim().is_empty() {
        return Err(ListingError::InvalidInput(
            "Cloudinary public ID and URL are required".into(),
        ));
    }
    let prefix = format!("unadomot/listings/{owner_id}/");
    if !media.cloudinary_public_id.starts_with(&prefix) {
        return Err(ListingError::InvalidInput(
            "Media must be uploaded to your own listing folder".into(),
        ));
    }
    repository.add_media(listing_id, owner_id, media).await
}

/// Amenities are free text, so the only guardrails are count and length. The
/// cap keeps a single listing from carrying an unbounded array into every
/// browse response.
fn validate_amenities(amenities: &[String]) -> Result<(), ListingError> {
    if amenities.len() > 30 {
        return Err(ListingError::InvalidInput(
            "A listing can have at most 30 amenities".into(),
        ));
    }
    for amenity in amenities {
        let trimmed = amenity.trim();
        if trimmed.is_empty() || trimmed.len() > 60 {
            return Err(ListingError::InvalidInput(
                "Each amenity must be between 1 and 60 characters".into(),
            ));
        }
    }
    Ok(())
}

fn validate_new_listing(input: &NewListing) -> Result<(), ListingError> {
    if input.price <= Decimal::ZERO {
        return Err(ListingError::InvalidInput(
            "Price must be greater than zero".into(),
        ));
    }
    if input.title.trim().is_empty() || input.title.len() > 120 {
        return Err(ListingError::InvalidInput(
            "Title must be between 1 and 120 characters".into(),
        ));
    }
    if input.description.trim().is_empty() || input.description.len() > 5000 {
        return Err(ListingError::InvalidInput(
            "Description must be between 1 and 5000 characters".into(),
        ));
    }
    if normalize_state(&input.state).is_none() {
        return Err(ListingError::InvalidInput(
            "State must be a valid Nigerian state or FCT".into(),
        ));
    }
    if !validate_lga(&input.lga) {
        return Err(ListingError::InvalidInput(
            "LGA must be between 1 and 80 characters".into(),
        ));
    }
    validate_amenities(&input.amenities)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_input() -> NewListing {
        NewListing {
            landlord_id: Uuid::new_v4(),
            title: "Flat".into(),
            description: "Nice".into(),
            price: Decimal::new(150_000, 0),
            address: "Port Harcourt".into(),
            state: "Rivers".into(),
            lga: "Obio/Akpor".into(),
            is_agent_listing: false,
            bedrooms: None,
            bathrooms: None,
            property_type: None,
            furnishing: None,
            amenities: Vec::new(),
        }
    }

    #[test]
    fn rejects_invalid_price() {
        let input = NewListing {
            price: Decimal::ZERO,
            ..valid_input()
        };

        assert!(matches!(
            validate_new_listing(&input),
            Err(ListingError::InvalidInput(_))
        ));
    }

    #[test]
    fn accepts_a_normal_listing() {
        assert!(validate_new_listing(&valid_input()).is_ok());
    }

    #[test]
    fn rejects_too_many_amenities() {
        let input = NewListing {
            amenities: (0..31).map(|index| format!("Item {index}")).collect(),
            ..valid_input()
        };

        assert!(matches!(
            validate_new_listing(&input),
            Err(ListingError::InvalidInput(_))
        ));
    }

    #[test]
    fn rejects_blank_amenity() {
        let input = NewListing {
            amenities: vec!["Borehole".into(), "   ".into()],
            ..valid_input()
        };

        assert!(matches!(
            validate_new_listing(&input),
            Err(ListingError::InvalidInput(_))
        ));
    }
}
