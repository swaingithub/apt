use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use uuid::Uuid;

use crate::db::Database;
use crate::models::{CreateBlockRequest, UpdateBlockRequest, ErrorResponse};
use super::{get_user_id, check_app_owner};

pub async fn list_blocks(
    path: web::Path<(String, String)>,
    db: web::Data<Database>,
) -> HttpResponse {
    let (_app_id, page_db_id) = path.into_inner();
    match db.list_blocks(&page_db_id) {
        Ok(blocks) => HttpResponse::Ok().json(blocks),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn create_block(
    req: HttpRequest,
    path: web::Path<String>,
    db: web::Data<Database>,
    body: web::Json<CreateBlockRequest>,
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
    let attrs = body.attributes.as_ref().map(|a| a.to_string()).unwrap_or_else(|| "{}".to_string());
    let sort_order = body.sort_order.unwrap_or(0);

    match db.create_block(&id, &body.page_id, &body.client_id, &body.name, &attrs, body.parent_id.as_deref(), sort_order, &now) {
        Ok(_) => HttpResponse::Created().json(serde_json::json!({
            "id": id,
            "client_id": body.client_id,
            "name": body.name,
            "attributes": body.attributes,
            "parent_id": body.parent_id,
            "sort_order": sort_order,
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "create_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn update_block(
    req: HttpRequest,
    path: web::Path<(String, String)>,
    db: web::Data<Database>,
    body: web::Json<UpdateBlockRequest>,
) -> HttpResponse {
    let (app_id, block_db_id) = path.into_inner();
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
    let name = body.name.as_deref().unwrap_or("");
    let attrs = body.attributes.as_ref().map(|a| a.to_string()).unwrap_or_else(|| "{}".to_string());
    let sort_order = body.sort_order.unwrap_or(0);

    match db.update_block(&block_db_id, name, &attrs, sort_order) {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "status": "updated" })),
        Ok(false) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Block not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "update_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn delete_block(
    req: HttpRequest,
    path: web::Path<(String, String)>,
    db: web::Data<Database>,
) -> HttpResponse {
    let (app_id, block_db_id) = path.into_inner();
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
    match db.delete_block(&block_db_id) {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "status": "deleted" })),
        Ok(false) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Block not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "delete_failed".to_string(),
            message: e.to_string(),
        }),
    }
}
