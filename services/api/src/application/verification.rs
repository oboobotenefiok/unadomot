use crate::domain::verification::VerificationRequest;
use async_trait::async_trait;
use uuid::Uuid;

#[derive(Debug)]
pub enum VerificationError {
    NotFound,
    Conflict(String),
    InvalidInput(String),
    Repository(String),
}

#[async_trait]
pub trait VerificationRepository: Send + Sync {
    async fn submit(
        &self,
        user_id: Uuid,
        document_public_id: &str,
        notes: Option<&str>,
    ) -> Result<VerificationRequest, VerificationError>;
    async fn find_for_user(
        &self,
        user_id: Uuid,
    ) -> Result<Option<VerificationRequest>, VerificationError>;
    async fn find_by_id(
        &self,
        id: Uuid,
    ) -> Result<Option<VerificationRequest>, VerificationError>;
    async fn list_by_status(
        &self,
        status: &str,
    ) -> Result<Vec<VerificationRequest>, VerificationError>;
    async fn review(
        &self,
        id: Uuid,
        status: &str,
        review_notes: Option<&str>,
    ) -> Result<VerificationRequest, VerificationError>;
    async fn review_with_audit(
        &self,
        id: Uuid,
        status: &str,
        review_notes: Option<&str>,
        admin_id: Uuid,
        metadata: serde_json::Value,
    ) -> Result<VerificationRequest, VerificationError>;
    async fn record_audit(
        &self,
        admin_id: Uuid,
        action: &str,
        target_id: Uuid,
        metadata: serde_json::Value,
    ) -> Result<(), VerificationError>;
}

/// A verification document must live in the caller's own verification folder
/// and look like a Cloudinary public id, never an arbitrary URL.
fn valid_document_public_id(user_id: Uuid, value: &str) -> bool {
    let prefix = format!("unadomot/verification/{user_id}/");
    value.starts_with(&prefix)
        && !value.contains("..")
        && value.len() <= 255
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '_' | '-' | '.'))
}

pub async fn submit_request(
    repository: &dyn VerificationRepository,
    user_id: Uuid,
    document_public_id: &str,
    notes: Option<&str>,
) -> Result<VerificationRequest, VerificationError> {
    let public_id = document_public_id.trim();
    if !valid_document_public_id(user_id, public_id) {
        return Err(VerificationError::InvalidInput(
            "Upload your document to the verification folder before submitting".into(),
        ));
    }

    if let Some(existing) = repository.find_for_user(user_id).await? {
        if existing.status == "pending" {
            return Err(VerificationError::Conflict(
                "You already have a pending verification request".into(),
            ));
        }
    }

    repository.submit(user_id, public_id, notes).await
}

pub async fn my_request(
    repository: &dyn VerificationRepository,
    user_id: Uuid,
) -> Result<Option<VerificationRequest>, VerificationError> {
    repository.find_for_user(user_id).await
}

pub async fn pending_requests(
    repository: &dyn VerificationRepository,
) -> Result<Vec<VerificationRequest>, VerificationError> {
    repository.list_by_status("pending").await
}

pub async fn review_request(
    repository: &dyn VerificationRepository,
    id: Uuid,
    approve: bool,
    review_notes: Option<&str>,
) -> Result<VerificationRequest, VerificationError> {
    let status = if approve { "approved" } else { "rejected" };
    repository.review(id, status, review_notes).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_the_users_verification_folder() {
        let user = Uuid::nil();
        assert!(valid_document_public_id(
            user,
            &format!("unadomot/verification/{user}/id-front")
        ));
        assert!(!valid_document_public_id(
            user,
            "unadomot/verification/other-user/id-front"
        ));
        assert!(!valid_document_public_id(user, "https://evil.example/id.jpg"));
        assert!(!valid_document_public_id(
            user,
            &format!("unadomot/verification/{user}/../secret")
        ));
    }
}
