use async_trait::async_trait;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde_json::Value;
use uuid::Uuid;

pub struct Profile {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub username: Option<String>,
    pub phone: Option<String>,
    pub bio: Option<String>,
    pub photo_url: Option<String>,
    pub user_type: String,
    pub verified: bool,
    pub reply_rate: Option<f64>,
    pub response_time: Option<String>,
    pub last_active: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

pub struct ProfileListing {
    pub id: Uuid,
    pub title: String,
    pub price: Decimal,
    pub address: String,
    pub state: String,
    pub lga: String,
    pub status: String,
    pub property_type: Option<String>,
    pub bedrooms: Option<i32>,
    pub bathrooms: Option<i32>,
    pub code: Option<String>,
    pub image_url: Option<String>,
}

pub struct AdminUserSummary {
    pub id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub username: Option<String>,
    pub status: String,
    pub verified: bool,
    pub user_type: String,
}

pub struct AuditEntry {
    pub id: Uuid,
    pub admin_user_id: Uuid,
    pub action: String,
    pub target_id: Uuid,
    pub metadata: Value,
    pub created_at: DateTime<Utc>,
}

#[async_trait]
pub trait ProfileRepository: Send + Sync {
    async fn email_for_user(&self, user_id: Uuid) -> Result<Option<String>, sqlx::Error>;
    async fn ensure_profile(&self, user_id: Uuid, email: &str) -> Result<(), sqlx::Error>;
    async fn find_profile(&self, user_id: Uuid) -> Result<Option<Profile>, sqlx::Error>;
    async fn find_public_profile(&self, username: &str) -> Result<Option<Profile>, sqlx::Error>;
    async fn update_profile(
        &self,
        user_id: Uuid,
        name: &str,
        phone: &str,
        bio: &str,
        photo_url: &str,
    ) -> Result<bool, sqlx::Error>;
    async fn listings_for_user(
        &self,
        user_id: Uuid,
        only_available: bool,
    ) -> Result<Vec<ProfileListing>, sqlx::Error>;
    async fn search_users(&self, term: &str) -> Result<Vec<AdminUserSummary>, sqlx::Error>;
    async fn recent_audit(&self, limit: i64) -> Result<Vec<AuditEntry>, sqlx::Error>;
}
