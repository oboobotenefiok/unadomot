use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::{Duration, Utc};
use serde::Deserialize;
use serde_json::{json, Value};
use unadomot_api::application::auth::{
    hash_refresh_token, issue_session, new_refresh_token,
};
use unadomot_api::application::profiles::{Profile, ProfileListing};
use unadomot_api::extract::{AdminUser, AuthUser};
use unadomot_api::http::AppState;
use uuid::Uuid;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/profile/me", get(me).patch(update_me))
        .route("/api/profile/me/listings", get(my_listings))
        .route("/api/profile/{username}", get(public_profile))
        .route("/api/auth/google", post(google_auth))
        .route("/api/admin/users/search", get(admin_user_search))
        .route("/api/admin/audit", get(admin_audit))
        .with_state(state)
}

fn error(status: StatusCode, message: &str) -> axum::response::Response {
    (status, Json(json!({ "error": { "message": message } }))).into_response()
}

fn valid_media_url(url: &str) -> bool {
    url.is_empty()
        || (url.starts_with("https://res.cloudinary.com/")
            && url.contains("/upload/")
            && url.len() <= 2048
            && !url.contains(' ')
            && !url.contains('\n')
            && !url.contains('\r'))
}

fn profile_json(profile: &Profile, public: bool) -> Value {
    if public {
        json!({
            "id": profile.id,
            "name": profile.name,
            "username": profile.username,
            "bio": profile.bio,
            "photo_url": profile.photo_url,
            "user_type": profile.user_type,
            "verified": profile.verified,
            "reply_rate": profile.reply_rate,
            "response_time": profile.response_time,
            "last_active": profile.last_active,
            "created_at": profile.created_at,
        })
    } else {
        json!({
            "id": profile.id,
            "email": profile.email,
            "name": profile.name,
            "username": profile.username,
            "phone": profile.phone,
            "bio": profile.bio,
            "photo_url": profile.photo_url,
            "user_type": profile.user_type,
            "verified": profile.verified,
            "reply_rate": profile.reply_rate,
            "response_time": profile.response_time,
            "last_active": profile.last_active,
            "created_at": profile.created_at,
        })
    }
}

fn listing_json(listing: &ProfileListing) -> Value {
    json!({
        "id": listing.id,
        "title": listing.title,
        "price": listing.price.to_string(),
        "address": listing.address,
        "state": listing.state,
        "lga": listing.lga,
        "status": listing.status,
        "property_type": listing.property_type,
        "bedrooms": listing.bedrooms,
        "bathrooms": listing.bathrooms,
        "code": listing.code,
        "image_url": listing.image_url,
    })
}

async fn me(
    State(state): State<AppState>,
    user: AuthUser,
) -> axum::response::Response {
    let profiles = match state.profiles.as_ref() {
        Some(profiles) => profiles,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let email = match profiles.email_for_user(user.id).await {
        Ok(Some(email)) => email,
        Ok(None) => return error(StatusCode::NOT_FOUND, "Account not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    if profiles.ensure_profile(user.id, &email).await.is_err() {
        return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable");
    }

    let profile = match profiles.find_profile(user.id).await {
        Ok(Some(profile)) => profile,
        Ok(None) => return error(StatusCode::NOT_FOUND, "Profile not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let is_admin = state.users.is_admin(user.id).await.unwrap_or(false);
    let mut value = profile_json(&profile, false);
    value["is_admin"] = json!(is_admin);
    Json(value).into_response()
}

#[derive(Deserialize)]
struct UpdateProfileRequest {
    name: Option<String>,
    phone: Option<String>,
    bio: Option<String>,
    photo_url: Option<String>,
}

async fn update_me(
    State(state): State<AppState>,
    user: AuthUser,
    Json(request): Json<UpdateProfileRequest>,
) -> axum::response::Response {
    let profiles = match state.profiles.as_ref() {
        Some(profiles) => profiles,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let name = request.name.unwrap_or_default().trim().to_string();
    if name.len() < 2 || name.len() > 60 {
        return error(StatusCode::BAD_REQUEST, "Name must be 2 to 60 characters");
    }
    let phone = request.phone.unwrap_or_default().trim().to_string();
    let bio = request.bio.unwrap_or_default().trim().to_string();
    if bio.len() > 500 {
        return error(StatusCode::BAD_REQUEST, "Bio must be 500 characters or less");
    }
    let photo_url = request.photo_url.unwrap_or_default().trim().to_string();
    if !valid_media_url(&photo_url) {
        return error(StatusCode::BAD_REQUEST, "Photo must be a Cloudinary HTTPS upload");
    }

    match profiles
        .update_profile(user.id, &name, &phone, &bio, &photo_url)
        .await
    {
        Ok(true) => (StatusCode::OK, Json(json!({ "ok": true }))).into_response(),
        Ok(false) => error(StatusCode::NOT_FOUND, "Profile not found"),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    }
}

async fn my_listings(
    State(state): State<AppState>,
    user: AuthUser,
) -> axum::response::Response {
    let profiles = match state.profiles.as_ref() {
        Some(profiles) => profiles,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Listings unavailable"),
    };

    match profiles.listings_for_user(user.id, false).await {
        Ok(rows) => Json(rows.iter().map(listing_json).collect::<Vec<_>>()).into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Listings unavailable"),
    }
}

async fn public_profile(
    State(state): State<AppState>,
    Path(username): Path<String>,
) -> axum::response::Response {
    let profiles = match state.profiles.as_ref() {
        Some(profiles) => profiles,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let profile = match profiles.find_public_profile(&username).await {
        Ok(Some(profile)) => profile,
        Ok(None) => return error(StatusCode::NOT_FOUND, "User not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let listings = profiles
        .listings_for_user(profile.id, true)
        .await
        .unwrap_or_default();

    let mut value = profile_json(&profile, true);
    value["listings"] = json!(listings.iter().map(listing_json).collect::<Vec<_>>());
    Json(value).into_response()
}

#[derive(Deserialize, Default)]
struct UserSearchQuery {
    q: Option<String>,
}

async fn admin_user_search(
    State(state): State<AppState>,
    _admin: AdminUser,
    Query(query): Query<UserSearchQuery>,
) -> axum::response::Response {
    let profiles = match state.profiles.as_ref() {
        Some(profiles) => profiles,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "User search unavailable"),
    };

    let term = query.q.unwrap_or_default().trim().to_lowercase();
    if term.len() < 2 {
        return Json(json!([])).into_response();
    }

    match profiles.search_users(&term).await {
        Ok(rows) => Json(
            rows.into_iter()
                .map(|row| {
                    json!({
                        "id": row.id,
                        "email": row.email,
                        "name": row.name,
                        "username": row.username,
                        "status": row.status,
                        "verified": row.verified,
                        "user_type": row.user_type,
                    })
                })
                .collect::<Vec<_>>(),
        )
        .into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "User search unavailable"),
    }
}

async fn admin_audit(
    State(state): State<AppState>,
    _admin: AdminUser,
) -> axum::response::Response {
    let profiles = match state.profiles.as_ref() {
        Some(profiles) => profiles,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Audit log unavailable"),
    };

    match profiles.recent_audit(100).await {
        Ok(rows) => Json(
            rows.into_iter()
                .map(|row| {
                    json!({
                        "id": row.id,
                        "admin_user_id": row.admin_user_id,
                        "action": row.action,
                        "target_id": row.target_id,
                        "metadata": row.metadata,
                        "created_at": row.created_at,
                    })
                })
                .collect::<Vec<_>>(),
        )
        .into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Audit log unavailable"),
    }
}

#[derive(Deserialize)]
struct GoogleAuthRequest {
    id_token: String,
}

#[derive(Deserialize)]
struct GoogleTokenInfo {
    aud: String,
    email: String,
    email_verified: Option<String>,
    name: Option<String>,
}

async fn google_auth(
    State(state): State<AppState>,
    Json(request): Json<GoogleAuthRequest>,
) -> axum::response::Response {
    let client_id = match std::env::var("GOOGLE_CLIENT_ID") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => return error(StatusCode::SERVICE_UNAVAILABLE, "Google sign-in is not configured"),
    };

    if request.id_token.trim().is_empty() {
        return error(StatusCode::BAD_REQUEST, "Google token is required");
    }

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
    {
        Ok(client) => client,
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Google verification unavailable"),
    };

    let response = match client
        .get("https://oauth2.googleapis.com/tokeninfo")
        .query(&[("id_token", request.id_token.trim())])
        .send()
        .await
    {
        Ok(response) => response,
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Google verification unavailable"),
    };

    if !response.status().is_success() {
        return error(StatusCode::UNAUTHORIZED, "Google sign-in failed");
    }

    let info: GoogleTokenInfo = match response.json().await {
        Ok(info) => info,
        Err(_) => return error(StatusCode::UNAUTHORIZED, "Google sign-in failed"),
    };

    if info.aud != client_id {
        return error(StatusCode::UNAUTHORIZED, "Google token audience mismatch");
    }
    if info.email_verified.as_deref() != Some("true") {
        return error(StatusCode::UNAUTHORIZED, "Google email is not verified");
    }

    let email = info.email.trim().to_lowercase();
    let name = info.name.unwrap_or_else(|| email.split('@').next().unwrap_or("User").to_string());

    let existing = match state.users.find_by_email(&email).await {
        Ok(user) => user,
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Could not verify account"),
    };

    let user_id = match existing {
        Some(user) => {
            if user.status != "active" {
                return error(StatusCode::FORBIDDEN, "This account is suspended");
            }
            if state
                .users
                .link_google_user(user.id, user.password_hash.is_some())
                .await
                .is_err()
            {
                return error(StatusCode::SERVICE_UNAVAILABLE, "Could not verify account");
            }
            user.id
        }
        None => match state.users.create_google_user(&email).await {
            Ok(id) => id,
            Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Could not create account"),
        },
    };

    let profiles = match state.profiles.as_ref() {
        Some(profiles) => profiles,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Could not create profile"),
    };
    if profiles.ensure_profile(user_id, &email).await.is_err() {
        return error(StatusCode::SERVICE_UNAVAILABLE, "Could not create profile");
    }

    if state
        .users
        .set_profile_name_if_empty(user_id, &name)
        .await
        .is_err()
    {
        return error(StatusCode::SERVICE_UNAVAILABLE, "Could not create profile");
    }

    let refresh_token = new_refresh_token();
    let refresh_hash = hash_refresh_token(&refresh_token);
    if state
        .users
        .store_refresh_token(user_id, &refresh_hash, Utc::now() + Duration::days(30))
        .await
        .is_err()
    {
        return error(StatusCode::SERVICE_UNAVAILABLE, "Could not create session");
    }

    match issue_session(user_id, email, &state.jwt_secret) {
        Ok(session) => Json(json!({
            "token": session.token,
            "expires_at": session.expires_at,
            "refresh_token": refresh_token,
        }))
        .into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Could not create session"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_cloudinary_photo_urls() {
        assert!(!valid_media_url("http://example.com/photo.jpg"));
        assert!(!valid_media_url("javascript:alert(1)"));
        assert!(!valid_media_url("https://example.com/upload/photo.jpg"));
        assert!(valid_media_url("https://res.cloudinary.com/demo/image/upload/sample.jpg"));
        assert!(valid_media_url(""));
    }

    #[test]
    fn public_profile_never_serialises_email_or_phone() {
        let profile = Profile {
            id: Uuid::new_v4(),
            email: "private@example.test".into(),
            name: "Private User".into(),
            username: Some("privateuser".into()),
            phone: Some("08000000000".into()),
            bio: None,
            photo_url: None,
            user_type: "renter".into(),
            verified: false,
            reply_rate: None,
            response_time: None,
            last_active: None,
            created_at: Utc::now(),
        };

        let public = profile_json(&profile, true);
        assert!(public.get("email").is_none());
        assert!(public.get("phone").is_none());

        let private = profile_json(&profile, false);
        assert_eq!(private["email"], "private@example.test");
        assert_eq!(private["phone"], "08000000000");
    }
}
