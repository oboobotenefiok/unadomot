use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use crate::extract::AuthUser;
use crate::http::AppState;
use uuid::Uuid;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route(
            "/api/listings/{id}/comments",
            get(list_comments).post(create_comment),
        )
        .route("/api/comments/{id}/reactions", post(toggle_reaction))
        .route("/api/comments/{id}", delete(delete_comment))
        .with_state(state)
}

fn error(status: StatusCode, message: &str) -> axum::response::Response {
    (status, Json(json!({ "error": { "message": message } }))).into_response()
}

#[derive(Deserialize)]
struct CreateCommentRequest {
    body: String,
}

#[derive(Deserialize)]
struct ReactionRequest {
    emoji: String,
}

#[derive(Deserialize, Default)]
struct CommentQuery {
    limit: Option<i64>,
    offset: Option<i64>,
}

async fn delete_comment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(comment_id): Path<Uuid>,
) -> axum::response::Response {
    let comments = match state.comments.as_ref() {
        Some(comments) => comments,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Comment unavailable"),
    };

    let (owner, listing_id) = match comments.comment_owner_and_listing(comment_id).await {
        Ok(Some(row)) => row,
        Ok(None) => return error(StatusCode::NOT_FOUND, "Comment not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Comment unavailable"),
    };

    let is_admin = state.users.is_admin(user.id).await.unwrap_or(false);
    let is_listing_owner = comments
        .is_listing_owner(listing_id, user.id)
        .await
        .unwrap_or(false);

    if owner != user.id && !is_admin && !is_listing_owner {
        return error(StatusCode::FORBIDDEN, "You cannot delete this comment");
    }

    match comments.delete_comment(comment_id).await {
        Ok(_) => Json(json!({ "ok": true })).into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Could not delete comment"),
    }
}

async fn list_comments(
    State(state): State<AppState>,
    Path(listing_id): Path<Uuid>,
    Query(query): Query<CommentQuery>,
) -> axum::response::Response {
    let comments = match state.comments.as_ref() {
        Some(comments) => comments,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Comments unavailable"),
    };

    match comments.listing_exists(listing_id).await {
        Ok(true) => {}
        Ok(false) => return error(StatusCode::NOT_FOUND, "Listing not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Comments unavailable"),
    }

    let limit = query.limit.unwrap_or(50).clamp(1, 100);
    let offset = query.offset.unwrap_or(0).max(0);

    match comments.list_comments(listing_id, limit, offset).await {
        Ok(rows) => Json(
            rows.into_iter()
                .map(|row| {
                    json!({
                        "id": row.id,
                        "user_id": row.user_id,
                        "name": row.name,
                        "body": row.body,
                        "photo_url": row.photo_url,
                        "created_at": row.created_at,
                        "reactions": row.reactions,
                    })
                })
                .collect::<Vec<_>>(),
        )
        .into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Comments unavailable"),
    }
}

async fn create_comment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(listing_id): Path<Uuid>,
    Json(request): Json<CreateCommentRequest>,
) -> axum::response::Response {
    let comments = match state.comments.as_ref() {
        Some(comments) => comments,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Comments unavailable"),
    };

    let body = request.body.trim();
    if body.is_empty() || body.len() > 1000 {
        return error(StatusCode::BAD_REQUEST, "Comment must be 1 to 1000 characters");
    }

    match comments.listing_exists(listing_id).await {
        Ok(true) => {}
        Ok(false) => return error(StatusCode::NOT_FOUND, "Listing not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Comments unavailable"),
    }

    match comments.create_comment(listing_id, user.id, body).await {
        Ok(comment) => (
            StatusCode::CREATED,
            Json(json!({
                "id": comment.id,
                "user_id": comment.user_id,
                "name": comment.name,
                "body": comment.body,
                "photo_url": comment.photo_url,
                "created_at": comment.created_at,
                "reactions": [],
            })),
        )
            .into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Could not post comment"),
    }
}

async fn toggle_reaction(
    State(state): State<AppState>,
    user: AuthUser,
    Path(comment_id): Path<Uuid>,
    Json(request): Json<ReactionRequest>,
) -> axum::response::Response {
    let comments = match state.comments.as_ref() {
        Some(comments) => comments,
        None => return error(StatusCode::SERVICE_UNAVAILABLE, "Comments unavailable"),
    };

    let emoji = request.emoji.trim();
    if !matches!(emoji, "love" | "laugh" | "cry" | "dislike" | "hate") {
        return error(StatusCode::BAD_REQUEST, "Unsupported reaction");
    }

    match comments.comment_visible(comment_id).await {
        Ok(true) => {}
        Ok(false) => return error(StatusCode::NOT_FOUND, "Comment not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Comments unavailable"),
    }

    match comments.toggle_reaction(comment_id, user.id, emoji).await {
        Ok((active, rows)) => Json(json!({
            "active": active,
            "reactions": rows
                .into_iter()
                .map(|(emoji, count)| json!({"emoji": emoji, "count": count}))
                .collect::<Vec<_>>(),
        }))
        .into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Comments unavailable"),
    }
}
