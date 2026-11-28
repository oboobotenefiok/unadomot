//! Change notifications for connected devices.
//!
//! A device holds a request open against `/api/events`. When something the
//! user should see happens on another device, the write path publishes to
//! their channel and the held request returns straight away. The client then
//! reconnects, so a change reaches a second device without a manual reload.
//!
//! The hub is process-local. With more than one API instance each device only
//! hears about writes handled by the instance it happens to be polling, so a
//! shared bus (Redis pub/sub) is the next step if the API is scaled out.

use axum::{extract::State, response::IntoResponse, routing::get, Json, Router};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::extract::AuthUser;
use crate::http::AppState;

/// Events buffered per user before the slowest listener starts losing them.
const CHANNEL_CAPACITY: usize = 64;

/// How long a poll is held open before returning empty. Kept under the usual
/// 30 second proxy idle timeout.
const HOLD: Duration = Duration::from_secs(25);

struct Hub {
    senders: Mutex<HashMap<Uuid, broadcast::Sender<Value>>>,
}

fn hub() -> &'static Hub {
    static HUB: OnceLock<Hub> = OnceLock::new();
    HUB.get_or_init(|| Hub {
        senders: Mutex::new(HashMap::new()),
    })
}

fn sender_for(user_id: Uuid) -> broadcast::Sender<Value> {
    let mut senders = hub()
        .senders
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    senders
        .entry(user_id)
        .or_insert_with(|| broadcast::channel(CHANNEL_CAPACITY).0)
        .clone()
}

/// Delivers `event` to every device listening for any of `user_ids`.
pub fn publish(user_ids: &[Uuid], event: Value) {
    let senders = hub()
        .senders
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    for id in user_ids {
        if let Some(sender) = senders.get(id) {
            let _ = sender.send(event.clone());
        }
    }
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/events", get(events_handler))
        .with_state(state)
}

async fn events_handler(State(_state): State<AppState>, user: AuthUser) -> impl IntoResponse {
    let mut receiver = sender_for(user.id).subscribe();

    let events = match tokio::time::timeout(HOLD, receiver.recv()).await {
        Ok(Ok(event)) => vec![event],
        _ => Vec::new(),
    };

    Json(json!({ "events": events }))
}
