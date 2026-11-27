use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::{Duration, Utc};
use rust_decimal::Decimal;
use serde::Deserialize;
use serde_json::{json, Value};
use unadomot_api::application::auth::{
    hash_refresh_token, issue_session, new_refresh_token,
};
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

fn username_base(name: &str) -> String {
    let mut parts = name.split_whitespace();
    let first = parts.next().unwrap_or("user");
    let last = parts.last().unwrap_or("");
    let mut first_part: String = first
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphabetic())
        .take(4)
        .collect();
    while first_part.len() < 4 {
        first_part.push('a');
    }
    let last_initial = last
        .to_lowercase()
        .chars()
        .find(|c| c.is_ascii_alphabetic())
        .unwrap_or('a');
    let suffix = 1000 + (Uuid::new_v4().as_u128() % 9000) as u32;
    format!("{first_part}{last_initial}{suffix}")
}

async fn ensure_profile(pool: &sqlx::PgPool, user_id: Uuid, email: &str) -> Result<(), sqlx::Error> {
    let fallback = email.split('@').next().unwrap_or("User").to_string();
    sqlx::query(
        "INSERT INTO user_profiles (user_id, name) VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING",
    )
    .bind(user_id)
    .bind(&fallback)
    .execute(pool)
    .await?;

    let current: Option<String> = sqlx::query_scalar(
        "SELECT username FROM user_profiles WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if current.is_none() {
        for _ in 0..8 {
            let candidate = username_base(&fallback);
            let exists: bool = sqlx::query_scalar(
                "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE lower(username) = lower($1))",
            )
            .bind(&candidate)
            .fetch_one(pool)
            .await?;
            if !exists {
                sqlx::query("UPDATE user_profiles SET username = $2 WHERE user_id = $1")
                    .bind(user_id)
                    .bind(&candidate)
                    .execute(pool)
                    .await?;
                break;
            }
        }
    }
    Ok(())
}

async fn me(
    State(state): State<AppState>,
    user: AuthUser,
) -> axum::response::Response {
    let pool = match state.pool.as_ref() {
        Some(pool) => pool,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let email: String = match sqlx::query_scalar("SELECT email FROM users WHERE id = $1")
        .bind(user.id)
        .fetch_optional(pool)
        .await
    {
        Ok(Some(email)) => email,
        Ok(None) => return error(StatusCode::NOT_FOUND, "Account not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    if ensure_profile(pool, user.id, &email).await.is_err() {
        return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable");
    }

    let row = sqlx::query_as::<_, ProfileRow>(
        "SELECT u.id, u.email, p.name, p.username, p.phone, p.bio, p.photo_url,
                p.user_type, p.verified, p.reply_rate, p.response_time, p.last_active, u.created_at
         FROM users u JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id = $1",
    )
    .bind(user.id)
    .fetch_one(pool)
    .await;

    let is_admin: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM admin_roles WHERE user_id = $1)",
    )
    .bind(user.id)
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    match row {
        Ok(row) => {
            let mut value = row.into_json();
            value["is_admin"] = json!(is_admin);
            Json(value).into_response()
        }
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    }
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
    let pool = match state.pool.as_ref() {
        Some(pool) => pool,
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

    let result = sqlx::query(
        "UPDATE user_profiles SET name = $2, phone = NULLIF($3, ''), bio = NULLIF($4, ''),
                photo_url = COALESCE(NULLIF($5, ''), photo_url)
         WHERE user_id = $1",
    )
    .bind(user.id)
    .bind(&name)
    .bind(&phone)
    .bind(&bio)
    .bind(&photo_url)
    .execute(pool)
    .await;

    match result {
        Ok(done) if done.rows_affected() > 0 => (StatusCode::OK, Json(json!({ "ok": true }))).into_response(),
        Ok(_) => error(StatusCode::NOT_FOUND, "Profile not found"),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    }
}

async fn my_listings(
    State(state): State<AppState>,
    user: AuthUser,
) -> axum::response::Response {
    let pool = match state.pool.as_ref() {
        Some(pool) => pool,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Listings unavailable"),
    };

    let rows = sqlx::query_as::<_, ListingRow>(
        "SELECT id, title, price, address, state, lga, status, property_type, bedrooms, bathrooms, code,
                (SELECT url FROM listing_media WHERE listing_id = listings.id ORDER BY position LIMIT 1) AS image_url
         FROM listings
         WHERE landlord_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC",
    )
    .bind(user.id)
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => Json(rows.into_iter().map(ListingRow::into_json).collect::<Vec<_>>()).into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Listings unavailable"),
    }
}

async fn public_profile(
    State(state): State<AppState>,
    Path(username): Path<String>,
) -> axum::response::Response {
    let pool = match state.pool.as_ref() {
        Some(pool) => pool,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let row = sqlx::query_as::<_, ProfileRow>(
        "SELECT u.id, u.email, p.name, p.username, p.phone, p.bio, p.photo_url,
                p.user_type, p.verified, p.reply_rate, p.response_time, p.last_active, u.created_at
         FROM users u JOIN user_profiles p ON p.user_id = u.id
         WHERE lower(p.username) = lower($1)",
    )
    .bind(&username)
    .fetch_optional(pool)
    .await;

    let profile = match row {
        Ok(Some(row)) => row,
        Ok(None) => return error(StatusCode::NOT_FOUND, "User not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let listings = sqlx::query_as::<_, ListingRow>(
        "SELECT id, title, price, address, state, lga, status, property_type, bedrooms, bathrooms, code,
                (SELECT url FROM listing_media WHERE listing_id = listings.id ORDER BY position LIMIT 1) AS image_url
         FROM listings
         WHERE landlord_id = $1 AND deleted_at IS NULL AND status = 'available'
         ORDER BY created_at DESC LIMIT 50",
    )
    .bind(profile.id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut value = profile.into_public_json();
    value["listings"] = json!(listings.into_iter().map(ListingRow::into_json).collect::<Vec<_>>());
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

    if ensure_profile(pool, user_id, &email).await.is_err() {
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

#[derive(sqlx::FromRow)]
struct ProfileRow {
    id: Uuid,
    email: String,
    name: String,
    username: Option<String>,
    phone: Option<String>,
    bio: Option<String>,
    photo_url: Option<String>,
    user_type: String,
    verified: bool,
    reply_rate: Option<f64>,
    response_time: Option<String>,
    last_active: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl ProfileRow {
    fn into_json(self) -> Value {
        json!({
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "username": self.username,
            "phone": self.phone,
            "bio": self.bio,
            "photo_url": self.photo_url,
            "user_type": self.user_type,
            "verified": self.verified,
            "reply_rate": self.reply_rate,
            "response_time": self.response_time,
            "last_active": self.last_active,
            "created_at": self.created_at,
        })
    }

    fn into_public_json(self) -> Value {
        json!({
            "id": self.id,
            "name": self.name,
            "username": self.username,
            "bio": self.bio,
            "photo_url": self.photo_url,
            "user_type": self.user_type,
            "verified": self.verified,
            "reply_rate": self.reply_rate,
            "response_time": self.response_time,
            "last_active": self.last_active,
            "created_at": self.created_at,
        })
    }
}

#[derive(sqlx::FromRow)]
struct ListingRow {
    id: Uuid,
    title: String,
    price: Decimal,
    address: String,
    state: String,
    lga: String,
    status: String,
    property_type: Option<String>,
    bedrooms: Option<i32>,
    bathrooms: Option<i32>,
    code: Option<String>,
    image_url: Option<String>,
}

impl ListingRow {
    fn into_json(self) -> Value {
        json!({
            "id": self.id,
            "title": self.title,
            "price": self.price.to_string(),
            "address": self.address,
            "state": self.state,
            "lga": self.lga,
            "status": self.status,
            "property_type": self.property_type,
            "bedrooms": self.bedrooms,
            "bathrooms": self.bathrooms,
            "code": self.code,
            "image_url": self.image_url,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn profile_row() -> ProfileRow {
        ProfileRow {
            id: Uuid::new_v4(),
            email: "private@example.com".into(),
            name: "Test User".into(),
            username: Some("testuser".into()),
            phone: Some("+2348000000000".into()),
            bio: Some("Hello".into()),
            photo_url: None,
            user_type: "renter".into(),
            verified: false,
            reply_rate: None,
            response_time: None,
            last_active: None,
            created_at: Utc::now(),
        }
    }

    #[test]
    fn public_profile_omits_email_and_phone() {
        let value = profile_row().into_public_json();
        assert!(value.get("email").is_none());
        assert!(value.get("phone").is_none());
        assert_eq!(value["username"], "testuser");
    }

    #[test]
    fn rejects_non_https_photo_urls() {
        assert!(!valid_media_url("http://example.com/photo.jpg"));
        assert!(!valid_media_url("javascript:alert(1)"));
        assert!(valid_media_url("https://res.cloudinary.com/demo/image/upload/sample.jpg"));
        assert!(valid_media_url(""));
    }

    #[test]
    fn username_has_expected_shape() {
        let username = username_base("John Doe");
        assert_eq!(username.len(), 9);
        assert!(username.chars().take(4).all(|c| c.is_ascii_alphabetic()));
        assert!(username.chars().skip(5).all(|c| c.is_ascii_digit()));
    }
}
