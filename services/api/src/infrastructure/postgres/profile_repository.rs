use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use crate::application::profiles::{
    AdminUserSummary, AuditEntry, Profile, ProfileListing, ProfileRepository,
};

pub struct PostgresProfileRepository {
    pool: PgPool,
}

impl PostgresProfileRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

fn username_base(name: &str) -> String {
    let mut parts = name.split_whitespace();
    let first = parts.next().unwrap_or("user");
    let last = parts.last().unwrap_or("");
    let mut first_part: String = first
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphabetic())
        .take(4)
        .collect();
    while first_part.len() < 4 {
        first_part.push('a');
    }
    let last_initial = last
        .to_lowercase()
        .chars()
        .find(|c| c.is_ascii_alphabetic())
        .unwrap_or('a');
    let suffix = 1000 + (Uuid::new_v4().as_u128() % 9000) as u32;
    format!("{first_part}{last_initial}{suffix}")
}

#[derive(sqlx::FromRow)]
struct ProfileRow {
    id: Uuid,
    email: String,
    name: String,
    username: Option<String>,
    phone: Option<String>,
    bio: Option<String>,
    photo_url: Option<String>,
    user_type: String,
    verified: bool,
    reply_rate: Option<f64>,
    response_time: Option<String>,
    last_active: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<ProfileRow> for Profile {
    fn from(row: ProfileRow) -> Self {
        Self {
            id: row.id,
            email: row.email,
            name: row.name,
            username: row.username,
            phone: row.phone,
            bio: row.bio,
            photo_url: row.photo_url,
            user_type: row.user_type,
            verified: row.verified,
            reply_rate: row.reply_rate,
            response_time: row.response_time,
            last_active: row.last_active,
            created_at: row.created_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct ListingRow {
    id: Uuid,
    title: String,
    price: rust_decimal::Decimal,
    address: String,
    state: String,
    lga: String,
    status: String,
    property_type: Option<String>,
    bedrooms: Option<i32>,
    bathrooms: Option<i32>,
    code: Option<String>,
    image_url: Option<String>,
}

impl From<ListingRow> for ProfileListing {
    fn from(row: ListingRow) -> Self {
        Self {
            id: row.id,
            title: row.title,
            price: row.price,
            address: row.address,
            state: row.state,
            lga: row.lga,
            status: row.status,
            property_type: row.property_type,
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            code: row.code,
            image_url: row.image_url,
        }
    }
}

#[async_trait]
impl ProfileRepository for PostgresProfileRepository {
    async fn email_for_user(&self, user_id: Uuid) -> Result<Option<String>, sqlx::Error> {
        sqlx::query_scalar("SELECT email FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await
    }

    async fn ensure_profile(&self, user_id: Uuid, email: &str) -> Result<(), sqlx::Error> {
        let fallback = email.split('@').next().unwrap_or("User").to_string();
        sqlx::query(
            "INSERT INTO user_profiles (user_id, name) VALUES ($1, $2)
             ON CONFLICT (user_id) DO NOTHING",
        )
        .bind(user_id)
        .bind(&fallback)
        .execute(&self.pool)
        .await?;

        let current: Option<String> =
            sqlx::query_scalar("SELECT username FROM user_profiles WHERE user_id = $1")
                .bind(user_id)
                .fetch_one(&self.pool)
                .await?;

        if current.is_none() {
            for _ in 0..8 {
                let candidate = username_base(&fallback);
                let exists: bool = sqlx::query_scalar(
                    "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE lower(username) = lower($1))",
                )
                .bind(&candidate)
                .fetch_one(&self.pool)
                .await?;
                if !exists {
                    sqlx::query("UPDATE user_profiles SET username = $2 WHERE user_id = $1")
                        .bind(user_id)
                        .bind(&candidate)
                        .execute(&self.pool)
                        .await?;
                    break;
                }
            }
        }
        Ok(())
    }

    async fn find_profile(&self, user_id: Uuid) -> Result<Option<Profile>, sqlx::Error> {
        sqlx::query_as::<_, ProfileRow>(
            "SELECT u.id, u.email, p.name, p.username, p.phone, p.bio, p.photo_url,
                    p.user_type, p.verified, p.reply_rate, p.response_time, p.last_active, u.created_at
             FROM users u JOIN user_profiles p ON p.user_id = u.id
             WHERE u.id = $1",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map(|row| row.map(Profile::from))
    }

    async fn find_public_profile(&self, username: &str) -> Result<Option<Profile>, sqlx::Error> {
        let by_username = sqlx::query_as::<_, ProfileRow>(
            "SELECT u.id, u.email, p.name, p.username, p.phone, p.bio, p.photo_url,
                    p.user_type, p.verified, p.reply_rate, p.response_time, p.last_active, u.created_at
             FROM users u JOIN user_profiles p ON p.user_id = u.id
             WHERE lower(p.username) = lower($1)",
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = by_username {
            return Ok(Some(Profile::from(row)));
        }

        // Older clients link to an owner by slugging their display name, which
        // never matches the generated username. Accept that form as a fallback
        // so those links resolve instead of returning 404.
        sqlx::query_as::<_, ProfileRow>(
            "SELECT u.id, u.email, p.name, p.username, p.phone, p.bio, p.photo_url,
                    p.user_type, p.verified, p.reply_rate, p.response_time, p.last_active, u.created_at
             FROM users u JOIN user_profiles p ON p.user_id = u.id
             WHERE lower(replace(p.name, ' ', '')) = lower($1)
             ORDER BY u.created_at ASC
             LIMIT 1",
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await
        .map(|row| row.map(Profile::from))
    }

    async fn update_profile(
        &self,
        user_id: Uuid,
        name: &str,
        phone: &str,
        bio: &str,
        photo_url: &str,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE user_profiles SET name = $2, phone = NULLIF($3, ''), bio = NULLIF($4, ''),
                    photo_url = COALESCE(NULLIF($5, ''), photo_url)
             WHERE user_id = $1",
        )
        .bind(user_id)
        .bind(name)
        .bind(phone)
        .bind(bio)
        .bind(photo_url)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    async fn listings_for_user(
        &self,
        user_id: Uuid,
        only_available: bool,
    ) -> Result<Vec<ProfileListing>, sqlx::Error> {
        let rows = sqlx::query_as::<_, ListingRow>(
            "SELECT id, title, price, address, state, lga, status, property_type, bedrooms, bathrooms, code,
                    (SELECT url FROM listing_media WHERE listing_id = listings.id ORDER BY position LIMIT 1) AS image_url
             FROM listings
             WHERE landlord_id = $1 AND deleted_at IS NULL
               AND ($2 = false OR status = 'available')
             ORDER BY created_at DESC
             LIMIT CASE WHEN $2 THEN 50 ELSE NULL END",
        )
        .bind(user_id)
        .bind(only_available)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(ProfileListing::from).collect())
    }

    async fn search_users(&self, term: &str) -> Result<Vec<AdminUserSummary>, sqlx::Error> {
        let pattern = format!("%{}%", term.to_lowercase());
        let rows = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, String, bool, String)>(
            "SELECT u.id, u.email, p.name, p.username, u.status, p.verified, p.user_type
             FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
             WHERE lower(u.email) LIKE $1 OR lower(COALESCE(p.name, '')) LIKE $1 OR lower(COALESCE(p.username, '')) LIKE $1
             ORDER BY u.created_at DESC LIMIT 25",
        )
        .bind(pattern)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|(id, email, name, username, status, verified, user_type)| AdminUserSummary {
                id,
                email,
                name,
                username,
                status,
                verified,
                user_type,
            })
            .collect())
    }

    async fn recent_audit(&self, limit: i64) -> Result<Vec<AuditEntry>, sqlx::Error> {
        let rows = sqlx::query_as::<_, (Uuid, Uuid, String, Uuid, serde_json::Value, chrono::DateTime<chrono::Utc>)>(
            "SELECT id, admin_user_id, action, target_id, metadata, created_at
             FROM admin_audit_log ORDER BY created_at DESC LIMIT $1",
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|(id, admin_user_id, action, target_id, metadata, created_at)| AuditEntry {
                id,
                admin_user_id,
                action,
                target_id,
                metadata,
                created_at,
            })
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn username_has_expected_shape() {
        let username = username_base("John Doe");
        assert_eq!(username.len(), 9);
        assert!(username.chars().take(4).all(|c| c.is_ascii_alphabetic()));
        assert!(username.chars().skip(5).all(|c| c.is_ascii_digit()));
    }
}
