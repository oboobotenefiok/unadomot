use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::PgPool;
use std::sync::Arc;
use unadomot_api::application::auth::{issue_session, verify_session};
use uuid::Uuid;

#[derive(Clone)]
pub struct ProfileState {
    pub pool: PgPool,
    pub jwt_secret: Arc<String>,
}

pub fn router(state: ProfileState) -> Router {
    Router::new()
        .route("/api/profile/me", get(me).patch(update_me))
        .route("/api/profile/me/listings", get(my_listings))
        .route("/api/profile/{username}", get(public_profile))
        .route("/api/auth/google", post(google_auth))
        .with_state(state)
}

fn error(status: StatusCode, message: &str) -> axum::response::Response {
    (status, Json(json!({ "error": { "message": message } }))).into_response()
}

fn authorize(state: &ProfileState, headers: &HeaderMap) -> Result<Uuid, axum::response::Response> {
    let header = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or_else(|| error(StatusCode::UNAUTHORIZED, "Please sign in"))?;

    verify_session(header, &state.jwt_secret)
        .map(|user| user.id)
        .map_err(|_| error(StatusCode::UNAUTHORIZED, "Session expired"))
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
    let suffix = (1000..9999).find(|_| true).unwrap_or(1000);
    format!("{first_part}{last_initial}{suffix}")
}

async fn ensure_profile(pool: &PgPool, user_id: Uuid, email: &str) -> Result<(), sqlx::Error> {
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
    State(state): State<ProfileState>,
    headers: HeaderMap,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let email: String = match sqlx::query_scalar("SELECT email FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(email)) => email,
        Ok(None) => return error(StatusCode::NOT_FOUND, "Account not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    if ensure_profile(&state.pool, user_id, &email).await.is_err() {
        return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable");
    }

    let row = sqlx::query_as::<_, ProfileRow>(
        "SELECT u.id, u.email, p.name, p.username, p.phone, p.bio, p.photo_url,
                p.user_type, p.verified, p.reply_rate, p.response_time, p.last_active, u.created_at
         FROM users u JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id = $1",
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(row) => Json(row.into_json()).into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    }
}

#[derive(Deserialize)]
struct UpdateProfileRequest {
    name: Option<String>,
    phone: Option<String>,
    bio: Option<String>,
}

async fn update_me(
    State(state): State<ProfileState>,
    headers: HeaderMap,
    Json(request): Json<UpdateProfileRequest>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers) {
        Ok(id) => id,
        Err(response) => return response,
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

    let result = sqlx::query(
        "UPDATE user_profiles SET name = $2, phone = NULLIF($3, ''), bio = NULLIF($4, '')
         WHERE user_id = $1",
    )
    .bind(user_id)
    .bind(&name)
    .bind(&phone)
    .bind(&bio)
    .execute(&state.pool)
    .await;

    match result {
        Ok(done) if done.rows_affected() > 0 => (StatusCode::OK, Json(json!({ "ok": true }))).into_response(),
        Ok(_) => error(StatusCode::NOT_FOUND, "Profile not found"),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    }
}

async fn my_listings(
    State(state): State<ProfileState>,
    headers: HeaderMap,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let rows = sqlx::query_as::<_, ListingRow>(
        "SELECT id, title, price, address, state, lga, status, property_type, bedrooms, bathrooms,
                (SELECT url FROM listing_media WHERE listing_id = listings.id ORDER BY position LIMIT 1) AS image_url
         FROM listings
         WHERE landlord_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC",
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => Json(rows.into_iter().map(ListingRow::into_json).collect::<Vec<_>>()).into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Listings unavailable"),
    }
}

async fn public_profile(
    State(state): State<ProfileState>,
    Path(username): Path<String>,
) -> axum::response::Response {
    let row = sqlx::query_as::<_, ProfileRow>(
        "SELECT u.id, u.email, p.name, p.username, p.phone, p.bio, p.photo_url,
                p.user_type, p.verified, p.reply_rate, p.response_time, p.last_active, u.created_at
         FROM users u JOIN user_profiles p ON p.user_id = u.id
         WHERE lower(p.username) = lower($1)",
    )
    .bind(&username)
    .fetch_optional(&state.pool)
    .await;

    let profile = match row {
        Ok(Some(row)) => row,
        Ok(None) => return error(StatusCode::NOT_FOUND, "User not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Profile unavailable"),
    };

    let listings = sqlx::query_as::<_, ListingRow>(
        "SELECT id, title, price, address, state, lga, status, property_type, bedrooms, bathrooms,
                (SELECT url FROM listing_media WHERE listing_id = listings.id ORDER BY position LIMIT 1) AS image_url
         FROM listings
         WHERE landlord_id = $1 AND deleted_at IS NULL AND status = 'available'
         ORDER BY created_at DESC LIMIT 50",
    )
    .bind(profile.id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mut value = profile.into_json();
    value["listings"] = json!(listings.into_iter().map(ListingRow::into_json).collect::<Vec<_>>());
    Json(value).into_response()
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
    State(state): State<ProfileState>,
    Json(request): Json<GoogleAuthRequest>,
) -> axum::response::Response {
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

    let user_id: Uuid = match sqlx::query_scalar(
        "INSERT INTO users (email, auth_provider) VALUES ($1, 'google')
         ON CONFLICT (lower(email)) DO UPDATE SET email = EXCLUDED.email
         RETURNING id",
    )
    .bind(&email)
    .fetch_one(&state.pool)
    .await
    {
        Ok(id) => id,
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Could not create account"),
    };

    if ensure_profile(&state.pool, user_id, &email).await.is_err() {
        return error(StatusCode::SERVICE_UNAVAILABLE, "Could not create profile");
    }

    let _ = sqlx::query("UPDATE user_profiles SET name = $2 WHERE user_id = $1 AND (name IS NULL OR name = '')")
        .bind(user_id)
        .bind(&name)
        .execute(&state.pool)
        .await;

    match issue_session(user_id, email, &state.jwt_secret) {
        Ok(session) => Json(json!({
            "token": session.token,
            "expires_at": session.expires_at,
            "refresh_token": null,
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
}

#[derive(sqlx::FromRow)]
struct ListingRow {
    id: Uuid,
    title: String,
    price: f64,
    address: String,
    state: String,
    lga: String,
    status: String,
    property_type: Option<String>,
    bedrooms: Option<i32>,
    bathrooms: Option<i32>,
    image_url: Option<String>,
}

impl ListingRow {
    fn into_json(self) -> Value {
        json!({
            "id": self.id,
            "title": self.title,
            "price": self.price,
            "address": self.address,
            "state": self.state,
            "lga": self.lga,
            "status": self.status,
            "property_type": self.property_type,
            "bedrooms": self.bedrooms,
            "bathrooms": self.bathrooms,
            "image_url": self.image_url,
        })
    }
}
