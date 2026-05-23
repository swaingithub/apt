use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use uuid::Uuid;

use crate::db::Database;
use crate::models::{CreateSettingRequest, ErrorResponse};
use super::{get_user_id, check_app_owner};

pub async fn list_settings(
    path: web::Path<String>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    match db.list_settings(&app_id) {
        Ok(settings) => HttpResponse::Ok().json(settings),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn upsert_setting(
    req: HttpRequest,
    path: web::Path<String>,
    db: web::Data<Database>,
    body: web::Json<CreateSettingRequest>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let user_id = get_user_id(&req);
    if let Err(resp) = check_app_owner(&db, &app_id, &user_id) {
        return resp;
    }
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let value_str = body.value.to_string();

    match db.upsert_setting(&id, &app_id, &body.key, &value_str, &now) {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "status": "saved",
            "key": body.key,
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "save_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn delete_setting(
    req: HttpRequest,
    path: web::Path<(String, String)>,
    db: web::Data<Database>,
) -> HttpResponse {
    let (app_id, key) = path.into_inner();
    let user_id = get_user_id(&req);
    if user_id == "anonymous" {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "unauthorized".to_string(),
            message: "Authentication required".to_string(),
        });
    }
    if let Err(resp) = check_app_owner(&db, &app_id, &user_id) {
        return resp;
    }
    match db.delete_setting(&app_id, &key) {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "status": "deleted" })),
        Ok(false) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Setting not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "delete_failed".to_string(),
            message: e.to_string(),
        }),
    }
}
