use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;

pub struct CommentView {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub body: String,
    pub photo_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub reactions: Value,
}

pub struct NewComment {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub body: String,
    pub photo_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[async_trait]
pub trait CommentRepository: Send + Sync {
    async fn find_listing_by_code(&self, code: &str) -> Result<Option<Uuid>, sqlx::Error>;
    async fn comment_owner_and_listing(
        &self,
        comment_id: Uuid,
    ) -> Result<Option<(Uuid, Uuid)>, sqlx::Error>;
    async fn is_listing_owner(
        &self,
        listing_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, sqlx::Error>;
    async fn delete_comment(&self, comment_id: Uuid) -> Result<(), sqlx::Error>;
    async fn listing_exists(&self, listing_id: Uuid) -> Result<bool, sqlx::Error>;
    async fn list_comments(
        &self,
        listing_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<CommentView>, sqlx::Error>;
    async fn create_comment(
        &self,
        listing_id: Uuid,
        user_id: Uuid,
        body: &str,
    ) -> Result<NewComment, sqlx::Error>;
    async fn comment_visible(&self, comment_id: Uuid) -> Result<bool, sqlx::Error>;
    async fn toggle_reaction(
        &self,
        comment_id: Uuid,
        user_id: Uuid,
        emoji: &str,
    ) -> Result<(bool, Vec<(String, i32)>), sqlx::Error>;
}
