use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use crate::application::comments::{CommentRepository, CommentView, NewComment};

pub struct PostgresCommentRepository {
    pool: PgPool,
}

impl PostgresCommentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl CommentRepository for PostgresCommentRepository {
    async fn find_listing_by_code(&self, code: &str) -> Result<Option<Uuid>, sqlx::Error> {
        sqlx::query_scalar(
            "SELECT id FROM listings WHERE upper(code) = $1 AND deleted_at IS NULL",
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await
    }

    async fn comment_owner_and_listing(
        &self,
        comment_id: Uuid,
    ) -> Result<Option<(Uuid, Uuid)>, sqlx::Error> {
        sqlx::query_as("SELECT user_id, listing_id FROM listing_comments WHERE id = $1")
            .bind(comment_id)
            .fetch_optional(&self.pool)
            .await
    }

    async fn is_listing_owner(
        &self,
        listing_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM listings WHERE id = $1 AND landlord_id = $2 AND deleted_at IS NULL)",
        )
        .bind(listing_id)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
    }

    async fn delete_comment(&self, comment_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM listing_comments WHERE id = $1")
            .bind(comment_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn listing_exists(&self, listing_id: Uuid) -> Result<bool, sqlx::Error> {
        sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM listings WHERE id = $1 AND deleted_at IS NULL)",
        )
        .bind(listing_id)
        .fetch_one(&self.pool)
        .await
    }

    async fn list_comments(
        &self,
        listing_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<CommentView>, sqlx::Error> {
        let rows = sqlx::query_as::<_, (Uuid, Uuid, String, String, Option<String>, chrono::DateTime<chrono::Utc>, serde_json::Value)>(r#"
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
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|(id, user_id, name, body, photo_url, created_at, reactions)| CommentView {
                id,
                user_id,
                name,
                body,
                photo_url,
                created_at,
                reactions,
            })
            .collect())
    }

    async fn create_comment(
        &self,
        listing_id: Uuid,
        user_id: Uuid,
        body: &str,
    ) -> Result<NewComment, sqlx::Error> {
        let (id, user_id, body, photo_url, created_at) = sqlx::query_as::<_, (Uuid, Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>)>(
            "INSERT INTO listing_comments (listing_id, user_id, body) VALUES ($1, $2, $3)
             RETURNING id, user_id, body, (SELECT photo_url FROM user_profiles WHERE user_id = $2), created_at",
        )
        .bind(listing_id)
        .bind(user_id)
        .bind(body)
        .fetch_one(&self.pool)
        .await?;

        let name: String = sqlx::query_scalar(
            "SELECT COALESCE(name, 'User') FROM user_profiles WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?
        .flatten()
        .unwrap_or_else(|| "User".into());

        Ok(NewComment {
            id,
            user_id,
            name,
            body,
            photo_url,
            created_at,
        })
    }

    async fn comment_visible(&self, comment_id: Uuid) -> Result<bool, sqlx::Error> {
        sqlx::query_scalar(
            "SELECT EXISTS(
                SELECT 1 FROM listing_comments c
                JOIN listings l ON l.id = c.listing_id
                WHERE c.id = $1 AND l.deleted_at IS NULL
            )",
        )
        .bind(comment_id)
        .fetch_one(&self.pool)
        .await
    }

    async fn toggle_reaction(
        &self,
        comment_id: Uuid,
        user_id: Uuid,
        emoji: &str,
    ) -> Result<(bool, Vec<(String, i32)>), sqlx::Error> {
        let removed = sqlx::query(
            "DELETE FROM listing_comment_reactions WHERE comment_id = $1 AND user_id = $2 AND emoji = $3",
        )
        .bind(comment_id)
        .bind(user_id)
        .bind(emoji)
        .execute(&self.pool)
        .await?
        .rows_affected()
            > 0;

        if !removed {
            sqlx::query(
                "INSERT INTO listing_comment_reactions (comment_id, user_id, emoji) VALUES ($1, $2, $3)
                 ON CONFLICT DO NOTHING",
            )
            .bind(comment_id)
            .bind(user_id)
            .bind(emoji)
            .execute(&self.pool)
            .await?;
        }

        let rows = sqlx::query_as::<_, (String, i32)>(
            "SELECT emoji, COUNT(*)::int FROM listing_comment_reactions WHERE comment_id = $1 GROUP BY emoji",
        )
        .bind(comment_id)
        .fetch_all(&self.pool)
        .await?;

        Ok((!removed, rows))
    }
}
