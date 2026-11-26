use crate::application::auth::{AuthenticatedUser, AuthError, StoredUser, UserRepository};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

pub struct PostgresUserRepository {
    pool: PgPool,
}

impl PostgresUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserRepository for PostgresUserRepository {
    async fn create_user(
        &self,
        email: &str,
        password_hash: Option<&str>,
        name: &str,
    ) -> Result<AuthenticatedUser, AuthError> {
        let mut transaction = self
            .pool
            .begin()
            .await
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        let user = sqlx::query_as::<_, UserRow>(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, password_hash, status",
        )
        .bind(email)
        .bind(password_hash)
        .fetch_one(&mut *transaction)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        sqlx::query("INSERT INTO user_profiles (user_id, name) VALUES ($1, $2)")
            .bind(user.id)
            .bind(name)
            .execute(&mut *transaction)
            .await
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        transaction
            .commit()
            .await
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        Ok(AuthenticatedUser {
            id: user.id,
            email: user.email,
        })
    }

    async fn find_by_email(&self, email: &str) -> Result<Option<StoredUser>, AuthError> {
        let user = sqlx::query_as::<_, UserRow>(
            "SELECT id, email, password_hash, status FROM users WHERE lower(email) = lower($1)",
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        Ok(user.map(|row| StoredUser {
            id: row.id,
            email: row.email,
            password_hash: row.password_hash,
            status: row.status,
        }))
    }

    async fn store_refresh_token(
        &self,
        user_id: Uuid,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), AuthError> {
        sqlx::query(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        )
        .bind(user_id)
        .bind(token_hash)
        .bind(expires_at)
        .execute(&self.pool)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn rotate_refresh_token(
        &self,
        old_hash: &str,
        new_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<Option<AuthenticatedUser>, AuthError> {
        let mut transaction = self
            .pool
            .begin()
            .await
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        let rotated = sqlx::query_as::<_, RefreshRow>(
            "UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now() RETURNING user_id",
        )
        .bind(old_hash)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        let Some(rotated) = rotated else {
            return Ok(None);
        };

        let user = sqlx::query_as::<_, UserRow>(
            "SELECT id, email, password_hash, status FROM users WHERE id = $1",
        )
        .bind(rotated.user_id)
        .fetch_one(&mut *transaction)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        if user.status != "active" {
            return Ok(None);
        }

        sqlx::query(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        )
        .bind(user.id)
        .bind(new_hash)
        .bind(expires_at)
        .execute(&mut *transaction)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        transaction
            .commit()
            .await
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        Ok(Some(AuthenticatedUser {
            id: user.id,
            email: user.email,
        }))
    }

    async fn revoke_refresh_token(&self, token_hash: &str) -> Result<bool, AuthError> {
        let result = sqlx::query(
            "UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
        )
        .bind(token_hash)
        .execute(&self.pool)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }

    async fn create_password_reset(
        &self,
        email: &str,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<Option<Uuid>, AuthError> {
        let user_id = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM users WHERE lower(email) = lower($1) AND status = 'active'",
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        let Some(user_id) = user_id else {
            return Ok(None);
        };

        sqlx::query(
            "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        )
        .bind(user_id)
        .bind(token_hash)
        .bind(expires_at)
        .execute(&self.pool)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        Ok(Some(user_id))
    }

    async fn reset_password(&self, token_hash: &str, password_hash: &str) -> Result<bool, AuthError> {
        let mut transaction = self
            .pool
            .begin()
            .await
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        let user_id = sqlx::query_scalar::<_, Uuid>(
            "UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING user_id",
        )
        .bind(token_hash)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        let Some(user_id) = user_id else {
            return Ok(false);
        };

        sqlx::query("UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1")
            .bind(user_id)
            .bind(password_hash)
            .execute(&mut *transaction)
            .await
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        sqlx::query(
            "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
        )
        .bind(user_id)
        .execute(&mut *transaction)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        transaction
            .commit()
            .await
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        Ok(true)
    }

    async fn is_admin(&self, user_id: Uuid) -> Result<bool, AuthError> {
        let row: Option<(bool,)> = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM admin_roles WHERE user_id = $1)",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;
        Ok(row.map(|(is_admin,)| is_admin).unwrap_or(false))
    }

    async fn is_active(&self, user_id: Uuid) -> Result<bool, AuthError> {
        let row: Option<(bool,)> = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND status = 'active')",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;
        Ok(row.map(|(is_active,)| is_active).unwrap_or(false))
    }

    async fn suspend_user(&self, user_id: Uuid) -> Result<bool, AuthError> {
        let result = sqlx::query(
            "UPDATE users SET status = 'suspended', updated_at = now() WHERE id = $1 AND status = 'active'",
        )
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }
}

#[derive(sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    email: String,
    password_hash: Option<String>,
    status: String,
}

#[derive(sqlx::FromRow)]
struct RefreshRow {
    user_id: Uuid,
}
