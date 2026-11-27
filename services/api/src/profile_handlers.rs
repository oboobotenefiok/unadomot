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
        || (url.starts_with("https://")
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
        return error(StatusCode::BAD_REQUEST, "Photo URL must be a valid HTTPS URL");
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
    let pool = match state.pool.as_ref() {
        Some(pool) => pool,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "User search unavailable"),
    };

    let term = query.q.unwrap_or_default().trim().to_lowercase();
    if term.len() < 2 {
        return Json(json!([])).into_response();
    }
    let pattern = format!("%{term}%");

    let rows = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, String, bool, String)>(
        "SELECT u.id, u.email, p.name, p.username, u.status, p.verified, p.user_type
         FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE lower(u.email) LIKE $1 OR lower(COALESCE(p.name, '')) LIKE $1 OR lower(COALESCE(p.username, '')) LIKE $1
         ORDER BY u.created_at DESC LIMIT 25",
    )
    .bind(&pattern)
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => Json(
            rows.into_iter()
                .map(|(id, email, name, username, status, verified, user_type)| {
                    json!({
                        "id": id,
                        "email": email,
                        "name": name,
                        "username": username,
                        "status": status,
                        "verified": verified,
                        "user_type": user_type,
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
    let pool = match state.pool.as_ref() {
        Some(pool) => pool,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Audit log unavailable"),
    };

    let rows = sqlx::query_as::<_, (Uuid, Uuid, String, Uuid, Value, chrono::DateTime<chrono::Utc>)>(
        "SELECT id, admin_user_id, action, target_id, metadata, created_at
         FROM admin_audit_log ORDER BY created_at DESC LIMIT 100",
    )
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => Json(
            rows.into_iter()
                .map(|(id, admin_user_id, action, target_id, metadata, created_at)| {
                    json!({
                        "id": id,
                        "admin_user_id": admin_user_id,
                        "action": action,
                        "target_id": target_id,
                        "metadata": metadata,
                        "created_at": created_at,
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
    let pool = match state.pool.as_ref() {
        Some(pool) => pool,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Google sign-in unavailable"),
    };

    let client_id = match std::env::var("GOOGLE_CLIENT_ID") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => return error(StatusCode::SERVICE_UNAVAILABLE, "Google sign-in is not configured"),
    };

    if request.id_token.trim().is_empty() {
        return error(StatusCode::BAD_REQUEST, "Google token is required");
    }

    let response = match reqwest::Client::new()
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

    let existing = sqlx::query_as::<_, (Uuid, Option<String>, String)>(
        "SELECT id, password_hash, status FROM users WHERE lower(email) = lower($1)",
    )
    .bind(&email)
    .fetch_optional(pool)
    .await;

    let user_id = match existing {
        Ok(Some((id, password_hash, status))) => {
            if status != "active" {
                return error(StatusCode::FORBIDDEN, "This account is suspended");
            }

            if password_hash.is_some() {
                let _ = sqlx::query(
                    "UPDATE users SET password_hash = NULL, auth_provider = 'google' WHERE id = $1",
                )
                .bind(id)
                .execute(pool)
                .await;
                let _ = sqlx::query(
                    "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
                )
                .bind(id)
                .execute(pool)
                .await;
            } else {
                let _ = sqlx::query("UPDATE users SET auth_provider = 'google' WHERE id = $1")
                    .bind(id)
                    .execute(pool)
                    .await;
            }
            id
        }
        Ok(None) => {
            match sqlx::query_scalar::<_, Uuid>(
                "INSERT INTO users (email, auth_provider) VALUES ($1, 'google') RETURNING id",
            )
            .bind(&email)
            .fetch_one(pool)
            .await
            {
                Ok(id) => id,
                Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Could not create account"),
            }
        }
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Could not verify account"),
    };

    let profiles = match state.profiles.as_ref() {
        Some(profiles) => profiles,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Could not create profile"),
    };
    if profiles.ensure_profile(user_id, &email).await.is_err() {
        return error(StatusCode::SERVICE_UNAVAILABLE, "Could not create profile");
    }

    let _ = sqlx::query("UPDATE user_profiles SET name = $2 WHERE user_id = $1 AND (name IS NULL OR name = '')")
        .bind(user_id)
        .bind(&name)
        .execute(pool)
        .await;

    let refresh_token = new_refresh_token();
    let refresh_hash = hash_refresh_token(&refresh_token);
    if sqlx::query(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    )
    .bind(user_id)
    .bind(&refresh_hash)
    .bind(Utc::now() + Duration::days(30))
    .execute(pool)
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
    fn rejects_non_https_photo_urls() {
        assert!(!valid_media_url("http://example.com/photo.jpg"));
        assert!(!valid_media_url("javascript:alert(1)"));
        assert!(valid_media_url("https://res.cloudinary.com/demo/image/upload/sample.jpg"));
        assert!(valid_media_url(""));
    }
}
