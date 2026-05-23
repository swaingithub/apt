use actix_web::{web, HttpResponse};

use crate::models::ErrorResponse;

#[derive(serde::Deserialize)]
pub(crate) struct PushRequest {
    to: String,
    title: Option<String>,
    body: Option<String>,
    data: Option<serde_json::Value>,
}

pub async fn send_push_notification(body: web::Json<PushRequest>) -> HttpResponse {
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
                    "expo_status": status_code,
                    "response": data,
                })),
                Err(e) => HttpResponse::Ok().json(serde_json::json!({
                    "status": "sent",
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
