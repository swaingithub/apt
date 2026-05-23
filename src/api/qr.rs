use actix_web::{web, HttpRequest, HttpResponse};

use crate::db::Database;
use crate::models::ErrorResponse;
use crate::services::qr_generator::QRGenerator;

pub async fn get_qr_code(
    req: HttpRequest,
    path: web::Path<String>,
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
    let config_url = format!("{}://{}/api/v1/config/{}", scheme, host, slug);

    match QRGenerator::generate_expo_qr(&config_url) {
        Ok(qr_data_url) => HttpResponse::Ok().json(serde_json::json!({
            "qr_code": qr_data_url,
            "config_url": config_url,
            "app_name": app_name,
            "slug": slug,
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "qr_generation_failed".to_string(),
            message: e.to_string(),
        }),
    }
}
