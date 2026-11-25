use crate::domain::listing::{Listing, ListingFilter};

#[derive(Debug)]
pub enum ListingError {
    Repository(String),
}

pub trait ListingRepository: Send + Sync {
    fn browse(&self, filter: &ListingFilter) -> Result<Vec<Listing>, ListingError>;
    fn get(&self, id: uuid::Uuid) -> Result<Option<Listing>, ListingError>;
}

pub fn browse_listings(
    repository: &dyn ListingRepository,
    filter: &ListingFilter,
) -> Result<Vec<Listing>, ListingError> {
    repository.browse(filter)
}

pub fn get_listing(
    repository: &dyn ListingRepository,
    id: uuid::Uuid,
) -> Result<Option<Listing>, ListingError> {
    repository.get(id)
}
