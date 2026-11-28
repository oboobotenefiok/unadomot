use crate::application::media::{MediaError, MediaSigner, UploadRequest, UploadSignature};
use base64::Engine;
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

    /// Cloudinary signs alphabetically sorted `key=value` pairs joined by `&`,
    /// with the API secret appended.
    fn signature_for(&self, params: &[(String, String)]) -> String {
        let mut sorted = params.to_vec();
        sorted.sort_by(|a, b| a.0.cmp(&b.0));
        let to_sign = sorted
            .iter()
            .map(|(key, value)| format!("{key}={value}"))
            .collect::<Vec<_>>()
            .join("&");
        let mut hasher = Sha1::new();
        hasher.update(format!("{to_sign}{}", self.api_secret).as_bytes());
        hex::encode(hasher.finalize())
    }
}

impl MediaSigner for CloudinarySigner {
    fn sign_upload(&self, request: &UploadRequest) -> Result<UploadSignature, MediaError> {
        let timestamp = Utc::now().timestamp();
        let allowed_formats = request.purpose.allowed_formats().to_string();
        let mut params = vec![
            ("allowed_formats".to_string(), allowed_formats.clone()),
            ("folder".to_string(), request.folder.clone()),
            ("timestamp".to_string(), timestamp.to_string()),
        ];
        if request.authenticated {
            params.push(("type".to_string(), "authenticated".to_string()));
        }

        let signature = self.signature_for(&params);

        Ok(UploadSignature {
            signature,
            timestamp,
            api_key: self.api_key.clone(),
            cloud_name: self.cloud_name.clone(),
            folder: request.folder.clone(),
            allowed_formats,
            upload_type: request.authenticated.then(|| "authenticated".to_string()),
            resource_type: request.purpose.resource_type().to_string(),
        })
    }

    fn cloud_name(&self) -> Option<&str> {
        Some(&self.cloud_name)
    }

    fn signed_delivery_url(&self, public_id: &str) -> Result<String, MediaError> {
        let to_sign = format!("image/authenticated/{public_id}");
        let mut hasher = Sha1::new();
        hasher.update(format!("{to_sign}{}", self.api_secret).as_bytes());
        let digest = hasher.finalize();
        let encoded = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest);
        let signature = &encoded[..8];

        Ok(format!(
            "https://res.cloudinary.com/{}/image/authenticated/s--{}--/{}",
            self.cloud_name, signature, public_id
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::media::UploadPurpose;
    use uuid::Uuid;

    fn signer() -> CloudinarySigner {
        CloudinarySigner::new("demo".into(), "key".into(), "secret".into())
    }

    #[test]
    fn signs_sorted_params_and_restricts_formats() {
        let request = UploadRequest::new(UploadPurpose::Listing, Uuid::nil());
        let signature = signer().sign_upload(&request).unwrap();
        assert_eq!(signature.allowed_formats, "jpg,jpeg,png,webp,heic");
        assert_eq!(signature.resource_type, "image");
        assert!(signature.upload_type.is_none());

        let expected_params = [
            ("allowed_formats".to_string(), signature.allowed_formats.clone()),
            ("folder".to_string(), request.folder.clone()),
            ("timestamp".to_string(), signature.timestamp.to_string()),
        ];
        let expected = signer().signature_for(&expected_params);
        assert_eq!(signature.signature, expected);
    }

    #[test]
    fn chat_uploads_are_signed_for_audio_and_video() {
        let request = UploadRequest::new(UploadPurpose::Chat, Uuid::nil());
        let signature = signer().sign_upload(&request).unwrap();
        assert_eq!(signature.resource_type, "auto");
        assert!(signature.allowed_formats.contains("m4a"));
        assert!(signature.allowed_formats.contains("mp4"));
        assert!(signature.upload_type.is_none());
    }

    #[test]
    fn verification_uploads_are_authenticated() {
        let request = UploadRequest::new(UploadPurpose::Verification, Uuid::nil());
        let signature = signer().sign_upload(&request).unwrap();
        assert_eq!(signature.upload_type.as_deref(), Some("authenticated"));
        assert_eq!(signature.resource_type, "image");
    }

    #[test]
    fn exposes_cloud_name_for_url_validation() {
        assert_eq!(signer().cloud_name(), Some("demo"));
    }

    #[test]
    fn builds_signed_authenticated_delivery_urls() {
        let url = signer()
            .signed_delivery_url("unadomot/verification/abc/id-front")
            .unwrap();
        assert!(url.starts_with("https://res.cloudinary.com/demo/image/authenticated/s--"));
        assert!(url.ends_with("/unadomot/verification/abc/id-front"));
    }
}
