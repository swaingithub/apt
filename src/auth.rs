use actix_web::{web, HttpRequest, HttpResponse};
use anyhow::Result;
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand::Rng;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::Database;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
    #[serde(default)]
    pub device_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub name: String,
}

fn generate_jwt_secret() -> String {
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()"
        .chars()
        .collect();
    (0..64).map(|_| chars[rng.gen_range(0..chars.len())]).collect()
}

lazy_static::lazy_static! {
    static ref JWT_SECRET: String = std::env::var("JWT_SECRET").unwrap_or_else(|_| generate_jwt_secret());
}

fn create_token(user_id: &str, email: &str) -> Result<String> {
    let now = Utc::now().timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        exp: now + 86400 * 7,
        iat: now,
    };
    Ok(encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET.as_bytes()),
    )?)
}

fn verify_token(token: &str) -> Result<Claims> {
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET.as_bytes()),
        &Validation::default(),
    )?;
    Ok(data.claims)
}

pub fn extract_user_id(req: &HttpRequest) -> Option<String> {
    let auth_header = req
        .headers()
        .get("Authorization")?
        .to_str()
        .ok()?;

    if !auth_header.starts_with("Bearer ") {
        return None;
    }

    let token = &auth_header[7..];
    match verify_token(token) {
        Ok(claims) => Some(claims.sub),
        Err(_) => None,
    }
}

pub fn require_auth(req: &HttpRequest) -> actix_web::Result<String> {
    extract_user_id(req).ok_or_else(|| {
        actix_web::error::ErrorUnauthorized(serde_json::json!({
            "error": "unauthorized",
            "message": "Missing or invalid token"
        }))
    })
}

pub async fn register(
    db: web::Data<Database>,
    body: web::Json<RegisterRequest>,
) -> actix_web::Result<HttpResponse> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    if body.email.is_empty() || body.password.len() < 6 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "validation_error",
            "message": "Email required and password must be at least 6 characters"
        })));
    }

    let hash = bcrypt::hash(&body.password, bcrypt::DEFAULT_COST).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Hash failed: {}", e))
    })?;

    match db.create_user(&id, &body.email, &hash, &body.name, &now) {
        Ok(_) => {
            // Claim anonymous apps for this device
            if let Some(ref device_id) = body.device_id {
                if !device_id.is_empty() {
                    let _ = db.migrate_anonymous_apps(device_id, &id);
                }
            }
            let token = create_token(&id, &body.email).map_err(|e| {
                actix_web::error::ErrorInternalServerError(format!("Token failed: {}", e))
            })?;
            Ok(HttpResponse::Created().json(AuthResponse {
                token,
                user: UserResponse {
                    id,
                    email: body.email.clone(),
                    name: body.name.clone(),
                },
            }))
        }
        Err(e) => {
            if e.to_string().contains("UNIQUE") {
                Ok(HttpResponse::Conflict().json(serde_json::json!({
                    "error": "email_exists",
                    "message": "Email already registered"
                })))
            } else {
                Err(actix_web::error::ErrorInternalServerError(e.to_string()))
            }
        }
    }
}

pub async fn login(
    db: web::Data<Database>,
    body: web::Json<LoginRequest>,
) -> actix_web::Result<HttpResponse> {
    let user = db.get_user_by_email(&body.email).map_err(|e| {
        actix_web::error::ErrorInternalServerError(e.to_string())
    })?;

    match user {
        Some((id, email, hash, name)) => {
            let valid = bcrypt::verify(&body.password, &hash).unwrap_or(false);
            if !valid {
                return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
                    "error": "invalid_credentials",
                    "message": "Invalid email or password"
                })));
            }

            let token = create_token(&id, &email).map_err(|e| {
                actix_web::error::ErrorInternalServerError(format!("Token failed: {}", e))
            })?;

            Ok(HttpResponse::Ok().json(AuthResponse {
                token,
                user: UserResponse { id, email, name },
            }))
        }
        None => Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "invalid_credentials",
            "message": "Invalid email or password"
        }))),
    }
}

pub async fn me(
    req: HttpRequest,
    db: web::Data<Database>,
) -> actix_web::Result<HttpResponse> {
    let user_id = require_auth(&req)?;
    let user = db.get_user_by_id(&user_id).map_err(|e| {
        actix_web::error::ErrorInternalServerError(e.to_string())
    })?;

    match user {
        Some((id, email, name)) => Ok(HttpResponse::Ok().json(UserResponse { id, email, name })),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "user_not_found",
            "message": "User not found"
        }))),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub email: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

pub async fn put_profile(
    req: HttpRequest,
    db: web::Data<Database>,
    body: web::Json<UpdateProfileRequest>,
) -> actix_web::Result<HttpResponse> {
    let user_id = require_auth(&req)?;
    let user = db.get_user_by_id(&user_id).map_err(|e| {
        actix_web::error::ErrorInternalServerError(e.to_string())
    })?;
    let (_, current_email, current_name) = user.ok_or_else(|| {
        actix_web::error::ErrorNotFound(serde_json::json!({
            "error": "user_not_found",
            "message": "User not found"
        }))
    })?;

    let new_email = body.email.clone().unwrap_or(current_email);
    let new_name = body.name.clone().unwrap_or(current_name);

    db.update_user(&user_id, &new_email, &new_name).map_err(|e| {
        actix_web::error::ErrorInternalServerError(e.to_string())
    })?;

    let token = create_token(&user_id, &new_email).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Token failed: {}", e))
    })?;

    Ok(HttpResponse::Ok().json(AuthResponse {
        token,
        user: UserResponse {
            id: user_id,
            email: new_email,
            name: new_name,
        },
    }))
}

pub async fn put_password(
    req: HttpRequest,
    db: web::Data<Database>,
    body: web::Json<ChangePasswordRequest>,
) -> actix_web::Result<HttpResponse> {
    let user_id = require_auth(&req)?;

    let hash = {
        let conn = db.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT password_hash FROM users WHERE id = ?1").map_err(|e| {
            actix_web::error::ErrorInternalServerError(e.to_string())
        })?;
        let h: String = stmt.query_row(rusqlite::params![&user_id], |row| row.get(0)).map_err(|_| {
            actix_web::error::ErrorNotFound(serde_json::json!({
                "error": "user_not_found",
            }))
        })?;
        h
    };

    let valid = bcrypt::verify(&body.current_password, &hash).unwrap_or(false);
    if !valid {
        return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "invalid_password",
            "message": "Current password is incorrect"
        })));
    }

    if body.new_password.len() < 6 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "validation_error",
            "message": "New password must be at least 6 characters"
        })));
    }

    let new_hash = bcrypt::hash(&body.new_password, bcrypt::DEFAULT_COST).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Hash failed: {}", e))
    })?;

    db.update_password(&user_id, &new_hash).map_err(|e| {
        actix_web::error::ErrorInternalServerError(e.to_string())
    })?;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Password changed" })))
}

pub async fn delete_account(
    req: HttpRequest,
    db: web::Data<Database>,
) -> actix_web::Result<HttpResponse> {
    let user_id = require_auth(&req)?;
    db.delete_user(&user_id).map_err(|e| {
        actix_web::error::ErrorInternalServerError(e.to_string())
    })?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Account deleted" })))
}

pub async fn firebase_sync(
    db: web::Data<Database>,
    body: web::Json<serde_json::Value>,
) -> actix_web::Result<HttpResponse> {
    let email = body.get("email").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
    let uid = body.get("uid").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();

    if email.is_empty() || uid.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "validation_error",
            "message": "Email and uid required"
        })));
    }

    let now = Utc::now().to_rfc3339();
    let existing_user = db.get_user_by_email(&email).map_err(|e| {
        actix_web::error::ErrorInternalServerError(e.to_string())
    })?;

    let final_id = match existing_user {
        Some((id, _, _, _)) => id,
        None => {
            db.create_user(&uid, &email, "firebase_managed", &name, &now).map_err(|e| {
                actix_web::error::ErrorInternalServerError(e.to_string())
            })?;
            uid
        }
    };

    let token = create_token(&final_id, &email).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Token failed: {}", e))
    })?;

    let name_str = if name.is_empty() { email.split('@').next().unwrap_or("").to_string() } else { name };

    Ok(HttpResponse::Ok().json(AuthResponse {
        token,
        user: UserResponse {
            id: final_id,
            email,
            name: name_str,
        },
    }))
}
