//! Router-level tests. These exercise the real `app()` router without a
//! database or network listener, using the unconfigured repository adapters.

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use serde_json::Value;
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
        refresh_secret: Arc::new("test-refresh-secret-that-is-at-least-32-bytes".into()),
        http_client: reqwest::Client::new(),
        google: None,
        turn_urls: None,
        turn_secret: None,
        limiter: Arc::new(RateLimiter::new(10_000, None)),
        allowed_origins: Arc::new(Vec::new()),
        public_web_url: Arc::new("https://unadomot.test".into()),
    }
}

async fn response_for(method: Method, uri: &str) -> (StatusCode, Value) {
    let label = format!("{} {}", method.as_str(), uri);
    let request = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json")
        .body(Body::empty())
        .expect("valid request");

    let response = app(test_state())
        .oneshot(request)
        .await
        .expect("router response");
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    let body = serde_json::from_slice(&bytes).unwrap_or(Value::Null);

    assert!(
        status != StatusCode::METHOD_NOT_ALLOWED,
        "{label} returned 405; the test is using the wrong HTTP method"
    );

    (status, body)
}

async fn assert_unauthorized(method: Method, uri: &str) {
    let (status, body) = response_for(method, uri).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED, "{} {}", method.as_str(), uri);
    assert_eq!(
        body["error"]["code"],
        "unauthorized",
        "{} {} returned the wrong error code: {body}",
        method.as_str(),
        uri
    );
}

#[tokio::test]
async fn health_endpoint_is_public() {
    let (status, _) = response_for(Method::GET, "/health").await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn unknown_routes_are_not_found() {
    let (status, _) = response_for(Method::GET, "/api/does-not-exist").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn profile_requires_authentication() {
    assert_unauthorized(Method::GET, "/api/profile/me").await;
}

#[tokio::test]
async fn admin_routes_require_authentication() {
    assert_unauthorized(Method::GET, "/api/admin/audit").await;
    assert_unauthorized(Method::GET, "/api/admin/verification").await;
}

#[tokio::test]
async fn messaging_and_call_routes_require_authentication() {
    assert_unauthorized(Method::GET, "/api/conversations").await;
    assert_unauthorized(Method::GET, "/api/calls/incoming").await;
}

#[tokio::test]
async fn media_signature_requires_authentication() {
    assert_unauthorized(Method::POST, "/api/media/signature").await;
}

#[tokio::test]
async fn public_listing_browse_is_wired() {
    // The unconfigured repository returns a 503, which proves the route is
    // mounted and reached the handler rather than 404ing.
    let (status, _) = response_for(Method::GET, "/api/listings").await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
}
