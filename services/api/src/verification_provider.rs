use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationInput {
    pub id_type: String,
    pub id_number: String,
    pub selfie_url: Option<String>,
    pub document_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationOutcome {
    pub approved: bool,
    pub provider: String,
    pub provider_reference: Option<String>,
    pub reason: Option<String>,
    pub raw: serde_json::Value,
}

#[async_trait]
pub trait IdentityVerificationProvider: Send + Sync {
    fn name(&self) -> &'static str;
    async fn verify(&self, input: VerificationInput) -> Result<VerificationOutcome, String>;
}

pub struct MockProvider;

#[async_trait]
impl IdentityVerificationProvider for MockProvider {
    fn name(&self) -> &'static str {
        "mock"
    }

    async fn verify(&self, input: VerificationInput) -> Result<VerificationOutcome, String> {
        if input.id_number.trim().len() < 11 {
            return Ok(VerificationOutcome {
                approved: false,
                provider: self.name().to_string(),
                provider_reference: None,
                reason: Some("ID number is too short".to_string()),
                raw: serde_json::json!({ "mock": true }),
            });
        }

        Ok(VerificationOutcome {
            approved: true,
            provider: self.name().to_string(),
            provider_reference: Some(format!("mock-{}", uuid::Uuid::new_v4())),
            reason: None,
            raw: serde_json::json!({ "mock": true, "id_type": input.id_type }),
        })
    }
}

pub struct SmileIdProvider {
    partner_id: String,
    api_key: String,
    base_url: String,
}

impl SmileIdProvider {
    pub fn from_env() -> Option<Self> {
        let partner_id = std::env::var("SMILE_ID_PARTNER_ID").ok()?;
        let api_key = std::env::var("SMILE_ID_API_KEY").ok()?;
        if partner_id.trim().is_empty() || api_key.trim().is_empty() {
            return None;
        }
        let environment = std::env::var("SMILE_ID_ENVIRONMENT").unwrap_or_else(|_| "sandbox".into());
        let base_url = if environment == "production" {
            "https://api.smileidentity.com".to_string()
        } else {
            "https://testapi.smileidentity.com".to_string()
        };
        Some(Self { partner_id, api_key, base_url })
    }
}

#[async_trait]
impl IdentityVerificationProvider for SmileIdProvider {
    fn name(&self) -> &'static str {
        "smile_id"
    }

    async fn verify(&self, input: VerificationInput) -> Result<VerificationOutcome, String> {
        let response = reqwest::Client::new()
            .post(format!("{}/v1/async/id_verification", self.base_url))
            .header("X-Partner-ID", &self.partner_id)
            .header("X-API-Key", &self.api_key)
            .json(&serde_json::json!({
                "country": "NG",
                "id_type": input.id_type,
                "id_number": input.id_number,
                "selfie_url": input.selfie_url,
                "document_url": input.document_url,
            }))
            .send()
            .await
            .map_err(|error| error.to_string())?;

        let status = response.status();
        let raw: serde_json::Value = response.json().await.map_err(|error| error.to_string())?;

        if !status.is_success() {
            return Ok(VerificationOutcome {
                approved: false,
                provider: self.name().to_string(),
                provider_reference: None,
                reason: Some(format!("Provider returned {status}")),
                raw,
            });
        }

        let approved = raw.get("ResultCode").and_then(|value| value.as_str()) == Some("0810")
            || raw.get("result_code").and_then(|value| value.as_str()) == Some("0810");
        let reference = raw
            .get("PartnerParams")
            .and_then(|value| value.get("job_id"))
            .and_then(|value| value.as_str())
            .map(|value| value.to_string());

        Ok(VerificationOutcome {
            approved,
            provider: self.name().to_string(),
            provider_reference: reference,
            reason: if approved { None } else { Some("Identity could not be confirmed".to_string()) },
            raw,
        })
    }
}

pub fn configured_provider() -> Box<dyn IdentityVerificationProvider> {
    if let Some(provider) = SmileIdProvider::from_env() {
        return Box::new(provider);
    }

    let environment = std::env::var("APP_ENV").unwrap_or_else(|_| "development".into());
    if environment == "production" {
        panic!(
            "SMILE_ID_PARTNER_ID and SMILE_ID_API_KEY are required in production; mock verification is disabled"
        );
    }

    Box::new(MockProvider)
}
