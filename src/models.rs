use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub app_name: String,
    pub package_name: String,
    pub display_name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub primary_color: String,
    pub secondary_color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComponentStyles {
    pub width: Option<String>,
    pub height: Option<String>,
    pub padding: Option<String>,
    pub margin: Option<String>,
    pub background_color: Option<String>,
    pub color: Option<String>,
    pub font_size: Option<String>,
    pub font_weight: Option<String>,
    pub border_radius: Option<String>,
    pub border_width: Option<String>,
    pub border_color: Option<String>,
    pub border_top_width: Option<String>,
    pub border_top_color: Option<String>,
    pub flex: Option<i32>,
    pub flex_direction: Option<String>,
    pub justify_content: Option<String>,
    pub align_items: Option<String>,
    pub position: Option<String>,
    pub top: Option<String>,
    pub left: Option<String>,
    pub right: Option<String>,
    pub bottom: Option<String>,
    pub gap: Option<String>,
    pub box_shadow: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Component {
    pub id: String,
    pub component_type: String,
    pub props: serde_json::Value,
    pub children: Vec<Component>,
    pub styles: ComponentStyles,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Screen {
    pub id: String,
    pub name: String,
    pub components: Vec<Component>,
    pub layout: serde_json::Value,
    pub navigation: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: String,
    pub screens: Vec<Screen>,
    pub theme: serde_json::Value,
    pub config: AppConfig,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAppRequest {
    pub config: AppConfig,
    pub features: Vec<String>,
    pub project_config: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateFromTemplateRequest {
    pub app_name: String,
    pub package_name: String,
    pub display_name: String,
    pub version: String,
    pub primary_color: String,
    pub project_config: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: String,
    pub config: AppConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub screens: Option<Vec<Screen>>,
    pub theme: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppResponse {
    pub app_id: String,
    pub config: AppConfig,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub expo_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectResponse {
    pub id: String,
    pub name: String,
    pub description: String,
    pub screens: Vec<Screen>,
    pub config: AppConfig,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BuildRequest {
    pub platform: String, // "android" or "ios"
    pub app_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BuildResponse {
    pub build_id: String,
    pub app_id: String,
    pub platform: String,
    pub status: String,
    pub download_url: Option<String>,
    pub qr_code: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BuildStatusResponse {
    pub build_id: String,
    pub app_id: String,
    pub platform: String,
    pub status: String,
    pub message: String,
    pub download_url: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

// ── New Normalized Schema Types ────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSetting {
    pub key: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageData {
    pub id: String,
    pub page_id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub attributes: serde_json::Value,
    pub is_published: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BlockData {
    pub id: Option<String>,
    pub client_id: String,
    pub name: String,
    pub attributes: serde_json::Value,
    pub parent_id: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BlockDefinition {
    pub id: Option<String>,
    pub name: String,
    pub label: String,
    pub category: String,
    pub icon: String,
    pub schema: serde_json::Value,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NavigationConfig {
    pub id: Option<String>,
    #[serde(rename = "type")]
    pub type_: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PublishedConfig {
    pub id: String,
    pub version: String,
    pub config: serde_json::Value,
    pub published_at: String,
    pub is_current: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MediaItem {
    pub id: Option<String>,
    pub url: String,
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub alt_text: String,
}

// ── Config API Response (fetched by mobile runtime) ───────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfigResponse {
    pub version: String,
    pub project: ConfigProject,
    pub settings: serde_json::Value,
    pub pages: serde_json::Value,       // Map<page_id, PageConfig>
    pub navigation: serde_json::Value,  // NavigationConfig
    pub theme: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfigProject {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub store_url: String,
    pub slug: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageConfig {
    pub attributes: serde_json::Value,
    pub blocks: Vec<BlockData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PublishRequest {
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PublishResponse {
    pub version: String,
    pub published_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSettingRequest {
    pub key: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePageRequest {
    pub page_id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub type_: Option<String>,
    pub attributes: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePageRequest {
    pub title: Option<String>,
    pub attributes: Option<serde_json::Value>,
    pub is_published: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBlockRequest {
    pub page_id: String,
    pub client_id: String,
    pub name: String,
    pub attributes: Option<serde_json::Value>,
    pub parent_id: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateBlockRequest {
    pub name: Option<String>,
    pub attributes: Option<serde_json::Value>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpsertNavigationRequest {
    #[serde(rename = "type")]
    pub type_: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMediaRequest {
    pub url: String,
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub alt_text: String,
}
