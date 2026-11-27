use async_trait::async_trait;
use serde_json::json;

#[derive(Debug)]
pub enum EmailError {
    NotConfigured,
    Delivery(String),
}

#[async_trait]
pub trait EmailSender: Send + Sync {
    async fn send_password_reset(&self, to: &str, reset_link: &str) -> Result<(), EmailError>;
}

pub struct ResendEmailSender {
    api_key: String,
    from: String,
    client: reqwest::Client,
}

impl ResendEmailSender {
    pub fn new(api_key: String, from: String) -> Self {
        Self {
            api_key,
            from,
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl EmailSender for ResendEmailSender {
    async fn send_password_reset(&self, to: &str, reset_link: &str) -> Result<(), EmailError> {
        let response = self
            .client
            .post("https://api.resend.com/emails")
            .bearer_auth(&self.api_key)
            .json(&json!({
                "from": self.from,
                "to": [to],
                "subject": "Reset your UnaDomot password",
                "html": format!(
                    "<p>Use the link below to reset your UnaDomot password. It expires in 30 minutes.</p><p><a href=\"{reset_link}\">Reset password</a></p>"
                ),
            }))
            .send()
            .await
            .map_err(|error| EmailError::Delivery(error.to_string()))?;

        if !response.status().is_success() {
            return Err(EmailError::Delivery(format!(
                "email provider returned {}",
                response.status()
            )));
        }

        Ok(())
    }
}

pub struct UnconfiguredEmailSender;

#[async_trait]
impl EmailSender for UnconfiguredEmailSender {
    async fn send_password_reset(&self, _to: &str, _reset_link: &str) -> Result<(), EmailError> {
        Err(EmailError::NotConfigured)
    }
}

pub fn from_env() -> std::sync::Arc<dyn EmailSender> {
    match (
        std::env::var("RESEND_API_KEY"),
        std::env::var("EMAIL_FROM"),
    ) {
        (Ok(api_key), Ok(from)) if !api_key.trim().is_empty() && !from.trim().is_empty() => {
            std::sync::Arc::new(ResendEmailSender::new(api_key, from))
        }
        _ => std::sync::Arc::new(UnconfiguredEmailSender),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn unconfigured_sender_fails_closed() {
        let sender = UnconfiguredEmailSender;
        assert!(matches!(
            sender.send_password_reset("user@example.com", "https://example.com").await,
            Err(EmailError::NotConfigured)
        ));
    }
}
