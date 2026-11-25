use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug)]
pub enum AuthError {
    InvalidCredentials,
    EmailTaken,
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
}

#[derive(Clone, Debug)]
pub struct StoredUser {
    pub id: Uuid,
    pub email: String,
    pub password_hash: Option<String>,
}

pub trait UserRepository: Send + Sync {
    fn create_user(
        &self,
        email: &str,
        password_hash: Option<&str>,
        name: &str,
    ) -> Result<AuthenticatedUser, AuthError>;
    fn find_by_email(&self, email: &str) -> Result<Option<StoredUser>, AuthError>;
}

pub fn register(
    repository: &dyn UserRepository,
    email: &str,
    password: &str,
    name: &str,
) -> Result<AuthenticatedUser, AuthError> {
    if repository.find_by_email(email)?.is_some() {
        return Err(AuthError::EmailTaken);
    }

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AuthError::Repository(e.to_string()))?
        .to_string();

    repository.create_user(email, Some(&hash), name)
}

pub fn login(
    repository: &dyn UserRepository,
    email: &str,
    password: &str,
    jwt_secret: &str,
) -> Result<Session, AuthError> {
    let user = repository
        .find_by_email(email)?
        .ok_or(AuthError::InvalidCredentials)?;

    let parsed = user
        .password_hash
        .as_deref()
        .and_then(|hash| PasswordHash::new(hash).ok())
        .ok_or(AuthError::InvalidCredentials)?;

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .map_err(|_| AuthError::InvalidCredentials)?;

    issue_session(user.id, user.email, jwt_secret)
}

pub fn issue_session(
    user_id: Uuid,
    email: String,
    jwt_secret: &str,
) -> Result<Session, AuthError> {
    let expires_at = (Utc::now() + Duration::days(30)).timestamp();
    let claims = Claims {
        sub: user_id,
        email,
        exp: expires_at,
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
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| AuthError::InvalidCredentials)?;

    Ok(AuthenticatedUser {
        id: data.claims.sub,
        email: data.claims.email,
    })
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
}
