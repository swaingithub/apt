use std::cell::Cell;
use std::env;

use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::db::Database;
use crate::services::ai::{self, AiRequest, all_providers};
use super::{get_user_id, check_app_owner};

#[derive(Debug, Deserialize)]
pub struct GenerateRequest {
    pub prompt: String,
}

#[derive(Debug, Serialize)]
pub struct GenerateResponse {
    pub pages: Vec<Value>,
    pub matched_category: Option<String>,
    pub ai_generated: bool,
}

fn next_id(c: &Cell<u32>) -> String {
    let v = c.get() + 1;
    c.set(v);
    format!("b_{}", v)
}

fn heading(c: &Cell<u32>, text: &str, size: u32, align: &str, color: &str) -> Value {
    serde_json::json!({
        "id": next_id(c), "type": "heading", "label": text,
        "styles": { "fontSize": size, "fontWeight": 800, "textAlign": align, "color": color, "margin": "0 0 8px 0" },
        "properties": { "value": text }
    })
}

fn text(c: &Cell<u32>, text: &str, color: &str) -> Value {
    serde_json::json!({
        "id": next_id(c), "type": "text", "label": "Text",
        "styles": { "fontSize": 14, "color": color, "lineHeight": 1.5, "margin": "0 0 12px 0" },
        "properties": { "value": text }
    })
}

fn button(c: &Cell<u32>, label: &str, bg: &str, color: &str, target: Option<&str>) -> Value {
    let id = next_id(c);
    let mut b = serde_json::json!({
        "id": id, "type": "button", "label": label,
        "styles": { "backgroundColor": bg, "color": color, "borderRadius": 8, "padding": "14px 28px", "alignSelf": "center", "fontWeight": 600 },
        "properties": { "value": label }
    });
    if let Some(t) = target {
        b["actions"] = serde_json::json!({ "onClick": { "type": "navigate", "targetPage": t } });
    }
    b
}

fn image(c: &Cell<u32>, label: &str, bg: &str, height: u32) -> Value {
    serde_json::json!({
        "id": next_id(c), "type": "image", "label": label,
        "styles": { "borderRadius": 12, "width": "100%", "height": height },
        "properties": { "src": "", "placeholder": bg }
    })
}

fn container(c: &Cell<u32>, bg: &str, padding: u32, children: Vec<Value>) -> Value {
    serde_json::json!({
        "id": next_id(c), "type": "container", "label": "Section",
        "styles": { "backgroundColor": bg, "borderRadius": 16, "padding": padding },
        "properties": {}, "children": children
    })
}

fn divider(c: &Cell<u32>) -> Value {
    serde_json::json!({
        "id": next_id(c), "type": "divider", "label": "Divider",
        "styles": { "margin": "16px 0", "backgroundColor": "#e2e8f0", "height": 1 },
        "properties": {}
    })
}

fn card(c: &Cell<u32>, title: &str, desc: &str, icon: &str, bg: &str) -> Value {
    serde_json::json!({
        "id": next_id(c), "type": "card", "label": title,
        "styles": { "backgroundColor": bg, "borderRadius": 12, "padding": 16 },
        "properties": {}, "children": [
            { "id": next_id(c), "type": "icon", "label": "Icon", "styles": { "fontSize": 24, "margin": "0 0 8px 0" }, "properties": { "name": icon } },
            { "id": next_id(c), "type": "heading", "label": title, "styles": { "fontSize": 16, "fontWeight": 700, "margin": "0 0 4px 0" }, "properties": { "value": title } },
            { "id": next_id(c), "type": "text", "label": "Description", "styles": { "fontSize": 13, "color": "#64748b", "lineHeight": 1.4 }, "properties": { "value": desc } }
        ]
    })
}

fn grid(c: &Cell<u32>, cols: u32, children: Vec<Value>) -> Value {
    serde_json::json!({
        "id": next_id(c), "type": "grid", "label": "Grid",
        "styles": { "margin": "8px 0" }, "properties": { "gridCols": cols },
        "children": children
    })
}

fn input(c: &Cell<u32>, label: &str, placeholder: &str) -> Value {
    serde_json::json!({
        "id": next_id(c), "type": "input", "label": label,
        "styles": { "margin": "0 0 12px 0" },
        "properties": { "placeholder": placeholder, "value": "" }
    })
}

fn home_page(c: &Cell<u32>, category: &str) -> Value {
    match category {
        "ecommerce" => serde_json::json!({
            "id": "page_home", "name": "Home", "elements": [
                container(c, "#1e293b", 24, vec![
                    heading(c, "Welcome to\nOur Store", 28, "center", "#ffffff"),
                    text(c, "Discover amazing products at unbeatable prices", "#94a3b8"),
                    button(c, "Shop Now", "#6366f1", "#ffffff", Some("page_products")),
                ]),
                container(c, "#ffffff", 20, vec![
                    heading(c, "Featured Categories", 20, "left", "#0f172a"),
                    grid(c, 2, vec![
                        card(c, "Electronics", "Latest gadgets & devices", "📱", "#f0f9ff"),
                        card(c, "Fashion", "Trendy clothing & accessories", "👕", "#fdf2f8"),
                        card(c, "Home & Living", "Decor & essentials", "🏠", "#f0fdf4"),
                        card(c, "Sports", "Gear & equipment", "⚽", "#fefce8"),
                    ]),
                ]),
            ]
        }),
        "restaurant" => serde_json::json!({
            "id": "page_home", "name": "Home", "elements": [
                container(c, "#1e293b", 24, vec![
                    heading(c, "Gourmet Bites", 28, "center", "#ffffff"),
                    text(c, "Experience the finest dining, delivered to your door", "#94a3b8"),
                    button(c, "View Menu", "#ef4444", "#ffffff", Some("page_menu")),
                ]),
                container(c, "#ffffff", 20, vec![
                    heading(c, "Popular Dishes", 20, "left", "#0f172a"),
                    grid(c, 2, vec![
                        card(c, "Classic Burger", "Beef patty with fresh toppings", "🍔", "#fef2f2"),
                        card(c, "Margherita Pizza", "Fresh mozzarella & basil", "🍕", "#fefce8"),
                        card(c, "Caesar Salad", "Crisp romaine & parmesan", "🥗", "#f0fdf4"),
                        card(c, "Tiramisu", "Classic Italian dessert", "🍰", "#fdf2f8"),
                    ]),
                ]),
            ]
        }),
        "fitness" => serde_json::json!({
            "id": "page_home", "name": "Home", "elements": [
                container(c, "#1e293b", 24, vec![
                    heading(c, "Transform\nYour Body", 28, "center", "#ffffff"),
                    text(c, "Personalized workouts & nutrition plans", "#94a3b8"),
                    button(c, "Start Free Trial", "#22c55e", "#ffffff", Some("page_workout")),
                ]),
                container(c, "#ffffff", 20, vec![
                    heading(c, "Our Programs", 20, "left", "#0f172a"),
                    grid(c, 2, vec![
                        card(c, "Strength", "Build muscle & power", "💪", "#f0fdf4"),
                        card(c, "Cardio", "Burn fat & improve stamina", "🏃", "#fefce8"),
                        card(c, "Yoga", "Flexibility & mindfulness", "🧘", "#f0f9ff"),
                        card(c, "HIIT", "High intensity interval", "⚡", "#fdf2f8"),
                    ]),
                ]),
            ]
        }),
        "education" => serde_json::json!({
            "id": "page_home", "name": "Home", "elements": [
                container(c, "#1e293b", 24, vec![
                    heading(c, "Learn\nAnything", 28, "center", "#ffffff"),
                    text(c, "Expert-led courses to advance your career", "#94a3b8"),
                    button(c, "Browse Courses", "#f59e0b", "#ffffff", Some("page_courses")),
                ]),
                container(c, "#ffffff", 20, vec![
                    heading(c, "Popular Subjects", 20, "left", "#0f172a"),
                    grid(c, 2, vec![
                        card(c, "Programming", "Web & mobile development", "💻", "#f0f9ff"),
                        card(c, "Design", "UI/UX & graphic design", "🎨", "#fdf2f8"),
                        card(c, "Business", "Entrepreneurship & management", "📊", "#fefce8"),
                        card(c, "Languages", "Learn new languages", "🌍", "#f0fdf4"),
                    ]),
                ]),
            ]
        }),
        _ => serde_json::json!({
            "id": "page_home", "name": "Home", "elements": [
                container(c, "#1e293b", 24, vec![
                    heading(c, "Welcome", 28, "center", "#ffffff"),
                    text(c, "We're excited to have you here", "#94a3b8"),
                    button(c, "Get Started", "#6366f1", "#ffffff", Some("page_about")),
                ]),
                container(c, "#ffffff", 20, vec![
                    heading(c, "Overview", 20, "left", "#0f172a"),
                    text(c, "This is your app. Customize every page, block, and style using the builder.", "#64748b"),
                    image(c, "Hero", "#e2e8f0", 180),
                ]),
            ]
        }),
    }
}

fn pages_for_category(category: &str, c: &Cell<u32>) -> Vec<Value> {
    let mut pages = vec![home_page(c, category)];

    match category {
        "ecommerce" => {
            pages.push(serde_json::json!({
                "id": "page_products", "name": "Products", "elements": [
                    container(c, "#ffffff", 16, vec![
                        heading(c, "All Products", 22, "left", "#0f172a"),
                        grid(c, 2, vec![
                            card(c, "Wireless Headphones", "Premium sound quality", "🎧", "#f0f9ff"),
                            card(c, "Smart Watch", "Fitness & notifications", "⌚", "#fdf2f8"),
                            card(c, "Laptop Stand", "Ergonomic workspace", "💻", "#f0fdf4"),
                            card(c, "Phone Case", "Shockproof protection", "📱", "#fefce8"),
                        ]),
                    ]),
                ]
            }));
            pages.push(serde_json::json!({
                "id": "page_cart", "name": "Cart", "elements": [
                    container(c, "#ffffff", 16, vec![
                        heading(c, "Shopping Cart", 22, "left", "#0f172a"),
                        card(c, "Wireless Headphones", "Qty: 1 - $79.99", "🎧", "#f8fafc"),
                        divider(c),
                        card(c, "Smart Watch", "Qty: 1 - $199.99", "⌚", "#f8fafc"),
                        divider(c),
                        text(c, "Total: $279.98", "#0f172a"),
                        button(c, "Checkout", "#6366f1", "#ffffff", Some("page_checkout")),
                    ]),
                ]
            }));
            pages.push(serde_json::json!({
                "id": "page_checkout", "name": "Checkout", "elements": [
                    container(c, "#ffffff", 16, vec![
                        heading(c, "Checkout", 22, "left", "#0f172a"),
                        text(c, "Shipping Information", "#64748b"),
                        input(c, "Full Name", "Enter your name"),
                        input(c, "Address", "Enter your address"),
                        button(c, "Place Order", "#22d06c", "#ffffff", None),
                    ]),
                ]
            }));
        }
        "restaurant" => {
            pages.push(serde_json::json!({
                "id": "page_menu", "name": "Menu", "elements": [
                    container(c, "#ffffff", 16, vec![
                        heading(c, "Our Menu", 22, "left", "#0f172a"),
                        grid(c, 2, vec![
                            card(c, "Classic Burger", "$12.99 - Beef, lettuce, tomato", "🍔", "#fef2f2"),
                            card(c, "Margherita Pizza", "$14.99 - Mozzarella, basil", "🍕", "#fefce8"),
                            card(c, "Caesar Salad", "$9.99 - Romaine, parmesan", "🥗", "#f0fdf4"),
                            card(c, "Pasta Carbonara", "$13.99 - Creamy bacon pasta", "🍝", "#fdf2f8"),
                            card(c, "Grilled Salmon", "$18.99 - With seasonal veggies", "🐟", "#f0f9ff"),
                            card(c, "Tiramisu", "$7.99 - Classic Italian dessert", "🍰", "#f5f3ff"),
                        ]),
                    ]),
                ]
            }));
            pages.push(serde_json::json!({
                "id": "page_reservations", "name": "Reservations", "elements": [
                    container(c, "#ffffff", 16, vec![
                        heading(c, "Make a Reservation", 22, "left", "#0f172a"),
                        text(c, "Book your table for an unforgettable experience", "#64748b"),
                        input(c, "Date", "Select date"),
                        input(c, "Time", "Select time"),
                        input(c, "Guests", "Number of guests"),
                        button(c, "Book Now", "#ef4444", "#ffffff", None),
                    ]),
                ]
            }));
        }
        "fitness" => {
            pages.push(serde_json::json!({
                "id": "page_workout", "name": "Workouts", "elements": [
                    container(c, "#ffffff", 16, vec![
                        heading(c, "Today's Workout", 22, "left", "#0f172a"),
                        card(c, "Upper Body Strength", "45 min · Intermediate", "💪", "#f0fdf4"),
                        divider(c),
                        card(c, "Cardio Blast", "30 min · All levels", "🏃", "#fefce8"),
                        divider(c),
                        card(c, "Core & Flexibility", "20 min · Beginner", "🧘", "#f0f9ff"),
                        button(c, "Start Workout", "#22c55e", "#ffffff", None),
                    ]),
                ]
            }));
        }
        "education" => {
            pages.push(serde_json::json!({
                "id": "page_courses", "name": "Courses", "elements": [
                    container(c, "#ffffff", 16, vec![
                        heading(c, "Available Courses", 22, "left", "#0f172a"),
                        card(c, "React Native Mastery", "Build cross-platform mobile apps", "📱", "#f0f9ff"),
                        divider(c),
                        card(c, "UI/UX Design", "Design beautiful interfaces", "🎨", "#fdf2f8"),
                        divider(c),
                        card(c, "Python for Data Science", "Analyze & visualize data", "🐍", "#f0fdf4"),
                    ]),
                ]
            }));
        }
        _ => {}
    }

    pages.push(serde_json::json!({
        "id": "page_about", "name": "About", "elements": [
            container(c, "#ffffff", 16, vec![
                heading(c, "About Us", 22, "left", "#0f172a"),
                text(c, "We're passionate about creating amazing experiences for our users.", "#64748b"),
                image(c, "Team", "#e2e8f0", 160),
                divider(c),
                text(c, "Contact us anytime — we'd love to hear from you!", "#64748b"),
                button(c, "Contact Us", "#6366f1", "#ffffff", None),
            ]),
        ]
    }));

    pages
}

fn match_category(prompt: &str) -> &str {
    let prompt = prompt.to_lowercase();
    if prompt.contains("shop") || prompt.contains("store")
        || prompt.contains("product") || prompt.contains("cart")
        || prompt.contains("checkout") || prompt.contains("ecommerce")
        || prompt.contains("buy") || prompt.contains("purchase")
    {
        "ecommerce"
    } else if prompt.contains("restaurant") || prompt.contains("food")
        || prompt.contains("menu") || prompt.contains("cafe")
        || prompt.contains("coffee") || prompt.contains("dining")
        || prompt.contains("pizza") || prompt.contains("burger")
    {
        "restaurant"
    } else if prompt.contains("fitness") || prompt.contains("gym")
        || prompt.contains("workout") || prompt.contains("health")
        || prompt.contains("exercise") || prompt.contains("yoga")
    {
        "fitness"
    } else if prompt.contains("education") || prompt.contains("course")
        || prompt.contains("learn") || prompt.contains("school")
        || prompt.contains("academy") || prompt.contains("training")
    {
        "education"
    } else if prompt.contains("business") || prompt.contains("company")
        || prompt.contains("corporate") || prompt.contains("professional")
        || prompt.contains("service") || prompt.contains("consult")
    {
        "business"
    } else if (prompt.contains("real") && prompt.contains("estate"))
        || prompt.contains("property") || prompt.contains("rental")
        || prompt.contains("apartment") || prompt.contains("housing")
    {
        "realestate"
    } else if prompt.contains("entertainment") || prompt.contains("event")
        || prompt.contains("music") || prompt.contains("movie")
        || prompt.contains("ticket") || prompt.contains("concert")
    {
        "entertainment"
    } else if prompt.contains("travel") || prompt.contains("hotel")
        || prompt.contains("booking") || prompt.contains("destination")
        || prompt.contains("trip") || prompt.contains("vacation")
    {
        "travel"
    } else if prompt.contains("portfolio") || prompt.contains("gallery")
        || prompt.contains("showcase") || prompt.contains("creative")
        || prompt.contains("artist") || prompt.contains("photograph")
    {
        "portfolio"
    } else if prompt.contains("saas") || prompt.contains("dashboard")
        || prompt.contains("pricing") || prompt.contains("software")
        || prompt.contains("platform")
    {
        "saas"
    } else {
        "general"
    }
}

fn category_name(category: &str) -> &str {
    match category {
        "ecommerce" => "E-Commerce",
        "restaurant" => "Restaurant",
        "fitness" => "Health & Fitness",
        "education" => "Education",
        "business" => "Business",
        "realestate" => "Real Estate",
        "entertainment" => "Entertainment",
        "travel" => "Travel",
        "portfolio" => "Portfolio",
        "saas" => "SaaS / App",
        _ => "General",
    }
}

const OPENAI_SYSTEM_PROMPT: &str = "You are a mobile app page generator. Given a user's description, generate pages for a mobile app built with a React Native visual builder. \
Return a JSON object with a single key 'pages' containing an array of page objects. Each page has: \
id (snake_case string like page_home), name (human-readable), elements (array of block objects). \
Available block types: \
1. container: 'type':'container', children:[blocks], styles:{backgroundColor,borderRadius,padding} \
2. heading: 'type':'heading', properties:{value:text}, styles:{fontSize,fontWeight,textAlign,color,margin} \
3. text: 'type':'text', properties:{value:text}, styles:{fontSize,color,lineHeight,margin} \
4. button: 'type':'button', properties:{value:label}, actions?{onClick:{type:'navigate',targetPage:'page_xxx'}}, styles:{backgroundColor,color,borderRadius,padding,alignSelf,fontWeight} \
5. image: 'type':'image', styles:{borderRadius,width:'100%',height}, properties:{src:'',placeholder:'#color'} \
6. divider: 'type':'divider', styles:{margin,backgroundColor,height:1} \
7. card: 'type':'card', children:[icon,heading,text], styles:{backgroundColor,borderRadius,padding} \
8. grid: 'type':'grid', properties:{gridCols:2}, children:[blocks], styles:{margin} \
9. input: 'type':'input', properties:{placeholder,value:''}, styles:{margin} \
10. icon: 'type':'icon', properties:{name:'emoji'}, styles:{fontSize,margin} \
Use realistic placeholder content. Use modern dark/light theme colors. Generate 2-5 pages. Return ONLY valid JSON. No markdown.";

async fn try_ai_generation(prompt: &str, model: &str) -> Option<Vec<Value>> {
    let resp = ai::chat_completion(AiRequest {
        model: model.to_string(),
        messages: vec![
            json!({"role": "system", "content": OPENAI_SYSTEM_PROMPT}),
            json!({"role": "user", "content": prompt}),
        ],
        temperature: 0.7,
        max_tokens: 4000,
        tools: None,
        response_format: Some(json!({"type": "json_object"})),
        custom_api_keys: None,
    }).await.ok()?;

    let parsed: Value = serde_json::from_str(&resp.content).ok()?;
    let pages = parsed["pages"].as_array()?.clone();

    if pages.is_empty() || !pages.iter().all(|p| {
        p["id"].as_str().is_some() && p["name"].as_str().is_some() && p["elements"].is_array()
    }) {
        return None;
    }

    Some(pages)
}

/// Try AI generation across multiple providers in order of preference
async fn try_providers(prompt: &str) -> Option<(Vec<Value>, &'static str)> {
    // Ordered list of (env_var, model_name, label)
    let providers: Vec<(&str, &str, &str)> = vec![
        ("OPENAI_API_KEY", "gpt-4o-mini", "OpenAI"),
        ("GROQ_API_KEY", "groq/llama-3.1-8b-instant", "Groq"),
        ("GEMINI_API_KEY", "gemini/gemini-3.5-flash", "Gemini"),
    ];

    for (env_key, model, label) in &providers {
        let key = env::var(env_key).unwrap_or_default();
        if key.is_empty() || key == "sk-placeholder" {
            continue;
        }
        if let Some(pages) = try_ai_generation(prompt, model).await {
            return Some((pages, label));
        }
    }
    None
}

pub async fn generate_from_prompt(
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<GenerateRequest>,
    db: web::Data<Database>,
) -> HttpResponse {
    let app_id = path.into_inner();
    let user_id = get_user_id(&req);

    match check_app_owner(&db, &app_id, &user_id) {
        Ok(_) => {}
        Err(resp) => return resp,
    }

    let prompt = body.prompt.to_lowercase();

    // Try AI providers in order (OpenAI → Groq → Gemini)
    if let Some((ai_pages, provider)) = try_providers(&prompt).await {
        return HttpResponse::Ok().json(GenerateResponse {
            pages: ai_pages,
            matched_category: Some(format!("AI Generated ({})", provider)),
            ai_generated: true,
        });
    }

    // Fall back to keyword-based template generation
    let category = match_category(&prompt);
    let counter = Cell::new(100);
    let pages = pages_for_category(category, &counter);

    HttpResponse::Ok().json(GenerateResponse {
        pages,
        matched_category: Some(category_name(category).to_string()),
        ai_generated: false,
    })
}

pub async fn get_ai_providers() -> HttpResponse {
    HttpResponse::Ok().json(all_providers())
}
