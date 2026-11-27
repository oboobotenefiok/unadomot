use crate::application::auth::{
    hash_password, hash_refresh_token, issue_session, login, new_refresh_token, register, AuthError,
};
use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
    Json, Router,
};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};

use super::{ApiError, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/login", post(login_handler))
        .route("/api/auth/refresh", post(refresh_handler))
        .route("/api/auth/logout", post(logout_handler))
        .route(
            "/api/auth/password-reset/request",
            post(password_reset_request_handler),
        )
        .route(
            "/api/auth/password-reset/confirm",
            post(password_reset_confirm_handler),
        )
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Deserialize)]
pub struct LogoutRequest {
    pub refresh_token: String,
}

#[derive(Deserialize)]
pub struct PasswordResetRequest {
    pub email: String,
}

#[derive(Deserialize)]
pub struct PasswordResetConfirm {
    pub token: String,
    pub new_password: String,
}

#[derive(Serialize)]
pub struct SessionResponse {
    pub token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

async fn register_handler(
    State(state): State<AppState>,
    Json(request): Json<RegisterRequest>,
) -> Result<Json<SessionResponse>, ApiError> {
    let user = register(
        state.users.as_ref(),
        &request.email,
        &request.password,
        &request.name,
    )
    .await
    .map_err(auth_error)?;

    let session = issue_session(user.id, user.email, &state.jwt_secret).map_err(auth_error)?;
    let refresh_token = new_refresh_token();
    state
        .users
        .store_refresh_token(
            user.id,
            &hash_refresh_token(&refresh_token),
            Utc::now() + Duration::days(30),
        )
        .await
        .map_err(auth_error)?;

    Ok(Json(SessionResponse {
        token: session.token,
        refresh_token,
        expires_at: session.expires_at,
    }))
}

async fn login_handler(
    State(state): State<AppState>,
    Json(request): Json<LoginRequest>,
) -> Result<Json<SessionResponse>, ApiError> {
    let session = login(
        state.users.as_ref(),
        &request.email,
        &request.password,
        &state.jwt_secret,
    )
    .await
    .map_err(|error| {
        tracing::warn!("login failed");
        auth_error(error)
    })?;

    let user = state
        .users
        .find_by_email(&request.email)
        .await
        .map_err(auth_error)?
        .ok_or_else(|| {
            ApiError::new(
                StatusCode::UNAUTHORIZED,
                "invalid_credentials",
                "Invalid email or password",
            )
        })?;

    let refresh_token = new_refresh_token();
    state
        .users
        .store_refresh_token(
            user.id,
            &hash_refresh_token(&refresh_token),
            Utc::now() + Duration::days(30),
        )
        .await
        .map_err(auth_error)?;

    Ok(Json(SessionResponse {
        token: session.token,
        refresh_token,
        expires_at: session.expires_at,
    }))
}

async fn refresh_handler(
    State(state): State<AppState>,
    Json(request): Json<RefreshRequest>,
) -> Result<Json<SessionResponse>, ApiError> {
    let new_token = new_refresh_token();
    let user = state
        .users
        .rotate_refresh_token(
            &hash_refresh_token(&request.refresh_token),
            &hash_refresh_token(&new_token),
            Utc::now() + Duration::days(30),
        )
        .await
        .map_err(auth_error)?
        .ok_or_else(|| {
            ApiError::new(
                StatusCode::UNAUTHORIZED,
                "invalid_refresh_token",
                "Refresh token is invalid or expired",
            )
        })?;

    let session = issue_session(user.id, user.email, &state.jwt_secret).map_err(auth_error)?;

    Ok(Json(SessionResponse {
        token: session.token,
        refresh_token: new_token,
        expires_at: session.expires_at,
    }))
}

async fn logout_handler(
    State(state): State<AppState>,
    Json(request): Json<LogoutRequest>,
) -> Result<StatusCode, ApiError> {
    state
        .users
        .revoke_refresh_token(&hash_refresh_token(&request.refresh_token))
        .await
        .map_err(auth_error)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn password_reset_request_handler(
    State(state): State<AppState>,
    Json(request): Json<PasswordResetRequest>,
) -> Result<StatusCode, ApiError> {
    let token = new_refresh_token();
    let user_id = state
        .users
        .create_password_reset(
            request.email.trim(),
            &hash_refresh_token(&token),
            Utc::now() + Duration::minutes(30),
        )
        .await
        .map_err(auth_error)?;

    if user_id.is_some() {
        let reset_link = format!(
            "{}/reset-password?token={}",
            state.app_base_url,
            token
        );
        if let Err(error) = state
            .email
            .send_password_reset(request.email.trim(), &reset_link)
            .await
        {
            tracing::error!(error = ?error, "password reset email delivery failed");
        }
    }

    Ok(StatusCode::NO_CONTENT)
}

async fn password_reset_confirm_handler(
    State(state): State<AppState>,
    Json(request): Json<PasswordResetConfirm>,
) -> Result<StatusCode, ApiError> {
    let password_hash = hash_password(&request.new_password).map_err(auth_error)?;
    let updated = state
        .users
        .reset_password(&hash_refresh_token(&request.token), &password_hash)
        .await
        .map_err(auth_error)?;

    if !updated {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "invalid_reset_token",
            "Reset token is invalid or expired",
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}

fn auth_error(error: AuthError) -> ApiError {
    match error {
        AuthError::InvalidCredentials => ApiError::new(
            StatusCode::UNAUTHORIZED,
            "invalid_credentials",
            "Invalid email or password",
        ),
        AuthError::EmailTaken => ApiError::new(
            StatusCode::CONFLICT,
            "email_taken",
            "Email already registered",
        ),
        AuthError::Validation(message) => {
            ApiError::new(StatusCode::BAD_REQUEST, "validation_error", message)
        }
        AuthError::Repository(_) => ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "service_unavailable",
            "The service is temporarily unavailable",
        ),
    }
}
