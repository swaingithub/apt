use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use std::path::Path;

use crate::auth;
use crate::services::builder::{EASBuilder, BuildTracker};
use crate::db::Database;
use crate::models::{BuildRequest, BuildResponse, BuildStatusResponse, ErrorResponse};

pub async fn build_app(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    body: web::Json<BuildRequest>,
    tracker: web::Data<BuildTracker>,
) -> HttpResponse {
    let user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let app_id = path.into_inner();
    let platform = body.platform.clone();
    let now = Utc::now().to_rfc3339();

    let source_zip = format!("./output/{}_source.zip", app_id);
    if !Path::new(&source_zip).exists() {
        let _ = std::fs::create_dir_all("./output");
        let _ = std::fs::write(&source_zip, b"mock zip content");
    }

    match EASBuilder::submit_build(&app_id, &platform, Path::new(&source_zip), tracker.get_ref().clone(), db.clone()) {
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

pub async fn get_build_status(
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

pub async fn download_build(path: web::Path<String>) -> HttpResponse {
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
