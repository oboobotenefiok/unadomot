use crate::domain::listing::{
    Listing, ListingFilter, ListingMedia, ListingStatus, ListingUpdate, NewListing, NewListingMedia,
};
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
    repository.add_media(listing_id, owner_id, media).await
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
    if input.state.trim().is_empty() || input.lga.trim().is_empty() {
        return Err(ListingError::InvalidInput(
            "State and LGA are required".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_price() {
        let input = NewListing {
            landlord_id: Uuid::new_v4(),
            title: "Flat".into(),
            description: "Nice".into(),
            price: Decimal::ZERO,
            address: "Port Harcourt".into(),
            state: "Rivers".into(),
            lga: "Obio/Akpor".into(),
            is_agent_listing: false,
            bedrooms: None,
            bathrooms: None,
            property_type: None,
            furnishing: None,
        };

        assert!(matches!(
            validate_new_listing(&input),
            Err(ListingError::InvalidInput(_))
        ));
    }
}
