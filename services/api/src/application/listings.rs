use crate::domain::listing::{Listing, ListingFilter, NewListing};
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
    if input.landlord_id != owner_id {
        return Err(ListingError::Forbidden);
    }
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

    repository.create(input)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::listing::ListingStatus;

    struct TestRepository;

    impl ListingRepository for TestRepository {
        fn browse(&self, _filter: &ListingFilter) -> Result<Vec<Listing>, ListingError> {
            Ok(vec![])
        }

        fn get(&self, _id: Uuid) -> Result<Option<Listing>, ListingError> {
            Ok(None)
        }

        fn create(&self, listing: &NewListing) -> Result<Listing, ListingError> {
            Ok(Listing {
                id: Uuid::new_v4(),
                landlord_id: listing.landlord_id,
                title: listing.title.clone(),
                description: listing.description.clone(),
                price: listing.price,
                address: listing.address.clone(),
                state: listing.state.clone(),
                lga: listing.lga.clone(),
                is_agent_listing: listing.is_agent_listing,
                status: ListingStatus::Available,
                bedrooms: listing.bedrooms,
                bathrooms: listing.bathrooms,
                property_type: listing.property_type.clone(),
                furnishing: listing.furnishing.clone(),
            })
        }
    }

    #[test]
    fn owner_can_create_listing() {
        let owner = Uuid::new_v4();
        let input = NewListing {
            landlord_id: owner,
            title: "Flat".into(),
            description: "Nice flat".into(),
            price: 800_000.0,
            address: "Port Harcourt".into(),
            state: "Rivers".into(),
            lga: "Obio/Akpor".into(),
            is_agent_listing: false,
            bedrooms: Some(2),
            bathrooms: Some(2),
            property_type: Some("flat".into()),
            furnishing: Some("unfurnished".into()),
        };

        let listing = create_listing(&TestRepository, owner, &input).unwrap();
        assert_eq!(listing.landlord_id, owner);
    }

    #[test]
    fn other_users_cannot_create_for_owner() {
        let owner = Uuid::new_v4();
        let input = NewListing {
            landlord_id: owner,
            title: "Flat".into(),
            description: "Nice flat".into(),
            price: 800_000.0,
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
            create_listing(&TestRepository, Uuid::new_v4(), &input),
            Err(ListingError::Forbidden)
        ));
    }
}
