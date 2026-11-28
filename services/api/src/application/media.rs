use serde::Serialize;
use uuid::Uuid;

#[derive(Debug)]
pub enum MediaError {
    NotConfigured,
    Signing(String),
}

/// The only folders a client may upload into. The server derives the concrete
/// folder from the purpose and the authenticated user, so a client can never
/// choose an arbitrary Cloudinary path.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UploadPurpose {
    Listing,
    Avatar,
    Chat,
    Verification,
}

impl UploadPurpose {
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "listing" => Some(Self::Listing),
            "avatar" => Some(Self::Avatar),
            "chat" => Some(Self::Chat),
            "verification" => Some(Self::Verification),
            _ => None,
        }
    }

    pub fn folder(self, user_id: Uuid) -> String {
        match self {
            Self::Listing => format!("unadomot/listings/{user_id}"),
            Self::Avatar => format!("unadomot/avatars/{user_id}"),
            Self::Chat => format!("unadomot/chat/{user_id}"),
            Self::Verification => format!("unadomot/verification/{user_id}"),
        }
    }

    /// Verification documents contain PII and must use Cloudinary's
    /// `authenticated` delivery type so they are not world-readable by URL.
    pub fn is_authenticated(self) -> bool {
        matches!(self, Self::Verification)
    }

    /// Formats Cloudinary will accept for this purpose. Listings, avatars and
    /// identity documents are images only; chat carries photos, video, voice
    /// notes and documents.
    pub fn allowed_formats(self) -> &'static str {
        match self {
            Self::Listing | Self::Avatar | Self::Verification => "jpg,jpeg,png,webp,heic",
            Self::Chat => "jpg,jpeg,png,webp,heic,mp4,mov,m4a,mp3,pdf,doc,docx",
        }
    }

    /// Cloudinary resource type for the upload endpoint. `auto` routes audio
    /// and video to the correct endpoint instead of having `/image/upload/`
    /// reject them.
    pub fn resource_type(self) -> &'static str {
        match self {
            Self::Chat => "auto",
            Self::Listing | Self::Avatar | Self::Verification => "image",
        }
    }
}

#[derive(Debug, Clone)]
pub struct UploadRequest {
    pub folder: String,
    pub authenticated: bool,
    pub purpose: UploadPurpose,
}

impl UploadRequest {
    pub fn new(purpose: UploadPurpose, user_id: Uuid) -> Self {
        Self {
            folder: purpose.folder(user_id),
            authenticated: purpose.is_authenticated(),
            purpose,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct UploadSignature {
    pub signature: String,
    pub timestamp: i64,
    pub api_key: String,
    pub cloud_name: String,
    pub folder: String,
    pub allowed_formats: String,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub upload_type: Option<String>,
    pub resource_type: String,
}

pub trait MediaSigner: Send + Sync {
    fn sign_upload(&self, request: &UploadRequest) -> Result<UploadSignature, MediaError>;

    /// The configured Cloudinary cloud name, used to validate that submitted
    /// media URLs point at this application's cloud.
    fn cloud_name(&self) -> Option<&str> {
        None
    }

    /// Builds a short-lived signed delivery URL for an `authenticated` asset.
    /// Used only for admin review of identity documents.
    fn signed_delivery_url(&self, _public_id: &str) -> Result<String, MediaError> {
        Err(MediaError::NotConfigured)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_known_purposes_only() {
        assert_eq!(UploadPurpose::parse("listing"), Some(UploadPurpose::Listing));
        assert_eq!(UploadPurpose::parse("AVATAR"), Some(UploadPurpose::Avatar));
        assert_eq!(UploadPurpose::parse("chat"), Some(UploadPurpose::Chat));
        assert_eq!(
            UploadPurpose::parse("verification"),
            Some(UploadPurpose::Verification)
        );
        assert_eq!(UploadPurpose::parse("other"), None);
        assert_eq!(UploadPurpose::parse(""), None);
    }

    #[test]
    fn folders_are_scoped_to_the_user() {
        let user = Uuid::nil();
        assert_eq!(
            UploadPurpose::Listing.folder(user),
            format!("unadomot/listings/{user}")
        );
        assert_eq!(
            UploadPurpose::Avatar.folder(user),
            format!("unadomot/avatars/{user}")
        );
        assert_eq!(
            UploadPurpose::Chat.folder(user),
            format!("unadomot/chat/{user}")
        );
        assert_eq!(
            UploadPurpose::Verification.folder(user),
            format!("unadomot/verification/{user}")
        );
    }

    #[test]
    fn only_verification_documents_are_authenticated() {
        assert!(UploadPurpose::Verification.is_authenticated());
        assert!(!UploadPurpose::Listing.is_authenticated());
        assert!(!UploadPurpose::Avatar.is_authenticated());
        assert!(!UploadPurpose::Chat.is_authenticated());
    }

    #[test]
    fn chat_accepts_audio_and_video_while_listings_stay_images() {
        assert_eq!(UploadPurpose::Listing.resource_type(), "image");
        assert_eq!(UploadPurpose::Avatar.resource_type(), "image");
        assert_eq!(UploadPurpose::Verification.resource_type(), "image");
        assert_eq!(UploadPurpose::Chat.resource_type(), "auto");

        assert!(!UploadPurpose::Listing.allowed_formats().contains("m4a"));
        assert!(UploadPurpose::Chat.allowed_formats().contains("m4a"));
        assert!(UploadPurpose::Chat.allowed_formats().contains("pdf"));
    }

    #[test]
    fn request_derives_folder_and_type_from_purpose() {
        let user = Uuid::nil();
        let chat = UploadRequest::new(UploadPurpose::Chat, user);
        assert_eq!(chat.folder, format!("unadomot/chat/{user}"));
        assert!(!chat.authenticated);

        let verification = UploadRequest::new(UploadPurpose::Verification, user);
        assert!(verification.authenticated);
    }
}
