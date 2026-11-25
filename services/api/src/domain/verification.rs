use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct VerificationRequest {
    pub id: Uuid,
    pub user_id: Uuid,
    pub document_url: String,
    pub notes: Option<String>,
    pub status: String,
    pub review_notes: Option<String>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}
