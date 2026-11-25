use crate::application::auth::{
    AuthenticatedUser, AuthError, StoredUser, UserRepository,
};
use crate::application::listings::{ListingError, ListingRepository};
use crate::domain::listing::{Listing, ListingFilter, NewListing};
use uuid::Uuid;

pub struct UnconfiguredRepository;

impl ListingRepository for UnconfiguredRepository {
    fn browse(&self, _filter: &ListingFilter) -> Result<Vec<Listing>, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    fn get(&self, _id: Uuid) -> Result<Option<Listing>, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    fn create(&self, _listing: &NewListing) -> Result<Listing, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }
}

pub struct UnconfiguredUserRepository;

impl UserRepository for UnconfiguredUserRepository {
    fn create_user(
        &self,
        _email: &str,
        _password_hash: Option<&str>,
        _name: &str,
    ) -> Result<AuthenticatedUser, AuthError> {
        Err(AuthError::Repository("Persistence not configured".into()))
    }

    fn find_by_email(&self, _email: &str) -> Result<Option<StoredUser>, AuthError> {
        Err(AuthError::Repository("Persistence not configured".into()))
    }
}
