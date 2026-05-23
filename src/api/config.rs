use actix_web::{web, HttpResponse};
use chrono::Utc;

use crate::db::Database;
use crate::models::ErrorResponse;
use super::ConfigCache;

pub async fn get_config(
    path: web::Path<String>,
    db: web::Data<Database>,
    cache: web::Data<ConfigCache>,
) -> HttpResponse {
    let slug = path.into_inner();

    if let Some(cached) = cache.get(&slug) {
        return HttpResponse::Ok()
            .insert_header(("X-Cache", "HIT"))
            .insert_header(("Cache-Control", "public, max-age=60, stale-while-revalidate=300"))
            .json(cached);
    }

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

    let settings_res = db.list_settings(app_id);
    let pages_res = db.list_pages(app_id);
    let nav_res = db.get_navigation(app_id);

    let settings = settings_res.unwrap_or_default();
    let pages = pages_res.unwrap_or_default();
    let nav_data = nav_res.ok().flatten();

    let mut pages_map = serde_json::Map::new();

    if !pages.is_empty() {
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

    let settings_map: serde_json::Map<String, serde_json::Value> = settings.into_iter()
        .filter_map(|s| {
            let key = s["key"].as_str()?.to_string();
            let value = s["value"].clone();
            Some((key, value))
        })
        .collect();

    let navigation = nav_data.map(|n| n["config"].clone()).unwrap_or(serde_json::json!([]));

    let project_config = project.get("config").and_then(|c| c.as_object()).cloned().unwrap_or_default();
    let theme = project_config.get("project_config").and_then(|pc| pc.get("theme")).cloned()
        .unwrap_or_else(|| serde_json::json!({
            "mode": "light",
            "primaryColor": "#6366f1",
            "backgroundColor": "#f8fafc",
            "surfaceColor": "#ffffff",
            "textColor": "#0f172a",
        }));

    let version = db.list_published_configs(app_id)
        .ok()
        .and_then(|v| v.into_iter().next())
        .and_then(|p| p.get("published_at").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .unwrap_or_else(|| format!("1.0.{}", Utc::now().timestamp()));

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

    cache.set(&slug, response.clone());

    HttpResponse::Ok()
        .insert_header(("X-Cache", "MISS"))
        .insert_header(("Cache-Control", "public, max-age=60, stale-while-revalidate=300"))
        .json(response)
}
