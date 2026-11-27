use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
};
use uuid::Uuid;

use crate::application::auth::verify_session;
use crate::http::{ApiError, AppState};

pub struct AuthUser {
    pub id: Uuid,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .ok_or_else(|| {
                ApiError::new(
                    StatusCode::UNAUTHORIZED,
                    "unauthorized",
                    "Missing bearer token",
                )
            })?;

        let user = verify_session(token, &state.jwt_secret).map_err(|_| {
            ApiError::new(
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                "Invalid or expired token",
            )
        })?;

        if !state.users.is_active(user.id).await.map_err(|_| {
            ApiError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                "The service is temporarily unavailable",
            )
        })? {
            return Err(ApiError::new(
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                "Account is not active",
            ));
        }

        Ok(AuthUser { id: user.id })
    }
}

pub struct AdminUser {
    pub id: Uuid,
}

impl FromRequestParts<AppState> for AdminUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let user = <AuthUser as FromRequestParts<AppState>>::from_request_parts(parts, state)
            .await?;

        if !state.users.is_admin(user.id).await.map_err(|_| {
            ApiError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                "The service is temporarily unavailable",
            )
        })? {
            return Err(ApiError::new(
                StatusCode::FORBIDDEN,
                "forbidden",
                "Admin access is required",
            ));
        }

        Ok(AdminUser { id: user.id })
    }
}
