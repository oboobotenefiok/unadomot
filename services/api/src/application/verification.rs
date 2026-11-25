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
        document_url: &str,
        notes: Option<&str>,
    ) -> Result<VerificationRequest, VerificationError>;
    async fn find_for_user(
        &self,
        user_id: Uuid,
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
}

pub async fn submit_request(
    repository: &dyn VerificationRepository,
    user_id: Uuid,
    document_url: &str,
    notes: Option<&str>,
) -> Result<VerificationRequest, VerificationError> {
    let document_url = document_url.trim();
    if document_url.is_empty() || document_url.len() > 2048 {
        return Err(VerificationError::InvalidInput(
            "A document URL is required".into(),
        ));
    }

    if let Some(existing) = repository.find_for_user(user_id).await? {
        if existing.status == "pending" {
            return Err(VerificationError::Conflict(
                "You already have a pending verification request".into(),
            ));
        }
    }

    repository.submit(user_id, document_url, notes).await
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
