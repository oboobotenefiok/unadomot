use std::sync::Arc;

#[derive(Clone)]
pub struct Config {
    pub is_production: bool,
    pub database_url: Option<String>,
    pub jwt_secret: Arc<String>,
    pub refresh_secret: Arc<String>,
    pub allowed_origins: Arc<Vec<String>>,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let is_production = std::env::var("FLY_APP_NAME").is_ok()
            || std::env::var("APP_ENV").ok().as_deref() == Some("production");

        let jwt_secret = std::env::var("JWT_SECRET")
            .map_err(|_| "JWT_SECRET is required and must be at least 32 bytes")?;
        if jwt_secret.len() < 32 {
            return Err("JWT_SECRET must be at least 32 bytes".into());
        }
        if is_placeholder_secret(&jwt_secret) {
            return Err("JWT_SECRET must not be a placeholder value".into());
        }

        let refresh_secret = std::env::var("REFRESH_TOKEN_SECRET")
            .map_err(|_| "REFRESH_TOKEN_SECRET is required and must be at least 32 bytes")?;
        if refresh_secret.len() < 32 {
            return Err("REFRESH_TOKEN_SECRET must be at least 32 bytes".into());
        }
        if is_placeholder_secret(&refresh_secret) {
            return Err("REFRESH_TOKEN_SECRET must not be a placeholder value".into());
        }
        if refresh_secret == jwt_secret {
            return Err("REFRESH_TOKEN_SECRET must differ from JWT_SECRET".into());
        }

        let database_url = std::env::var("DATABASE_URL").ok();
        if database_url.is_none() && is_production {
            return Err("DATABASE_URL is required in production".into());
        }

        let allowed_origins = Arc::new(
            std::env::var("ALLOWED_ORIGINS")
                .unwrap_or_default()
                .split(',')
                .map(|origin| origin.trim().to_string())
                .filter(|origin| !origin.is_empty())
                .collect::<Vec<_>>(),
        );

        Ok(Self {
            is_production,
            database_url,
            jwt_secret: Arc::new(jwt_secret),
            refresh_secret: Arc::new(refresh_secret),
            allowed_origins,
        })
    }
}

fn is_placeholder_secret(value: &str) -> bool {
    let lower = value.to_lowercase();
    lower.contains("changeme")
        || lower.contains("change-me")
        || lower.contains("test-secret")
        || lower.contains("your-secret")
        || lower.contains("example")
        || lower == "secret"
        || lower == "password"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_common_placeholder_secrets() {
        assert!(is_placeholder_secret("changeme"));
        assert!(is_placeholder_secret("test-secret-that-is-long-enough"));
        assert!(is_placeholder_secret("your-secret-value"));
        assert!(is_placeholder_secret("example-secret"));
        assert!(is_placeholder_secret("secret"));
        assert!(is_placeholder_secret("password"));
        assert!(!is_placeholder_secret("a-real-random-production-secret"));
    }
}
