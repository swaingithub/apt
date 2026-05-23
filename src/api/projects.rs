use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use uuid::Uuid;

use crate::services::app_generator::AppGenerator;
use crate::auth;
use crate::db::Database;
use crate::models::ErrorResponse;

pub async fn create_project(
    req: HttpRequest,
    db: web::Data<Database>,
    body: web::Json<serde_json::Value>,
) -> HttpResponse {
    let user_id = match auth::extract_user_id(&req) {
        Some(id) => id,
        None => return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "unauthorized".to_string(),
            message: "Authentication required".to_string(),
        }),
    };

    let project_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("Untitled");
    let description = body.get("description").and_then(|v| v.as_str()).unwrap_or("");
    let config = body.get("config").map(|v| v.to_string()).unwrap_or_else(|| "{}".to_string());
    let screens = body.get("screens").map(|v| v.to_string()).unwrap_or_else(|| "[]".to_string());
    let theme = body.get("theme").map(|v| v.to_string()).unwrap_or_else(|| "{}".to_string());

    match db.create_project(&project_id, &user_id, name, description, &config, &screens, &theme, &now) {
        Ok(_) => HttpResponse::Created().json(serde_json::json!({
            "id": project_id,
            "name": name,
            "description": description,
            "config": serde_json::from_str::<serde_json::Value>(&config).unwrap_or_default(),
            "screens": serde_json::from_str::<serde_json::Value>(&screens).unwrap_or_default(),
            "theme": serde_json::from_str::<serde_json::Value>(&theme).unwrap_or_default(),
            "created_at": now,
            "updated_at": now,
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "create_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn list_projects(req: HttpRequest, db: web::Data<Database>) -> HttpResponse {
    let user_id = match auth::extract_user_id(&req) {
        Some(id) => id,
        None => return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "unauthorized".to_string(),
            message: "Authentication required".to_string(),
        }),
    };

    match db.list_projects(&user_id) {
        Ok(projects) => HttpResponse::Ok().json(projects),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "list_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn get_project(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = match auth::extract_user_id(&req) {
        Some(id) => id,
        None => return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "unauthorized".to_string(),
            message: "Authentication required".to_string(),
        }),
    };

    let project_id = path.into_inner();
    match db.get_project(&project_id, &user_id) {
        Ok(Some(project)) => HttpResponse::Ok().json(project),
        Ok(None) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Project not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn update_project(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    body: web::Json<serde_json::Value>,
) -> HttpResponse {
    let user_id = match auth::extract_user_id(&req) {
        Some(id) => id,
        None => return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "unauthorized".to_string(),
            message: "Authentication required".to_string(),
        }),
    };

    let project_id = path.into_inner();
    let now = Utc::now().to_rfc3339();

    let name = body.get("name").and_then(|v| v.as_str());
    let description = body.get("description").and_then(|v| v.as_str());
    let config = body.get("config").map(|v| v.to_string());
    let screens = body.get("screens").map(|v| v.to_string());
    let theme = body.get("theme").map(|v| v.to_string());

    match db.update_project(
        &project_id,
        &user_id,
        name,
        description,
        config.as_deref(),
        screens.as_deref(),
        theme.as_deref(),
        &now,
    ) {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "status": "updated" })),
        Ok(false) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Project not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "update_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn delete_project(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = match auth::extract_user_id(&req) {
        Some(id) => id,
        None => return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "unauthorized".to_string(),
            message: "Authentication required".to_string(),
        }),
    };

    let project_id = path.into_inner();
    match db.delete_project(&project_id, &user_id) {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "status": "deleted" })),
        Ok(false) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Project not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "delete_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn export_project(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = match auth::extract_user_id(&req) {
        Some(id) => id,
        None => return HttpResponse::Unauthorized().json(ErrorResponse {
            error: "unauthorized".to_string(),
            message: "Authentication required".to_string(),
        }),
    };

    let project_id = path.into_inner();
    let project = match db.get_project(&project_id, &user_id) {
        Ok(Some(p)) => p,
        Ok(None) => return HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Project not found".to_string(),
        }),
        Err(e) => return HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    };

    let app_name = project["name"].as_str().unwrap_or("exported_app");
    let package_name = project["config"]["package_name"].as_str().unwrap_or("com.example.app");
    let display_name = project["config"]["display_name"].as_str().unwrap_or(app_name);
    let version = project["config"]["version"].as_str().unwrap_or("1.0.0");
    let primary_color = project["config"]["primary_color"].as_str().unwrap_or("#000000");
    let screens = project.get("screens").cloned().unwrap_or(serde_json::json!([]));

    let project_config = serde_json::json!({
        "appName": display_name,
        "homePageId": screens[0]["id"].as_str().unwrap_or("home"),
        "pages": screens,
        "collections": [],
        "globalStates": [],
    });

    match AppGenerator::generate_from_template(
        &project_id,
        app_name,
        &project_config,
        package_name,
        display_name,
        version,
        primary_color,
    ) {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "status": "exported",
            "project_id": project_id,
            "download_url": format!("/api/projects/{}/download", project_id),
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "export_failed".to_string(),
            message: e.to_string(),
        }),
    }
}
