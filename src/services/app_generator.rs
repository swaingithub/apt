use anyhow::Result;
use serde_json::Value;
use std::fs;
use std::io::{BufWriter, Read, Write};
use std::path::{Path, PathBuf};
use zip::{write::FileOptions, ZipWriter};

pub struct AppGenerator;

impl AppGenerator {
    /// Generate an Expo project from mobile-expo/ template,
    /// inject the user's ProjectConfig, and return the zip path.
    pub fn generate_from_template(
        app_id: &str,
        app_name: &str,
        project_config: &Value,
        package_name: &str,
        display_name: &str,
        version: &str,
        primary_color: &str,
    ) -> Result<String> {
        let temp_dir = tempfile::TempDir::new()?;
        let output_path = temp_dir.path().join(app_name);

        let template_path = PathBuf::from("./mobile-expo");
        if !template_path.exists() {
            anyhow::bail!("mobile-expo/ template directory not found");
        }

        Self::copy_template(&template_path, &output_path)?;

        // Remove node_modules if present in template
        let nm = output_path.join("node_modules");
        if nm.exists() {
            fs::remove_dir_all(&nm)?;
        }

        // Write project config as TypeScript (the only file that changes per user)
        let config_ts = Self::render_project_config(project_config);
        fs::write(output_path.join("src").join("theme").join("config.ts"), config_ts)?;

        // Update app.json with user metadata
        Self::update_app_json(&output_path, display_name, package_name, version, primary_color)?;

        // Update package.json with user app name
        Self::update_package_json(&output_path, app_name, version)?;

        // Create zip archive (use app_id for unique filename)
        let zip_path = format!("./output/{}_source.zip", app_id);
        fs::create_dir_all("./output")?;
        Self::create_zip(&output_path, &zip_path)?;

        Ok(zip_path)
    }

    fn copy_template(src: &Path, dst: &Path) -> Result<()> {
        fs::create_dir_all(dst)?;
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let entry_type = entry.file_type()?;
            let name = entry.file_name();
            let src_path = entry.path();
            let dst_path = dst.join(&name);

            // Skip node_modules, target, .git
            if name == "node_modules" || name == "target" || name == ".git" {
                continue;
            }

            if entry_type.is_dir() {
                Self::copy_template(&src_path, &dst_path)?;
            } else {
                fs::copy(&src_path, &dst_path)?;
            }
        }
        Ok(())
    }

    fn render_project_config(config: &Value) -> String {
        let mut augmented = config.clone();
        // Inject runtime metadata so the mobile app knows its identity
        let app_name = config.get("appName").and_then(|v| v.as_str()).unwrap_or("app");
        let slug = app_name.to_lowercase().replace(" ", "-");
        if let Some(obj) = augmented.as_object_mut() {
            let runtime = obj.entry("runtime").or_insert(serde_json::json!({}));
            if let Some(rt) = runtime.as_object_mut() {
                if !rt.contains_key("slug") {
                    rt.insert("slug".into(), Value::String(slug));
                }
                if !rt.contains_key("apiBaseUrl") {
                    let base_url = std::env::var("APT_API_BASE_URL").unwrap_or_else(|_| "http://localhost:8080".into());
                    rt.insert("apiBaseUrl".into(), Value::String(base_url));
                }
            }
        }
        let json = serde_json::to_string_pretty(&augmented).unwrap_or_else(|_| "{}".to_string());
        format!(
            "import type {{ ProjectConfig }} from '../apt';\n\
             \n\
             const config: ProjectConfig = {};\n\
             \n\
             export default config;\n",
            json
        )
    }

    fn update_app_json(
        path: &Path,
        display_name: &str,
        package_name: &str,
        version: &str,
        primary_color: &str,
    ) -> Result<()> {
        let app_json_path = path.join("app.json");
        let content = fs::read_to_string(&app_json_path)?;
        let mut app: Value = serde_json::from_str(&content)?;

        if let Some(expo) = app.get_mut("expo") {
            if let Some(obj) = expo.as_object_mut() {
                obj.insert("name".to_string(), Value::String(display_name.to_string()));
                obj.insert("version".to_string(), Value::String(version.to_string()));
                // Keep the original slug (apt-mobile) so EAS project ID stays valid

                if let Some(ios) = obj.get_mut("ios") {
                    if let Some(ios_obj) = ios.as_object_mut() {
                        ios_obj.insert(
                            "bundleIdentifier".to_string(),
                            Value::String(package_name.to_string()),
                        );
                    }
                }

                if let Some(android) = obj.get_mut("android") {
                    if let Some(android_obj) = android.as_object_mut() {
                        android_obj.insert(
                            "package".to_string(),
                            Value::String(package_name.to_string()),
                        );
                        if let Some(icon) = android_obj.get_mut("adaptiveIcon") {
                            if let Some(icon_obj) = icon.as_object_mut() {
                                icon_obj.insert(
                                    "backgroundColor".to_string(),
                                    Value::String(primary_color.to_string()),
                                );
                            }
                        }
                    }
                }
            }
        }

        fs::write(&app_json_path, serde_json::to_string_pretty(&app)?)?;
        Ok(())
    }

    fn update_package_json(path: &Path, app_name: &str, version: &str) -> Result<()> {
        let pkg_path = path.join("package.json");
        let content = fs::read_to_string(&pkg_path)?;
        let mut pkg: Value = serde_json::from_str(&content)?;

        if let Some(obj) = pkg.as_object_mut() {
            obj.insert("name".to_string(), Value::String(app_name.to_string()));
            obj.insert("version".to_string(), Value::String(version.to_string()));
        }

        fs::write(&pkg_path, serde_json::to_string_pretty(&pkg)?)?;
        Ok(())
    }

    fn create_zip(source_path: &Path, zip_path: &str) -> Result<()> {
        let file = fs::File::create(zip_path)?;
        let mut zip = ZipWriter::new(BufWriter::new(file));
        let options = FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o755);

        Self::zip_dir(&mut zip, source_path, source_path, options)?;

        zip.finish()?;
        Ok(())
    }

    fn zip_dir(
        zip: &mut ZipWriter<BufWriter<fs::File>>,
        prefix: &Path,
        base: &Path,
        options: FileOptions,
    ) -> Result<()> {
        for entry in fs::read_dir(prefix)? {
            let entry = entry?;
            let path = entry.path();
            let name = path.strip_prefix(base)?;

            if path.is_dir() {
                zip.add_directory(name.to_string_lossy().as_ref(), options)?;
                Self::zip_dir(zip, &path, base, options)?;
            } else {
                zip.start_file(name.to_string_lossy().as_ref(), options)?;
                let mut file = fs::File::open(&path)?;
                let mut buffer = Vec::new();
                file.read_to_end(&mut buffer)?;
                zip.write_all(&buffer)?;
            }
        }
        Ok(())
    }
}
