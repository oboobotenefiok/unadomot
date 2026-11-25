use crate::application::media::{MediaError, MediaSigner, UploadSignature};
use chrono::Utc;
use sha1::{Digest, Sha1};

pub struct CloudinarySigner {
    cloud_name: String,
    api_key: String,
    api_secret: String,
}

impl CloudinarySigner {
    pub fn new(cloud_name: String, api_key: String, api_secret: String) -> Self {
        Self {
            cloud_name,
            api_key,
            api_secret,
        }
    }
}

impl MediaSigner for CloudinarySigner {
    fn sign_upload(&self, folder: &str) -> Result<UploadSignature, MediaError> {
        let timestamp = Utc::now().timestamp();
        let params = format!("folder={folder}&timestamp={timestamp}");
        let mut hasher = Sha1::new();
        hasher.update(format!("{params}{}", self.api_secret).as_bytes());
        let signature = hex::encode(hasher.finalize());

        Ok(UploadSignature {
            signature,
            timestamp,
            api_key: self.api_key.clone(),
            cloud_name: self.cloud_name.clone(),
            folder: folder.to_string(),
        })
    }
}
