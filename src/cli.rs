use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::io::{self, Write};
use std::path::PathBuf;

#[derive(Parser)]
#[command(
    name = "apt",
    version = "0.1.0",
    about = "Apt - No-Code Mobile App Builder CLI",
    long_about = "A CLI for building, managing, and publishing mobile apps without code.\n\nUse 'apt <command> --help' for more info on a specific command."
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    #[arg(
        short,
        long,
        default_value = "http://localhost:8080",
        env = "APT_API_URL",
        global = true
    )]
    api_url: String,
}

#[derive(Subcommand)]
enum Commands {
    /// Authenticate with the Apt server
    Login {
        email: String,
    },
    /// Log out and remove stored credentials
    Logout,
    /// Show current user info
    Whoami,
    /// Scaffold a new project from template
    Init {
        name: String,
    },
    /// Manage projects
    #[command(subcommand)]
    Project(ProjectCommands),
    /// Build a project for a platform
    Build {
        project_id: String,
        #[arg(short, long, default_value = "android")]
        platform: String,
    },
    /// Generate and download the app source for a project
    Publish {
        project_id: String,
    },
    /// Check system prerequisites
    Doctor,
    /// Manage SDK version
    #[command(subcommand)]
    Sdk(SdkCommands),
}

#[derive(Subcommand)]
enum ProjectCommands {
    /// List all projects
    List,
    /// Show project details
    Show { project_id: String },
    /// Select a project as active
    Select { project_id: String },
    /// Delete a project
    Delete { project_id: String },
}

#[derive(Subcommand)]
enum SdkCommands {
    /// Show current SDK version info
    Info,
    /// Update the local SDK template to latest
    Update,
}

// ── Config ────────────────────────────────────────────────────────────

fn config_dir() -> PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    let dir = PathBuf::from(home).join(".apt");
    std::fs::create_dir_all(&dir).ok();
    dir
}

fn token_path() -> PathBuf {
    config_dir().join("token")
}

fn active_project_path() -> PathBuf {
    config_dir().join("active_project")
}

fn store_token(token: &str) {
    let _ = std::fs::write(token_path(), token);
}

fn read_token() -> Option<String> {
    std::fs::read_to_string(token_path()).ok().map(|s| s.trim().to_string())
}

fn clear_token() {
    let _ = std::fs::remove_file(token_path());
}

fn store_active_project(id: &str) {
    let _ = std::fs::write(active_project_path(), id);
}

fn read_active_project() -> Option<String> {
    std::fs::read_to_string(active_project_path()).ok().map(|s| s.trim().to_string())
}

// ── Helpers ───────────────────────────────────────────────────────────

fn prompt(msg: &str) -> String {
    print!("{}", msg);
    io::stdout().flush().ok();
    let mut input = String::new();
    io::stdin().read_line(&mut input).ok();
    input.trim().to_string()
}

fn prompt_password(msg: &str) -> String {
    // Use rpassword if available; fallback to plain stdin
    rpassword_or_fallback(msg)
}

fn rpassword_or_fallback(msg: &str) -> String {
    // Simple fallback: read from stdin without hiding chars
    // In production, use rpassword crate
    prompt(msg)
}

fn green(s: &str) -> String {
    format!("\x1b[32m{}\x1b[0m", s)
}

fn red(s: &str) -> String {
    format!("\x1b[31m{}\x1b[0m", s)
}

fn yellow(s: &str) -> String {
    format!("\x1b[33m{}\x1b[0m", s)
}

fn cyan(s: &str) -> String {
    format!("\x1b[36m{}\x1b[0m", s)
}

fn bold(s: &str) -> String {
    format!("\x1b[1m{}\x1b[0m", s)
}

fn dim(s: &str) -> String {
    format!("\x1b[2m{}\x1b[0m", s)
}

// ── API Client ────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct AuthResponse {
    token: String,
    user: UserInfo,
}

#[derive(Deserialize)]
struct UserInfo {
    id: String,
    email: String,
    name: String,
}

#[derive(Deserialize)]
struct ProjectInfo {
    id: String,
    name: String,
    description: String,
    created_at: String,
    updated_at: String,
}

#[derive(Deserialize)]
struct BuildInfo {
    id: String,
    project_id: String,
    platform: String,
    status: String,
    output_file: Option<String>,
    created_at: String,
}

#[derive(Deserialize)]
struct ErrorBody {
    error: String,
    message: String,
}

#[derive(Deserialize)]
struct GenerateResponse {
    status: String,
    app_id: String,
    download_url: String,
    filename: String,
}

#[derive(Serialize)]
struct LoginPayload {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct RegisterPayload {
    email: String,
    password: String,
    name: String,
}

#[derive(Serialize)]
struct BuildPayload {
    platform: String,
    app_id: String,
}

#[derive(Serialize)]
struct GeneratePayload {
    app_name: String,
    package_name: String,
    display_name: String,
    version: String,
    primary_color: String,
    project_config: serde_json::Value,
}

async fn api_post<T: Serialize>(
    api_url: &str,
    path: &str,
    body: &T,
    token: Option<&str>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!("{}{}", api_url.trim_end_matches('/'), path);
    let mut req = client.post(&url).json(body);
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {}", t));
    }
    let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
    let status = resp.status();
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("Parse failed: {}", e))?;
    if status.is_success() {
        Ok(json)
    } else {
        let msg = json.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error");
        Err(format!("{} (status {})", msg, status))
    }
}

async fn api_get(api_url: &str, path: &str, token: Option<&str>) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!("{}{}", api_url.trim_end_matches('/'), path);
    let mut req = client.get(&url);
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {}", t));
    }
    let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
    let status = resp.status();
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("Parse failed: {}", e))?;
    if status.is_success() {
        Ok(json)
    } else {
        let msg = json.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error");
        Err(format!("{} (status {})", msg, status))
    }
}

async fn api_download(api_url: &str, path: &str, token: Option<&str>, dest: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}{}", api_url.trim_end_matches('/'), path);
    let mut req = client.get(&url);
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {}", t));
    }
    let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        let json: serde_json::Value = resp.json().await.map_err(|_| format!("Download failed (status {})", status))?;
        let msg = json.get("message").and_then(|m| m.as_str()).unwrap_or("Download failed");
        return Err(format!("{} (status {})", msg, status));
    }
    let bytes = resp.bytes().await.map_err(|e| format!("Read response failed: {}", e))?;
    std::fs::write(dest, &bytes).map_err(|e| format!("Write file failed: {}", e))?;
    Ok(())
}

// ── Commands ──────────────────────────────────────────────────────────

async fn cmd_login(api_url: &str, email: &str) {
    let password = prompt_password(&format!("Password for {}: ", email));
    let payload = LoginPayload {
        email: email.to_string(),
        password,
    };
    match api_post(api_url, "/api/auth/login", &payload, None).await {
        Ok(json) => {
            let token = json["token"].as_str().unwrap_or("").to_string();
            store_token(&token);
            let name = json["user"]["name"].as_str().unwrap_or("");
            println!("{} Logged in as {} ({})", green("✓"), bold(name), dim(email));
        }
        Err(e) => {
            println!("{} Login failed: {}", red("✗"), e);
        }
    }
}

fn cmd_logout() {
    clear_token();
    println!("{} Logged out", green("✓"));
}

async fn cmd_whoami(api_url: &str) {
    let token = match read_token() {
        Some(t) => t,
        None => {
            println!("{} Not logged in. Use 'apt login <email>'", yellow("!"));
            return;
        }
    };
    match api_get(api_url, "/api/auth/me", Some(&token)).await {
        Ok(json) => {
            let id = json["id"].as_str().unwrap_or("");
            let email = json["email"].as_str().unwrap_or("");
            let name = json["name"].as_str().unwrap_or("");
            println!("{}  User: {}", bold("User"), bold(&name));
            println!("{}  Email: {}", dim("   "), email);
            println!("{}  ID:   {}", dim("   "), id);
        }
        Err(e) => {
            println!("{} Failed to get user info: {}", red("✗"), e);
        }
    }
}

async fn cmd_init(api_url: &str, name: &str) {
    let token = read_token();
    let safe_name = name.replace(' ', "_");
    let dir = PathBuf::from(&safe_name);
    if dir.exists() {
        println!("{} Directory '{}' already exists", red("✗"), safe_name);
        return;
    }

    println!("{} Scaffolding project '{}'...", bold("→"), name);

    let project_config = serde_json::json!({
        "appName": name,
        "homePageId": "home",
        "pages": [
            {
                "id": "home",
                "name": "Home",
                "components": [],
                "layout": {},
                "navigation": {}
            }
        ],
        "collections": [],
        "globalStates": [],
        "theme": {
            "primaryColor": "#7c3aed",
            "backgroundColor": "#ffffff",
            "textColor": "#111827",
            "fontFamily": "System"
        },
        "build": {
            "appId": format!("com.apt.{}", safe_name.to_lowercase()),
            "version": "1.0.0",
            "buildNumber": 1,
            "platform": "both",
            "packageType": "apk",
            "environment": "development"
        },
        "push": {},
        "deployment": {}
    });

    let payload = GeneratePayload {
        app_name: safe_name.clone(),
        package_name: format!("com.apt.{}", safe_name.to_lowercase()),
        display_name: name.to_string(),
        version: "1.0.0".to_string(),
        primary_color: "#7c3aed".to_string(),
        project_config,
    };

    match api_post(api_url, "/api/generate", &payload, token.as_deref()).await {
        Ok(json) => {
            let download_url = json["download_url"].as_str().unwrap_or("");
            let filename = json["filename"].as_str().unwrap_or("source.zip");
            let output_path = format!("{}/{}", safe_name, filename);

            std::fs::create_dir_all(&safe_name).ok();
            println!("{} Downloading source...", bold("→"));
            if let Err(e) = api_download(api_url, download_url, token.as_deref(), &output_path).await {
                println!("{} Download failed: {}", red("✗"), e);
                return;
            }
            println!("{} Project scaffolded in ./{}", green("✓"), safe_name);
            println!("  {}{}", dim("Source: "), output_path);
        }
        Err(e) => {
            println!("{} Init failed: {}", red("✗"), e);
        }
    }
}

async fn cmd_project_list(api_url: &str) {
    let token = match read_token() {
        Some(t) => t,
        None => {
            println!("{} Not logged in. Use 'apt login <email>'", yellow("!"));
            return;
        }
    };

    match api_get(api_url, "/api/projects", Some(&token)).await {
        Ok(json) => {
            let projects = json.as_array().map(|a| a.clone()).unwrap_or_default();
            if projects.is_empty() {
                println!("{} No projects found", dim("(empty)"));
                return;
            }
            println!("{} Projects:", bold("Projects"));
            println!("{}", dim("────────────────────────────────────────────"));
            for p in &projects {
                let id = p["id"].as_str().unwrap_or("");
                let name = p["name"].as_str().unwrap_or("");
                let updated = p["updated_at"].as_str().unwrap_or("");
                let active = read_active_project();
                let marker = if active.as_deref() == Some(id) { green("●") } else { dim("○") };
                println!(" {} {}  {}", marker, bold(name), dim(updated));
                println!("   {}ID: {}", dim("   "), id);
            }
        }
        Err(e) => {
            println!("{} Failed to list projects: {}", red("✗"), e);
        }
    }
}

async fn cmd_project_show(api_url: &str, project_id: &str) {
    let token = match read_token() {
        Some(t) => t,
        None => {
            println!("{} Not logged in", yellow("!"));
            return;
        }
    };

    match api_get(api_url, &format!("/api/projects/{}", project_id), Some(&token)).await {
        Ok(json) => {
            let name = json["name"].as_str().unwrap_or("");
            let desc = json["description"].as_str().unwrap_or("");
            let created = json["created_at"].as_str().unwrap_or("");
            let updated = json["updated_at"].as_str().unwrap_or("");
            println!("{} {}", bold("Project:"), bold(name));
            println!("{}  Description: {}", dim("   "), desc);
            println!("{}  ID:          {}", dim("   "), project_id);
            println!("{}  Created:     {}", dim("   "), created);
            println!("{}  Updated:     {}", dim("   "), updated);
        }
        Err(e) => {
            println!("{} {}", red("✗"), e);
        }
    }
}

fn cmd_project_select(project_id: &str) {
    store_active_project(project_id);
    println!("{} Active project set to {}", green("✓"), bold(project_id));
}

async fn cmd_project_delete(api_url: &str, project_id: &str) {
    let token = match read_token() {
        Some(t) => t,
        None => {
            println!("{} Not logged in", yellow("!"));
            return;
        }
    };

    let confirm = prompt(&format!("Delete project {}? (y/N): ", bold(project_id)));
    if confirm.to_lowercase() != "y" {
        println!("{} Cancelled", yellow("!"));
        return;
    }

    let client = reqwest::Client::new();
    let url = format!("{}/api/projects/{}", api_url.trim_end_matches('/'), project_id);
    let resp = client
        .delete(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await;
    match resp {
        Ok(r) if r.status().is_success() => {
            println!("{} Project deleted", green("✓"));
        }
        Ok(r) => {
            let json: serde_json::Value = r.json().await.unwrap_or_default();
            let msg = json["message"].as_str().unwrap_or("Unknown error");
            println!("{} {}", red("✗"), msg);
        }
        Err(e) => {
            println!("{} {}", red("✗"), e);
        }
    }
}

async fn cmd_build(api_url: &str, project_id: &str, platform: &str) {
    let token = match read_token() {
        Some(t) => t,
        None => {
            println!("{} Not logged in", yellow("!"));
            return;
        }
    };

    println!("{} Building {} for {}...", bold("→"), bold(project_id), bold(platform));

    let payload = BuildPayload {
        platform: platform.to_string(),
        app_id: project_id.to_string(),
    };

    match api_post(api_url, "/api/apps/{}/build", &payload, Some(&token)).await {
        Ok(json) => {
            let build_id = json["build_id"].as_str().unwrap_or("");
            let status = json["status"].as_str().unwrap_or("");
            println!("{} Build {}: {} ({})", green("✓"), bold(build_id), yellow(status), dim(platform));
        }
        Err(e) => {
            println!("{} Build failed: {}", red("✗"), e);
        }
    }
}

async fn cmd_publish(api_url: &str, project_id: &str) {
    let token = match read_token() {
        Some(t) => t,
        None => {
            println!("{} Not logged in", yellow("!"));
            return;
        }
    };

    println!("{} Publishing project {}...", bold("→"), bold(project_id));

    let client = reqwest::Client::new();
    let url = format!("{}/api/projects/{}/export", api_url.trim_end_matches('/'), project_id);
    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => {
            let json: serde_json::Value = r.json().await.unwrap_or_default();
            let download_url = json["download_url"].as_str().unwrap_or("");
            let output = format!("{}.zip", project_id);

            println!("{} Downloading...", bold("→"));
            if let Err(e) = api_download(api_url, download_url, Some(&token), &output).await {
                println!("{} Download failed: {}", red("✗"), e);
                return;
            }
            println!("{} Published: {}", green("✓"), bold(&output));
        }
        Ok(r) => {
            let json: serde_json::Value = r.json().await.unwrap_or_default();
            let msg = json["message"].as_str().unwrap_or("Export failed");
            println!("{} {}", red("✗"), msg);
        }
        Err(e) => {
            println!("{} {}", red("✗"), e);
        }
    }
}

fn cmd_doctor() {
    println!("{} Checking system prerequisites...\n", bold("🔍 Doctor"));

    let checks: Vec<(&str, &str, fn() -> bool)> = vec![
        ("Node.js",  "node --version",          || check_cmd("node", "--version")),
        ("npm",      "npm --version",           || check_cmd("npm", "--version")),
        ("npx",      "npx --version",           || check_cmd("npx", "--version")),
        ("Expo CLI", "npx expo --version",      || check_cmd("npx", "--version") && std::process::Command::new("npx").args(["expo", "--version"]).output().is_ok()),
        ("Git",      "git --version",           || check_cmd("git", "--version")),
        ("Java",     "java -version",           || check_cmd_java()),
        ("Android SDK", "ANDROID_HOME set",     || std::env::var("ANDROID_HOME").is_ok()),
    ];

    let mut all_ok = true;
    for (name, cmd, check) in &checks {
        let ok = check();
        if ok {
            println!("  {} {}  {}", green("✓"), bold(name), dim(cmd));
        } else {
            println!("  {} {}  {}", red("✗"), bold(name), dim(cmd));
            all_ok = false;
        }
    }

    println!();
    if all_ok {
        println!("{} All checks passed!", green("✓"));
    } else {
        println!("{} Some checks failed. Install missing dependencies.", yellow("!"));
    }
}

fn check_cmd(cmd: &str, arg: &str) -> bool {
    std::process::Command::new(cmd)
        .arg(arg)
        .output()
        .is_ok()
}

fn check_cmd_java() -> bool {
    std::process::Command::new("java")
        .arg("-version")
        .output()
        .is_ok()
}

fn cmd_version() {
    println!("apt v{}", env!("CARGO_PKG_VERSION"));
    println!("{} No-code mobile app builder", dim("Apt"));
}

async fn cmd_sdk_info(api_url: &str) {
    println!("{} Checking SDK info...", bold("→"));
    match api_get(api_url, "/api/health", None).await {
        Ok(json) => {
            let svc = json["service"].as_str().unwrap_or("Apt");
            let ver = json["version"].as_str().unwrap_or("?");
            println!("{} Server: {} v{}", green("✓"), svc, ver);
        }
        Err(e) => {
            println!("{} Server not reachable: {}", yellow("!"), e);
        }
    }
    println!("{} Local SDK: {}", dim("   "), dim("mobile-expo/ (Expo SDK 55)"));
}

fn cmd_sdk_update() {
    println!("{} Updating SDK template...", bold("→"));
    println!("{} To update, pull latest from git or re-clone the mobile-expo/ template.", yellow("!"));
    println!("  Run: git pull origin main  (in mobile-expo/ directory)");
}

// ── Main ──────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let api_url = cli.api_url;

    match cli.command {
        Commands::Login { email } => cmd_login(&api_url, &email).await,
        Commands::Logout => cmd_logout(),
        Commands::Whoami => cmd_whoami(&api_url).await,
        Commands::Init { name } => cmd_init(&api_url, &name).await,
        Commands::Project(cmd) => match cmd {
            ProjectCommands::List => cmd_project_list(&api_url).await,
            ProjectCommands::Show { project_id } => cmd_project_show(&api_url, &project_id).await,
            ProjectCommands::Select { project_id } => cmd_project_select(&project_id),
            ProjectCommands::Delete { project_id } => cmd_project_delete(&api_url, &project_id).await,
        },
        Commands::Build { project_id, platform } => {
            cmd_build(&api_url, &project_id, &platform).await
        }
        Commands::Publish { project_id } => cmd_publish(&api_url, &project_id).await,
        Commands::Doctor => cmd_doctor(),
        Commands::Sdk(cmd) => match cmd {
            SdkCommands::Info => cmd_sdk_info(&api_url).await,
            SdkCommands::Update => cmd_sdk_update(),
        },
    }
}
