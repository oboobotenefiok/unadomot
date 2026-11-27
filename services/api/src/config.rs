use std::sync::Arc;

#[derive(Clone)]
pub struct CloudinaryConfig {
    pub cloud_name: String,
    pub api_key: String,
    pub api_secret: String,
}

#[derive(Clone)]
pub struct ResendConfig {
    pub api_key: String,
    pub from: String,
}

#[derive(Clone)]
pub struct Config {
    pub is_production: bool,
    pub database_url: Option<String>,
    pub jwt_secret: Arc<String>,
    pub refresh_secret: Arc<String>,
    pub allowed_origins: Arc<Vec<String>>,
    pub rate_limit_per_minute: u32,
    pub cloudinary: Option<CloudinaryConfig>,
    pub resend: Option<ResendConfig>,
    pub password_reset_debug: bool,
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

        let rate_limit_per_minute = std::env::var("RATE_LIMIT_PER_MINUTE")
            .ok()
            .and_then(|value| value.parse::<u32>().ok())
            .unwrap_or(120);

        let cloudinary = match (
            std::env::var("CLOUDINARY_CLOUD_NAME"),
            std::env::var("CLOUDINARY_API_KEY"),
            std::env::var("CLOUDINARY_API_SECRET"),
        ) {
            (Ok(cloud_name), Ok(api_key), Ok(api_secret))
                if !cloud_name.trim().is_empty()
                    && !api_key.trim().is_empty()
                    && !api_secret.trim().is_empty() =>
            {
                Some(CloudinaryConfig {
                    cloud_name,
                    api_key,
                    api_secret,
                })
            }
            _ => None,
        };
        if is_production && cloudinary.is_none() {
            return Err(
                "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required in production"
                    .into(),
            );
        }

        let resend = match (
            std::env::var("RESEND_API_KEY"),
            std::env::var("EMAIL_FROM"),
        ) {
            (Ok(api_key), Ok(from))
                if !api_key.trim().is_empty() && !from.trim().is_empty() =>
            {
                Some(ResendConfig { api_key, from })
            }
            _ => None,
        };
        if is_production && resend.is_none() {
            return Err("RESEND_API_KEY and EMAIL_FROM are required in production".into());
        }

        let password_reset_debug =
            std::env::var("PASSWORD_RESET_DEBUG").ok().as_deref() == Some("1");
        if password_reset_debug && is_production {
            return Err("PASSWORD_RESET_DEBUG must not be enabled in production".into());
        }

        Ok(Self {
            is_production,
            database_url,
            jwt_secret: Arc::new(jwt_secret),
            refresh_secret: Arc::new(refresh_secret),
            allowed_origins,
            rate_limit_per_minute,
            cloudinary,
            resend,
            password_reset_debug,
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
