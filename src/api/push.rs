use actix_web::{web, HttpResponse};

use crate::models::ErrorResponse;
use crate::db::Database;

#[derive(serde::Deserialize)]
pub(crate) struct PushRequest {
    to: String,
    title: Option<String>,
    body: Option<String>,
    data: Option<serde_json::Value>,
    app_id: Option<String>,
}

pub async fn send_push_notification(
    db: web::Data<Database>,
    body: web::Json<PushRequest>,
) -> HttpResponse {
    let mut fcm_server_key = None;

    if let Some(ref aid) = body.app_id {
        if let Ok(settings) = db.list_settings(aid) {
            for setting in settings {
                if setting.get("key").and_then(|v| v.as_str()) == Some("firebase_config") {
                    if let Some(val) = setting.get("value") {
                        if let Some(key) = val.get("serverKey").and_then(|v| v.as_str()) {
                            if !key.trim().is_empty() {
                                fcm_server_key = Some(key.trim().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    if let Some(server_key) = fcm_server_key {
        // Direct Firebase Cloud Messaging (FCM) Gateway Sync
        let recipient = if body.to == "ExponentPushToken[Broadcast]" {
            "/topics/all".to_string()
        } else {
            body.to.clone()
        };

        let fcm_payload = serde_json::json!({
            "to": recipient,
            "notification": {
                "title": body.title.as_deref().unwrap_or("Appmake Update"),
                "body": body.body.as_deref().unwrap_or("You have a new update from your app."),
                "sound": "default"
            },
            "data": body.data,
            "priority": "high"
        });

        let client = reqwest::Client::new();
        match client
            .post("https://fcm.googleapis.com/fcm/send")
            .header("Content-Type", "application/json")
            .header("Authorization", format!("key={}", server_key))
            .json(&fcm_payload)
            .send()
            .await
        {
            Ok(resp) => {
                let status_code = resp.status().as_u16();
                let response_data = resp.json::<serde_json::Value>().await.unwrap_or(serde_json::json!({}));
                HttpResponse::Ok().json(serde_json::json!({
                    "status": "sent",
                    "gateway": "firebase_fcm",
                    "fcm_status": status_code,
                    "response": response_data,
                }))
            }
            Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
                error: "fcm_push_failed".to_string(),
                message: format!("Failed to send FCM push: {}", e),
            }),
        }
    } else {
        // Fallback: Expo Push Service Gateway
        let expo_push_url = "https://exp.host/--/api/v2/push/send";

        let payload = serde_json::json!({
            "to": body.to,
            "title": body.title.as_deref().unwrap_or("Appmake Update"),
            "body": body.body.as_deref().unwrap_or("You have a new update from your app."),
            "data": body.data,
            "sound": "default",
            "priority": "high",
        });

        let client = reqwest::Client::new();
        match client
            .post(expo_push_url)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .json(&payload)
            .send()
            .await
        {
            Ok(resp) => {
                let status_code = resp.status().as_u16();
                match resp.json::<serde_json::Value>().await {
                    Ok(data) => HttpResponse::Ok().json(serde_json::json!({
                        "status": "sent",
                        "gateway": "expo_push",
                        "expo_status": status_code,
                        "response": data,
                    })),
                    Err(e) => HttpResponse::Ok().json(serde_json::json!({
                        "status": "sent",
                        "gateway": "expo_push",
                        "expo_status": status_code,
                        "response": e.to_string(),
                    })),
                }
            }
            Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
                error: "push_failed".to_string(),
                message: format!("Failed to send push: {}", e),
            }),
        }
    }
}
