use crate::domain::call::CallSession;
use async_trait::async_trait;
use uuid::Uuid;

#[derive(Debug)]
pub enum CallError {
    NotFound,
    Forbidden,
    InvalidInput(String),
    Repository(String),
}

#[async_trait]
pub trait CallRepository: Send + Sync {
    async fn create(
        &self,
        conversation_id: Uuid,
        caller_id: Uuid,
        kind: &str,
        offer_sdp: &str,
    ) -> Result<CallSession, CallError>;

    async fn get(&self, id: Uuid, user_id: Uuid) -> Result<Option<CallSession>, CallError>;

    async fn answer(
        &self,
        id: Uuid,
        user_id: Uuid,
        answer_sdp: &str,
    ) -> Result<CallSession, CallError>;

    async fn end(&self, id: Uuid, user_id: Uuid) -> Result<CallSession, CallError>;

    async fn incoming(&self, _user_id: Uuid) -> Result<Vec<CallSession>, CallError> {
        Ok(Vec::new())
    }

    async fn history(
        &self,
        _conversation_id: Uuid,
        _user_id: Uuid,
    ) -> Result<Vec<CallSession>, CallError> {
        Ok(Vec::new())
    }
}
