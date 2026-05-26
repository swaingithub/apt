use actix_web::{web, HttpRequest, HttpResponse};
use crate::auth;
use crate::db::Database;
use serde::Deserialize;
use chrono::Utc;
use uuid::Uuid;

fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn render_locales_table(app_id: &str, locales: &[serde_json::Value]) -> String {
    let mut rows = String::new();
    for (idx, loc) in locales.iter().enumerate() {
        let code = loc["code"].as_str().unwrap_or("??");
        let name = loc["name"].as_str().unwrap_or("Untitled");
        let progress = loc["progress"].as_i64().unwrap_or(0);
        rows.push_str(&format!(
"    <tr style=\"border-bottom:1px solid var(--border);\" id=\"locale-{idx}\">
      <td style=\"padding:20px 24px;font-weight:600;display:flex;align-items:center;gap:12px;\">
        <div style=\"width:24px;height:24px;border-radius:50%;background:var(--bg-input);color:var(--text);display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;\">{code_upper}</div>
        {name_esc}
      </td>
      <td style=\"padding:20px 24px;color:var(--text-secondary);font-family:monospace;font-size:0.9rem;\">{code_esc}</td>
      <td style=\"padding:20px 24px;\">
        <div style=\"display:flex;align-items:center;gap:12px;\">
          <div style=\"flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;box-shadow:inset 0 1px 2px var(--bg-input);\">
            <div style=\"height:100%;width:{progress}%;background:var(--primary);border-radius:4px;\"></div>
          </div>
          <span style=\"font-size:0.85rem;font-weight:600;color:var(--primary);width:40px;\">{progress}%</span>
        </div>
      </td>
      <td style=\"padding:20px 24px;text-align:right;\">
        <button class=\"btn\" style=\"padding:8px 16px;font-size:0.85rem;border-radius:8px;background:var(--bg-hover);border:1px solid var(--border);color:var(--text);\"
          hx-get=\"/hx/apps/{app_id}/languages/{idx}/edit\"
          hx-target=\"#locale-{idx}\" hx-swap=\"outerHTML\">Edit</button>
        <button class=\"btn\" style=\"padding:8px 12px;font-size:0.85rem;border-radius:8px;background:transparent;border:1px solid transparent;color:var(--text-muted);\"
          hx-delete=\"/hx/apps/{app_id}/languages/{idx}\"
          hx-target=\"#languages-table-body\" hx-swap=\"outerHTML\"
          hx-confirm=\"Delete this language?\">✕</button>
      </td>
    </tr>",
            idx = idx,
            app_id = app_id,
            code_upper = code.to_uppercase(),
            name_esc = esc(name),
            code_esc = esc(code),
            progress = progress,
        ));
    }
    format!("<tbody id=\"languages-table-body\">{}</tbody>", rows)
}

fn render_locale_edit_form(app_id: &str, idx: usize, code: &str, name: &str, progress: i64) -> String {
    format!(
"    <tr id=\"locale-{idx}\" style=\"border-bottom:1px solid var(--border);background:var(--bg-surface);\"
      hx-target=\"this\" hx-swap=\"outerHTML\">
      <td style=\"padding:20px 24px;font-weight:600;\" colspan=\"4\">
        <form hx-put=\"/hx/apps/{app_id}/languages/{idx}\" hx-target=\"#languages-table-body\" hx-swap=\"outerHTML\"
              style=\"display:flex;align-items:center;gap:12px;flex-wrap:wrap;\">
          <div style=\"width:24px;height:24px;border-radius:50%;background:var(--bg-input);color:var(--text);display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;\">{code_upper}</div>
          <span style=\"font-weight:600;min-width:120px;\">{name_esc}</span>
          <span style=\"color:var(--text-secondary);font-family:monospace;font-size:0.9rem;min-width:60px;\">{code_esc}</span>
          <input type=\"number\" name=\"progress\" value=\"{progress}\" min=\"0\" max=\"100\"
                 style=\"width:80px;padding:8px 12px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text);\">
          <span style=\"font-size:0.85rem;color:var(--text-secondary);\">%</span>
          <button type=\"submit\" class=\"btn\" style=\"padding:8px 16px;font-size:0.85rem;border-radius:8px;background:var(--primary);color:#fff;border:none;\">Save</button>
          <button type=\"button\" class=\"btn\" style=\"padding:8px 16px;font-size:0.85rem;border-radius:8px;background:var(--bg-hover);border:1px solid var(--border);color:var(--text);\"
            hx-get=\"/hx/apps/{app_id}/languages\" hx-target=\"#languages-table-body\" hx-swap=\"outerHTML\">Cancel</button>
        </form>
      </td>
    </tr>",
        idx = idx,
        app_id = app_id,
        code_upper = code.to_uppercase(),
        name_esc = esc(name),
        code_esc = esc(code),
        progress = progress,
    )
}

fn render_locale_add_form(app_id: &str) -> String {
    format!(
"    <tr id=\"locale-add-form\" style=\"border-bottom:1px solid var(--border);background:var(--bg-surface);\"
      hx-target=\"this\" hx-swap=\"outerHTML\">
      <td style=\"padding:20px 24px;\" colspan=\"4\">
        <form hx-post=\"/hx/apps/{app_id}/languages\" hx-target=\"#languages-table-body\" hx-swap=\"outerHTML\"
              style=\"display:flex;align-items:center;gap:12px;flex-wrap:wrap;\">
          <input type=\"text\" name=\"code\" placeholder=\"Code (e.g. fr, es)\" required
                 style=\"width:100px;padding:8px 12px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text);\">
          <input type=\"text\" name=\"name\" placeholder=\"Name (e.g. French)\" required
                 style=\"flex:1;min-width:120px;padding:8px 12px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text);\">
          <button type=\"submit\" class=\"btn\" style=\"padding:8px 16px;font-size:0.85rem;border-radius:8px;background:var(--primary);color:#fff;border:none;\">Add</button>
          <button type=\"button\" class=\"btn\" style=\"padding:8px 16px;font-size:0.85rem;border-radius:8px;background:var(--bg-hover);border:1px solid var(--border);color:var(--text);\"
            hx-get=\"/hx/apps/{app_id}/languages\" hx-target=\"#languages-table-body\" hx-swap=\"outerHTML\">Cancel</button>
        </form>
      </td>
    </tr>",
        app_id = app_id,
    )
}

fn get_app_config(db: &Database, app_id: &str) -> Result<serde_json::Value, HttpResponse> {
    match db.get_generated_app(app_id) {
        Ok(Some(app)) => {
            let config = app.get("config").and_then(|c| c.as_object()).cloned().unwrap_or_default();
            let mut cfg = serde_json::Map::new();
            cfg.insert("app_id".to_string(), serde_json::Value::String(app_id.to_string()));
            for (k, v) in &config {
                cfg.insert(k.clone(), v.clone());
            }
            Ok(serde_json::Value::Object(cfg))
        }
        Ok(None) => Err(HttpResponse::NotFound().body("App not found")),
        Err(e) => Err(HttpResponse::InternalServerError().body(e.to_string())),
    }
}

fn modify_and_save_config(
    db: &Database,
    app_id: &str,
    config: &serde_json::Map<String, serde_json::Value>,
) -> Result<(), HttpResponse> {
    let config_str = serde_json::to_string(config).map_err(|e| {
        HttpResponse::InternalServerError().body(e.to_string())
    })?;
    db.update_app_config(app_id, &config_str).map_err(|e| {
        HttpResponse::InternalServerError().body(e.to_string())
    })?;
    Ok(())
}

fn get_locales(project_config: &serde_json::Value) -> Vec<serde_json::Value> {
    project_config.get("locales")
        .and_then(|l| l.as_array())
        .cloned()
        .unwrap_or_else(|| vec![
            serde_json::json!({"code": "en", "name": "English (Default)", "progress": 100})
        ])
}

pub async fn languages_list(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let project_config = cfg.get("project_config").cloned().unwrap_or_default();
    let locales = get_locales(&project_config);
    let html = render_locales_table(&app_id, &locales);
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

#[derive(Deserialize)]
pub struct LocaleEditForm {
    progress: Option<i64>,
}

pub async fn languages_edit(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<(String, usize)>,
    form: web::Form<LocaleEditForm>,
) -> HttpResponse {
    let (app_id, idx) = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let mut config_map = cfg.as_object().cloned().unwrap_or_default();
    let mut project_config = config_map.get("project_config").cloned().unwrap_or_else(|| serde_json::json!({}));
    let mut locales = get_locales(&project_config);
    if idx < locales.len() {
        if let Some(p) = form.progress {
            let p = p.clamp(0, 100);
            if let Some(obj) = locales[idx].as_object_mut() {
                obj.insert("progress".to_string(), serde_json::Value::Number(p.into()));
            }
        }
    }
    if let Some(pc) = project_config.as_object_mut() {
        pc.insert("locales".to_string(), serde_json::Value::Array(locales.clone()));
    }
    config_map.insert("project_config".to_string(), project_config);
    if let Err(r) = modify_and_save_config(&db, &app_id, &config_map) {
        return r;
    }
    let html = render_locales_table(&app_id, &locales);
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

pub async fn languages_edit_form(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<(String, usize)>,
) -> HttpResponse {
    let (app_id, idx) = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let project_config = cfg.get("project_config").cloned().unwrap_or_default();
    let locales = get_locales(&project_config);
    if idx >= locales.len() {
        return HttpResponse::NotFound().body("Locale not found");
    }
    let loc = &locales[idx];
    let code = loc["code"].as_str().unwrap_or("??");
    let name = loc["name"].as_str().unwrap_or("Untitled");
    let progress = loc["progress"].as_i64().unwrap_or(0);
    let html = render_locale_edit_form(&app_id, idx, code, name, progress);
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

#[derive(Deserialize)]
pub struct LocaleAddForm {
    code: String,
    name: String,
}

pub async fn languages_add(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    form: web::Form<LocaleAddForm>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let mut config_map = cfg.as_object().cloned().unwrap_or_default();
    let mut project_config = config_map.get("project_config").cloned().unwrap_or_else(|| serde_json::json!({}));
    let mut locales = get_locales(&project_config);
    locales.push(serde_json::json!({
        "code": form.code.to_lowercase(),
        "name": form.name.clone(),
        "progress": 0,
    }));
    if let Some(pc) = project_config.as_object_mut() {
        pc.insert("locales".to_string(), serde_json::Value::Array(locales.clone()));
    }
    config_map.insert("project_config".to_string(), project_config);
    if let Err(r) = modify_and_save_config(&db, &app_id, &config_map) {
        return r;
    }
    let html = render_locales_table(&app_id, &locales);
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

pub async fn languages_delete(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<(String, usize)>,
) -> HttpResponse {
    let (app_id, idx) = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let mut config_map = cfg.as_object().cloned().unwrap_or_default();
    let mut project_config = config_map.get("project_config").cloned().unwrap_or_else(|| serde_json::json!({}));
    let mut locales = get_locales(&project_config);
    if idx < locales.len() {
        locales.remove(idx);
    }
    if let Some(pc) = project_config.as_object_mut() {
        pc.insert("locales".to_string(), serde_json::Value::Array(locales.clone()));
    }
    config_map.insert("project_config".to_string(), project_config);
    if let Err(r) = modify_and_save_config(&db, &app_id, &config_map) {
        return r;
    }
    let html = render_locales_table(&app_id, &locales);
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

pub async fn languages_add_form(
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let html = render_locale_add_form(&app_id);
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

#[derive(Deserialize)]
pub struct StoreCredentialsForm {
    ios_issuer_id: Option<String>,
    ios_key_id: Option<String>,
}

pub async fn store_credentials_save(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    form: web::Form<StoreCredentialsForm>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let mut config_map = cfg.as_object().cloned().unwrap_or_default();
    let mut project_config = config_map.get("project_config").cloned().unwrap_or_else(|| serde_json::json!({}));
    let mut creds = project_config.get("store_credentials").cloned().unwrap_or_else(|| serde_json::json!({}));
    if let Some(c) = creds.as_object_mut() {
        if let Some(v) = &form.ios_issuer_id { c.insert("ios_issuer_id".to_string(), serde_json::Value::String(v.clone())); }
        if let Some(v) = &form.ios_key_id { c.insert("ios_key_id".to_string(), serde_json::Value::String(v.clone())); }
    }
    if let Some(pc) = project_config.as_object_mut() {
        pc.insert("store_credentials".to_string(), creds);
    }
    config_map.insert("project_config".to_string(), project_config);
    if let Err(r) = modify_and_save_config(&db, &app_id, &config_map) {
        return r;
    }
    HttpResponse::Ok()
        .content_type("text/html")
        .body(r#"<script>toast('Store credentials saved!');</script>"#)
}

#[derive(Deserialize)]
pub struct PushSendForm {
    title: String,
    body: String,
}

pub async fn push_send(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    form: web::Form<PushSendForm>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let mut config_map = cfg.as_object().cloned().unwrap_or_default();
    let mut push_history = config_map.get("pushHistory").and_then(|h| h.as_array()).cloned().unwrap_or_default();
    push_history.insert(0, serde_json::json!({
        "title": form.title,
        "body": form.body,
        "date": chrono::Utc::now().to_rfc3339(),
    }));
    if push_history.len() > 20 { push_history.pop(); }
    let html = render_push_history(&push_history);
    config_map.insert("pushHistory".to_string(), serde_json::Value::Array(push_history));
    if let Err(r) = modify_and_save_config(&db, &app_id, &config_map) {
        return r;
    }
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

fn render_push_history(history: &[serde_json::Value]) -> String {
    if history.is_empty() {
        return r#"<div id="pushHistoryContainer"><div class="empty-state" style="padding:40px 20px;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color:var(--text-muted);margin-bottom:12px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p style="margin:0;">No recent history.</p></div></div>"#.to_string();
    }
    let mut html = String::from(r#"<div id="pushHistoryContainer">"#);
    for item in history.iter().take(10) {
        let title = esc(item["title"].as_str().unwrap_or(""));
        let body = esc(item["body"].as_str().unwrap_or(""));
        let date = item["date"].as_str().unwrap_or("");
        let display_date = if date.len() >= 16 { &date[..16].replace("T", " ") } else { date };
        html.push_str(&format!(
            r#"<div style="border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px;background:var(--bg-panel);">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                <div style="font-weight:600;font-size:0.9rem;">{}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap;margin-left:12px;">{}</div>
              </div>
              <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.4;">{}</div>
            </div>"#, title, display_date, body
        ));
    }
    html.push_str("</div>");
    html
}

#[derive(Deserialize)]
pub struct AppSettingsForm {
    app_name: String,
    display_name: Option<String>,
    package_name: Option<String>,
    version: Option<String>,
}

pub async fn app_settings_save(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    form: web::Form<AppSettingsForm>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let mut config_map = cfg.as_object().cloned().unwrap_or_default();
    config_map.insert("app_name".to_string(), serde_json::Value::String(form.app_name.clone()));
    config_map.insert("display_name".to_string(), serde_json::Value::String(
        form.display_name.clone().unwrap_or_else(|| form.app_name.clone())
    ));
    config_map.insert("package_name".to_string(), serde_json::Value::String(
        form.package_name.clone().unwrap_or_else(|| "com.example.app".to_string())
    ));
    config_map.insert("version".to_string(), serde_json::Value::String(
        form.version.clone().unwrap_or_else(|| "1.0.0".to_string())
    ));
    if let Err(r) = modify_and_save_config(&db, &app_id, &config_map) {
        return r;
    }
    let html = format!(r#"<div id="app-settings-result"
      hx-swap-oob="true"
      hx-trigger="load"
      hx-get="/hx/apps/{}/app-header"
    ></div>
    <script>toast('Settings saved!');</script>"#, app_id);
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

pub async fn app_header_fragment(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let name = cfg.get("display_name").and_then(|v| v.as_str()).unwrap_or("App");
    let app_name = cfg.get("app_name").and_then(|v| v.as_str()).unwrap_or("app");
    let version = cfg.get("version").and_then(|v| v.as_str()).unwrap_or("1.0.0");
    let initial = name.chars().next().map(|c| c.to_uppercase().to_string()).unwrap_or_else(|| "?".to_string());
    let name_esc = esc(name);
    let app_name_esc = esc(app_name);

    let html = format!(r#"
<span id="dashTitle" style="display:none;">{name_esc}</span>
<span id="dashVersion" style="display:none;">v{version}</span>
<span id="dashAvatar" style="display:none;">{initial}</span>
<span id="dashName" style="display:none;">{name_esc}</span>
<span id="dashSlug" style="display:none;">{app_name_esc}</span>
<script>document.title = '{name_esc} — App Dashboard';</script>
"#);
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

#[derive(Deserialize)]
pub struct ThemeSettingsForm {
    primary_color: Option<String>,
    font_family: Option<String>,
    border_radius: Option<i64>,
}

pub async fn theme_settings_save(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    form: web::Form<ThemeSettingsForm>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let mut config_map = cfg.as_object().cloned().unwrap_or_default();
    let mut project_config = config_map.get("project_config").cloned().unwrap_or_else(|| serde_json::json!({}));
    let mut theme = project_config.get("theme").cloned().unwrap_or_else(|| serde_json::json!({}));
    if let Some(t) = theme.as_object_mut() {
        if let Some(c) = &form.primary_color {
            t.insert("primaryColor".to_string(), serde_json::Value::String(c.clone()));
        }
        if let Some(f) = &form.font_family {
            t.insert("fontFamily".to_string(), serde_json::Value::String(f.clone()));
        }
        if let Some(r) = form.border_radius {
            t.insert("borderRadius".to_string(), serde_json::Value::Number(r.into()));
        }
    }
    if let Some(pc) = project_config.as_object_mut() {
        pc.insert("theme".to_string(), theme);
    }
    config_map.insert("project_config".to_string(), project_config);
    if let Err(r) = modify_and_save_config(&db, &app_id, &config_map) {
        return r;
    }
    HttpResponse::Ok()
        .content_type("text/html")
        .body(r#"<script>toast('Theme settings saved!'); renderOverview();</script>"#)
}

// ── Billing & Subscription ──

fn esc_plan(plan: &str) -> String {
    match plan {
        "Free" | "Pro" => plan.to_string(),
        _ => "Free".to_string(),
    }
}

fn render_billing_plans(plan: &str, app_id: &str) -> String {
    let plan = esc_plan(plan);
    let is_free = plan == "Free";
    let downgrade_url = format!("/hx/apps/{}/billing", app_id);
    let free_btn = if is_free {
        r##"<button class="btn btn-outline" disabled style="width:100%;justify-content:center;padding:14px;font-size:1rem;font-weight:600;border-radius:12px;opacity:0.6;">Active Plan</button>"##.to_string()
    } else {
        format!(r##"<button class="btn btn-outline" hx-put="{}" hx-vals='{{"plan_tier":"Free"}}' hx-target="#billingPlansContainer" hx-swap="outerHTML" hx-confirm="Downgrade to Standard Plan?" style="width:100%;justify-content:center;padding:14px;font-size:1rem;font-weight:600;border-radius:12px;border:1px solid rgba(255,255,255,0.2);">Downgrade to Standard</button>"##, downgrade_url)
    };
    let pro_btn = if !is_free {
        format!(r##"<button class="btn btn-outline" hx-put="{}" hx-vals='{{"plan_tier":"Free"}}' hx-target="#billingPlansContainer" hx-swap="outerHTML" hx-confirm="Are you sure you want to cancel your Pro plan subscription? You will lose access to premium developer features." style="width:100%;justify-content:center;padding:14px;font-size:1rem;font-weight:600;border-radius:12px;">Cancel Subscription</button>"##, downgrade_url)
    } else {
        r##"<button class="btn btn-primary" onclick="openBillingPortal()" style="width:100%;justify-content:center;padding:14px;font-size:1rem;font-weight:600;border-radius:12px;box-shadow:0 6px 20px rgba(99,102,241,0.4);border:none;">Upgrade to Pro</button>"##.to_string()
    };
    format!(r##"
<div id="billingPlansContainer" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
  <div class="section-card" style="margin-top:0;border:1px solid {free_border};background:var(--bg-surface);border-radius:20px;position:relative;overflow:hidden;">
    {free_badge}
    <div class="section-card-body" style="padding:40px 32px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
        <div style="width:48px;height:48px;border-radius:12px;background:var(--bg-hover);color:var(--text);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
        <h3 style="margin:0;font-size:1.5rem;font-weight:700;letter-spacing:-0.01em;">Standard Plan</h3>
      </div>
      <div style="font-size:3rem;font-weight:800;margin-bottom:8px;letter-spacing:-0.03em;color:var(--text);">$0<span style="font-size:1.2rem;font-weight:600;color:var(--text-secondary);">/mo</span></div>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin:0 0 32px;line-height:1.5;">Free forever. Perfect for getting started.</p>
      <ul style="list-style:none;padding:0;margin:0 0 32px;font-size:0.95rem;display:flex;flex-direction:column;gap:16px;">
        <li style="display:flex;align-items:center;gap:12px;color:var(--text-secondary);"><div style="background:var(--bg-hover);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Up to 3 Pages</span></li>
        <li style="display:flex;align-items:center;gap:12px;color:var(--text-secondary);"><div style="background:var(--bg-hover);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Standard Preview</span></li>
        <li style="display:flex;align-items:center;gap:12px;color:var(--text-secondary);"><div style="background:var(--bg-hover);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Standard Themes</span></li>
      </ul>
      {free_btn}
    </div>
  </div>
  <div class="section-card" style="margin-top:0;border:1px solid {pro_border};background:var(--bg-surface);box-shadow:{pro_shadow};border-radius:20px;position:relative;overflow:hidden;">
    {pro_badge}
    <div class="section-card-body" style="padding:40px 32px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(99,102,241,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 1px rgba(255,255,255,0.2);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </div>
        <h3 style="margin:0;font-size:1.5rem;font-weight:700;letter-spacing:-0.01em;text-shadow:0 2px 4px var(--bg-input);">Pro Plan</h3>
      </div>
      <div style="font-size:3rem;font-weight:800;margin-bottom:8px;letter-spacing:-0.03em;color:var(--text);">$29<span style="font-size:1.2rem;font-weight:600;color:var(--text-secondary);">/mo</span></div>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin:0 0 32px;line-height:1.5;">Billed monthly. Complete developer platform access.</p>
      <ul style="list-style:none;padding:0;margin:0 0 32px;font-size:0.95rem;display:flex;flex-direction:column;gap:16px;">
        <li style="display:flex;align-items:center;gap:12px;"><div style="background:rgba(99,102,241,0.2);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Unlimited Pages & Custom Blocks</span></li>
        <li style="display:flex;align-items:center;gap:12px;"><div style="background:rgba(99,102,241,0.2);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Unlimited OTA Updates</span></li>
        <li style="display:flex;align-items:center;gap:12px;"><div style="background:rgba(99,102,241,0.2);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Push Notifications Broadcasting</span></li>
      </ul>
      {pro_btn}
    </div>
  </div>
</div>
"##,
        free_border = if is_free { "var(--primary)" } else { "rgba(255,255,255,0.08)" },
        free_badge = if is_free { String::from(r#"<div style="position:absolute;top:20px;right:20px;background:rgba(99,102,241,0.15);color:var(--primary);border:1px solid rgba(99,102,241,0.3);font-size:0.7rem;font-weight:700;padding:6px 12px;border-radius:99px;text-transform:uppercase;letter-spacing:0.05em;">Current Plan</div>"#) } else { String::new() },
        free_btn = free_btn,
        pro_border = if !is_free { "var(--primary)" } else { "rgba(255,255,255,0.08)" },
        pro_shadow = if !is_free { "0 12px 32px rgba(99,102,241,0.15)" } else { "none" },
        pro_badge = if !is_free { String::from(r#"<div style="position:absolute;top:20px;right:20px;background:rgba(99,102,241,0.15);color:var(--primary);border:1px solid rgba(99,102,241,0.3);font-size:0.7rem;font-weight:700;padding:6px 12px;border-radius:99px;text-transform:uppercase;letter-spacing:0.05em;">Current Plan</div>"#) } else { String::new() },
        pro_btn = pro_btn,
    )
}

#[derive(Deserialize)]
pub struct BillingForm {
    plan_tier: String,
}

pub async fn billing_get(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let plan = cfg.get("plan_tier").and_then(|v| v.as_str()).unwrap_or("Free");
    HttpResponse::Ok()
        .content_type("text/html")
        .body(render_billing_plans(plan, &app_id))
}

pub async fn billing_save(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    form: web::Form<BillingForm>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let cfg = match get_app_config(&db, &app_id) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let plan = esc_plan(&form.plan_tier);
    let mut config_map = cfg.as_object().cloned().unwrap_or_default();
    config_map.insert("plan_tier".to_string(), serde_json::Value::String(plan.clone()));
    if let Err(r) = modify_and_save_config(&db, &app_id, &config_map) {
        return r;
    }
    let html = format!(
        r#"{}<script>toast('Subscription plan updated to {}!'); renderOverview();</script>"#,
        render_billing_plans(&plan, &app_id),
        plan
    );
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

// ── Reusable Blocks ──

fn render_blocks_grid(blocks: &[serde_json::Value], app_id: &str) -> String {
    let delete_url = format!("/hx/apps/{}/blocks/delete", app_id);
    let mut html = r#"<div id="blocksGrid" class="overview-grid" style="grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:24px;">"#.to_string();
    for b in blocks {
        let name = esc(b["name"].as_str().unwrap_or("Untitled"));
        let block_type = esc(b["block_type"].as_str().unwrap_or("unknown"));
        let created = b["created_at"].as_str().unwrap_or("");
        let display_date = if created.len() >= 10 { &created[..10] } else { created };
        let block_id = esc(b["id"].as_str().unwrap_or(""));
        html.push_str("<div class=\"section-card\" style=\"margin:0;border:1px solid var(--border);background:var(--bg-surface);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;\">");
        html.push_str("<div style=\"height:120px;background:var(--bg-hover);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:2.5rem;\">");
        html.push_str("<svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"/><line x1=\"3\" y1=\"9\" x2=\"21\" y2=\"9\"/></svg>");
        html.push_str("</div>");
        html.push_str("<div style=\"padding:16px 20px;flex-grow:1;display:flex;flex-direction:column;justify-content:space-between;\">");
        html.push_str("<div>");
        html.push_str(&format!("<h4 style=\"margin:0 0 6px;font-size:1.05rem;font-weight:600;\">{}</h4>", name));
        html.push_str(&format!("<p style=\"margin:0 0 16px;font-size:0.8rem;color:var(--text-secondary);\">Type: {} &bull; Saved {}</p>", block_type, display_date));
        html.push_str("</div>");
        html.push_str("<div style=\"display:flex;gap:8px;\">");
        html.push_str(&format!(
            r##"<button class="btn btn-sm btn-danger" style="padding:4px 8px;font-size:0.75rem;border-radius:6px;width:100%;justify-content:center;"
            hx-post="{}" hx-vals='{{"block_id":"{}"}}' hx-target="#blocksGrid" hx-swap="outerHTML"
            hx-confirm="Delete this reusable block template?">Delete Template</button>"##,
            delete_url, block_id
        ));
        html.push_str("</div></div></div>");
    }
    html.push_str(r#"<div class="section-card" style="margin:0;border:1px dashed rgba(255,255,255,0.2);border-radius:16px;background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:216px;cursor:pointer;" onclick="switchAppView('builder')">"#);
    html.push_str(r#"<div style="width:48px;height:48px;border-radius:50%;background:rgba(99,102,241,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;margin-bottom:12px;">"#);
    html.push_str(r#"<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>"#);
    html.push_str("</div>");
    html.push_str(r#"<span style="font-size:0.95rem;font-weight:600;color:var(--text);">Create via Canvas</span>"#);
    html.push_str(r#"<p style="margin:8px 0 0;font-size:0.75rem;color:var(--text-muted);text-align:center;padding:0 16px;">Select any block in the App Builder canvas and save as Reusable Template.</p>"#);
    html.push_str("</div>");
    html.push_str("</div>");
    html
}

fn get_reusable_blocks(db: &Database, app_id: &str) -> Vec<serde_json::Value> {
    if let Ok(settings) = db.list_settings(app_id) {
        for s in &settings {
            if s["key"].as_str() == Some("reusable_blocks") {
                return s["value"].as_array().cloned().unwrap_or_default();
            }
        }
    }
    vec![]
}

pub async fn blocks_list(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let blocks = get_reusable_blocks(&db, &app_id);
    HttpResponse::Ok()
        .content_type("text/html")
        .body(render_blocks_grid(&blocks, &app_id))
}

#[derive(Deserialize)]
pub struct BlockDeleteForm {
    block_id: String,
}

pub async fn blocks_delete(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    form: web::Form<BlockDeleteForm>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let mut blocks = get_reusable_blocks(&db, &app_id);
    blocks.retain(|b| b["id"].as_str() != Some(&form.block_id));
    let value_str = serde_json::json!(blocks).to_string();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    if let Err(e) = db.upsert_setting(&id, &app_id, "reusable_blocks", &value_str, &now) {
        return HttpResponse::InternalServerError().content_type("text/html").body(
            format!("<script>toast('Delete failed: {}', 'error');</script>", esc(&e.to_string()))
        );
    }
    let html = format!(
        r#"{}<script>toast('Template deleted successfully', 'success');</script>"#,
        render_blocks_grid(&blocks, &app_id)
    );
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

// ── Routing ──

fn render_routing_form(_app_id: &str, pages: &[serde_json::Value], routing: &serde_json::Value) -> String {
    let scheme = routing.get("scheme").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let host = routing.get("host").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let prefix = routing.get("prefix").and_then(|v| v.as_str()).unwrap_or("/").to_string();
    let page_routes = routing.get("pages").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    let mut html = String::new();
    html.push_str(r#"<div id="routingContainer">"#);
    html.push_str(r#"<div class="section-card" style="margin-top:0;border:1px solid var(--border);background:var(--bg-surface);border-radius:16px;overflow:hidden;">"#);
    html.push_str(r#"<div class="section-card-header" style="padding:20px 24px;border-bottom:1px solid var(--border);">"#);
    html.push_str(r#"<h3 style="font-size:1.1rem;font-weight:600;margin:0;">Page Routes</h3>"#);
    html.push_str(r#"</div><div style="padding:20px 24px;">"#);
    html.push_str(r#"<table style="width:100%;border-collapse:collapse;text-align:left;font-size:0.9rem;">"#);
    html.push_str(r#"<thead><tr style="border-bottom:1px solid var(--border);">"#);
    html.push_str(r#"<th style="padding:12px 16px;font-weight:600;color:var(--text-secondary);">Page</th>"#);
    html.push_str(r#"<th style="padding:12px 16px;font-weight:600;color:var(--text-secondary);">Route Path</th>"#);
    html.push_str(r#"<th style="padding:12px 16px;font-weight:600;color:var(--text-secondary);">Parameters</th>"#);
    html.push_str(r#"</tr></thead><tbody>"#);
    for page in pages {
        let page_id = page["page_id"].as_str().unwrap_or("");
        let page_name = page["attributes"]["name"].as_str().unwrap_or("Untitled");
        let existing = page_routes.iter().find(|r| r["page_id"].as_str() == Some(page_id));
        let path = existing.and_then(|r| r["path"].as_str()).unwrap_or("");
        let params = existing.and_then(|r| r["params"].as_array()).cloned().unwrap_or_default();
        let params_str = params.iter()
            .filter_map(|p| p.as_str())
            .collect::<Vec<_>>()
            .join(", ");
        let slug = page_name.to_lowercase().replace(' ', "-");
        html.push_str(r#"<tr style="border-bottom:1px solid var(--border);">"#);
        html.push_str(&format!(r#"<td style="padding:12px 16px;font-weight:500;">{}</td>"#, esc(page_name)));
        html.push_str(&format!(r#"<td style="padding:12px 16px;"><input type="text" class="form-input route-path-input" data-page-id="{}" value="{}" placeholder="/{}" style="width:100%;padding:8px 10px;font-size:0.8rem;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:monospace;"></td>"#, esc(page_id), esc(path), esc(&slug)));
        html.push_str(&format!(r#"<td style="padding:12px 16px;"><input type="text" class="form-input route-params-input" data-page-id="{}" value="{}" placeholder="id, slug (comma-separated)" style="width:100%;padding:8px 10px;font-size:0.8rem;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:monospace;"></td>"#, esc(page_id), esc(&params_str)));
        html.push_str(r#"</tr>"#);
    }
    html.push_str(r#"</tbody></table></div></div>"#);
    html.push_str(r#"<div class="section-card" style="margin-top:24px;border:1px solid var(--border);background:var(--bg-surface);border-radius:16px;overflow:hidden;">"#);
    html.push_str(r#"<div class="section-card-header" style="padding:20px 24px;border-bottom:1px solid var(--border);">"#);
    html.push_str(r#"<h3 style="font-size:1.1rem;font-weight:600;margin:0;">Deep Linking</h3>"#);
    html.push_str(r#"</div><div class="section-card-body" style="padding:24px;">"#);
    html.push_str(r#"<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">"#);

    html.push_str(r#"<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:6px;color:var(--text-secondary);">URL Scheme</label>"#);
    html.push_str(&format!(r#"<input type="text" id="routingScheme" value="{}" class="form-input" placeholder="myapp" style="width:100%;padding:10px 12px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:monospace;">"#, esc(&scheme)));
    html.push_str(r#"<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">e.g. myapp://</div></div>"#);

    html.push_str(r#"<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:6px;color:var(--text-secondary);">Universal Link Host</label>"#);
    html.push_str(&format!(r#"<input type="text" id="routingHost" value="{}" class="form-input" placeholder="app.example.com" style="width:100%;padding:10px 12px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:monospace;">"#, esc(&host)));
    html.push_str(r#"<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">e.g. app.example.com</div></div></div>"#);

    html.push_str(r#"<div style="margin-bottom:20px;"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:6px;color:var(--text-secondary);">Route Prefix</label>"#);
    html.push_str(&format!(r#"<input type="text" id="routingPrefix" value="{}" class="form-input" placeholder="/" style="width:100%;padding:10px 12px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:monospace;">"#, esc(&prefix)));
    html.push_str(r#"<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">Prefix applied to all routes (e.g. /app)</div></div>"#);

    html.push_str(r#"<div style="display:flex;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid var(--border);">"#);
    html.push_str(r#"<button class="btn btn-primary" id="saveRoutingBtn" style="padding:12px 28px;font-size:0.9rem;font-weight:600;border-radius:10px;">Save Routing Config</button>"#);
    html.push_str(r#"</div></div></div></div>"#);
    html
}

#[derive(Deserialize)]
pub struct RoutingForm {
    scheme: Option<String>,
    host: Option<String>,
    prefix: Option<String>,
    // Page-specific routes are submitted as JSON in a hidden field
    routes_json: Option<String>,
}

pub async fn routing_get(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let pages = db.list_pages(&app_id).unwrap_or_default();

    let routing = if let Ok(settings) = db.list_settings(&app_id) {
        settings.iter()
            .find(|s| s["key"].as_str() == Some("routing"))
            .and_then(|s| s.get("value").cloned())
            .unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    HttpResponse::Ok()
        .content_type("text/html")
        .body(render_routing_form(&app_id, &pages, &routing))
}

pub async fn routing_save(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
    form: web::Form<RoutingForm>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());

    let mut config = serde_json::json!({
        "scheme": form.scheme.as_deref().unwrap_or(""),
        "host": form.host.as_deref().unwrap_or(""),
        "prefix": form.prefix.as_deref().unwrap_or("/"),
    });

    // Parse page routes from JSON
    if let Some(json_str) = &form.routes_json {
        if let Ok(routes) = serde_json::from_str::<Vec<serde_json::Value>>(json_str) {
            config.as_object_mut().map(|o| o.insert("pages".to_string(), serde_json::json!(routes)));
        }
    }

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    let value_str = config.to_string();

    if let Err(e) = db.upsert_setting(&id, &app_id, "routing", &value_str, &now) {
        return HttpResponse::InternalServerError().content_type("text/html").body(
            format!("<script>toast('Save failed: {}', 'error');</script>", esc(&e.to_string()))
        );
    }

    let pages = db.list_pages(&app_id).unwrap_or_default();
    let html = format!(
        r#"{}<script>toast('Routing config saved!');</script>"#,
        render_routing_form(&app_id, &pages, &config)
    );
    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}

// ── OTA Updates ──

fn render_ota_list(_app_id: &str, versions: &[serde_json::Value]) -> String {
    if versions.is_empty() {
        return r#"<div id="otaUpdatesList"><div class="empty-state" style="padding:40px;text-align:center;color:var(--text-muted);">No OTA updates pushed yet.</div></div>"#.to_string();
    }
    let mut html = r#"<div id="otaUpdatesList">"#.to_string();
    for v in versions.iter().rev().take(20) {
        let ver = esc(v["version"].as_str().unwrap_or("?"));
        let published = v["published_at"].as_str().unwrap_or("");
        let display_date = if published.len() >= 16 {
            published[..16].replace("T", " ")
        } else {
            published.to_string()
        };
        let is_current = v["is_current"].as_bool().unwrap_or(false);
        html.push_str(&format!(
            r#"<div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:600;font-size:0.95rem;color:var(--text);">Update v{}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;">Published {} &bull; Active on 100% of devices</div>
              </div>
              {}
            </div>"#,
            ver,
            display_date,
            if is_current {
                r#"<div style="padding:4px 10px;border-radius:6px;background:rgba(16,185,129,0.1);color:#10b981;font-size:0.75rem;font-weight:600;border:1px solid rgba(16,185,129,0.2);">Active</div>"#
            } else {
                r#"<div style="padding:4px 10px;border-radius:6px;background:var(--bg-hover);color:var(--text-secondary);font-size:0.75rem;font-weight:500;border:1px solid var(--border);">Inactive</div>"#
            }
        ));
    }
    html.push_str("</div>");
    html
}

pub async fn ota_list(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let configs = match db.list_published_configs(&app_id) {
        Ok(c) => c,
        Err(_) => return HttpResponse::Ok().content_type("text/html").body(render_ota_list(&app_id, &[])),
    };
    HttpResponse::Ok()
        .content_type("text/html")
        .body(render_ota_list(&app_id, &configs))
}

pub async fn ota_trigger(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let version = format!("1.0.{}", Utc::now().timestamp());

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
            let configs = db.list_published_configs(&app_id).unwrap_or_default();
            let html = format!(
                r#"{}<script>toast('OTA Update Published successfully! v{}', 'success');</script>"#,
                render_ota_list(&app_id, &configs),
                version
            );
            HttpResponse::Ok().content_type("text/html").body(html)
        }
        Err(e) => HttpResponse::InternalServerError().content_type("text/html").body(
            format!("<script>toast('Publish failed: {}', 'error');</script>", esc(&e.to_string()))
        ),
    }
}
// ── App Dashboard ──

fn render_app_card(app: &serde_json::Value) -> String {
    let id = app["id"].as_str().unwrap_or("");
    let config = app.get("config").and_then(|c| c.as_object());
    let mut primary = "#7c5cfc".to_string();
    let mut app_name = app["app_name"].as_str().unwrap_or("App").to_string();
    let mut version = "1.0.0".to_string();
    let mut pkg_name = "-".to_string();
    let mut page_count = 0usize;
    
    if let Some(cfg) = config {
        if let Some(p) = cfg.get("primary_color").and_then(|v| v.as_str()) { primary = p.to_string(); }
        if let Some(n) = cfg.get("display_name").and_then(|v| v.as_str()) { app_name = n.to_string(); }
        else if let Some(n) = cfg.get("app_name").and_then(|v| v.as_str()) { app_name = n.to_string(); }
        if let Some(v) = cfg.get("version").and_then(|v| v.as_str()) { version = v.to_string(); }
        if let Some(p) = cfg.get("package_name").and_then(|v| v.as_str()) { pkg_name = p.to_string(); }
        if let Some(pages) = cfg.get("pages").and_then(|v| v.as_array()) { page_count = pages.len(); }
    }
    
    let created_at = app["created_at"].as_str().unwrap_or("");
    let date = if created_at.len() >= 10 { &created_at[..10] } else { created_at };
    let monogram = app_name.chars().next().map(|c| c.to_uppercase().to_string()).unwrap_or_else(|| "A".to_string());
    let page_label = if page_count == 1 { "page" } else { "pages" };

    format!(r##"
    <div class="app-card group" onclick="navigateToApp('{id}')" style="--card-primary:{primary};" id="app-card-{id}">
        <div class="app-card-glow"></div>
        <div class="app-card-inner">
            <div class="app-card-header">
                <div class="app-card-header-bg"></div>
                <div class="app-card-header-content">
                    <div class="app-card-icon">
                        <span class="app-card-monogram">{monogram}</span>
                    </div>
                    <div class="app-card-header-text">
                        <div class="app-card-header-name">{appName}</div>
                        <div class="app-card-meta">
                            <span class="app-card-tag primary-tag">v{version}</span>
                            <span class="app-card-tag pages-tag">{pageCount} {pageLabel}</span>
                        </div>
                    </div>
                </div>
                <button class="app-card-delete"
                        hx-delete="/hx/apps/{id}" 
                        hx-target="#app-card-{id}" 
                        hx-swap="outerHTML" 
                        hx-confirm="Are you sure you want to delete this app?"
                        onclick="event.stopPropagation();"
                        title="Delete app">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
            <div class="app-card-body">
                <div class="app-card-detail">
                    <div class="app-card-detail-item">
                        <div class="icon-wrapper"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
                        <span class="app-card-detail-text" title="{pkgName}">{pkgName}</span>
                    </div>
                    <div class="app-card-detail-item">
                        <div class="icon-wrapper"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                        <span class="app-card-detail-text">{date}</span>
                    </div>
                </div>
            </div>
            <div class="app-card-footer">
                <button class="btn btn-card-action btn-preview" onclick="event.stopPropagation();openPreview('{id}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <span>Preview</span>
                </button>
                <button class="btn btn-card-action btn-open" onclick="event.stopPropagation();navigateToApp('{id}')">
                    <span>Open</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
            </div>
        </div>
    </div>
    "##, id=esc(id), primary=esc(&primary), appName=esc(&app_name), version=esc(&version), pkgName=esc(&pkg_name), date=esc(date), monogram=esc(&monogram), pageCount=page_count.to_string(), pageLabel=esc(page_label))
}

pub async fn apps_list(
    _req: HttpRequest,
    db: web::Data<Database>,
) -> HttpResponse {
    match db.list_all_generated_apps() {
        Ok(apps) => {
            let mut html = String::new();
            if apps.is_empty() {
                html.push_str(r#"<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">No apps found. Create your first app above!</div>"#);
            } else {
                for app in apps {
                    html.push_str(&render_app_card(&app));
                }
            }
            HttpResponse::Ok().content_type("text/html").body(html)
        },
        Err(e) => HttpResponse::InternalServerError().content_type("text/html").body(
            format!("<div style='color:red;'>Error loading apps: {}</div>", esc(&e.to_string()))
        ),
    }
}

pub async fn apps_delete(
    req: HttpRequest,
    db: web::Data<Database>,
    path: web::Path<String>,
) -> HttpResponse {
    let _user_id = auth::extract_user_id(&req).unwrap_or_else(|| "anonymous".to_string());
    let app_id = path.into_inner();

    let zip_path = format!("./output/{}_source.zip", app_id);
    let _ = std::fs::remove_file(&zip_path);

    match db.delete_generated_app(&app_id) {
        Ok(true) => HttpResponse::Ok()
            .content_type("text/html")
            .body(r#"<script>toast('App deleted successfully', 'success');</script>"#),
        Ok(false) => HttpResponse::NotFound()
            .content_type("text/html")
            .body("<script>toast('App not found', 'error');</script>"),
        Err(e) => HttpResponse::InternalServerError()
            .content_type("text/html")
            .body(format!("<script>toast('Error: {}', 'error');</script>", esc(&e.to_string()))),
    }
}

pub fn htmx_routes(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/hx/apps", web::get().to(apps_list))
        .route("/hx/apps/{app_id}", web::delete().to(apps_delete))
        .route("/hx/apps/{app_id}/languages", web::get().to(languages_list))
        .route("/hx/apps/{app_id}/languages", web::post().to(languages_add))
        .route("/hx/apps/{app_id}/languages/add-form", web::get().to(languages_add_form))
        .route("/hx/apps/{app_id}/languages/{idx}", web::put().to(languages_edit))
        .route("/hx/apps/{app_id}/languages/{idx}", web::delete().to(languages_delete))
        .route("/hx/apps/{app_id}/languages/{idx}/edit", web::get().to(languages_edit_form))
        .route("/hx/apps/{app_id}/settings", web::put().to(app_settings_save))
        .route("/hx/apps/{app_id}/app-header", web::get().to(app_header_fragment))
        .route("/hx/apps/{app_id}/theme", web::put().to(theme_settings_save))
        .route("/hx/apps/{app_id}/store-credentials", web::put().to(store_credentials_save))
        .route("/hx/apps/{app_id}/push/send", web::post().to(push_send))
        .route("/hx/apps/{app_id}/ota", web::get().to(ota_list))
        .route("/hx/apps/{app_id}/ota/trigger", web::post().to(ota_trigger))
        .route("/hx/apps/{app_id}/billing", web::get().to(billing_get))
        .route("/hx/apps/{app_id}/billing", web::put().to(billing_save))
        .route("/hx/apps/{app_id}/blocks", web::get().to(blocks_list))
        .route("/hx/apps/{app_id}/blocks/delete", web::post().to(blocks_delete))
        .route("/hx/apps/{app_id}/routing", web::get().to(routing_get))
        .route("/hx/apps/{app_id}/routing", web::put().to(routing_save));
}
