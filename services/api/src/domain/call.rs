use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct CallSession {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub caller_id: Uuid,
    pub callee_id: Uuid,
    pub kind: String,
    pub status: String,
    pub offer_sdp: String,
    pub answer_sdp: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
