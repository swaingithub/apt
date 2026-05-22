use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use uuid::Uuid;

use crate::app_generator::AppGenerator;
use crate::auth;
use crate::builder::{EASBuilder, BuildTracker};
use crate::db::Database;
use crate::models::{
    AppConfig, BuildRequest, BuildResponse, BuildStatusResponse, ErrorResponse,
    GenerateFromTemplateRequest,
    CreateSettingRequest, CreatePageRequest, UpdatePageRequest,
    CreateBlockRequest, UpdateBlockRequest, UpsertNavigationRequest,
    CreateMediaRequest, PublishRequest, PublishResponse,
};
use crate::qr_generator::QRGenerator;

// ── Config Cache (in-memory TTL) ─────────────────────────────────

struct ConfigCacheEntry {
    data: serde_json::Value,
    cached_at: std::time::Instant,
}

pub struct ConfigCache {
    map: Mutex<HashMap<String, ConfigCacheEntry>>,
    ttl: std::time::Duration,
}

impl ConfigCache {
    pub fn new(ttl_secs: u64) -> Self {
        ConfigCache {
            map: Mutex::new(HashMap::new()),
            ttl: std::time::Duration::from_secs(ttl_secs),
        }
    }

    pub fn get(&self, key: &str) -> Option<serde_json::Value> {
        let map = self.map.lock().unwrap();
        map.get(key).and_then(|entry| {
            if entry.cached_at.elapsed() < self.ttl {
                Some(entry.data.clone())
            } else {
                None
            }
        })
    }

    pub fn set(&self, key: &str, data: serde_json::Value) {
        let mut map = self.map.lock().unwrap();
        map.insert(key.to_string(), ConfigCacheEntry {
            data,
            cached_at: std::time::Instant::now(),
        });
    }

    pub fn invalidate(&self, key: &str) {
        let mut map = self.map.lock().unwrap();
        map.remove(key);
    }
}

// ── Auth helpers ──────────────────────────────────────────────────

fn get_user_id(req: &HttpRequest) -> String {
    auth::extract_user_id(req).unwrap_or_else(|| "anonymous".to_string())
}

fn check_app_owner(db: &Database, app_id: &str, user_id: &str) -> Result<serde_json::Value, HttpResponse> {
    match db.get_generated_app(app_id) {
        Ok(Some(app)) => {
            let owner = app["user_id"].as_str().unwrap_or("");
            // Allow if user is owner, or if anonymous (for backwards compat)
            if owner == user_id || user_id == "anonymous" || owner.is_empty() {
                Ok(app)
            } else {
                Err(HttpResponse::Forbidden().json(ErrorResponse {
                    error: "forbidden".to_string(),
                    message: "You don't have access to this app".to_string(),
                }))
            }
        }
        Ok(None) => Err(HttpResponse::NotFound().json(ErrorResponse {
            error: "not_found".to_string(),
            message: "App not found".to_string(),
        })),
        Err(e) => Err(HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        })),
    }
}

pub fn routes(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/api/health", web::get().to(health_check))
        .route("/api/auth/register", web::post().to(auth::register))
        .route("/api/auth/login", web::post().to(auth::login))
        .route("/api/auth/me", web::get().to(auth::me))
        .route("/api/generate", web::post().to(generate_from_template))
        .route("/api/apps", web::post().to(create_app))
        .route("/api/apps", web::get().to(list_apps))
        .route("/api/apps/{app_id}", web::get().to(get_app))
        .route("/api/apps/{app_id}", web::put().to(update_app))
        .route("/api/apps/{app_id}", web::delete().to(delete_app))
        .route("/api/apps/{app_id}/download", web::get().to(download_source))
        .route("/api/apps/{app_id}/build", web::post().to(build_app))
        .route("/api/apps/{app_id}/builds", web::get().to(list_app_builds))
        .route("/api/apps/{app_id}/qr", web::get().to(get_qr_code))
        .route("/api/projects", web::post().to(create_project))
        .route("/api/projects", web::get().to(list_projects))
        .route("/api/projects/{project_id}", web::get().to(get_project))
        .route("/api/projects/{project_id}", web::put().to(update_project))
        .route("/api/projects/{project_id}", web::delete().to(delete_project))
        .route("/api/projects/{project_id}/export", web::post().to(export_project))
        .route("/api/builds/{build_id}", web::get().to(get_build_status))
        .route("/api/builds/{build_id}/download", web::get().to(download_build))
        .route("/api/push/send", web::post().to(send_push_notification))

        // ── Config API (mobile runtime) ──
        .route("/api/v1/config/{slug}", web::get().to(get_config))

        // ── Settings CRUD ──
        .route("/api/v1/apps/{app_id}/settings", web::get().to(list_settings))
        .route("/api/v1/apps/{app_id}/settings", web::put().to(upsert_setting))
        .route("/api/v1/apps/{app_id}/settings/{key}", web::delete().to(delete_setting))

        // ── Pages CRUD ──
        .route("/api/v1/apps/{app_id}/pages", web::get().to(list_pages))
        .route("/api/v1/apps/{app_id}/pages", web::post().to(create_page))
        .route("/api/v1/apps/{app_id}/pages/{page_db_id}", web::put().to(update_page))
        .route("/api/v1/apps/{app_id}/pages/{page_db_id}", web::delete().to(delete_page))

        // ── Blocks CRUD ──
        .route("/api/v1/apps/{app_id}/blocks", web::post().to(create_block))
        .route("/api/v1/apps/{app_id}/blocks/{block_db_id}", web::put().to(update_block))
        .route("/api/v1/apps/{app_id}/blocks/{block_db_id}", web::delete().to(delete_block))
        .route("/api/v1/apps/{app_id}/pages/{page_db_id}/blocks", web::get().to(list_blocks))

        // ── Navigation ──
        .route("/api/v1/apps/{app_id}/navigation", web::get().to(get_navigation))
        .route("/api/v1/apps/{app_id}/navigation", web::put().to(upsert_navigation))

        // ── Publish ──
        .route("/api/v1/apps/{app_id}/publish", web::post().to(publish_config))
        .route("/api/v1/apps/{app_id}/publish", web::get().to(list_published))

        // ── Media ──
        .route("/api/v1/apps/{app_id}/media", web::get().to(list_media))
        .route("/api/v1/apps/{app_id}/media", web::post().to(create_media))
        .route("/api/v1/apps/{app_id}/media/{media_id}", web::delete().to(delete_media));
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "Apt",
        "version": "0.1.0"
    }))
}

// ── Generate ──────────────────────────────────────────────────────────

async fn generate_from_template(
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

// ── Apps ──────────────────────────────────────────────────────────────

async fn create_app(
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
            // Always persist to DB so the Config API can find it by slug
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

async fn download_source(path: web::Path<String>) -> HttpResponse {
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

// ── App Management (list, get, update, delete) ────────────────────────

async fn list_apps(
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

async fn get_app(
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

async fn update_app(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    body: web::Json<serde_json::Value>,
) -> HttpResponse {
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let app_id = path.into_inner();

    // Check app exists and get current config
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

    // Build project_config from body or use existing
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

async fn delete_app(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let app_id = path.into_inner();

    // Delete the source zip if it exists
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

async fn list_app_builds(
    path: web::Path<String>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    match db.list_builds_for_app(&app_id) {
        Ok(builds) => HttpResponse::Ok().json(builds),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

// ── Build ─────────────────────────────────────────────────────────────

async fn build_app(
    req: HttpRequest,
    db: web::Data<Database>,
    body: web::Json<BuildRequest>,
    tracker: web::Data<BuildTracker>,
) -> HttpResponse {
    let user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let platform = body.platform.clone();
    let app_id = body.app_id.clone();
    let now = Utc::now().to_rfc3339();

    let source_zip = format!("./output/{}_source.zip", app_id);
    if !Path::new(&source_zip).exists() {
        return HttpResponse::NotFound().json(ErrorResponse {
            error: "app_not_found".to_string(),
            message: "Source code not found. Please create the app first.".to_string(),
        });
    }

    match EASBuilder::submit_build(&app_id, &platform, Path::new(&source_zip), tracker.get_ref().clone()) {
        Ok(build_id) => {
            let _ = db.create_build(&build_id, &app_id, &user_id, &platform, "queued", None, &now);
            HttpResponse::Accepted().json(BuildResponse {
                build_id,
                app_id,
                platform,
                status: "queued".to_string(),
                download_url: None,
                qr_code: None,
                created_at: Utc::now(),
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "build_submit_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

async fn get_build_status(
    path: web::Path<String>,
    tracker: web::Data<BuildTracker>,
) -> HttpResponse {
    let build_id = path.into_inner();
    let t = tracker.lock().unwrap();

    match t.get(&build_id) {
        Some(progress) => {
            let download_url = progress.output_file.as_ref().map(|_| {
                format!("/api/builds/{}/download", build_id)
            });

            HttpResponse::Ok().json(BuildStatusResponse {
                build_id: progress.build_id.clone(),
                app_id: progress.app_id.clone(),
                platform: progress.platform.clone(),
                status: progress.status.clone(),
                message: progress.message.clone(),
                download_url,
                created_at: progress.created_at.clone(),
            })
        }
        None => HttpResponse::NotFound().json(ErrorResponse {
            error: "build_not_found".to_string(),
            message: "Build not found".to_string(),
        }),
    }
}

async fn download_build(path: web::Path<String>) -> HttpResponse {
    let build_id = path.into_inner();
    let files = match std::fs::read_dir("./output") {
        Ok(f) => f,
        Err(_) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                error: "file_not_found".to_string(),
                message: "Build file not found".to_string(),
            })
        }
    };

    for file in files {
        if let Ok(entry) = file {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if file_name.starts_with(&build_id) {
                match std::fs::read(entry.path()) {
                    Ok(contents) => {
                        let content_type = if file_name.ends_with(".apk") {
                            "application/vnd.android.package-archive"
                        } else if file_name.ends_with(".zip") {
                            "application/zip"
                        } else {
                            "application/octet-stream"
                        };
                        return HttpResponse::Ok()
                            .content_type(content_type)
                            .insert_header(("Content-Disposition", format!("attachment; filename=\"{}\"", file_name)))
                            .body(contents);
                    }
                    Err(e) => {
                        return HttpResponse::InternalServerError().json(ErrorResponse {
                            error: "read_failed".to_string(),
                            message: e.to_string(),
                        })
                    }
                }
            }
        }
    }

    HttpResponse::NotFound().json(ErrorResponse {
        error: "file_not_found".to_string(),
        message: "Build file not found".to_string(),
    })
}

// ── QR Code ───────────────────────────────────────────────────────────

async fn get_qr_code(path: web::Path<String>) -> HttpResponse {
    let app_id = path.into_inner();
    let expo_url = format!("exp://localhost:19000/{}", app_id);

    match QRGenerator::generate_expo_qr(&expo_url) {
        Ok(qr_data_url) => HttpResponse::Ok().json(serde_json::json!({
            "qr_code": qr_data_url,
            "expo_url": expo_url
        })),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "qr_generation_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

// ── Projects ──────────────────────────────────────────────────────────

async fn create_project(
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

async fn list_projects(req: HttpRequest, db: web::Data<Database>) -> HttpResponse {
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

async fn get_project(
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

async fn update_project(
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

async fn delete_project(
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

// ── Export ────────────────────────────────────────────────────────────

async fn export_project(
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

// ── Push Notifications ────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct PushRequest {
    to: String,
    title: Option<String>,
    body: Option<String>,
    data: Option<serde_json::Value>,
}

async fn send_push_notification(body: web::Json<PushRequest>) -> HttpResponse {
    let expo_push_url = "https://exp.host/--/api/v2/push/send";

    let payload = serde_json::json!({
        "to": body.to,
        "title": body.title.as_deref().unwrap_or("Appmake Update"),
        "body": body.body.as_deref().unwrap_or("You have a new update from your app."),
        "data": body.data,
        "sound": "default",
        "priority": "high",
    });

    let client = reqwest::Client::new();
    match client
        .post(expo_push_url)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) => {
            let status_code = resp.status().as_u16();
            match resp.json::<serde_json::Value>().await {
                Ok(data) => HttpResponse::Ok().json(serde_json::json!({
                    "status": "sent",
                    "expo_status": status_code,
                    "response": data,
                })),
                Err(e) => HttpResponse::Ok().json(serde_json::json!({
                    "status": "sent",
                    "expo_status": status_code,
                    "response": e.to_string(),
                })),
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "push_failed".to_string(),
            message: format!("Failed to send push: {}", e),
        }),
    }
}

// ── Config API ───────────────────────────────────────────────────────

async fn get_config(
    path: web::Path<String>,
    db: web::Data<Database>,
    cache: web::Data<ConfigCache>,
) -> HttpResponse {
    let slug = path.into_inner();

    // Check cache first
    if let Some(cached) = cache.get(&slug) {
        return HttpResponse::Ok()
            .insert_header(("X-Cache", "HIT"))
            .insert_header(("Cache-Control", "public, max-age=60, stale-while-revalidate=300"))
            .json(cached);
    }

    // Look up project by slug
    let project = match db.get_app_by_slug(&slug) {
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

    let app_id = project["id"].as_str().unwrap_or("");
    let app_name = project["app_name"].as_str().unwrap_or("");
    let platform = project["platform"].as_str().unwrap_or("custom");
    let store_url = project["store_url"].as_str().unwrap_or("");

    // Fetch settings, pages with blocks, navigation in parallel-ish
    let settings_res = db.list_settings(app_id);
    let pages_res = db.list_pages(app_id);
    let nav_res = db.get_navigation(app_id);

    let settings = settings_res.unwrap_or_default();
    let pages = pages_res.unwrap_or_default();
    let nav_data = nav_res.ok().flatten();

    // Build pages map
    let mut pages_map = serde_json::Map::new();

    if !pages.is_empty() {
        // Normalized tables have data — use them
        for page in &pages {
            let page_id = page["page_id"].as_str().unwrap_or("");
            let page_db_id = page["id"].as_str().unwrap_or("");
            let attributes = page["attributes"].clone();
            let blocks = db.list_blocks(page_db_id).unwrap_or_default();
            pages_map.insert(page_id.to_string(), serde_json::json!({
                "attributes": attributes,
                "blocks": blocks,
            }));
        }
    } else {
        // Fall back to flat project_config JSON (legacy generate flow)
        let project_config = project.get("config")
            .and_then(|c| c.get("project_config"))
            .or_else(|| project.get("project_config"));
        if let Some(pc) = project_config {
            if let Some(legacy_pages) = pc.get("pages").and_then(|p| p.as_array()) {
                for page in legacy_pages {
                    let page_id = page["id"].as_str().unwrap_or("page_unknown");
                    let name = page["name"].as_str().unwrap_or("Page");
                    let elements = page["elements"].clone();
                    pages_map.insert(page_id.to_string(), serde_json::json!({
                        "attributes": {
                            "name": name,
                            "icon": page.get("icon").or(Some(&serde_json::Value::Null)),
                        },
                        "blocks": elements,
                    }));
                }
            }
        }
    }

    // Build settings map
    let settings_map: serde_json::Map<String, serde_json::Value> = settings.into_iter()
        .filter_map(|s| {
            let key = s["key"].as_str()?.to_string();
            let value = s["value"].clone();
            Some((key, value))
        })
        .collect();

    // Build navigation
    let navigation = nav_data.map(|n| n["config"].clone()).unwrap_or(serde_json::json!([]));

    // Build theme from project config
    let project_config = project.get("config").and_then(|c| c.as_object()).cloned().unwrap_or_default();
    let theme = project_config.get("project_config").and_then(|pc| pc.get("theme")).cloned()
        .unwrap_or_else(|| serde_json::json!({
            "mode": "light",
            "primaryColor": "#6366f1",
            "backgroundColor": "#f8fafc",
            "surfaceColor": "#ffffff",
            "textColor": "#0f172a",
        }));

    // Generate version: use latest published_at timestamp or current time
    let version = db.list_published_configs(app_id)
        .ok()
        .and_then(|v| v.into_iter().next())
        .and_then(|p| p.get("published_at").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .unwrap_or_else(|| format!("1.0.{}", chrono::Utc::now().timestamp()));

    let response = serde_json::json!({
        "version": version,
        "project": {
            "id": app_id,
            "name": app_name,
            "platform": platform,
            "storeUrl": store_url,
            "slug": slug,
        },
        "settings": settings_map,
        "pages": pages_map,
        "navigation": {
            "bottomTabs": navigation,
        },
        "theme": theme,
    });

    // Cache for 60 seconds
    cache.set(&slug, response.clone());

    HttpResponse::Ok()
        .insert_header(("X-Cache", "MISS"))
        .insert_header(("Cache-Control", "public, max-age=60, stale-while-revalidate=300"))
        .json(response)
}

// ── Settings CRUD ────────────────────────────────────────────────────

async fn list_settings(
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

async fn upsert_setting(
    req: HttpRequest,
    path: web::Path<String>,
    db: web::Data<Database>,
    body: web::Json<CreateSettingRequest>,
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

async fn delete_setting(
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

// ── Pages CRUD ───────────────────────────────────────────────────────

async fn list_pages(
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

async fn create_page(
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

async fn update_page(
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

async fn delete_page(
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

// ── Blocks CRUD ──────────────────────────────────────────────────────

async fn list_blocks(
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

async fn create_block(
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

async fn update_block(
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

async fn delete_block(
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

// ── Navigation ───────────────────────────────────────────────────────

async fn get_navigation(
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

async fn upsert_navigation(
    req: HttpRequest,
    path: web::Path<String>,
    db: web::Data<Database>,
    body: web::Json<UpsertNavigationRequest>,
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
    let config_str = body.config.to_string();

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

// ── Publish ──────────────────────────────────────────────────────────

async fn publish_config(
    req: HttpRequest,
    path: web::Path<String>,
    db: web::Data<Database>,
    body: web::Json<PublishRequest>,
    cache: web::Data<ConfigCache>,
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
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    let version = body.version.clone().unwrap_or_else(|| {
        format!("1.0.{}", chrono::Utc::now().timestamp())
    });

    // Build the full config snapshot
    let settings = db.list_settings(&app_id).unwrap_or_default();
    let pages = db.list_pages(&app_id).unwrap_or_default();
    let nav = db.get_navigation(&app_id).ok().flatten();

    let mut pages_map = serde_json::Map::new();
    for page in &pages {
        let page_id = page["page_id"].as_str().unwrap_or("");
        let page_db_id = page["id"].as_str().unwrap_or("");
        let attrs = page["attributes"].clone();
        let blocks = db.list_blocks(page_db_id).unwrap_or_default();
        pages_map.insert(page_id.to_string(), serde_json::json!({
            "attributes": attrs,
            "blocks": blocks,
        }));
    }

    let settings_map: serde_json::Map<String, serde_json::Value> = settings.into_iter()
        .filter_map(|s| {
            let key = s["key"].as_str()?.to_string();
            let value = s["value"].clone();
            Some((key, value))
        })
        .collect();

    let nav_config = nav.map(|n| n["config"].clone()).unwrap_or(serde_json::json!([]));

    let full_config = serde_json::json!({
        "settings": settings_map,
        "pages": pages_map,
        "navigation": nav_config,
    });

    match db.create_published_config(&id, &app_id, &version, &full_config.to_string(), &now) {
        Ok(_) => {
            // Invalidate cache
            if let Some(app) = db.get_generated_app(&app_id).ok().flatten() {
                if let Some(slug) = app.get("config").and_then(|c| c.get("app_name")).and_then(|n| n.as_str()) {
                    let cache_key = slug.to_lowercase().replace(' ', "-");
                    cache.invalidate(&cache_key);
                }
            }

            HttpResponse::Ok().json(PublishResponse {
                version,
                published_at: now,
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "publish_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

async fn list_published(
    path: web::Path<String>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    match db.list_published_configs(&app_id) {
        Ok(configs) => HttpResponse::Ok().json(configs),
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e.to_string(),
        }),
    }
}

// ── Media CRUD ───────────────────────────────────────────────────────

async fn list_media(
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

async fn create_media(
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

async fn delete_media(
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
