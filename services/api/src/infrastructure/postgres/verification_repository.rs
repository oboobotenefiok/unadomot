use crate::application::verification::{VerificationError, VerificationRepository};
use crate::domain::verification::VerificationRequest;
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

pub struct PostgresVerificationRepository {
    pool: PgPool,
}

impl PostgresVerificationRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl VerificationRepository for PostgresVerificationRepository {
    async fn submit(
        &self,
        user_id: Uuid,
        document_url: &str,
        notes: Option<&str>,
    ) -> Result<VerificationRequest, VerificationError> {
        let row = sqlx::query_as::<_, VerificationRow>(
            "INSERT INTO verification_requests (user_id, document_url, notes) VALUES ($1, $2, $3) RETURNING id, user_id, document_url, notes, status, review_notes, reviewed_at, created_at",
        )
        .bind(user_id)
        .bind(document_url)
        .bind(notes)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| VerificationError::Repository(e.to_string()))?;

        Ok(row.into())
    }

    async fn find_for_user(
        &self,
        user_id: Uuid,
    ) -> Result<Option<VerificationRequest>, VerificationError> {
        let row = sqlx::query_as::<_, VerificationRow>(
            "SELECT id, user_id, document_url, notes, status, review_notes, reviewed_at, created_at FROM verification_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| VerificationError::Repository(e.to_string()))?;

        Ok(row.map(VerificationRequest::from))
    }

    async fn list_by_status(
        &self,
        status: &str,
    ) -> Result<Vec<VerificationRequest>, VerificationError> {
        let rows = sqlx::query_as::<_, VerificationRow>(
            "SELECT id, user_id, document_url, notes, status, review_notes, reviewed_at, created_at FROM verification_requests WHERE status = $1 ORDER BY created_at ASC",
        )
        .bind(status)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| VerificationError::Repository(e.to_string()))?;

        Ok(rows.into_iter().map(VerificationRequest::from).collect())
    }

    async fn review(
        &self,
        id: Uuid,
        status: &str,
        review_notes: Option<&str>,
    ) -> Result<VerificationRequest, VerificationError> {
        let mut transaction = self
            .pool
            .begin()
            .await
            .map_err(|e| VerificationError::Repository(e.to_string()))?;

        let row = sqlx::query_as::<_, VerificationRow>(
            "UPDATE verification_requests SET status = $2, review_notes = $3, reviewed_at = now() WHERE id = $1 RETURNING id, user_id, document_url, notes, status, review_notes, reviewed_at, created_at",
        )
        .bind(id)
        .bind(status)
        .bind(review_notes)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|e| VerificationError::Repository(e.to_string()))?
        .ok_or(VerificationError::NotFound)?;

        if status == "approved" {
            sqlx::query(
                "UPDATE user_profiles SET verified = true, updated_at = now() WHERE user_id = $1",
            )
            .bind(row.user_id)
            .execute(&mut *transaction)
            .await
            .map_err(|e| VerificationError::Repository(e.to_string()))?;
        }

        transaction
            .commit()
            .await
            .map_err(|e| VerificationError::Repository(e.to_string()))?;

        Ok(row.into())
    }

    async fn record_audit(
        &self,
        admin_id: Uuid,
        action: &str,
        target_id: Uuid,
        metadata: serde_json::Value,
    ) -> Result<(), VerificationError> {
        sqlx::query(
            "INSERT INTO admin_audit_log (admin_user_id, action, target_id, metadata) VALUES ($1, $2, $3, $4)",
        )
        .bind(admin_id)
        .bind(action)
        .bind(target_id)
        .bind(metadata)
        .execute(&self.pool)
        .await
        .map_err(|e| VerificationError::Repository(e.to_string()))?;
        Ok(())
    }
}

#[derive(sqlx::FromRow)]
struct VerificationRow {
    id: Uuid,
    user_id: Uuid,
    document_url: String,
    notes: Option<String>,
    status: String,
    review_notes: Option<String>,
    reviewed_at: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<VerificationRow> for VerificationRequest {
    fn from(row: VerificationRow) -> Self {
        Self {
            id: row.id,
            user_id: row.user_id,
            document_url: row.document_url,
            notes: row.notes,
            status: row.status,
            review_notes: row.review_notes,
            reviewed_at: row.reviewed_at,
            created_at: row.created_at,
        }
    }
}
