use crate::domain::report::Report;
use async_trait::async_trait;
use uuid::Uuid;

#[derive(Debug)]
pub enum ReportError {
    Repository(String),
    NotFound,
    InvalidInput(String),
}

#[async_trait]
pub trait ReportRepository: Send + Sync {
    async fn create(
        &self,
        listing_id: Uuid,
        reporter_id: Uuid,
        reason: &str,
        details: Option<&str>,
    ) -> Result<Report, ReportError>;
    async fn list(&self, status: &str) -> Result<Vec<Report>, ReportError>;
    async fn resolve(
        &self,
        id: Uuid,
        admin_id: Uuid,
        status: &str,
        notes: Option<&str>,
    ) -> Result<Report, ReportError>;
}

pub async fn create_report(
    repository: &dyn ReportRepository,
    listing_id: Uuid,
    reporter_id: Uuid,
    reason: &str,
    details: Option<&str>,
) -> Result<Report, ReportError> {
    let reason = reason.trim();
    if reason.is_empty() || reason.len() > 80 {
        return Err(ReportError::InvalidInput(
            "A report reason between 1 and 80 characters is required".into(),
        ));
    }
    if details.map(|value| value.len() > 2000).unwrap_or(false) {
        return Err(ReportError::InvalidInput(
            "Report details must be 2000 characters or fewer".into(),
        ));
    }
    repository
        .create(listing_id, reporter_id, reason, details)
        .await
}

pub async fn list_reports(
    repository: &dyn ReportRepository,
    status: &str,
) -> Result<Vec<Report>, ReportError> {
    let status = match status {
        "pending" | "reviewed" | "dismissed" | "actioned" => status,
        _ => "pending",
    };
    repository.list(status).await
}

pub async fn resolve_report(
    repository: &dyn ReportRepository,
    id: Uuid,
    admin_id: Uuid,
    status: &str,
    notes: Option<&str>,
) -> Result<Report, ReportError> {
    if !matches!(status, "reviewed" | "dismissed" | "actioned") {
        return Err(ReportError::InvalidInput(
            "Resolution status must be reviewed, dismissed, or actioned".into(),
        ));
    }
    if notes.map(|value| value.len() > 2000).unwrap_or(false) {
        return Err(ReportError::InvalidInput(
            "Resolution notes must be 2000 characters or fewer".into(),
        ));
    }
    repository.resolve(id, admin_id, status, notes).await
}
