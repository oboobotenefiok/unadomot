use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use chrono::{Duration, Utc};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;
use crate::application::auth::{hash_refresh_token, issue_session, new_refresh_token};
use crate::application::google::GoogleAuthError;
use crate::application::profiles::{Profile, ProfileListing};
use crate::extract::{AdminUser, AuthUser};
use crate::http::AppState;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/profile/me", get(me).patch(update_me))
        .route("/api/profile/me/listings", get(my_listings))
        .route("/api/profile/{username}", get(public_profile))
        .route("/api/account/export", get(export_account))
        .route("/api/account", delete(delete_account))
        .route(
            "/api/account/email-verification/request",
            post(request_email_verification),
        )
        .route(
            "/api/account/email-verification/confirm",
            post(confirm_email_verification),
        )
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

async fn export_account(
    State(state): State<AppState>,
    user: AuthUser,
) -> axum::response::Response {
    let profiles = match state.profiles.as_ref() {
        Some(profiles) => profiles,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let profile = match profiles.find_profile(user.id).await {
        Ok(Some(profile)) => profile,
        Ok(None) => return error(StatusCode::NOT_FOUND, "Account not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let listings = profiles
        .listings_for_user(user.id, false)
        .await
        .unwrap_or_default();
    let favorites = state
        .listings
        .list_favorites(user.id)
        .await
        .unwrap_or_default();

    let mut conversations = Vec::new();
    if let Ok(rows) = state.messaging.list_conversations(user.id).await {
        for row in rows {
            let messages = state
                .messaging
                .list_messages(row.id, None, 500)
                .await
                .unwrap_or_default();
            conversations.push(json!({
                "id": row.id,
                "listing_id": row.listing_id,
                "messages": messages.iter().map(|message| json!({
                    "id": message.id,
                    "sender_id": message.sender_id,
                    "body": message.body,
                    "created_at": message.created_at,
                })).collect::<Vec<_>>(),
            }));
        }
    }

    Json(json!({
        "exported_at": Utc::now(),
        "profile": profile_json(&profile, false),
        "listings": listings.iter().map(listing_json).collect::<Vec<_>>(),
        "favorites": favorites.iter().map(|listing| json!({
            "id": listing.id,
            "title": listing.title,
            "price": listing.price.to_string(),
            "state": listing.state,
            "lga": listing.lga,
        })).collect::<Vec<_>>(),
        "conversations": conversations,
    }))
    .into_response()
}

async fn delete_account(
    State(state): State<AppState>,
    user: AuthUser,
) -> axum::response::Response {
    let pool = match state.pool.as_ref() {
        Some(pool) => pool,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Account deletion unavailable"),
    };

    let mut transaction = match pool.begin().await {
        Ok(transaction) => transaction,
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Account deletion unavailable"),
    };

    if sqlx::query("DELETE FROM refresh_tokens WHERE user_id = $1")
        .bind(user.id)
        .execute(&mut *transaction)
        .await
        .is_err()
    {
        return error(StatusCode::SERVICE_UNAVAILABLE, "Account deletion unavailable");
    }

    let deleted = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user.id)
        .execute(&mut *transaction)
        .await;

    match deleted {
        Ok(result) if result.rows_affected() > 0 => {
            if transaction.commit().await.is_err() {
                return error(StatusCode::SERVICE_UNAVAILABLE, "Account deletion unavailable");
            }
            StatusCode::NO_CONTENT.into_response()
        }
        Ok(_) => error(StatusCode::NOT_FOUND, "Account not found"),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Account deletion unavailable"),
    }
}

async fn request_email_verification(
    State(state): State<AppState>,
    user: AuthUser,
) -> axum::response::Response {
    let pool = match state.pool.as_ref() {
        Some(pool) => pool,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Verification unavailable"),
    };
    let profiles = match state.profiles.as_ref() {
        Some(profiles) => profiles,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Verification unavailable"),
    };

    let email = match profiles.email_for_user(user.id).await {
        Ok(Some(email)) => email,
        Ok(None) => return error(StatusCode::NOT_FOUND, "Account not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Verification unavailable"),
    };

    let token = new_refresh_token();
    let token_hash = hash_refresh_token(&token, &state.refresh_secret);

    if sqlx::query(
        "INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    )
    .bind(user.id)
    .bind(&token_hash)
    .bind(Utc::now() + Duration::hours(24))
    .execute(pool)
    .await
    .is_err()
    {
        return error(StatusCode::SERVICE_UNAVAILABLE, "Verification unavailable");
    }

    let verify_link = format!("{}/verify-email?token={}", state.public_web_url, token);
    if let Err(error) = state.email.send_email_verification(&email, &verify_link).await {
        tracing::error!(error = ?error, "email verification delivery failed");
        return error(StatusCode::SERVICE_UNAVAILABLE, "Could not send the verification email");
    }

    StatusCode::NO_CONTENT.into_response()
}

#[derive(Deserialize)]
struct VerifyEmailRequest {
    token: String,
}

async fn confirm_email_verification(
    State(state): State<AppState>,
    user: AuthUser,
    Json(request): Json<VerifyEmailRequest>,
) -> axum::response::Response {
    let pool = match state.pool.as_ref() {
        Some(pool) => pool,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Verification unavailable"),
    };

    let token_hash = hash_refresh_token(request.token.trim(), &state.refresh_secret);
    let mut transaction = match pool.begin().await {
        Ok(transaction) => transaction,
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Verification unavailable"),
    };

    let valid = sqlx::query_scalar::<_, Uuid>(
        "UPDATE email_verifications SET used_at = now() WHERE user_id = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > now() RETURNING user_id",
    )
    .bind(user.id)
    .bind(&token_hash)
    .fetch_optional(&mut *transaction)
    .await;

    match valid {
        Ok(Some(_)) => {
            if sqlx::query("UPDATE users SET email_verified = true WHERE id = $1")
                .bind(user.id)
                .execute(&mut *transaction)
                .await
                .is_err()
            {
                return error(StatusCode::SERVICE_UNAVAILABLE, "Verification unavailable");
            }
            if transaction.commit().await.is_err() {
                return error(StatusCode::SERVICE_UNAVAILABLE, "Verification unavailable");
            }
            (StatusCode::OK, Json(json!({ "verified": true }))).into_response()
        }
        Ok(None) => error(StatusCode::BAD_REQUEST, "Verification link is invalid or expired"),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Verification unavailable"),
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

async fn google_auth(
    State(state): State<AppState>,
    Json(request): Json<GoogleAuthRequest>,
) -> axum::response::Response {
    let google = match state.google.as_ref() {
        Some(google) => google,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Google sign-in is not configured"),
    };

    if request.id_token.trim().is_empty() {
        return error(StatusCode::BAD_REQUEST, "Google token is required");
    }

    let info = match google.verify(request.id_token.trim()).await {
        Ok(info) => info,
        Err(GoogleAuthError::InvalidToken) => {
            return error(StatusCode::UNAUTHORIZED, "Google sign-in failed")
        }
        Err(GoogleAuthError::Unavailable) => {
            return error(StatusCode::SERVICE_UNAVAILABLE, "Google verification unavailable")
        }
    };

    let email = info.email;
    let name = info
        .name
        .unwrap_or_else(|| email.split('@').next().unwrap_or("User").to_string());

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
    let refresh_hash = hash_refresh_token(&refresh_token, &state.refresh_secret);
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
