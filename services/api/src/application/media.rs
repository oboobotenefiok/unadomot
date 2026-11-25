use serde::Serialize;

#[derive(Debug)]
pub enum MediaError {
    NotConfigured,
    Signing(String),
}

#[derive(Debug, Serialize)]
pub struct UploadSignature {
    pub signature: String,
    pub timestamp: i64,
    pub api_key: String,
    pub cloud_name: String,
    pub folder: String,
}

pub trait MediaSigner: Send + Sync {
    fn sign_upload(&self, folder: &str) -> Result<UploadSignature, MediaError>;
}
