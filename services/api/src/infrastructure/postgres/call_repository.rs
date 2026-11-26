use crate::application::calls::{CallError, CallRepository};
use crate::domain::call::CallSession;
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

pub struct PostgresCallRepository {
    pool: PgPool,
}

impl PostgresCallRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl CallRepository for PostgresCallRepository {
    async fn create(
        &self,
        conversation_id: Uuid,
        caller_id: Uuid,
        kind: &str,
        offer_sdp: &str,
    ) -> Result<CallSession, CallError> {
        if kind != "audio" && kind != "video" {
            return Err(CallError::InvalidInput("Call type must be audio or video".into()));
        }

        let participants = sqlx::query_as::<_, (Uuid, Uuid)>(
            "SELECT participant_a, participant_b FROM conversations WHERE id = $1",
        )
        .bind(conversation_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CallError::Repository(e.to_string()))?;

        let (participant_a, participant_b) = participants.ok_or(CallError::NotFound)?;
        let callee_id = if participant_a == caller_id {
            participant_b
        } else if participant_b == caller_id {
            participant_a
        } else {
            return Err(CallError::Forbidden);
        };

        let row = sqlx::query_as::<_, CallRow>(
            "INSERT INTO call_sessions (conversation_id, caller_id, callee_id, kind, offer_sdp)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, conversation_id, caller_id, callee_id, kind, status, offer_sdp, answer_sdp, created_at, updated_at",
        )
        .bind(conversation_id)
        .bind(caller_id)
        .bind(callee_id)
        .bind(kind)
        .bind(offer_sdp)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| CallError::Repository(e.to_string()))?;

        Ok(row.into())
    }

    async fn get(&self, id: Uuid, user_id: Uuid) -> Result<Option<CallSession>, CallError> {
        let row = sqlx::query_as::<_, CallRow>(
            "SELECT id, conversation_id, caller_id, callee_id, kind, status, offer_sdp, answer_sdp, created_at, updated_at
             FROM call_sessions
             WHERE id = $1 AND (caller_id = $2 OR callee_id = $2)",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CallError::Repository(e.to_string()))?;

        Ok(row.map(CallSession::from))
    }

    async fn answer(
        &self,
        id: Uuid,
        user_id: Uuid,
        answer_sdp: &str,
    ) -> Result<CallSession, CallError> {
        let row = sqlx::query_as::<_, CallRow>(
            "UPDATE call_sessions
             SET status = 'accepted', answer_sdp = $3, updated_at = now()
             WHERE id = $1 AND callee_id = $2 AND status = 'ringing'
             RETURNING id, conversation_id, caller_id, callee_id, kind, status, offer_sdp, answer_sdp, created_at, updated_at",
        )
        .bind(id)
        .bind(user_id)
        .bind(answer_sdp)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CallError::Repository(e.to_string()))?
        .ok_or(CallError::NotFound)?;

        Ok(row.into())
    }

    async fn end(&self, id: Uuid, user_id: Uuid) -> Result<CallSession, CallError> {
        let row = sqlx::query_as::<_, CallRow>(
            "UPDATE call_sessions
             SET status = CASE WHEN status = 'ringing' THEN 'declined' ELSE 'ended' END, updated_at = now()
             WHERE id = $1 AND (caller_id = $2 OR callee_id = $2)
             RETURNING id, conversation_id, caller_id, callee_id, kind, status, offer_sdp, answer_sdp, created_at, updated_at",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CallError::Repository(e.to_string()))?
        .ok_or(CallError::NotFound)?;

        Ok(row.into())
    }

    async fn incoming(&self, user_id: Uuid) -> Result<Vec<CallSession>, CallError> {
        let rows = sqlx::query_as::<_, CallRow>(
            "SELECT id, conversation_id, caller_id, callee_id, kind, status, offer_sdp, answer_sdp, created_at, updated_at
             FROM call_sessions
             WHERE callee_id = $1 AND status = 'ringing' AND created_at > now() - interval '60 seconds'
             ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| CallError::Repository(e.to_string()))?;

        Ok(rows.into_iter().map(CallSession::from).collect())
    }
}

#[derive(sqlx::FromRow)]
struct CallRow {
    id: Uuid,
    conversation_id: Uuid,
    caller_id: Uuid,
    callee_id: Uuid,
    kind: String,
    status: String,
    offer_sdp: String,
    answer_sdp: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<CallRow> for CallSession {
    fn from(row: CallRow) -> Self {
        Self {
            id: row.id,
            conversation_id: row.conversation_id,
            caller_id: row.caller_id,
            callee_id: row.callee_id,
            kind: row.kind,
            status: row.status,
            offer_sdp: row.offer_sdp,
            answer_sdp: row.answer_sdp,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}
