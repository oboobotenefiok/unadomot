//! Router-level tests. These exercise the real `app()` router without a
//! database or network listener, using the unconfigured repository adapters.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use std::sync::Arc;
use tower::ServiceExt;
use unadomot_api::adapters::{
    UnconfiguredCallRepository, UnconfiguredMediaSigner, UnconfiguredMessagingRepository,
    UnconfiguredReportRepository, UnconfiguredRepository, UnconfiguredUserRepository,
    UnconfiguredVerificationRepository,
};
use unadomot_api::application::email::UnconfiguredEmailSender;
use unadomot_api::http::{app, AppState, RateLimiter};

fn test_state() -> AppState {
    AppState {
        users: Arc::new(UnconfiguredUserRepository),
        listings: Arc::new(UnconfiguredRepository),
        messaging: Arc::new(UnconfiguredMessagingRepository),
        reports: Arc::new(UnconfiguredReportRepository),
        audit: Arc::new(UnconfiguredVerificationRepository),
        calls: Arc::new(UnconfiguredCallRepository),
        comments: None,
        profiles: None,
        media: Arc::new(UnconfiguredMediaSigner),
        email: Arc::new(UnconfiguredEmailSender),
        pool: None,
        jwt_secret: Arc::new("test-secret-that-is-long-enough-for-hs256".into()),
        limiter: Arc::new(RateLimiter::new(10_000)),
        allowed_origins: Arc::new(Vec::new()),
        app_base_url: Arc::new("https://unadomot.test".into()),
    }
}

async fn status_for(uri: &str) -> StatusCode {
    let request = Request::builder()
        .uri(uri)
        .body(Body::empty())
        .expect("valid request");

    app(test_state())
        .oneshot(request)
        .await
        .expect("router response")
        .status()
}

#[tokio::test]
async fn health_endpoint_is_public() {
    assert_eq!(status_for("/health").await, StatusCode::OK);
}

#[tokio::test]
async fn unknown_routes_are_not_found() {
    assert_eq!(status_for("/api/does-not-exist").await, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn profile_requires_authentication() {
    assert_eq!(
        status_for("/api/profile/me").await,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn admin_routes_require_authentication() {
    assert_eq!(
        status_for("/api/admin/audit").await,
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        status_for("/api/admin/verification").await,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn messaging_and_call_routes_require_authentication() {
    assert_eq!(
        status_for("/api/conversations").await,
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        status_for("/api/calls/incoming").await,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn media_signature_requires_authentication() {
    assert_eq!(
        status_for("/api/media/signature").await,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn public_listing_browse_is_wired() {
    // The unconfigured repository returns a 503, which proves the route is
    // mounted and reached the handler rather than 404ing.
    assert_eq!(
        status_for("/api/listings").await,
        StatusCode::SERVICE_UNAVAILABLE
    );
}
