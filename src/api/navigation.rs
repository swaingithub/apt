use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use uuid::Uuid;

use crate::db::Database;
use crate::models::{UpsertNavigationRequest, ErrorResponse};
use super::{get_user_id, check_app_owner};

pub async fn get_navigation(
    path: web::Path<String>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    match db.get_navigation(&app_id) {
        Ok(Some(nav)) => HttpResponse::Ok().json(nav),
        Ok(None) => HttpResponse::Ok().json(serde_json::json!({
            "type": "bottomTab",
            "config": [],
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn upsert_navigation(
    req: HttpRequest,
    path: web::Path<String>,
    db: web::Data<Database>,
    body: web::Json<UpsertNavigationRequest>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let user_id = get_user_id(&req);
    if let Err(resp) = check_app_owner(&db, &app_id, &user_id) {
        return resp;
    }
    let now = Utc::now().to_rfc3339();
    let config_str = body.config.to_string();

    let existing_id = db.get_navigation(&app_id).ok().flatten()
        .and_then(|n| n.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()));
    let id = existing_id.unwrap_or_else(|| Uuid::new_v4().to_string());

    match db.upsert_navigation(&id, &app_id, &body.type_, &config_str, &now) {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "status": "saved",
            "type": body.type_,
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "save_failed".to_string(),
            message: e.to_string(),
        }),
    }
}
