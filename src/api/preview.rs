use actix_web::{web, HttpRequest, HttpResponse};
use actix_ws::Message;
use chrono::Utc;
use futures_util::StreamExt;

use crate::services::preview::{Collaborator, PreviewBroadcaster};

pub async fn preview_ws(
    req: HttpRequest,
    body: web::Payload,
    path: web::Path<String>,
    broadcaster: web::Data<PreviewBroadcaster>,
) -> Result<HttpResponse, actix_web::Error> {
    let app_id = path.into_inner();
    let (response, mut session, stream) = actix_ws::handle(&req, body)?;

    let mut rx = broadcaster.subscribe(&app_id).await;
    let b = broadcaster.get_ref().clone();
    let app_id2 = app_id.clone();

    // To be populated once the client sends a join message
    let mut current_user_id: Option<String> = None;

    actix_web::rt::spawn(async move {
        let mut stream = stream;

        // Send the current online users list immediately on connect
        let initial_users = b.get_online_users(&app_id2).await;
        if !initial_users.is_empty() {
            let initial_payload = serde_json::json!({
                "type": "online_users",
                "users": initial_users,
            });
            let _ = session
                .text(serde_json::to_string(&initial_payload).unwrap_or_default())
                .await;
        }

        loop {
            tokio::select! {
                ws_msg = stream.next() => {
                    match ws_msg {
                        Some(Ok(Message::Ping(bytes))) => {
                            let _ = session.pong(&bytes).await;
                        }
                        Some(Ok(Message::Text(text))) => {
                            // Parse incoming JSON message
                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                                let msg_type = parsed["type"].as_str().unwrap_or("");

                                match msg_type {
                                    "join" => {
                                        let user_id = parsed["user"]["id"].as_str().unwrap_or("anonymous").to_string();
                                        let name = parsed["user"]["name"].as_str().unwrap_or("Anonymous").to_string();
                                        let avatar_color = parsed["user"]["avatar_color"].as_str().unwrap_or("#6366f1").to_string();

                                        let collab = Collaborator {
                                            id: user_id.clone(),
                                            name: name.clone(),
                                            avatar_color: avatar_color.clone(),
                                            joined_at: Utc::now().to_rfc3339(),
                                        };

                                        b.add_user(&app_id2, collab).await;
                                        current_user_id = Some(user_id.clone());

                                        // Broadcast join to all other subscribers
                                        let join_payload = serde_json::json!({
                                            "type": "user_joined",
                                            "user": {
                                                "id": user_id,
                                                "name": name,
                                                "avatar_color": avatar_color,
                                            },
                                        });
                                        let _ = b.broadcast(&app_id2, &serde_json::to_string(&join_payload).unwrap_or_default()).await;
                                    }
                                    "leave" => {
                                        if let Some(ref uid) = current_user_id {
                                            b.remove_user(&app_id2, uid).await;
                                            let leave_payload = serde_json::json!({
                                                "type": "user_left",
                                                "userId": uid,
                                            });
                                            let _ = b.broadcast(&app_id2, &serde_json::to_string(&leave_payload).unwrap_or_default()).await;
                                        }
                                        break;
                                    }
                                    "cursor" | "select" => {
                                        // Forward cursor/select events to other subscribers
                                        // The frontend handles filtering by sender
                                        if let Some(ref uid) = current_user_id {
                                            let mut payload = parsed.clone();
                                            payload["userId"] = serde_json::Value::String(uid.clone());
                                            let _ = b.broadcast(&app_id2, &serde_json::to_string(&payload).unwrap_or_default()).await;
                                        }
                                    }
                                    _ => {
                                        // Forward other messages (config_updated, etc.) to all subscribers
                                        let _ = b.broadcast(&app_id2, &text).await;
                                    }
                                }
                            } else {
                                // Not valid JSON, forward as-is
                                let _ = b.broadcast(&app_id2, &text).await;
                            }
                        }
                        Some(Ok(Message::Close(_))) | None => break,
                        _ => {}
                    }
                }
                broadcast_msg = rx.recv() => {
                    match broadcast_msg {
                        Ok(msg) => {
                            // Check if this message was originally sent by us (via ?exclude=)
                            let should_skip = if let Some(ref uid) = current_user_id {
                                msg.contains(&format!("?exclude={}", uid))
                            } else {
                                false
                            };

                            if should_skip {
                                continue;
                            }

                            // Strip any ?exclude= suffix from the message
                            let clean_msg = msg.split("?exclude=").next().unwrap_or(&msg);
                            if session.text(clean_msg.to_string()).await.is_err() {
                                break;
                            }
                        }
                        Err(_) => break,
                    }
                }
            }
        }

        // Cleanup on disconnect
        if let Some(uid) = current_user_id {
            b.remove_user(&app_id2, &uid).await;
            let leave_payload = serde_json::json!({
                "type": "user_left",
                "userId": uid,
            });
            let _ = b.broadcast(&app_id2, &serde_json::to_string(&leave_payload).unwrap_or_default()).await;
        }
    });

    Ok(response)
}
