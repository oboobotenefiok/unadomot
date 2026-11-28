//! Change notifications for connected devices.
//!
//! Events carry a monotonic id and are retained per user. With Redis
//! configured the history is shared across API instances, so a device can
//! reconnect to any instance and replay events after its `Last-Event-ID`.
//! Without Redis a bounded process-local history is used.

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use redis::AsyncCommands;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::{HashMap, VecDeque};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::extract::AuthUser;
use crate::http::AppState;

const CHANNEL_CAPACITY: usize = 64;
const HISTORY_LIMIT: isize = 100;
const HISTORY_TTL_SECONDS: i64 = 3600;
const HOLD: Duration = Duration::from_secs(25);

static EVENT_SEQUENCE: AtomicU64 = AtomicU64::new(0);

struct Hub {
    senders: Mutex<HashMap<Uuid, broadcast::Sender<Value>>>,
    history: Mutex<HashMap<Uuid, VecDeque<Value>>>,
}

fn hub() -> &'static Hub {
    static HUB: OnceLock<Hub> = OnceLock::new();
    HUB.get_or_init(|| Hub {
        senders: Mutex::new(HashMap::new()),
        history: Mutex::new(HashMap::new()),
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

fn next_event_id() -> String {
    let millis = Utc::now().timestamp_millis();
    let sequence = EVENT_SEQUENCE.fetch_add(1, Ordering::Relaxed) % 1_000_000;
    format!("{millis:013}-{sequence:06}")
}

fn remember(user_id: Uuid, event: &Value) {
    let mut history = hub()
        .history
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let entries = history.entry(user_id).or_default();
    entries.push_back(event.clone());
    while entries.len() > HISTORY_LIMIT as usize {
        entries.pop_front();
    }
}

/// Delivers `event` to every device listening for any of `user_ids` and
/// records it for replay.
pub async fn publish(state: &AppState, user_ids: &[Uuid], event: Value) {
    let mut event = event;
    let event_id = next_event_id();
    if let Some(object) = event.as_object_mut() {
        object.insert("id".into(), json!(event_id));
    }

    let redis = state.limiter.redis_client();
    for id in user_ids {
        remember(*id, &event);

        if let Some(client) = redis {
            if let Ok(mut connection) = client.get_multiplexed_async_connection().await {
                let key = format!("events:{id}");
                let payload = event.to_string();
                let _: Result<(), _> = connection.lpush(&key, payload).await;
                let _: Result<(), _> = connection.ltrim(&key, 0, HISTORY_LIMIT - 1).await;
                let _: Result<(), _> = connection.expire(&key, HISTORY_TTL_SECONDS).await;
            }
        }
    }

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

#[derive(Deserialize, Default)]
struct EventQuery {
    after: Option<String>,
}

async fn events_handler(
    State(state): State<AppState>,
    user: AuthUser,
    headers: HeaderMap,
    Query(query): Query<EventQuery>,
) -> impl IntoResponse {
    let last_id = headers
        .get("last-event-id")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string)
        .or(query.after)
        .unwrap_or_default();

    let mut events = read_events(&state, user.id, &last_id).await;

    if events.is_empty() {
        let mut receiver = sender_for(user.id).subscribe();
        let _ = tokio::time::timeout(HOLD, receiver.recv()).await;
        events = read_events(&state, user.id, &last_id).await;
    }

    Json(json!({ "events": events }))
}

async fn read_events(state: &AppState, user_id: Uuid, after: &str) -> Vec<Value> {
    if let Some(client) = state.limiter.redis_client() {
        if let Ok(mut connection) = client.get_multiplexed_async_connection().await {
            let key = format!("events:{user_id}");
            let raw: Result<Vec<String>, _> = connection.lrange(&key, 0, HISTORY_LIMIT - 1).await;
            if let Ok(raw) = raw {
                let mut events: Vec<Value> = raw
                    .iter()
                    .filter_map(|entry| serde_json::from_str(entry).ok())
                    .collect();
                events.reverse();
                events.retain(|event| event_id(event) > after);
                return events;
            }
        }
    }

    let history = hub()
        .history
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    history
        .get(&user_id)
        .map(|entries| {
            entries
                .iter()
                .filter(|event| event_id(event) > after)
                .cloned()
                .collect()
        })
        .unwrap_or_default()
}

fn event_id(event: &Value) -> &str {
    event.get("id").and_then(Value::as_str).unwrap_or("")
}
