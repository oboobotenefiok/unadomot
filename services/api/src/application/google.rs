use std::sync::Arc;
use std::time::{Duration, Instant};

use jsonwebtoken::{
    decode, decode_header, jwk::JwkSet, Algorithm, DecodingKey, Validation,
};
use serde::Deserialize;
use tokio::sync::RwLock;

const JWKS_URL: &str = "https://www.googleapis.com/oauth2/v3/certs";
const JWKS_TTL: Duration = Duration::from_secs(3600);

#[derive(Debug)]
pub enum GoogleAuthError {
    InvalidToken,
    Unavailable,
}

#[derive(Debug)]
pub struct GoogleUser {
    pub email: String,
    pub name: Option<String>,
}

struct CachedJwks {
    keys: Arc<JwkSet>,
    fetched_at: Instant,
}

pub struct GoogleAuth {
    client_id: String,
    client: reqwest::Client,
    jwks: RwLock<Option<CachedJwks>>,
}

impl GoogleAuth {
    pub fn new(client_id: String, client: reqwest::Client) -> Self {
        Self {
            client_id,
            client,
            jwks: RwLock::new(None),
        }
    }

    pub async fn verify(&self, token: &str) -> Result<GoogleUser, GoogleAuthError> {
        let header = decode_header(token).map_err(|_| GoogleAuthError::InvalidToken)?;
        if header.alg != Algorithm::RS256 {
            return Err(GoogleAuthError::InvalidToken);
        }
        let kid = header.kid.ok_or(GoogleAuthError::InvalidToken)?;

        let mut keys = self.keys(false).await?;
        let jwk = match find_key(&keys, &kid) {
            Some(jwk) => jwk,
            None => {
                keys = self.keys(true).await?;
                find_key(&keys, &kid).ok_or(GoogleAuthError::InvalidToken)?
            }
        };

        let key = DecodingKey::from_jwk(jwk).map_err(|_| GoogleAuthError::InvalidToken)?;
        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_issuer(&["https://accounts.google.com", "accounts.google.com"]);
        validation.set_audience(&[self.client_id.as_str()]);

        let data = decode::<GoogleClaims>(token, &key, &validation)
            .map_err(|_| GoogleAuthError::InvalidToken)?;
        let claims = data.claims;

        if claims.aud != self.client_id {
            return Err(GoogleAuthError::InvalidToken);
        }
        if let Some(azp) = claims.azp.as_deref() {
            if azp != self.client_id {
                return Err(GoogleAuthError::InvalidToken);
            }
        }
        if !claims.email_verified {
            return Err(GoogleAuthError::InvalidToken);
        }

        let email = claims.email.trim().to_lowercase();
        if email.is_empty() || !email.contains('@') {
            return Err(GoogleAuthError::InvalidToken);
        }

        Ok(GoogleUser {
            email,
            name: claims.name,
        })
    }

    async fn keys(&self, force: bool) -> Result<Arc<JwkSet>, GoogleAuthError> {
        if !force {
            let cache = self.jwks.read().await;
            if let Some(cached) = cache.as_ref() {
                if cached.fetched_at.elapsed() < JWKS_TTL {
                    return Ok(cached.keys.clone());
                }
            }
        }

        let response = self
            .client
            .get(JWKS_URL)
            .send()
            .await
            .map_err(|_| GoogleAuthError::Unavailable)?;
        if !response.status().is_success() {
            return Err(GoogleAuthError::Unavailable);
        }
        let keys = response
            .json::<JwkSet>()
            .await
            .map_err(|_| GoogleAuthError::Unavailable)?;
        let keys = Arc::new(keys);

        let mut cache = self.jwks.write().await;
        *cache = Some(CachedJwks {
            keys: keys.clone(),
            fetched_at: Instant::now(),
        });

        Ok(keys)
    }
}

fn find_key<'a>(keys: &'a JwkSet, kid: &str) -> Option<&'a jsonwebtoken::jwk::Jwk> {
    keys.keys
        .iter()
        .find(|key| key.common.key_id.as_deref() == Some(kid))
}

#[derive(Deserialize)]
struct GoogleClaims {
    email: String,
    email_verified: bool,
    name: Option<String>,
    aud: String,
    azp: Option<String>,
    iss: String,
    exp: i64,
}
