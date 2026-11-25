use crate::application::auth::{AuthenticatedUser, AuthError, StoredUser, UserRepository};
use crate::application::listings::{ListingError, ListingPage, ListingRepository};
use crate::application::media::{MediaError, MediaSigner, UploadSignature};
use crate::domain::listing::{
    Listing, ListingFilter, ListingMedia, ListingUpdate, NewListing, NewListingMedia,
};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub struct UnconfiguredRepository;

#[async_trait]
impl ListingRepository for UnconfiguredRepository {
    async fn browse(
        &self,
        _filter: &ListingFilter,
        _limit: i64,
        _offset: i64,
    ) -> Result<ListingPage, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    async fn get(&self, _id: Uuid) -> Result<Option<Listing>, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    async fn create(&self, _listing: &NewListing) -> Result<Listing, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    async fn update(
        &self,
        _id: Uuid,
        _owner_id: Uuid,
        _update: &ListingUpdate,
    ) -> Result<Listing, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    async fn delete(&self, _id: Uuid, _owner_id: Uuid) -> Result<(), ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    async fn add_media(
        &self,
        _listing_id: Uuid,
        _owner_id: Uuid,
        _media: &NewListingMedia,
    ) -> Result<ListingMedia, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    async fn health_check(&self) -> Result<(), ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }
}

pub struct UnconfiguredUserRepository;

#[async_trait]
impl UserRepository for UnconfiguredUserRepository {
    async fn create_user(
        &self,
        _email: &str,
        _password_hash: Option<&str>,
        _name: &str,
    ) -> Result<AuthenticatedUser, AuthError> {
        Err(AuthError::Repository("Persistence not configured".into()))
    }

    async fn find_by_email(&self, _email: &str) -> Result<Option<StoredUser>, AuthError> {
        Err(AuthError::Repository("Persistence not configured".into()))
    }

    async fn store_refresh_token(
        &self,
        _user_id: Uuid,
        _token_hash: &str,
        _expires_at: DateTime<Utc>,
    ) -> Result<(), AuthError> {
        Err(AuthError::Repository("Persistence not configured".into()))
    }

    async fn rotate_refresh_token(
        &self,
        _old_hash: &str,
        _new_hash: &str,
        _expires_at: DateTime<Utc>,
    ) -> Result<Option<AuthenticatedUser>, AuthError> {
        Err(AuthError::Repository("Persistence not configured".into()))
    }
}

pub struct UnconfiguredMediaSigner;

impl MediaSigner for UnconfiguredMediaSigner {
    fn sign_upload(&self, _folder: &str) -> Result<UploadSignature, MediaError> {
        Err(MediaError::NotConfigured)
    }
}
