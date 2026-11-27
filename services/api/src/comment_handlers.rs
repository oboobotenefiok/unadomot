use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::PgPool;
use std::sync::Arc;
use unadomot_api::application::auth::{bearer_token, require_active_pool, verify_session};
use uuid::Uuid;

#[derive(Clone)]
pub struct CommentState {
    pub pool: PgPool,
    pub jwt_secret: Arc<String>,
}

pub fn router(state: CommentState) -> Router {
    Router::new()
        .route(
            "/api/listings/{id}/comments",
            get(list_comments).post(create_comment),
        )
        .route("/api/comments/{id}/reactions", post(toggle_reaction))
        .route("/api/comments/{id}", delete(delete_comment))
        .route("/api/listings/code/{code}", get(find_by_code))
        .with_state(state)
}

fn error(status: StatusCode, message: &str) -> axum::response::Response {
    (status, Json(json!({ "error": { "message": message } }))).into_response()
}

async fn authorize(state: &CommentState, headers: &HeaderMap) -> Result<Uuid, axum::response::Response> {
    let token = bearer_token(headers)
        .map_err(|_| error(StatusCode::UNAUTHORIZED, "Please sign in"))?;

    let user = verify_session(token, &state.jwt_secret)
        .map_err(|_| error(StatusCode::UNAUTHORIZED, "Session expired"))?;

    require_active_pool(&state.pool, user.id)
        .await
        .map_err(|_| error(StatusCode::FORBIDDEN, "This account is suspended"))?;

    Ok(user.id)
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

async fn find_by_code(
    State(state): State<CommentState>,
    Path(code): Path<String>,
) -> axum::response::Response {
    let code = code.trim().to_uppercase();
    if code.len() < 4 || code.len() > 32 {
        return error(StatusCode::BAD_REQUEST, "Enter a valid listing code");
    }

    let id = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM listings WHERE upper(code) = $1 AND deleted_at IS NULL",
    )
    .bind(&code)
    .fetch_optional(&state.pool)
    .await;

    match id {
        Ok(Some(id)) => Json(json!({ "id": id, "code": code })).into_response(),
        Ok(None) => error(StatusCode::NOT_FOUND, "No listing matches that code"),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Listing lookup unavailable"),
    }
}

async fn delete_comment(
    State(state): State<CommentState>,
    headers: HeaderMap,
    Path(comment_id): Path<Uuid>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers).await {
        Ok(id) => id,
        Err(response) => return response,
    };

    let owner = sqlx::query_scalar::<_, Uuid>(
        "SELECT user_id FROM listing_comments WHERE id = $1",
    )
    .bind(comment_id)
    .fetch_optional(&state.pool)
    .await;

    let owner = match owner {
        Ok(Some(owner)) => owner,
        Ok(None) => return error(StatusCode::NOT_FOUND, "Comment not found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "Comment unavailable"),
    };

    let is_admin: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM admin_roles WHERE user_id = $1)",
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(false);

    if owner != user_id && !is_admin {
        return error(StatusCode::FORBIDDEN, "You cannot delete this comment");
    }

    match sqlx::query("DELETE FROM listing_comments WHERE id = $1")
        .bind(comment_id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(json!({ "ok": true })).into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Could not delete comment"),
    }
}

async fn list_comments(
    State(state): State<CommentState>,
    Path(listing_id): Path<Uuid>,
    Query(query): Query<CommentQuery>,
) -> axum::response::Response {
    let visible: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM listings WHERE id = $1 AND deleted_at IS NULL)",
    )
    .bind(listing_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(false);

    if !visible {
        return error(StatusCode::NOT_FOUND, "Listing not found");
    }

    let limit = query.limit.unwrap_or(50).clamp(1, 100);
    let offset = query.offset.unwrap_or(0).max(0);

    let rows = sqlx::query_as::<_, (Uuid, Uuid, String, String, Option<String>, chrono::DateTime<chrono::Utc>, Value)>(r#"
        SELECT c.id, c.user_id, COALESCE(p.name, 'User') AS name,
               c.body, p.photo_url, c.created_at,
               COALESCE(
                   (SELECT json_agg(json_build_object('emoji', r.emoji, 'count', r.count))
                    FROM (
                        SELECT emoji, COUNT(*)::int AS count
                        FROM listing_comment_reactions
                        WHERE comment_id = c.id
                        GROUP BY emoji
                    ) r),
                   '[]'::json
               ) AS reactions
        FROM listing_comments c
        LEFT JOIN user_profiles p ON p.user_id = c.user_id
        WHERE c.listing_id = $1
        ORDER BY c.created_at ASC
        LIMIT $2 OFFSET $3
    "#)
    .bind(listing_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => Json(
            rows.into_iter()
                .map(|(id, user_id, name, body, photo_url, created_at, reactions)| {
                    json!({
                        "id": id,
                        "user_id": user_id,
                        "name": name,
                        "body": body,
                        "photo_url": photo_url,
                        "created_at": created_at,
                        "reactions": reactions,
                    })
                })
                .collect::<Vec<_>>(),
        )
        .into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Comments unavailable"),
    }
}

async fn create_comment(
    State(state): State<CommentState>,
    headers: HeaderMap,
    Path(listing_id): Path<Uuid>,
    Json(request): Json<CreateCommentRequest>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers).await {
        Ok(id) => id,
        Err(response) => return response,
    };

    let body = request.body.trim();
    if body.is_empty() || body.len() > 1000 {
        return error(StatusCode::BAD_REQUEST, "Comment must be 1 to 1000 characters");
    }

    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM listings WHERE id = $1 AND deleted_at IS NULL)",
    )
    .bind(listing_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(false);
    if !exists {
        return error(StatusCode::NOT_FOUND, "Listing not found");
    }

    let row = sqlx::query_as::<_, (Uuid, Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>)>(
        "INSERT INTO listing_comments (listing_id, user_id, body) VALUES ($1, $2, $3)
         RETURNING id, user_id, body, (SELECT photo_url FROM user_profiles WHERE user_id = $2), created_at",
    )
    .bind(listing_id)
    .bind(user_id)
    .bind(body)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok((id, user_id, body, photo_url, created_at)) => {
            let name: String = sqlx::query_scalar(
                "SELECT COALESCE(name, 'User') FROM user_profiles WHERE user_id = $1",
            )
            .bind(user_id)
            .fetch_optional(&state.pool)
            .await
            .ok()
            .flatten()
            .unwrap_or_else(|| "User".into());

            (StatusCode::CREATED, Json(json!({
                "id": id,
                "user_id": user_id,
                "name": name,
                "body": body,
                "photo_url": photo_url,
                "created_at": created_at,
                "reactions": [],
            })))
            .into_response()
        }
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "Could not post comment"),
    }
}

async fn toggle_reaction(
    State(state): State<CommentState>,
    headers: HeaderMap,
    Path(comment_id): Path<Uuid>,
    Json(request): Json<ReactionRequest>,
) -> axum::response::Response {
    let user_id = match authorize(&state, &headers).await {
        Ok(id) => id,
        Err(response) => return response,
    };

    let emoji = request.emoji.trim();
    if !matches!(emoji, "love" | "laugh" | "cry" | "dislike" | "hate") {
        return error(StatusCode::BAD_REQUEST, "Unsupported reaction");
    }

    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM listing_comments WHERE id = $1)",
    )
    .bind(comment_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(false);
    if !exists {
        return error(StatusCode::NOT_FOUND, "Comment not found");
    }

    let removed = sqlx::query(
        "DELETE FROM listing_comment_reactions WHERE comment_id = $1 AND user_id = $2 AND emoji = $3",
    )
    .bind(comment_id)
    .bind(user_id)
    .bind(emoji)
    .execute(&state.pool)
    .await
    .map(|result| result.rows_affected() > 0)
    .unwrap_or(false);

    if !removed {
        let _ = sqlx::query(
            "INSERT INTO listing_comment_reactions (comment_id, user_id, emoji) VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING",
        )
        .bind(comment_id)
        .bind(user_id)
        .bind(emoji)
        .execute(&state.pool)
        .await;
    }

    let rows = sqlx::query_as::<_, (String, i32)>(
        "SELECT emoji, COUNT(*)::int FROM listing_comment_reactions WHERE comment_id = $1 GROUP BY emoji",
    )
    .bind(comment_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(json!({
        "active": !removed,
        "reactions": rows.into_iter().map(|(emoji, count)| json!({"emoji": emoji, "count": count})).collect::<Vec<_>>(),
    }))
    .into_response()
}
