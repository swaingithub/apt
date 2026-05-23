use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use std::path::Path;
use uuid::Uuid;

use crate::services::app_generator::AppGenerator;
use crate::auth;
use crate::db::Database;
use crate::models::{ErrorResponse, GenerateFromTemplateRequest};

pub async fn generate_from_template(
    req: HttpRequest,
    db: web::Data<Database>,
    body: web::Json<GenerateFromTemplateRequest>,
) -> HttpResponse {
    let user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let app_id = Uuid::new_v4().to_string();
    let app_name = if body.app_name.is_empty() {
        app_id.clone()
    } else {
        body.app_name.clone()
    };

    match AppGenerator::generate_from_template(
        &app_id,
        &app_name,
        &body.project_config,
        &body.package_name,
        &body.display_name,
        &body.version,
        &body.primary_color,
    ) {
        Ok(zip_path) => {
            let now = Utc::now().to_rfc3339();
            let config_json = serde_json::json!({
                "app_name": &body.app_name,
                "package_name": &body.package_name,
                "display_name": &body.display_name,
                "version": &body.version,
                "primary_color": &body.primary_color,
                "project_config": &body.project_config,
            });
            let _ = db.create_generated_app(&app_id, &user_id, &app_name, &zip_path, &config_json.to_string(), &now);
            HttpResponse::Ok().json(serde_json::json!({
                "status": "generated",
                "app_id": app_id,
                "download_url": format!("/api/apps/{}/download", app_id),
                "filename": Path::new(&zip_path).file_name().and_then(|n| n.to_str()).unwrap_or("app_source.zip"),
            }))
        }
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "generation_failed".to_string(),
            message: e.to_string(),
        }),
    }
}
