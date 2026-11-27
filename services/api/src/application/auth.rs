use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use async_trait::async_trait;
use axum::http::{header, HeaderMap};
use chrono::{DateTime, Duration, Utc};
use hmac::{Hmac, Mac};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use uuid::Uuid;

#[derive(Debug)]
pub enum AuthError {
    InvalidCredentials,
    EmailTaken,
    Validation(String),
    Repository(String),
}

#[derive(Clone, Debug)]
pub struct AuthenticatedUser {
    pub id: Uuid,
    pub email: String,
}

#[derive(Debug)]
pub struct Session {
    pub token: String,
    pub expires_at: i64,
}

#[derive(Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub email: String,
    pub exp: i64,
    pub iat: i64,
    pub iss: String,
    pub aud: String,
}

#[derive(Clone, Debug)]
pub struct StoredUser {
    pub id: Uuid,
    pub email: String,
    pub password_hash: Option<String>,
    pub status: String,
}

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn create_user(
        &self,
        email: &str,
        password_hash: Option<&str>,
        name: &str,
    ) -> Result<AuthenticatedUser, AuthError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<StoredUser>, AuthError>;
    async fn store_refresh_token(
        &self,
        user_id: Uuid,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), AuthError>;
    async fn rotate_refresh_token(
        &self,
        old_hash: &str,
        new_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<Option<AuthenticatedUser>, AuthError>;
    async fn revoke_refresh_token(&self, token_hash: &str) -> Result<bool, AuthError>;
    async fn create_password_reset(
        &self,
        email: &str,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<Option<Uuid>, AuthError>;
    async fn reset_password(
        &self,
        token_hash: &str,
        password_hash: &str,
    ) -> Result<bool, AuthError>;
    async fn is_admin(&self, user_id: Uuid) -> Result<bool, AuthError>;
    async fn is_active(&self, user_id: Uuid) -> Result<bool, AuthError>;
    async fn suspend_user(&self, user_id: Uuid) -> Result<bool, AuthError>;
}

pub fn bearer_token(headers: &HeaderMap) -> Result<&str, AuthError> {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or(AuthError::InvalidCredentials)
}

pub async fn require_active(
    repository: &dyn UserRepository,
    user_id: Uuid,
) -> Result<(), AuthError> {
    if repository.is_active(user_id).await? {
        Ok(())
    } else {
        Err(AuthError::InvalidCredentials)
    }
}

pub async fn require_active_pool(
    pool: &sqlx::PgPool,
    user_id: Uuid,
) -> Result<(), AuthError> {
    let active: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND status = 'active')",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AuthError::Repository(e.to_string()))?;

    if active.unwrap_or(false) {
        Ok(())
    } else {
        Err(AuthError::InvalidCredentials)
    }
}

pub async fn register(
    repository: &dyn UserRepository,
    email: &str,
    password: &str,
    name: &str,
) -> Result<AuthenticatedUser, AuthError> {
    let email = email.trim().to_lowercase();
    let name = name.trim();

    if name.is_empty() || name.len() > 120 {
        return Err(AuthError::Validation("Name is required (max 120 characters)".into()));
    }
    if !email.contains('@') || !email.contains('.') || email.len() > 254 {
        return Err(AuthError::Validation("A valid email is required".into()));
    }
    if password.len() < 8 || password.len() > 128 {
        return Err(AuthError::Validation(
            "Password must be between 8 and 128 characters".into(),
        ));
    }

    if repository.find_by_email(&email).await?.is_some() {
        return Err(AuthError::EmailTaken);
    }

    let password = password.to_string();
    let hash = tokio::task::spawn_blocking(move || hash_password(&password))
        .await
        .map_err(|e| AuthError::Repository(e.to_string()))??;
    repository.create_user(&email, Some(&hash), name).await
}

pub async fn login(
    repository: &dyn UserRepository,
    email: &str,
    password: &str,
    jwt_secret: &str,
) -> Result<Session, AuthError> {
    let user = repository.find_by_email(email.trim()).await?;

    let Some(user) = user else {
        dummy_verify(password).await?;
        return Err(AuthError::InvalidCredentials);
    };

    if user.status != "active" {
        dummy_verify(password).await?;
        return Err(AuthError::InvalidCredentials);
    }

    let password_hash = user.password_hash.ok_or(AuthError::InvalidCredentials)?;
    let password = password.to_string();
    let valid = tokio::task::spawn_blocking(move || {
        let Ok(parsed) = PasswordHash::new(&password_hash) else {
            return false;
        };
        Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok()
    })
    .await
    .map_err(|e| AuthError::Repository(e.to_string()))?;

    if !valid {
        return Err(AuthError::InvalidCredentials);
    }

    issue_session(user.id, user.email, jwt_secret)
}

async fn dummy_verify(password: &str) -> Result<(), AuthError> {
    let password = password.to_string();
    tokio::task::spawn_blocking(move || {
        let salt = SaltString::generate(&mut OsRng);
        let _ = Argon2::default().hash_password(password.as_bytes(), &salt);
    })
    .await
    .map_err(|e| AuthError::Repository(e.to_string()))?;
    Ok(())
}

pub fn hash_password(password: &str) -> Result<String, AuthError> {
    if password.len() < 8 || password.len() > 128 {
        return Err(AuthError::Validation(
            "Password must be between 8 and 128 characters".into(),
        ));
    }
    let salt = SaltString::generate(&mut OsRng);
    Ok(Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AuthError::Repository(e.to_string()))?
        .to_string())
}

pub fn issue_session(user_id: Uuid, email: String, jwt_secret: &str) -> Result<Session, AuthError> {
    let now = Utc::now();
    let expires_at = (now + Duration::minutes(60)).timestamp();
    let claims = Claims {
        sub: user_id,
        email,
        exp: expires_at,
        iat: now.timestamp(),
        iss: "unadomot".into(),
        aud: "unadomot-api".into(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| AuthError::Repository(e.to_string()))?;

    Ok(Session { token, expires_at })
}

pub fn verify_session(token: &str, jwt_secret: &str) -> Result<AuthenticatedUser, AuthError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&["unadomot"]);
    validation.set_audience(&["unadomot-api"]);

    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation,
    )
    .map_err(|_| AuthError::InvalidCredentials)?;

    Ok(AuthenticatedUser {
        id: data.claims.sub,
        email: data.claims.email,
    })
}

pub fn new_refresh_token() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

fn hash_refresh_token_with_secret(token: &str, secret: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .expect("HMAC accepts keys of any size");
    mac.update(token.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

pub fn hash_refresh_token(token: &str) -> String {
    let secret = std::env::var("REFRESH_TOKEN_SECRET")
        .expect("REFRESH_TOKEN_SECRET must be set before hashing refresh tokens");
    hash_refresh_token_with_secret(token, &secret)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn password_hashing_and_verification_work() {
        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default()
            .hash_password(b"correct-password", &salt)
            .unwrap()
            .to_string();
        let parsed = PasswordHash::new(&hash).unwrap();
        assert!(Argon2::default()
            .verify_password(b"correct-password", &parsed)
            .is_ok());
    }

    #[test]
    fn refresh_tokens_are_hashed_with_hmac() {
        let hash = hash_refresh_token_with_secret(
            "token-value",
            "test-refresh-secret-at-least-32-bytes-long",
        );
        assert_eq!(hash.len(), 64);
        assert_ne!(hash, "token-value");
    }
}
