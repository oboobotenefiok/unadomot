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
    pub last_message_preview: Option<String>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub unread_count: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
pub struct MessageReaction {
    pub emoji: String,
    pub count: i64,
    pub reacted_by_me: bool,
}

#[derive(Clone, Debug)]
pub struct Message {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub sender_id: Uuid,
    pub body: Option<String>,
    pub media_url: Option<String>,
    pub media_type: Option<String>,
    pub duration_seconds: Option<i32>,
    pub reply_to_id: Option<Uuid>,
    pub reply_to_body: Option<String>,
    pub reactions: Vec<MessageReaction>,
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
}
