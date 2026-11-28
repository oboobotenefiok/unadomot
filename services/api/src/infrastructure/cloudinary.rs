use crate::application::media::{MediaError, MediaSigner, UploadRequest, UploadSignature};
use chrono::Utc;
use sha1::{Digest, Sha1};

const ALLOWED_FORMATS: &str = "jpg,jpeg,png,webp,heic";

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
        let mut params = vec![
            ("allowed_formats".to_string(), ALLOWED_FORMATS.to_string()),
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
            allowed_formats: ALLOWED_FORMATS.to_string(),
            upload_type: request.authenticated.then(|| "authenticated".to_string()),
            resource_type: "image".to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn signer() -> CloudinarySigner {
        CloudinarySigner::new("demo".into(), "key".into(), "secret".into())
    }

    #[test]
    fn signs_sorted_params_and_restricts_formats() {
        let request = UploadRequest {
            folder: "unadomot/listings/abc".into(),
            authenticated: false,
        };
        let signature = signer().sign_upload(&request).unwrap();
        assert_eq!(signature.allowed_formats, ALLOWED_FORMATS);
        assert_eq!(signature.resource_type, "image");
        assert!(signature.upload_type.is_none());

        let expected_params = [
            ("allowed_formats".to_string(), ALLOWED_FORMATS.to_string()),
            ("folder".to_string(), request.folder.clone()),
            ("timestamp".to_string(), signature.timestamp.to_string()),
        ];
        let expected = signer().signature_for(&expected_params);
        assert_eq!(signature.signature, expected);
    }

    #[test]
    fn verification_uploads_are_authenticated() {
        let request = UploadRequest {
            folder: "unadomot/verification/abc".into(),
            authenticated: true,
        };
        let signature = signer().sign_upload(&request).unwrap();
        assert_eq!(signature.upload_type.as_deref(), Some("authenticated"));
    }
}
