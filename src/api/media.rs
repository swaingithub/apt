use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use uuid::Uuid;

use crate::db::Database;
use crate::models::{CreateMediaRequest, ErrorResponse};
use super::{get_user_id, check_app_owner};

pub async fn list_media(
    path: web::Path<String>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    match db.list_media(&app_id) {
        Ok(media) => HttpResponse::Ok().json(media),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn create_media(
    req: HttpRequest,
    path: web::Path<String>,
    db: web::Data<Database>,
    body: web::Json<CreateMediaRequest>,
) -> HttpResponse {
    let app_id = path.into_inner();
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
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    match db.create_media(&id, &app_id, &body.url, &body.filename, &body.mime_type, body.size_bytes, &body.alt_text, &now) {
        Ok(_) => HttpResponse::Created().json(serde_json::json!({
            "id": id,
            "url": body.url,
            "filename": body.filename,
            "mime_type": body.mime_type,
            "size_bytes": body.size_bytes,
            "alt_text": body.alt_text,
            "created_at": now,
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "create_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn delete_media(
    req: HttpRequest,
    path: web::Path<(String, String)>,
    db: web::Data<Database>,
) -> HttpResponse {
    let (app_id, media_id) = path.into_inner();
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
    match db.delete_media(&media_id) {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "status": "deleted" })),
        Ok(false) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Media not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "delete_failed".to_string(),
            message: e.to_string(),
        }),
    }
}
