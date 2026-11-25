use crate::application::auth::{AuthenticatedUser, AuthError, StoredUser, UserRepository};
use crate::application::listings::{ListingError, ListingRepository};
use crate::application::media::{MediaError, MediaSigner, UploadSignature};
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

    fn update(
        &self,
        _id: Uuid,
        _owner_id: Uuid,
        _update: &crate::domain::listing::ListingUpdate,
    ) -> Result<Listing, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    fn delete(&self, _id: Uuid, _owner_id: Uuid) -> Result<(), ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    fn add_media(
        &self,
        _listing_id: Uuid,
        _owner_id: Uuid,
        _media: &crate::domain::listing::NewListingMedia,
    ) -> Result<crate::domain::listing::ListingMedia, ListingError> {
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

pub struct UnconfiguredMediaSigner;

impl MediaSigner for UnconfiguredMediaSigner {
    fn sign_upload(&self, _folder: &str) -> Result<UploadSignature, MediaError> {
        Err(MediaError::NotConfigured)
    }
}
