use anyhow::Result;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::fs;
use std::io::{BufWriter, Read, Write};
use std::path::{Path, PathBuf};
use zip::{write::FileOptions, ZipWriter};

pub struct AppGenerator;

impl AppGenerator {
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

        let nm = output_path.join("node_modules");
        if nm.exists() {
            fs::remove_dir_all(&nm)?;
        }

        // Write project config
        let config_ts = Self::render_project_config(project_config);
        fs::write(output_path.join("src").join("theme").join("config.ts"), config_ts)?;

        // Generate integrations.ts from third-party SDK config
        let integrations_ts = Self::render_integrations(project_config);
        fs::write(output_path.join("src").join("apt").join("integrations.ts"), integrations_ts)?;

        Self::update_app_json(&output_path, display_name, package_name, version, primary_color)?;

        // Extract SDK npm packages for package.json injection
        let sdk_packages = Self::extract_sdk_packages(project_config);
        Self::update_package_json(&output_path, app_name, version, &sdk_packages)?;

        let zip_path = format!("./output/{}_source.zip", app_id);
        fs::create_dir_all("./output")?;
        Self::create_zip(&output_path, &zip_path)?;

        Ok(zip_path)
    }

    fn render_project_config(config: &Value) -> String {
        let mut augmented = config.clone();
        // Remove internal keys before writing to config.ts
        if let Some(obj) = augmented.as_object_mut() {
            obj.remove("_integrations");
        }
        let app_name = config.get("appName").and_then(|v| v.as_str()).unwrap_or("app");
        let slug = app_name.to_lowercase().replace(" ", "-");
        if let Some(obj) = augmented.as_object_mut() {
            let runtime = obj.entry("runtime").or_insert(json!({}));
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

    /// Extract enabled third-party SDK configs and generate initialization code
    fn render_integrations(config: &Value) -> String {
        let integrations = config.get("_integrations")
            .and_then(|v| v.as_object())
            .map(|m| {
                let mut result = BTreeMap::new();
                for (key, val) in m {
                    if let Some(obj) = val.as_object() {
                        if obj.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                            let cfg = obj.get("config").and_then(|v| v.as_object()).cloned().unwrap_or_default();
                            let mut clean = BTreeMap::new();
                            for (k, v) in cfg {
                                clean.insert(k.clone(), v.as_str().unwrap_or("").to_string());
                            }
                            result.insert(key.clone(), clean);
                        }
                    }
                }
                result
            })
            .unwrap_or_default();

        if integrations.is_empty() {
            return "// No third-party SDK integrations enabled\n".to_string();
        }

        let mut lines = vec![
            "// Auto-generated SDK integrations".to_string(),
            "// This file is regenerated on each build.".to_string(),
            String::new(),
            "export const INTEGRATIONS: Record<string, Record<string, string>> = {".to_string(),
        ];

        let mut sdk_sorted: Vec<&String> = integrations.keys().collect();
        sdk_sorted.sort();
        for key in &sdk_sorted {
            let cfg = &integrations[*key];
            lines.push(format!("  '{}': {{", key));
            let mut keys: Vec<&String> = cfg.keys().collect();
            keys.sort();
            for k in keys {
                let v = &cfg[k];
                lines.push(format!("    '{}': '{}',", k, v));
            }
            lines.push("  },".to_string());
        }
        lines.push("};".to_string());
        lines.push(String::new());

        // Generate init calls for each SDK
        lines.push("export async function initializeIntegrations(): Promise<void> {".to_string());
        for key in &sdk_sorted {
            lines.push(format!("  // {} SDK setup", key));
            lines.push(format!("  if (INTEGRATIONS['{}']) {{", key));
            lines.push(format!("    const cfg = INTEGRATIONS['{}'];", key));
            lines.push(format!("    console.log('[Integrations] Initializing {} with', Object.keys(cfg).length, 'config keys');", key));
            lines.push("  }".to_string());
        }
        lines.push("}".to_string());
        lines.push(String::new());
        lines.push("export default INTEGRATIONS;".to_string());
        lines.join("\n")
    }

    /// Collect npm package names from enabled third-party SDKs
    fn extract_sdk_packages(config: &Value) -> Vec<String> {
        let mut packages = Vec::new();
        // This is a lookup table — kept in sync with THIRD_PARTY_SDKS in the frontend
        let sdk_npm: Vec<(&str, &str)> = vec![
            ("gokwik", "gokwik-react-native-sdk"),
            ("razorpay", "razorpay-react-native"),
            ("cashfree", "cashfree-pg-react-native-sdk"),
            ("stripe", "@stripe/stripe-react-native"),
            ("instamojo", "instamojo-react-native"),
            ("return_prime", "return-prime-react-native-sdk"),
            ("shiprocket", "shiprocket-react-native-sdk"),
            ("delhivery", "delhivery-react-native-sdk"),
            ("shipway", "shipway-react-native-sdk"),
            ("mixpanel", "mixpanel-react-native"),
            ("clevertap", "clevertap-react-native"),
            ("firebase_analytics", "@react-native-firebase/analytics"),
            ("intercom", "intercom-react-native"),
        ];

        if let Some(integrations) = config.get("_integrations").and_then(|v| v.as_object()) {
            for (key, val) in integrations {
                let enabled = val.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
                if enabled {
                    if let Some(pkg) = sdk_npm.iter().find(|(k, _)| *k == key).map(|(_, p)| *p) {
                        if !packages.contains(&pkg.to_string()) {
                            packages.push(pkg.to_string());
                        }
                    }
                }
            }
        }
        packages
    }

    fn update_package_json(path: &Path, app_name: &str, version: &str, sdk_packages: &[String]) -> Result<()> {
        let pkg_path = path.join("package.json");
        let content = fs::read_to_string(&pkg_path)?;
        let mut pkg: Value = serde_json::from_str(&content)?;

        if let Some(obj) = pkg.as_object_mut() {
            obj.insert("name".to_string(), Value::String(app_name.to_string()));
            obj.insert("version".to_string(), Value::String(version.to_string()));

            // Inject SDK dependencies
            if !sdk_packages.is_empty() {
                let deps = obj.entry("dependencies").or_insert(json!({}));
                if let Some(deps_obj) = deps.as_object_mut() {
                    for pkg_name in sdk_packages {
                        if !deps_obj.contains_key(pkg_name) {
                            deps_obj.insert(pkg_name.clone(), Value::String("*".to_string()));
                        }
                    }
                }
            }
        }

        fs::write(&pkg_path, serde_json::to_string_pretty(&pkg)?)?;
        Ok(())
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
