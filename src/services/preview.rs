use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collaborator {
    pub id: String,
    pub name: String,
    pub avatar_color: String,
    pub joined_at: String,
}

#[derive(Clone)]
#[allow(dead_code)]
pub struct PreviewChannel {
    pub tx: broadcast::Sender<String>,
}

#[derive(Clone)]
pub struct PreviewBroadcaster {
    channels: Arc<Mutex<HashMap<String, broadcast::Sender<String>>>>,
    users: Arc<Mutex<HashMap<String, Vec<Collaborator>>>>,
}

impl PreviewBroadcaster {
    pub fn new() -> Self {
        PreviewBroadcaster {
            channels: Arc::new(Mutex::new(HashMap::new())),
            users: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn subscribe(&self, app_id: &str) -> broadcast::Receiver<String> {
        let mut map = self.channels.lock().await;
        let tx = map
            .entry(app_id.to_string())
            .or_insert_with(|| {
                let (tx, _) = broadcast::channel(64);
                tx
            })
            .clone();
        tx.subscribe()
    }

    pub async fn broadcast(&self, app_id: &str, message: &str) {
        if let Some(tx) = self.channels.lock().await.get(app_id) {
            let _ = tx.send(message.to_string());
        }
    }

    pub async fn add_user(&self, app_id: &str, user: Collaborator) {
        let mut map = self.users.lock().await;
        let list = map.entry(app_id.to_string()).or_insert_with(Vec::new);
        if !list.iter().any(|u| u.id == user.id) {
            list.push(user);
        }
    }

    pub async fn remove_user(&self, app_id: &str, user_id: &str) {
        let mut map = self.users.lock().await;
        if let Some(list) = map.get_mut(app_id) {
            list.retain(|u| u.id != user_id);
        }
    }

    pub async fn get_online_users(&self, app_id: &str) -> Vec<Collaborator> {
        let map = self.users.lock().await;
        map.get(app_id).cloned().unwrap_or_default()
    }

    /// Send a message to all subscribers of the given app_id,
    /// optionally excluding the sender by appending ?exclude=sender_id.
    #[allow(dead_code)]
    pub async fn broadcast_except(
        &self,
        app_id: &str,
        message: &str,
        exclude_user_id: Option<&str>,
    ) {
        if let Some(tx) = self.channels.lock().await.get(app_id) {
            let payload = if let Some(uid) = exclude_user_id {
                format!("{}?exclude={}", message, uid)
            } else {
                message.to_string()
            };
            let _ = tx.send(payload);
        }
    }
}
