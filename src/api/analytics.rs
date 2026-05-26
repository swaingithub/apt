use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;

use crate::db::Database;
use crate::models::ErrorResponse;
use super::{get_user_id, check_app_owner};

fn generate_sample_analytics(_app_id: &str) -> serde_json::Value {
    let now = Utc::now();

    let dau_values: Vec<i64> = vec![182, 215, 168, 243, 197, 289, 174, 312, 228, 156, 245, 278, 201, 167, 190, 234, 178, 256, 210, 298, 185, 320, 240, 165, 252, 285, 208, 172, 310, 195];
    let sessions_per_day: Vec<i64> = vec![45, 62, 38, 71, 55, 83, 49, 92, 58, 44, 67, 81, 53, 39, 48, 65, 42, 76, 58, 88, 51, 96, 62, 47, 70, 85, 56, 43, 90, 52];
    let crashes_per_day: Vec<i64> = vec![2, 0, 1, 3, 0, 1, 0, 2, 1, 0, 0, 1, 2, 0, 1, 0, 0, 2, 0, 1, 1, 0, 1, 0, 0, 2, 0, 1, 0, 0];

    serde_json::json!({
        "usage": {
            "dailyActiveUsers": dau_values.last().copied().unwrap_or(0),
            "monthlyActiveUsers": 8452,
            "totalSessions": 28341,
            "avgSessionDuration": 342,
            "newUsersLast7d": 567,
            "sessionsPerDay": sessions_per_day,
            "dauPerDay": dau_values,
        },
        "crashes": {
            "totalCrashes": 23,
            "crashFreeRate": 99.2,
            "affectedUsers": 19,
            "crashesPerDay": crashes_per_day,
            "topCrashes": [
                {"error": "TypeError: Cannot read property 'map' of undefined", "count": 8, "version": "1.0.4", "lastSeen": (now - chrono::Duration::hours(6)).to_rfc3339()},
                {"error": "NullPointerException in HomeScreen.render", "count": 5, "version": "1.0.3", "lastSeen": (now - chrono::Duration::days(3)).to_rfc3339()},
                {"error": "Network request failed at ProductsScreen", "count": 4, "version": "1.0.4", "lastSeen": (now - chrono::Duration::days(2)).to_rfc3339()},
                {"error": "RangeError: Maximum call stack size exceeded", "count": 3, "version": "1.0.2", "lastSeen": (now - chrono::Duration::days(5)).to_rfc3339()},
                {"error": "Invariant Violation: requireNativeComponent", "count": 3, "version": "1.0.4", "lastSeen": (now - chrono::Duration::days(6)).to_rfc3339()}
            ],
        },
        "engagement": {
            "retentionDay1": 42.3,
            "retentionDay7": 18.7,
            "retentionDay30": 8.2,
            "avgSessionPerUser": 4.2,
            "totalScreenViews": 89234,
            "topScreens": [
                {"screen": "Home", "views": 12431, "percentage": 28.4},
                {"screen": "Products", "views": 8923, "percentage": 20.4},
                {"screen": "Cart", "views": 6542, "percentage": 14.9},
                {"screen": "Profile", "views": 4321, "percentage": 9.9},
                {"screen": "Settings", "views": 2987, "percentage": 6.8}
            ],
            "topEvents": [
                {"event": "purchase_completed", "count": 1234, "trend": "up"},
                {"event": "add_to_cart", "count": 3456, "trend": "up"},
                {"event": "share_content", "count": 892, "trend": "down"},
                {"event": "search", "count": 5678, "trend": "stable"},
                {"event": "sign_up", "count": 456, "trend": "up"}
            ]
        },
        "generatedAt": now.to_rfc3339(),
        "sdkVersion": "1.0.0",
    })
}

pub async fn get_analytics(
    req: HttpRequest,
    path: web::Path<String>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let user_id = get_user_id(&req);

    match check_app_owner(&db, &app_id, &user_id) {
        Ok(_) => {}
        Err(resp) => return resp,
    }

    match db.get_analytics(&app_id) {
        Ok(Some(data)) => {
            HttpResponse::Ok().json(data)
        }
        Ok(None) => {
            let sample = generate_sample_analytics(&app_id);
            let _ = db.set_analytics(&app_id, &sample);
            HttpResponse::Ok().json(sample)
        }
        Err(e) => HttpResponse::InternalServerError().json(ErrorResponse {
            error: "query_failed".to_string(),
            message: e,
        }),
    }
}
