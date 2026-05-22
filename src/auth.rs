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
