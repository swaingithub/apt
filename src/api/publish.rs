use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use uuid::Uuid;

use crate::db::Database;
use crate::models::{PublishRequest, PublishResponse, ErrorResponse};
use super::{get_user_id, check_app_owner, ConfigCache};

pub async fn publish_config(
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
        format!("1.0.{}", Utc::now().timestamp())
    });

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

pub async fn list_published(
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
