use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct Conversation {
    pub id: Uuid,
    pub listing_id: Uuid,
    pub participant_a: Uuid,
    pub participant_b: Uuid,
    pub last_message_preview: Option<String>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub last_sender_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
pub struct ConversationSummary {
    pub id: Uuid,
    pub listing_id: Uuid,
    pub listing_title: String,
    pub listing_photo_url: Option<String>,
    pub counterpart_id: Uuid,
    pub counterpart_name: String,
    pub counterpart_verified: bool,
    pub counterpart_photo_url: Option<String>,
    pub counterpart_last_active: Option<DateTime<Utc>>,
    pub last_message_preview: Option<String>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub unread_count: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
pub struct Message {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub sender_id: Uuid,
    pub body: String,
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
}
