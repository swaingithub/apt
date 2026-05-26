mod agent;
mod ai;
mod analytics;
mod apps;
mod blocks;
mod builds;
mod config;
mod generate;
mod health;
mod htmx;
mod media;
mod navigation;
mod pages;
mod preview;
mod projects;
mod publish;
mod push;
mod qr;
mod settings;

use health::health_check;
use generate::generate_from_template;
use htmx::htmx_routes;
use preview::preview_ws;
use apps::{create_app, download_source, list_apps, get_app, update_app, delete_app, list_app_builds, get_app_products};
use builds::{build_app, get_build_status, download_build};
use qr::get_qr_code;
use projects::{create_project, list_projects, get_project, update_project, delete_project, export_project};
use push::send_push_notification;
use agent::agent_chat;
use ai::{generate_from_prompt, get_ai_providers};
use analytics::get_analytics;
use config::get_config;
use settings::{list_settings, upsert_setting, delete_setting};
use pages::{list_pages, create_page, update_page, delete_page};
use blocks::{list_blocks, create_block, update_block, delete_block};
use navigation::{get_navigation, upsert_navigation};
use publish::{publish_config, list_published};
use media::{list_media, create_media, delete_media};

use actix_web::{web, HttpRequest, HttpResponse};
use std::collections::HashMap;
use std::sync::Mutex;

use crate::auth as root_auth;
use crate::db::Database;
use crate::models::ErrorResponse;

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

fn get_user_id(req: &HttpRequest) -> String {
    root_auth::extract_user_id(req).unwrap_or_else(|| "anonymous".to_string())
}

fn check_app_owner(db: &Database, app_id: &str, user_id: &str) -> Result<serde_json::Value, HttpResponse> {
    match db.get_generated_app(app_id) {
        Ok(Some(app)) => {
            let owner = app["user_id"].as_str().unwrap_or("");
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
        .route("/api/auth/register", web::post().to(root_auth::register))
        .route("/api/auth/login", web::post().to(root_auth::login))
        .route("/api/auth/profile", web::put().to(root_auth::put_profile))
        .route("/api/auth/password", web::put().to(root_auth::put_password))
        .route("/api/auth/account", web::delete().to(root_auth::delete_account))
        .route("/api/auth/me", web::get().to(root_auth::me))
        .route("/api/auth/firebase-sync", web::post().to(root_auth::firebase_sync))
        .route("/api/generate", web::post().to(generate_from_template))
        .route("/api/apps", web::post().to(create_app))
        .route("/api/apps", web::get().to(list_apps))
        .route("/api/apps/{app_id}", web::get().to(get_app))
        .route("/api/apps/{app_id}/products", web::get().to(get_app_products))
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

        .route("/api/v1/config/{slug}", web::get().to(get_config))

        .route("/api/v1/apps/{app_id}/settings", web::get().to(list_settings))
        .route("/api/v1/apps/{app_id}/settings", web::put().to(upsert_setting))
        .route("/api/v1/apps/{app_id}/settings/{key}", web::delete().to(delete_setting))

        .route("/api/v1/apps/{app_id}/pages", web::get().to(list_pages))
        .route("/api/v1/apps/{app_id}/pages", web::post().to(create_page))
        .route("/api/v1/apps/{app_id}/pages/{page_db_id}", web::put().to(update_page))
        .route("/api/v1/apps/{app_id}/pages/{page_db_id}", web::delete().to(delete_page))

        .route("/api/v1/apps/{app_id}/blocks", web::post().to(create_block))
        .route("/api/v1/apps/{app_id}/blocks/{block_db_id}", web::put().to(update_block))
        .route("/api/v1/apps/{app_id}/blocks/{block_db_id}", web::delete().to(delete_block))
        .route("/api/v1/apps/{app_id}/pages/{page_db_id}/blocks", web::get().to(list_blocks))

        .route("/api/v1/apps/{app_id}/navigation", web::get().to(get_navigation))
        .route("/api/v1/apps/{app_id}/navigation", web::put().to(upsert_navigation))

        .route("/api/v1/apps/{app_id}/publish", web::post().to(publish_config))
        .route("/api/v1/apps/{app_id}/publish", web::get().to(list_published))

        .route("/api/v1/apps/{app_id}/media", web::get().to(list_media))
        .route("/api/v1/apps/{app_id}/media", web::post().to(create_media))
        .route("/api/v1/apps/{app_id}/media/{media_id}", web::delete().to(delete_media))
        .route("/api/v1/apps/{app_id}/analytics", web::get().to(get_analytics))
        .route("/api/v1/apps/{app_id}/generate", web::post().to(generate_from_prompt))
        .route("/api/v1/apps/{app_id}/agent/chat", web::post().to(agent_chat))
        .route("/api/v1/ai/providers", web::get().to(get_ai_providers))
        .route("/ws/preview/{app_id}", web::get().to(preview_ws))
        .configure(htmx_routes);
}
