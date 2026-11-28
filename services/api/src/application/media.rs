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
}

#[derive(Debug, Clone)]
pub struct UploadRequest {
    pub folder: String,
    pub authenticated: bool,
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
}
