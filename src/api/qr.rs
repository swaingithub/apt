use actix_web::{web, HttpRequest, HttpResponse};

use crate::db::Database;
use crate::models::ErrorResponse;
use crate::services::qr_generator::QRGenerator;

#[derive(serde::Deserialize)]
pub struct QRQuery {
    pub url: Option<String>,
}

fn get_local_ip() -> String {
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

pub async fn get_qr_code(
    req: HttpRequest,
    path: web::Path<String>,
    query: web::Query<QRQuery>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();

    let (slug, app_name) = match db.get_generated_app(&app_id) {
        Ok(Some(app)) => {
            let config = app.get("config").and_then(|c| c.as_object());
            let name = config
                .and_then(|c| c.get("app_name"))
                .and_then(|n| n.as_str())
                .unwrap_or("app");
            let s = name.to_lowercase().replace(' ', "-");
            (s, name.to_string())
        }
        _ => (app_id.clone(), app_id.clone()),
    };

    let host = req
        .headers()
        .get("Host")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("localhost:8080");
    let scheme = if req.headers().get("X-Forwarded-Proto").and_then(|v| v.to_str().ok()) == Some("https") { "https" } else { "http" };
    
    let local_ip = get_local_ip();
    let expo_url = match &query.url {
        Some(u) => u.clone(),
        None => format!("exp://{}:8081", local_ip),
    };
    let config_url = format!("{}://{}/api/v1/config/{}", scheme, host, slug);

    match QRGenerator::generate_expo_qr(&expo_url) {
        Ok(qr_data_url) => HttpResponse::Ok().json(serde_json::json!({
            "qr_code": qr_data_url,
            "config_url": config_url,
            "expo_url": expo_url,
            "local_ip": local_ip,
            "app_name": app_name,
            "slug": slug,
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "qr_generation_failed".to_string(),
            message: e.to_string(),
        }),
    }
}
