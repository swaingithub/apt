use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use uuid::Uuid;

use crate::db::Database;
use crate::models::{CreatePageRequest, UpdatePageRequest, ErrorResponse};
use super::{get_user_id, check_app_owner};

pub async fn list_pages(
    path: web::Path<String>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    match db.list_pages(&app_id) {
        Ok(pages) => HttpResponse::Ok().json(pages),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn create_page(
    req: HttpRequest,
    path: web::Path<String>,
    db: web::Data<Database>,
    body: web::Json<CreatePageRequest>,
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
    let type_ = body.type_.as_deref().unwrap_or("custom");
    let attrs = body.attributes.as_ref().map(|a| a.to_string()).unwrap_or_else(|| "{}".to_string());

    match db.create_page(&id, &app_id, &body.page_id, &body.title, type_, &attrs, &now) {
        Ok(_) => HttpResponse::Created().json(serde_json::json!({
            "id": id,
            "page_id": body.page_id,
            "title": body.title,
            "type": type_,
            "attributes": body.attributes,
            "is_published": false,
            "created_at": now,
            "updated_at": now,
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "create_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn update_page(
    req: HttpRequest,
    path: web::Path<(String, String)>,
    db: web::Data<Database>,
    body: web::Json<UpdatePageRequest>,
) -> HttpResponse {
    let (app_id, page_db_id) = path.into_inner();
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
    let now = Utc::now().to_rfc3339();
    let title = body.title.as_deref().unwrap_or("");
    let attrs = body.attributes.as_ref().map(|a| a.to_string()).unwrap_or_else(|| "{}".to_string());
    let is_published = body.is_published.unwrap_or(false);

    match db.update_page(&page_db_id, title, &attrs, is_published, &now) {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "status": "updated" })),
        Ok(false) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Page not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "update_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn delete_page(
    req: HttpRequest,
    path: web::Path<(String, String)>,
    db: web::Data<Database>,
) -> HttpResponse {
    let (app_id, page_db_id) = path.into_inner();
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
    match db.delete_page(&page_db_id) {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "status": "deleted" })),
        Ok(false) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Page not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "delete_failed".to_string(),
            message: e.to_string(),
        }),
    }
}
