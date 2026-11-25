use crate::domain::listing::{
    Listing, ListingFilter, ListingStatus, ListingUpdate, NewListing, NewListingMedia,
};
use uuid::Uuid;

#[derive(Debug)]
pub enum ListingError {
    Repository(String),
    NotFound,
    Forbidden,
    InvalidInput(String),
}

pub trait ListingRepository: Send + Sync {
    fn browse(&self, filter: &ListingFilter) -> Result<Vec<Listing>, ListingError>;
    fn get(&self, id: Uuid) -> Result<Option<Listing>, ListingError>;
    fn create(&self, listing: &NewListing) -> Result<Listing, ListingError>;
    fn update(
        &self,
        id: Uuid,
        owner_id: Uuid,
        update: &ListingUpdate,
    ) -> Result<Listing, ListingError>;
    fn delete(&self, id: Uuid, owner_id: Uuid) -> Result<(), ListingError>;
    fn add_media(
        &self,
        listing_id: Uuid,
        owner_id: Uuid,
        media: &NewListingMedia,
    ) -> Result<ListingMedia, ListingError>;
}

pub fn browse_listings(
    repository: &dyn ListingRepository,
    filter: &ListingFilter,
) -> Result<Vec<Listing>, ListingError> {
    repository.browse(filter)
}

pub fn get_listing(
    repository: &dyn ListingRepository,
    id: Uuid,
) -> Result<Option<Listing>, ListingError> {
    repository.get(id)
}

pub fn create_listing(
    repository: &dyn ListingRepository,
    owner_id: Uuid,
    input: &NewListing,
) -> Result<Listing, ListingError> {
    validate_new_listing(input)?;
    if input.landlord_id != owner_id {
        return Err(ListingError::Forbidden);
    }
    repository.create(input)
}

pub fn update_listing(
    repository: &dyn ListingRepository,
    id: Uuid,
    owner_id: Uuid,
    update: &ListingUpdate,
) -> Result<Listing, ListingError> {
    if let Some(price) = update.price {
        if price <= 0.0 {
            return Err(ListingError::InvalidInput(
                "Price must be greater than zero".into(),
            ));
        }
    }
    repository.update(id, owner_id, update)
}

pub fn delete_listing(
    repository: &dyn ListingRepository,
    id: Uuid,
    owner_id: Uuid,
) -> Result<(), ListingError> {
    repository.delete(id, owner_id)
}

pub fn add_listing_media(
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
    repository.add_media(listing_id, owner_id, media)
}

fn validate_new_listing(input: &NewListing) -> Result<(), ListingError> {
    if input.price <= 0.0 {
        return Err(ListingError::InvalidInput(
            "Price must be greater than zero".into(),
        ));
    }
    if input.title.trim().is_empty() || input.description.trim().is_empty() {
        return Err(ListingError::InvalidInput(
            "Title and description are required".into(),
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
            price: 0.0,
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
            create_listing(&FailingRepository, Uuid::new_v4(), &input),
            Err(ListingError::InvalidInput(_))
        ));
    }

    struct FailingRepository;

    impl ListingRepository for FailingRepository {
        fn browse(&self, _filter: &ListingFilter) -> Result<Vec<Listing>, ListingError> {
            Err(ListingError::Repository("unused".into()))
        }

        fn get(&self, _id: Uuid) -> Result<Option<Listing>, ListingError> {
            Err(ListingError::Repository("unused".into()))
        }

        fn create(&self, _listing: &NewListing) -> Result<Listing, ListingError> {
            Err(ListingError::Repository("unused".into()))
        }

        fn update(
            &self,
            _id: Uuid,
            _owner_id: Uuid,
            _update: &ListingUpdate,
        ) -> Result<Listing, ListingError> {
            Err(ListingError::Repository("unused".into()))
        }

        fn delete(&self, _id: Uuid, _owner_id: Uuid) -> Result<(), ListingError> {
            Err(ListingError::Repository("unused".into()))
        }

        fn add_media(
            &self,
            _listing_id: Uuid,
            _owner_id: Uuid,
            _media: &NewListingMedia,
        ) -> Result<crate::domain::listing::ListingMedia, ListingError> {
            Err(ListingError::Repository("unused".into()))
        }
    }
}
