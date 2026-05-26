use actix_web::{App, HttpServer, middleware, web};
use actix_cors::Cors;
use actix_files::Files;
use log::info;
use std::env;

mod api;
mod auth;
mod db;
mod models;
mod services;

use api::{routes, ConfigCache};
use db::Database;
use services::builder::EASBuilder;
use services::preview::PreviewBroadcaster;

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    env_logger::init();

    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let bind_addr = format!("{}:{}", host, port);

    info!("Starting Apt Server on {}...", bind_addr);

    std::fs::create_dir_all("./output")?;
    std::fs::create_dir_all("./temp")?;

    let database = Database::new("./apt.db")?;
    let db_data = web::Data::new(database);
    let build_tracker = EASBuilder::create_tracker();
    let tracker_data = web::Data::new(build_tracker);
    let config_cache = ConfigCache::new(60);
    let cache_data = web::Data::new(config_cache);
    let preview_broadcaster = PreviewBroadcaster::new();
    let preview_data = web::Data::new(preview_broadcaster);

    HttpServer::new(move || {
        let cors = Cors::permissive();

        App::new()
            .app_data(db_data.clone())
            .app_data(tracker_data.clone())
            .app_data(cache_data.clone())
            .app_data(preview_data.clone())
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .wrap(middleware::Compress::default())
            .configure(routes)
            .service(Files::new("/", "./static").index_file("index.html"))
    })
    .bind(&bind_addr)?
    .run()
    .await?;

    Ok(())
}
