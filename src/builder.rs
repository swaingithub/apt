use anyhow::{Context, Result};
use chrono::Utc;
use regex::Regex;
use std::collections::HashMap;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use zip::ZipArchive;

#[derive(Clone, Debug)]
pub struct BuildProgress {
    pub build_id: String,
    pub app_id: String,
    pub platform: String,
    pub status: String,
    pub message: String,
    pub output_file: Option<String>,
    pub created_at: String,
}

pub type BuildTracker = Arc<Mutex<HashMap<String, BuildProgress>>>;

pub struct EASBuilder;

impl EASBuilder {
    pub fn create_tracker() -> BuildTracker {
        Arc::new(Mutex::new(HashMap::new()))
    }

    pub fn submit_build(
        app_id: &str,
        platform: &str,
        source_zip: &Path,
        tracker: BuildTracker,
    ) -> Result<String> {
        let build_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        let build_dir = PathBuf::from("./temp").join(&build_id);
        std::fs::create_dir_all(&build_dir)?;
        Self::extract_zip(source_zip, &build_dir)?;

        let progress = BuildProgress {
            build_id: build_id.clone(),
            app_id: app_id.to_string(),
            platform: platform.to_string(),
            status: "queued".to_string(),
            message: "Preparing build...".to_string(),
            output_file: None,
            created_at: now,
        };

    {
        let mut t = tracker.lock().unwrap();
        t.insert(build_id.clone(), progress);
    }

    let bid = build_id.clone();
    let dir = build_dir.clone();
    let plat = platform.to_string();
    let tr = tracker.clone();

    tokio::task::spawn_blocking(move || {
        Self::run_build(&bid, &dir, &plat, tr);
    });

    Ok(build_id)
}

    fn run_build(build_id: &str, build_dir: &Path, platform: &str, tracker: BuildTracker) {
        let update = |status: &str, msg: &str, file: Option<String>| {
            let mut t = tracker.lock().unwrap();
            if let Some(p) = t.get_mut(build_id) {
                p.status = status.to_string();
                p.message = msg.to_string();
                p.output_file = file;
            }
        };

        update("building", "Installing dependencies...", None);

        // Remove lockfile to force fresh resolution (template may be stale)
        let _ = std::fs::remove_file(build_dir.join("package-lock.json"));

        let install = Command::new("npm")
            .args(["install", "--legacy-peer-deps"])
            .current_dir(build_dir)
            .output();

        match install {
            Ok(out) if !out.status.success() => {
                let err = String::from_utf8_lossy(&out.stderr);
                update("failed", &format!("npm install failed: {}", err), None);
                let _ = std::fs::remove_dir_all(build_dir);
                return;
            }
            Err(e) => {
                update("failed", &format!("npm install error: {}", e), None);
                let _ = std::fs::remove_dir_all(build_dir);
                return;
            }
            _ => {}
        }

        update("building", "Generating native code (expo prebuild)...", None);

        // Remove any pre-existing native dirs to force clean regeneration
        let _ = std::fs::remove_dir_all(build_dir.join("android"));
        let _ = std::fs::remove_dir_all(build_dir.join("ios"));

        let prebuild = Command::new("npx")
            .args(["expo", "prebuild", "--no-install"])
            .current_dir(build_dir)
            .output();

        match prebuild {
            Ok(out) if !out.status.success() => {
                let err = String::from_utf8_lossy(&out.stderr);
                update("failed", &format!("expo prebuild failed: {}", err), None);
                let _ = std::fs::remove_dir_all(build_dir);
                return;
            }
            _ => {}
        }

        update("building", "Initializing git for EAS...", None);

        // Write .gitignore to exclude node_modules and build artifacts
        let _ = std::fs::write(build_dir.join(".gitignore"), "node_modules/\n.expo/\ndist/\n*.tsbuildinfo\n");

        let git_init = Command::new("git")
            .args(["init"])
            .current_dir(build_dir)
            .output();

        if git_init.map_or(true, |o| !o.status.success()) {
            update("failed", "git init failed", None);
            let _ = std::fs::remove_dir_all(build_dir);
            return;
        }

        let _ = Command::new("git")
            .args(["config", "user.email", "build@apt.app"])
            .current_dir(build_dir)
            .output();
        let _ = Command::new("git")
            .args(["config", "user.name", "Apt Builder"])
            .current_dir(build_dir)
            .output();

        let _ = Command::new("git")
            .args(["add", "-A"])
            .current_dir(build_dir)
            .output();
        let _ = Command::new("git")
            .args(["commit", "-m", "Initial commit", "--allow-empty", "--no-gpg-sign"])
            .current_dir(build_dir)
            .output();

        // Remove node_modules before EAS build (EAS will reinstall)
        let _ = std::fs::remove_dir_all(build_dir.join("node_modules"));

        update("building", format!("Building {} on EAS cloud... (5-15 min)", platform).as_str(), None);

        let profile = match platform {
            "android" => "production",
            "ios" => "production",
            _ => "production",
        };

        let eas_output = Command::new("npx")
            .args([
                "eas",
                "build",
                "--platform",
                platform,
                "--profile",
                profile,
                "--non-interactive",
                "--wait",
            ])
            .current_dir(build_dir)
            .output();

        match eas_output {
            Ok(out) if out.status.success() => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let stderr = String::from_utf8_lossy(&out.stderr);
                let combined = format!("{}\n{}", stdout, stderr);

                let artifact_url = Self::extract_artifact_url(&combined);

                match artifact_url {
                    Some(url) => {
                        update("downloading", "Downloading build artifact...", None);

                        match Self::download_artifact(&url, build_id, platform) {
                            Ok(path) => {
                                update(
                                    "completed",
                                    &format!("Build completed successfully!"),
                                    Some(path),
                                );
                            }
                            Err(e) => {
                                update(
                                    "completed",
                                    &format!("Build completed but download failed: {}. Artifact URL: {}", e, url),
                                    None,
                                );
                            }
                        }
                    }
                    None => {
                        update(
                            "completed",
                            "Build completed but artifact URL not found in output.",
                            None,
                        );
                    }
                }
            }
            Ok(out) => {
                let stderr = String::from_utf8_lossy(&out.stderr);
                let stdout = String::from_utf8_lossy(&out.stdout);
                update(
                    "failed",
                    &format!("EAS build failed:\n{}\n{}", stdout, stderr),
                    None,
                );
            }
            Err(e) => {
                update("failed", &format!("EAS build error: {}", e), None);
            }
        }

        let _ = std::fs::remove_dir_all(build_dir);
    }

    fn extract_artifact_url(output: &str) -> Option<String> {
        let patterns = [
            r"https://expo\.dev/artifacts/eas/[a-f0-9-]+",
            r"https://api\.expo\.dev/v2/.*?/artifact",
            r"Build Artifact:\s*(https?://[^\s]+)",
        ];
        for pattern in &patterns {
            if let Ok(re) = Regex::new(pattern) {
                if let Some(m) = re.find(output) {
                    return Some(m.as_str().to_string());
                }
            }
        }
        None
    }

    fn download_artifact(url: &str, build_id: &str, platform: &str) -> Result<String> {
        let ext = match platform {
            "android" => "apk",
            "ios" => "zip",
            _ => "bin",
        };
        let output_path = format!("./output/{}_{}.{}", build_id, platform, ext);

        let status = Command::new("curl")
            .args(["-L", "-o", &output_path, url])
            .status()
            .context("Failed to run curl")?;

        if status.success() && Path::new(&output_path).exists() {
            Ok(output_path)
        } else {
            let response = reqwest::blocking::get(url).context("Failed to download artifact")?;
            let bytes = response.bytes().context("Failed to read response body")?;
            std::fs::write(&output_path, &bytes)?;
            Ok(output_path)
        }
    }

    fn extract_zip(zip_path: &Path, dest: &Path) -> Result<()> {
        let file = std::fs::File::open(zip_path)?;
        let mut archive = ZipArchive::new(BufReader::new(file))?;

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i)?;
            let entry_path = entry.mangled_name();
            let target = dest.join(&entry_path);

            if entry.is_dir() {
                std::fs::create_dir_all(&target)?;
            } else {
                if let Some(parent) = target.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                let mut output_file = std::fs::File::create(&target)?;
                std::io::copy(&mut entry, &mut output_file)?;
            }
        }

        Ok(())
    }
}
