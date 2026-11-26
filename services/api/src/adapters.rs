use crate::application::auth::{AuthenticatedUser, AuthError, StoredUser, UserRepository};
use crate::application::listings::{ListingError, ListingPage, ListingRepository};
use crate::application::media::{MediaError, MediaSigner, UploadSignature};
use crate::application::messaging::{MessagingError, MessagingRepository};
use crate::application::verification::{VerificationError, VerificationRepository};
use crate::domain::listing::{
    Listing, ListingFilter, ListingMedia, ListingUpdate, NewListing, NewListingMedia,
};
use crate::domain::messaging::{Conversation, ConversationSummary, Message};
use crate::domain::verification::VerificationRequest;
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

    async fn get_public(&self, _id: Uuid) -> Result<Option<Listing>, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    async fn list_by_owner(&self, _owner_id: Uuid) -> Result<Vec<Listing>, ListingError> {
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

    async fn admin_remove(
        &self,
        _id: Uuid,
        _admin_id: Uuid,
        _reason: &str,
    ) -> Result<Listing, ListingError> {
        Err(ListingError::Repository("Persistence not configured".into()))
    }

    async fn admin_restore(&self, _id: Uuid, _admin_id: Uuid) -> Result<Listing, ListingError> {
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

    async fn is_admin(&self, _user_id: Uuid) -> Result<bool, AuthError> {
        Ok(false)
    }
}

pub struct UnconfiguredMessagingRepository;

#[async_trait]
impl MessagingRepository for UnconfiguredMessagingRepository {
    async fn start_conversation(
        &self,
        _listing_id: Uuid,
        _initiator: Uuid,
    ) -> Result<Conversation, MessagingError> {
        Err(MessagingError::Repository("Persistence not configured".into()))
    }

    async fn list_conversations(
        &self,
        _user_id: Uuid,
    ) -> Result<Vec<ConversationSummary>, MessagingError> {
        Err(MessagingError::Repository("Persistence not configured".into()))
    }

    async fn find_conversation(
        &self,
        _id: Uuid,
        _user_id: Uuid,
    ) -> Result<Option<Conversation>, MessagingError> {
        Err(MessagingError::Repository("Persistence not configured".into()))
    }

    async fn list_messages(
        &self,
        _conversation_id: Uuid,
        _before: Option<DateTime<Utc>>,
        _limit: i64,
    ) -> Result<Vec<Message>, MessagingError> {
        Err(MessagingError::Repository("Persistence not configured".into()))
    }

    async fn send_message(
        &self,
        _conversation_id: Uuid,
        _sender_id: Uuid,
        _body: &str,
    ) -> Result<Message, MessagingError> {
        Err(MessagingError::Repository("Persistence not configured".into()))
    }

    async fn mark_read(&self, _conversation_id: Uuid, _user_id: Uuid) -> Result<(), MessagingError> {
        Err(MessagingError::Repository("Persistence not configured".into()))
    }
}

pub struct UnconfiguredVerificationRepository;

#[async_trait]
impl VerificationRepository for UnconfiguredVerificationRepository {
    async fn submit(
        &self,
        _user_id: Uuid,
        _document_url: &str,
        _notes: Option<&str>,
    ) -> Result<VerificationRequest, VerificationError> {
        Err(VerificationError::Repository("Persistence not configured".into()))
    }

    async fn find_for_user(
        &self,
        _user_id: Uuid,
    ) -> Result<Option<VerificationRequest>, VerificationError> {
        Err(VerificationError::Repository("Persistence not configured".into()))
    }

    async fn list_by_status(
        &self,
        _status: &str,
    ) -> Result<Vec<VerificationRequest>, VerificationError> {
        Err(VerificationError::Repository("Persistence not configured".into()))
    }

    async fn review(
        &self,
        _id: Uuid,
        _status: &str,
        _review_notes: Option<&str>,
    ) -> Result<VerificationRequest, VerificationError> {
        Err(VerificationError::Repository("Persistence not configured".into()))
    }

    async fn record_audit(
        &self,
        _admin_id: Uuid,
        _action: &str,
        _target_id: Uuid,
        _metadata: serde_json::Value,
    ) -> Result<(), VerificationError> {
        Ok(())
    }
}

pub struct UnconfiguredMediaSigner;

impl MediaSigner for UnconfiguredMediaSigner {
    fn sign_upload(&self, _folder: &str) -> Result<UploadSignature, MediaError> {
        Err(MediaError::NotConfigured)
    }
}
