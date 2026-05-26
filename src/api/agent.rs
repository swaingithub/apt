use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::db::Database;
use crate::services::ai::{self, AiRequest};
use super::{get_user_id, check_app_owner};

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub model: Option<String>,
    pub custom_api_keys: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub reply: String,
    pub actions: Vec<ToolActionResult>,
    pub app_updated: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct ToolActionResult {
    pub tool: String,
    pub description: String,
    pub success: bool,
}

const OPENAI_CHAT_SYSTEM: &str = r##"You are an AI agent for the Apt React Native app builder. You help users build and customize mobile apps through conversation.

You have access to tools that let you view and modify the app. When the user asks you to make changes, use the appropriate tool.

## Available Block Types
- container: Section wrapper. Supports children (nested blocks). Properties: {}. Styles: backgroundColor, borderRadius, padding.
- heading: Large text. Properties: {value: "text"}. Styles: fontSize, fontWeight, textAlign, color, margin.
- text: Paragraph. Properties: {value: "text"}. Styles: fontSize, color, lineHeight, margin.
- button: Clickable button. Properties: {value: "label"}. Styles: backgroundColor, color, borderRadius, padding, alignSelf, fontWeight. Can have actions: {onClick: {type: "navigate", targetPage: "page_id"}}.
- image: Image placeholder. Properties: {src: "", placeholder: "#color"}. Styles: borderRadius, width, height.
- divider: Horizontal line. Styles: margin, backgroundColor, height.
- card: Card with children (icon, heading, text). Styles: backgroundColor, borderRadius, padding.
- grid: Grid layout with children. Properties: {gridCols: 2}. Styles: margin.
- input: Text input. Properties: {placeholder: "...", value: ""}. Styles: margin.
- icon: Emoji display. Properties: {name: "emoji"}. Styles: fontSize, margin.

## App Structure
Pages live in config.project_config.pages. Each page: {id, name, elements: [...], properties: {backgroundColor, headerTitle, headerColor, headerTextColor}}.
Theme colors: config.primary_color, config.secondary_color.
Navigation is configured separately with type (bottomTab / topTab / none) and items. Items are: [{label: "Tab Name", icon: "home|search|person|settings|star|cart", pageId: "page_id"}].
Use the set_navigation tool to configure bottom tabs, top tabs, or no navigation.

Each element has: id (auto-generated), type, label, styles: {}, properties: {}, actions: {}, children: [] (container types only).

Respond conversationally. After each action, explain what you did in 1-2 sentences."##;

const TOOL_DEFS: &str = r##"[
  {
    "type": "function",
    "function": {
      "name": "get_app_summary",
      "description": "Get a detailed summary of the current app including all pages, their elements, theme colors, and navigation config",
      "parameters": { "type": "object", "properties": {}, "required": [] }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "create_page",
      "description": "Create a new empty page in the app",
      "parameters": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "description": "Page display name" }
        },
        "required": ["name"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "delete_page",
      "description": "Delete a page from the app by its id",
      "parameters": {
        "type": "object",
        "properties": {
          "page_id": { "type": "string", "description": "The page id to delete (e.g. page_home)" }
        },
        "required": ["page_id"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "add_element",
      "description": "Add a single element to a page",
      "parameters": {
        "type": "object",
        "properties": {
          "page_id": { "type": "string", "description": "Page id to add the element to" },
          "type": { "type": "string", "enum": ["container","heading","text","button","image","divider","card","grid","input","icon"], "description": "Type of element" },
          "properties": { "type": "object", "description": "Element properties like value, placeholder, src etc" },
          "styles": { "type": "object", "description": "CSS style overrides" },
          "content": { "type": "string", "description": "Short text content for heading/text/button elements (sets properties.value)" }
        },
        "required": ["page_id", "type"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "update_element",
      "description": "Update an existing element's properties and/or styles",
      "parameters": {
        "type": "object",
        "properties": {
          "page_id": { "type": "string", "description": "Page containing the element" },
          "element_id": { "type": "string", "description": "ID of the element to update" },
          "properties": { "type": "object", "description": "New property values to merge" },
          "styles": { "type": "object", "description": "New style values to merge" }
        },
        "required": ["page_id", "element_id"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "delete_element",
      "description": "Delete an element from a page",
      "parameters": {
        "type": "object",
        "properties": {
          "page_id": { "type": "string", "description": "Page containing the element" },
          "element_id": { "type": "string", "description": "ID of the element to delete" }
        },
        "required": ["page_id", "element_id"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "update_theme",
      "description": "Update the app's theme colors",
      "parameters": {
        "type": "object",
        "properties": {
          "primary_color": { "type": "string", "description": "Primary brand color hex (e.g. #7c5cfc)" },
          "secondary_color": { "type": "string", "description": "Background/secondary color hex" }
        },
        "required": []
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "set_navigation",
      "description": "Configure the app's navigation (bottom tabs, top tabs, or none)",
      "parameters": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["bottomTab", "topTab", "none"],
            "description": "Navigation type"
          },
          "items": {
            "type": "array",
            "description": "Tab items — each tab links to a page and has a label + icon",
            "items": {
              "type": "object",
              "properties": {
                "label": { "type": "string", "description": "Tab label text" },
                "icon": { "type": "string", "description": "Icon name: home, search, person, settings, star, cart, bell, heart, mail, grid" },
                "pageId": { "type": "string", "description": "Page ID this tab navigates to" }
              },
              "required": ["label", "pageId"]
            }
          }
        },
        "required": ["type"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "add_multiple_elements",
      "description": "Add multiple elements to a page at once (for building a full page layout)",
      "parameters": {
        "type": "object",
        "properties": {
          "page_id": { "type": "string", "description": "Page id to add elements to" },
          "elements": {
            "type": "array",
            "description": "Array of element objects to add. Each element has type (required), properties, styles, children, content (shortcut for heading/text/button properties.value)",
            "items": {
              "type": "object",
              "properties": {
                "type": { "type": "string", "enum": ["container","heading","text","button","image","divider","card","grid","input","icon"] },
                "properties": { "type": "object" },
                "styles": { "type": "object" },
                "content": { "type": "string" },
                "children": { "type": "array", "items": { "type": "object" } }
              },
              "required": ["type"]
            }
          }
        },
        "required": ["page_id", "elements"]
      }
    }
  }
]"##;

fn build_app_summary(app: &Value, nav: &Option<Value>) -> String {
    let config = app.get("config").and_then(|c| c.as_object());
    let app_name = config.and_then(|c| c.get("display_name").or_else(|| c.get("app_name")))
        .and_then(|v| v.as_str()).unwrap_or("Untitled");
    let primary = config.and_then(|c| c.get("primary_color")).and_then(|v| v.as_str()).unwrap_or("#7c5cfc");
    let secondary = config.and_then(|c| c.get("secondary_color")).and_then(|v| v.as_str()).unwrap_or("#ffffff");

    let pc = config.and_then(|c| c.get("project_config")).and_then(|v| v.as_object());
    let pages = pc.and_then(|p| p.get("pages")).and_then(|v| v.as_array()).cloned().unwrap_or_default();

    let mut summary = format!("App: **{}** (primary: {}, secondary: {})\n\n", app_name, primary, secondary);
    summary.push_str(&format!("**{} pages:**\n", pages.len()));
    for p in &pages {
        let name = p["name"].as_str().unwrap_or("?");
        let pid = p["id"].as_str().unwrap_or("?");
        let count = p["elements"].as_array().map(|e| e.len()).unwrap_or(0);
        summary.push_str(&format!("- **{}** (`{}`) — {} elements\n", name, pid, count));
    }

    if let Some(n) = nav {
        let nav_type = n["type"].as_str().unwrap_or("none");
        let items = n["config"].as_array().map(|a| a.len()).unwrap_or(0);
        summary.push_str(&format!("\nNavigation: **{}** with **{}** tabs\n", nav_type, items));
        if let Some(tabs) = n["config"].as_array() {
            for tab in tabs {
                let label = tab["label"].as_str().unwrap_or("?");
                let page_id = tab["pageId"].as_str().unwrap_or("?");
                summary.push_str(&format!("- {} → `{}`\n", label, page_id));
            }
        }
    } else {
        summary.push_str("\nNavigation: none configured\n");
    }

    let integrations = pc.and_then(|p| p.get("_integrations")).and_then(|v| v.as_object());
    if let Some(integ) = integrations {
        let enabled: Vec<&str> = integ.iter()
            .filter(|(_, v)| v.get("enabled").and_then(|e| e.as_bool()).unwrap_or(false))
            .map(|(k, _)| k.as_str())
            .collect();
        if !enabled.is_empty() {
            summary.push_str(&format!("\nEnabled integrations: {}\n", enabled.join(", ")));
        }
    }

    summary
}

fn generate_element_id(counter: &mut u32) -> String {
    *counter += 1;
    format!("b_{}", counter)
}

fn make_element(el_def: &Value, counter: &mut u32) -> Value {
    let el_type = el_def["type"].as_str().unwrap_or("text");
    let content = el_def.get("content").and_then(|c| c.as_str());
    let children = el_def.get("children").and_then(|c| c.as_array()).cloned().unwrap_or_default();

    let mut el = json!({
        "id": generate_element_id(counter),
        "type": el_type,
        "label": el_type,
        "styles": el_def.get("styles").cloned().unwrap_or(json!({})),
        "properties": el_def.get("properties").cloned().unwrap_or(json!({})),
        "actions": json!({}),
    });

    let has_children = matches!(el_type, "container" | "grid" | "card");
    if has_children {
        let child_els: Vec<Value> = children.iter().map(|c| make_element(c, counter)).collect();
        el["children"] = json!(child_els);
    }

    if let Some(text) = content {
        if !text.is_empty() {
            match el_type {
                "heading" | "text" | "button" => {
                    el["properties"]["value"] = json!(text);
                }
                _ => {}
            }
        }
    }

    el
}

fn build_page_structure(name: &str, _counter: &mut u32) -> Value {
    let page_id = format!("page_{}", name.to_lowercase().replace(" ", "_"));
    json!({
        "id": page_id,
        "name": name,
        "properties": {
            "backgroundColor": "#f1f5f9",
            "headerTitle": name,
            "headerColor": "#ffffff",
            "headerTextColor": "#0f172a"
        },
        "elements": []
    })
}

fn execute_tool(
    tool_name: &str,
    args: &Value,
    app: &mut Value,
    nav: &mut Option<Value>,
    counter: &mut u32,
) -> ToolActionResult {
    match tool_name {
        "get_app_summary" => {
            let summary = build_app_summary(app, nav);
            ToolActionResult {
                tool: "get_app_summary".into(),
                description: summary,
                success: true,
            }
        }
        "create_page" => {
            let name = args["name"].as_str().unwrap_or("New Page");
            let new_page = build_page_structure(name, counter);
            ensure_pages(app).push(new_page);
            ToolActionResult {
                tool: "create_page".into(),
                description: format!("Created page **{}**", name),
                success: true,
            }
        }
        "delete_page" => {
            let page_id = args["page_id"].as_str().unwrap_or("");
            if page_id.is_empty() {
                return ToolActionResult {
                    tool: "delete_page".into(),
                    description: "No page_id provided".into(),
                    success: false,
                };
            }
            let pages = ensure_pages(app);
            let before = pages.len();
            pages.retain(|p| p["id"].as_str().unwrap_or("") != page_id);
            if pages.len() < before {
                ToolActionResult {
                    tool: "delete_page".into(),
                    description: format!("Deleted page **{}**", page_id),
                    success: true,
                }
            } else {
                ToolActionResult {
                    tool: "delete_page".into(),
                    description: format!("Page **{}** not found", page_id),
                    success: false,
                }
            }
        }
        "add_element" => {
            let page_id = args["page_id"].as_str().unwrap_or("");
            let el_type = args["type"].as_str().unwrap_or("text");
            let content = args.get("content").and_then(|c| c.as_str());
            let pages = ensure_pages(app);
            if let Some(page) = pages.iter_mut().find(|p| p["id"].as_str().unwrap_or("") == page_id) {
                let elements = ensure_elements(page);
                let mut el = json!({
                    "id": generate_element_id(counter),
                    "type": el_type,
                    "label": el_type,
                    "styles": args.get("styles").cloned().unwrap_or(json!({})),
                    "properties": args.get("properties").cloned().unwrap_or(json!({})),
                    "actions": json!({}),
                });
                if let Some(text) = content {
                    if !text.is_empty() {
                        match el_type {
                            "heading" | "text" | "button" => {
                                el["properties"]["value"] = json!(text);
                            }
                            _ => {}
                        }
                    }
                }
                elements.push(el);
                ToolActionResult {
                    tool: "add_element".into(),
                    description: format!("Added **{}** element to page **{}**", el_type, page_id),
                    success: true,
                }
            } else {
                ToolActionResult {
                    tool: "add_element".into(),
                    description: format!("Page **{}** not found", page_id),
                    success: false,
                }
            }
        }
        "add_multiple_elements" => {
            let page_id = args["page_id"].as_str().unwrap_or("");
            let elements = args["elements"].as_array().cloned().unwrap_or_default();
            if elements.is_empty() {
                return ToolActionResult {
                    tool: "add_multiple_elements".into(),
                    description: "No elements provided".into(),
                    success: false,
                };
            }
            let pages = ensure_pages(app);
            if let Some(page) = pages.iter_mut().find(|p| p["id"].as_str().unwrap_or("") == page_id) {
                let target = ensure_elements(page);
                let count = elements.len();
                for el_def in &elements {
                    target.push(make_element(el_def, counter));
                }
                ToolActionResult {
                    tool: "add_multiple_elements".into(),
                    description: format!("Added **{}** elements to page **{}**", count, page_id),
                    success: true,
                }
            } else {
                ToolActionResult {
                    tool: "add_multiple_elements".into(),
                    description: format!("Page **{}** not found", page_id),
                    success: false,
                }
            }
        }
        "update_element" => {
            let page_id = args["page_id"].as_str().unwrap_or("");
            let element_id = args["element_id"].as_str().unwrap_or("");
            let pages = ensure_pages(app);
            if let Some(page) = pages.iter_mut().find(|p| p["id"].as_str().unwrap_or("") == page_id) {
                let els = ensure_elements(page);
                if let Some(el) = els.iter_mut().find(|e| e["id"].as_str().unwrap_or("") == element_id) {
                    if let Some(props) = args.get("properties").and_then(|v| v.as_object()) {
                        for (k, v) in props {
                            el["properties"][k] = v.clone();
                        }
                    }
                    if let Some(styles) = args.get("styles").and_then(|v| v.as_object()) {
                        for (k, v) in styles {
                            el["styles"][k] = v.clone();
                        }
                    }
                    ToolActionResult {
                        tool: "update_element".into(),
                        description: format!("Updated element **{}** on page **{}**", element_id, page_id),
                        success: true,
                    }
                } else {
                    ToolActionResult {
                        tool: "update_element".into(),
                        description: format!("Element **{}** not found on page **{}**", element_id, page_id),
                        success: false,
                    }
                }
            } else {
                ToolActionResult {
                    tool: "update_element".into(),
                    description: format!("Page **{}** not found", page_id),
                    success: false,
                }
            }
        }
        "delete_element" => {
            let page_id = args["page_id"].as_str().unwrap_or("");
            let element_id = args["element_id"].as_str().unwrap_or("");
            let pages = ensure_pages(app);
            if let Some(page) = pages.iter_mut().find(|p| p["id"].as_str().unwrap_or("") == page_id) {
                let els = ensure_elements(page);
                let before = els.len();
                els.retain(|e| e["id"].as_str().unwrap_or("") != element_id);
                if els.len() < before {
                    ToolActionResult {
                        tool: "delete_element".into(),
                        description: format!("Deleted element **{}** from page **{}**", element_id, page_id),
                        success: true,
                    }
                } else {
                    ToolActionResult {
                        tool: "delete_element".into(),
                        description: format!("Element **{}** not found on page **{}**", element_id, page_id),
                        success: false,
                    }
                }
            } else {
                ToolActionResult {
                    tool: "delete_element".into(),
                    description: format!("Page **{}** not found", page_id),
                    success: false,
                }
            }
        }
        "update_theme" => {
            let config = app.get_mut("config").and_then(|c| c.as_object_mut());
            if let Some(cfg) = config {
                if let Some(c) = args.get("primary_color").and_then(|v| v.as_str()) {
                    cfg.insert("primary_color".into(), json!(c));
                }
                if let Some(c) = args.get("secondary_color").and_then(|v| v.as_str()) {
                    cfg.insert("secondary_color".into(), json!(c));
                }
                ToolActionResult {
                    tool: "update_theme".into(),
                    description: "Updated theme colors".into(),
                    success: true,
                }
            } else {
                ToolActionResult {
                    tool: "update_theme".into(),
                    description: "Could not access app config".into(),
                    success: false,
                }
            }
        }
        "set_navigation" => {
            let nav_type = args["type"].as_str().unwrap_or("none");
            let items = args.get("items").and_then(|v| v.as_array()).cloned().unwrap_or_default();
            let tab_count = items.len();
            *nav = Some(json!({
                "type": nav_type,
                "config": items
            }));
            if tab_count > 0 {
                ToolActionResult {
                    tool: "set_navigation".into(),
                    description: format!("Set navigation to **{}** with **{}** tabs", nav_type, tab_count),
                    success: true,
                }
            } else {
                ToolActionResult {
                    tool: "set_navigation".into(),
                    description: format!("Set navigation type to **{}** (no tabs)", nav_type),
                    success: true,
                }
            }
        }
        _ => ToolActionResult {
            tool: tool_name.into(),
            description: format!("Unknown tool: {}", tool_name),
            success: false,
        },
    }
}

fn ensure_pages(app: &mut Value) -> &mut Vec<Value> {
    if !app["config"]["project_config"]["pages"].is_array() {
        app["config"]["project_config"]["pages"] = json!([]);
    }
    app["config"]["project_config"]["pages"].as_array_mut().unwrap()
}

fn ensure_elements(page: &mut Value) -> &mut Vec<Value> {
    if !page["elements"].is_array() {
        page["elements"] = json!([]);
    }
    page["elements"].as_array_mut().unwrap()
}

async fn call_ai(
    messages: &[Value],
    model: &str,
    custom_api_keys: Option<std::collections::HashMap<String, String>>,
) -> Result<(String, Vec<Value>), String> {
    let tools: Value = serde_json::from_str(TOOL_DEFS).map_err(|e| format!("Tool def parse error: {}", e))?;

    let resp = ai::chat_completion(AiRequest {
        model: model.to_string(),
        messages: messages.to_vec(),
        temperature: 0.7,
        max_tokens: 4000,
        tools: Some(tools),
        response_format: None,
        custom_api_keys,
    }).await.map_err(|e| {
        let mut msg = e.message;
        if let Some(s) = e.suggestion {
            msg.push_str(&format!("\n\n💡 {}", s));
        }
        msg
    })?;

    Ok((resp.content, resp.tool_calls))
}

pub async fn agent_chat(
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<ChatRequest>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let user_id = get_user_id(&req);

    match check_app_owner(&db, &app_id, &user_id) {
        Ok(_) => {}
        Err(resp) => return resp,
    }

    let message = body.message.trim();
    if message.is_empty() {
        return HttpResponse::BadRequest().json(json!({
            "reply": "Please enter a message.",
            "actions": [],
            "app_updated": false,
        }));
    }

    // Load current app
    let app_val = match db.get_generated_app(&app_id) {
        Ok(Some(a)) => a,
        Ok(None) => return HttpResponse::NotFound().json(json!({
            "reply": "App not found.",
            "actions": [],
            "app_updated": false,
        })),
        Err(e) => return HttpResponse::InternalServerError().json(json!({
            "reply": format!("Database error: {}", e),
            "actions": [],
            "app_updated": false,
        })),
    };

    // Determine model — OpenRouter will be used as universal fallback
    let model = body.model.as_deref().unwrap_or("gpt-4o-mini");
    let custom_api_keys = body.custom_api_keys.clone();

    // Load existing navigation config
    let existing_nav = db.get_navigation(&app_id).ok().flatten();
    let mut nav: Option<Value> = existing_nav.clone();
    let mut nav_updated = false;

    // Build system message with app context
    let summary = build_app_summary(&app_val, &nav);
    let system_msg = format!("{}\n\n## Current App State\n{}", OPENAI_CHAT_SYSTEM, summary);

    // Build conversation
    let mut messages: Vec<Value> = vec![
        json!({"role": "system", "content": system_msg}),
        json!({"role": "user", "content": message}),
    ];

    let mut all_actions: Vec<ToolActionResult> = Vec::new();
    let mut app_updated = false;
    let mut final_reply = String::new();
    let mut app = app_val;
    let mut counter: u32 = 1000;

    // Count existing element IDs to set counter
    if let Some(pages) = app["config"]["project_config"]["pages"].as_array() {
        for page in pages {
            if let Some(els) = page["elements"].as_array() {
                for el in els {
                    if let Some(id) = el["id"].as_str() {
                        if let Some(num) = id.strip_prefix("b_").and_then(|s| s.parse::<u32>().ok()) {
                            if num >= counter {
                                counter = num + 1;
                            }
                        }
                    }
                }
            }
        }
    }

    // Agent loop (max 5 iterations)
    for _iter in 0..5 {
        match call_ai(&messages, model, custom_api_keys.clone()).await {
            Ok((content, tool_calls)) => {
                if tool_calls.is_empty() {
                    final_reply = content;
                    break;
                }

                // Execute tool calls
                for tc in &tool_calls {
                    let function = &tc["function"];
                    let t_name = function["name"].as_str().unwrap_or("");
                    let args_str = function["arguments"].as_str().unwrap_or("{}");
                    let args: Value = serde_json::from_str(args_str).unwrap_or(json!({}));

                    let result = execute_tool(t_name, &args, &mut app, &mut nav, &mut counter);
                    let was_success = result.success;
                    all_actions.push(result.clone());

                    if was_success {
                        match t_name {
                            "set_navigation" => {
                                nav_updated = true;
                                app_updated = true;
                            }
                            "create_page" | "delete_page" | "add_element"
                            | "add_multiple_elements" | "update_element"
                            | "delete_element" | "update_theme" => {
                                app_updated = true;
                            }
                            _ => {}
                        }
                    }

                    // Add tool call + result to messages
                    messages.push(json!({
                        "role": "assistant",
                        "content": null,
                        "tool_calls": [tc.clone()]
                    }));
                    messages.push(json!({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": if result.success { result.description.clone() } else { format!("Error: {}", result.description) }
                    }));
                }
            }
            Err(e) => {
                final_reply = format!("Sorry, I encountered an error: {}", e);
                break;
            }
        }
    }

    if final_reply.is_empty() {
        final_reply = "I've completed several changes. What would you like to do next?".to_string();
    }

    // Save changes if app was updated
    if app_updated {
        let config_str = app["config"].to_string();
        if let Err(e) = db.update_app_config(&app_id, &config_str) {
            return HttpResponse::InternalServerError().json(json!({
                "reply": format!("Changes were made but failed to save: {}", e),
                "actions": all_actions,
                "app_updated": false,
            }));
        }
    }

    // Save navigation if it was modified
    if nav_updated {
        if let Some(nav_data) = &nav {
            let existing_id = db.get_navigation(&app_id).ok().flatten()
                .and_then(|n| n.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()));
            let id = existing_id.unwrap_or_else(|| Uuid::new_v4().to_string());
            let nav_type = nav_data["type"].as_str().unwrap_or("bottomTab");
            let config = nav_data.get("config").cloned().unwrap_or(json!([])).to_string();
            let now = Utc::now().to_rfc3339();
            if let Err(e) = db.upsert_navigation(&id, &app_id, nav_type, &config, &now) {
                log::error!("Failed to save navigation: {}", e);
            }
        }
    }

    HttpResponse::Ok().json(ChatResponse {
        reply: final_reply,
        actions: all_actions,
        app_updated,
    })
}
