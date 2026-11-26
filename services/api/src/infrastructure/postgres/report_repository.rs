use crate::application::reports::{ReportError, ReportRepository};
use crate::domain::report::Report;
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

pub struct PostgresReportRepository {
    pool: PgPool,
}

impl PostgresReportRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ReportRepository for PostgresReportRepository {
    async fn create(
        &self,
        listing_id: Uuid,
        reporter_id: Uuid,
        reason: &str,
        details: Option<&str>,
    ) -> Result<Report, ReportError> {
        let listing_exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM listings WHERE id = $1 AND deleted_at IS NULL)",
        )
        .bind(listing_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| ReportError::Repository(e.to_string()))?;

        if !listing_exists {
            return Err(ReportError::NotFound);
        }

        let row = sqlx::query_as::<_, ReportRow>(
            "INSERT INTO reports (listing_id, reporter_id, reason, details) VALUES ($1, $2, $3, $4) RETURNING id, listing_id, reporter_id, reason, details, status, reviewed_by, reviewed_at, resolution_notes, created_at",
        )
        .bind(listing_id)
        .bind(reporter_id)
        .bind(reason)
        .bind(details)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| ReportError::Repository(e.to_string()))?;

        Ok(row.into())
    }

    async fn list(&self, status: &str) -> Result<Vec<Report>, ReportError> {
        let rows = sqlx::query_as::<_, ReportRow>(
            "SELECT id, listing_id, reporter_id, reason, details, status, reviewed_by, reviewed_at, resolution_notes, created_at FROM reports WHERE status = $1 ORDER BY created_at ASC",
        )
        .bind(status)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ReportError::Repository(e.to_string()))?;

        Ok(rows.into_iter().map(Report::from).collect())
    }

    async fn resolve(
        &self,
        id: Uuid,
        admin_id: Uuid,
        status: &str,
        notes: Option<&str>,
    ) -> Result<Report, ReportError> {
        let row = sqlx::query_as::<_, ReportRow>(
            "UPDATE reports SET status = $2, reviewed_by = $3, reviewed_at = now(), resolution_notes = $4 WHERE id = $1 RETURNING id, listing_id, reporter_id, reason, details, status, reviewed_by, reviewed_at, resolution_notes, created_at",
        )
        .bind(id)
        .bind(status)
        .bind(admin_id)
        .bind(notes)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ReportError::Repository(e.to_string()))?;

        row.map(Report::from).ok_or(ReportError::NotFound)
    }
}

#[derive(sqlx::FromRow)]
struct ReportRow {
    id: Uuid,
    listing_id: Uuid,
    reporter_id: Uuid,
    reason: String,
    details: Option<String>,
    status: String,
    reviewed_by: Option<Uuid>,
    reviewed_at: Option<chrono::DateTime<chrono::Utc>>,
    resolution_notes: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<ReportRow> for Report {
    fn from(row: ReportRow) -> Self {
        Self {
            id: row.id,
            listing_id: row.listing_id,
            reporter_id: row.reporter_id,
            reason: row.reason,
            details: row.details,
            status: row.status,
            reviewed_by: row.reviewed_by,
            reviewed_at: row.reviewed_at,
            resolution_notes: row.resolution_notes,
            created_at: row.created_at,
        }
    }
}
