use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use std::path::Path;
use uuid::Uuid;

use crate::services::app_generator::AppGenerator;
use crate::auth;
use crate::services::builder::BuildTracker;
use crate::db::Database;
use crate::models::{AppConfig, ErrorResponse};

pub async fn create_app(
    req: HttpRequest,
    db: web::Data<Database>,
    body: web::Json<serde_json::Value>,
) -> HttpResponse {
    let user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let app_id = Uuid::new_v4().to_string();
    let config = body.get("config").and_then(|c| serde_json::from_value::<AppConfig>(c.clone()).ok());

    let cfg = config.unwrap_or(AppConfig {
        app_name: app_id.clone(),
        package_name: "com.example.app".to_string(),
        display_name: "Generated App".to_string(),
        version: "1.0.0".to_string(),
        description: None,
        author: None,
        primary_color: "#000000".to_string(),
        secondary_color: "#ffffff".to_string(),
    });

    let project_config = body.get("project_config").cloned();
    let pc = project_config.unwrap_or_else(|| serde_json::json!({
        "appName": cfg.display_name,
        "homePageId": "",
        "pages": [],
        "collections": [],
        "globalStates": [],
    }));

    match AppGenerator::generate_from_template(
        &app_id,
        &cfg.app_name,
        &pc,
        &cfg.package_name,
        &cfg.display_name,
        &cfg.version,
        &cfg.primary_color,
    ) {
        Ok(zip_path) => {
            let now = Utc::now().to_rfc3339();
            let slug = cfg.app_name.to_lowercase().replace(' ', "-");
            let config_json = serde_json::json!({
                "app_name": &cfg.app_name,
                "package_name": &cfg.package_name,
                "display_name": &cfg.display_name,
                "version": &cfg.version,
                "primary_color": &cfg.primary_color,
                "secondary_color": &cfg.secondary_color,
                "project_config": &pc,
            });
            let _ = db.create_generated_app(&app_id, &user_id, &cfg.app_name, &zip_path, &config_json.to_string(), &now);

            HttpResponse::Created().json(serde_json::json!({
                "app_id": app_id,
                "slug": slug,
                "config": cfg,
                "status": "created",
                "created_at": now,
                "expo_url": format!("exp://localhost:19000/{}", cfg.app_name),
                "config_url": format!("/api/v1/config/{}", slug),
                "download_url": format!("/api/apps/{}/download", app_id),
            }))
        }
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "generation_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn download_source(path: web::Path<String>) -> HttpResponse {
    let app_id = path.into_inner();
    let zip_path = format!("./output/{}_source.zip", app_id);

    if !Path::new(&zip_path).exists() {
        return HttpResponse::NotFound().json(ErrorResponse {
            error: "file_not_found".to_string(),
            message: "Source code not found".to_string(),
        });
    }

    match std::fs::read(&zip_path) {
        Ok(contents) => HttpResponse::Ok()
            .content_type("application/zip")
            .insert_header(("Content-Disposition", format!("attachment; filename=\"{}\"_source.zip", app_id)))
            .body(contents),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "read_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn list_apps(
    _req: HttpRequest,
    db: web::Data<Database>,
) -> HttpResponse {
    match db.list_all_generated_apps() {
        Ok(apps) => HttpResponse::Ok().json(apps),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "list_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn get_app(
    path: web::Path<String>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    match db.get_generated_app(&app_id) {
        Ok(Some(app)) => HttpResponse::Ok().json(app),
        Ok(None) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "App not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn update_app(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    body: web::Json<serde_json::Value>,
) -> HttpResponse {
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let app_id = path.into_inner();

    let existing = match db.get_generated_app(&app_id) {
        Ok(Some(a)) => a,
        Ok(None) => return HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "App not found".to_string(),
        }),
        Err(e) => return HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    };

    let current_config = existing.get("config").and_then(|c| c.as_object()).cloned().unwrap_or_default();
    let app_name = body.get("app_name").and_then(|v| v.as_str()).unwrap_or(
        current_config.get("app_name").and_then(|v| v.as_str()).unwrap_or("App")
    ).to_string();
    let package_name = body.get("package_name").and_then(|v| v.as_str()).unwrap_or(
        current_config.get("package_name").and_then(|v| v.as_str()).unwrap_or("com.example.app")
    ).to_string();
    let display_name = body.get("display_name").and_then(|v| v.as_str()).unwrap_or(
        current_config.get("display_name").and_then(|v| v.as_str()).unwrap_or(&app_name)
    ).to_string();
    let version = body.get("version").and_then(|v| v.as_str()).unwrap_or(
        current_config.get("version").and_then(|v| v.as_str()).unwrap_or("1.0.0")
    ).to_string();
    let primary_color = body.get("primary_color").and_then(|v| v.as_str()).unwrap_or(
        current_config.get("primary_color").and_then(|v| v.as_str()).unwrap_or("#6366f1")
    ).to_string();

    let project_config = body.get("project_config").cloned().unwrap_or_else(|| {
        serde_json::json!({
            "appName": display_name,
            "homePageId": "",
            "pages": [],
            "collections": [],
            "globalStates": [],
        })
    });

    let zip_path = match AppGenerator::generate_from_template(
        &app_id,
        &app_name,
        &project_config,
        &package_name,
        &display_name,
        &version,
        &primary_color,
    ) {
        Ok(p) => p,
        Err(e) => return HttpResponse::InternalServerError().json(ErrorResponse {
            error: "regeneration_failed".to_string(),
            message: e.to_string(),
        }),
    };

    let new_config = serde_json::json!({
        "app_name": app_name,
        "package_name": package_name,
        "display_name": display_name,
        "version": version,
        "primary_color": primary_color,
        "project_config": project_config,
    });

    match db.update_generated_app(&app_id, &app_name, &zip_path, &new_config.to_string()) {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({
            "status": "updated",
            "app_id": app_id,
            "download_url": format!("/api/apps/{}/download", app_id),
            "filename": Path::new(&zip_path).file_name().and_then(|n| n.to_str()).unwrap_or("app_source.zip"),
        })),
        Ok(false) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "App not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "update_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn delete_app(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let app_id = path.into_inner();

    let zip_path = format!("./output/{}_source.zip", app_id);
    let _ = std::fs::remove_file(&zip_path);

    match db.delete_generated_app(&app_id) {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "status": "deleted" })),
        Ok(false) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "App not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "delete_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn list_app_builds(
    path: web::Path<String>,
    db: web::Data<Database>,
    tracker: web::Data<BuildTracker>,
) -> HttpResponse {
    let app_id = path.into_inner();
    match db.list_builds_for_app(&app_id) {
        Ok(mut builds) => {
            let t = tracker.lock().unwrap();
            for build in builds.iter_mut() {
                let bid = build.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
                if let Some(ref bid) = bid {
                    if let Some(progress) = t.get(bid.as_str()) {
                        if let Some(obj) = build.as_object_mut() {
                            obj.insert("status".to_string(), serde_json::json!(progress.status));
                            obj.insert("message".to_string(), serde_json::json!(progress.message));
                            if let Some(ref _out) = progress.output_file {
                                obj.insert("download_url".to_string(), serde_json::json!(format!("/api/builds/download/{}", bid)));
                            }
                        }
                    }
                }
            }
            HttpResponse::Ok().json(builds)
        },
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

pub async fn get_app_products(
    path: web::Path<String>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    match db.get_generated_app(&app_id) {
        Ok(Some(app)) => {
            let mut has_ecomm = false;
            if let Some(cfg) = app.get("config") {
                if let Some(integrations) = cfg.get("integrations") {
                    if let Some(shopify) = integrations.get("shopify") {
                        if shopify.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                            has_ecomm = true;
                        }
                    }
                    if let Some(woo) = integrations.get("woocommerce") {
                        if woo.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                            has_ecomm = true;
                        }
                    }
                }
            }
            if has_ecomm {
                let products = serde_json::json!([
                    { "id": "p1", "title": "Premium Running Shoes", "price": "$120.00", "image": "👟" },
                    { "id": "p2", "title": "Classic Cotton T-Shirt", "price": "$25.00", "image": "👕" },
                    { "id": "p3", "title": "Wireless Noise-Canceling Headphones", "price": "$199.99", "image": "🎧" },
                    { "id": "p4", "title": "Smart Watch Series 7", "price": "$399.00", "image": "⌚" },
                    { "id": "p5", "title": "Ergonomic Office Chair", "price": "$249.50", "image": "💺" },
                    { "id": "p6", "title": "Organic Coffee Beans (1lb)", "price": "$18.00", "image": "☕" }
                ]);
                HttpResponse::Ok().json(products)
            } else {
                HttpResponse::Ok().json(serde_json::json!([]))
            }
        },
        Ok(None) => HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "App not found".to_string(),
        }),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}
