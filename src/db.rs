use rusqlite::{Connection, Result as SqlResult, params};
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &str) -> SqlResult<Self> {
        let conn = Connection::open(path)?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                config TEXT NOT NULL DEFAULT '{}',
                screens TEXT NOT NULL DEFAULT '[]',
                theme TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS builds (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                output_file TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS generated_apps (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                app_name TEXT NOT NULL,
                zip_path TEXT NOT NULL,
                config TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            -- Normalized Appmaker tables
            CREATE TABLE IF NOT EXISTS app_settings (
                id TEXT PRIMARY KEY,
                app_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL DEFAULT '{}',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (app_id) REFERENCES generated_apps(id) ON DELETE CASCADE,
                UNIQUE(app_id, key)
            );

            CREATE TABLE IF NOT EXISTS pages (
                id TEXT PRIMARY KEY,
                app_id TEXT NOT NULL,
                page_id TEXT NOT NULL,
                title TEXT DEFAULT '',
                type TEXT DEFAULT 'custom',
                attributes TEXT NOT NULL DEFAULT '{}',
                is_published INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (app_id) REFERENCES generated_apps(id) ON DELETE CASCADE,
                UNIQUE(app_id, page_id)
            );

            CREATE TABLE IF NOT EXISTS blocks (
                id TEXT PRIMARY KEY,
                page_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                name TEXT NOT NULL,
                attributes TEXT NOT NULL DEFAULT '{}',
                parent_id TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS block_definitions (
                id TEXT PRIMARY KEY,
                app_id TEXT,
                name TEXT NOT NULL,
                label TEXT NOT NULL,
                category TEXT DEFAULT '',
                icon TEXT DEFAULT '',
                schema TEXT NOT NULL DEFAULT '[]',
                is_active INTEGER DEFAULT 1,
                UNIQUE(app_id, name)
            );

            CREATE TABLE IF NOT EXISTS navigation (
                id TEXT PRIMARY KEY,
                app_id TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'bottomTab',
                config TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (app_id) REFERENCES generated_apps(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS published_configs (
                id TEXT PRIMARY KEY,
                app_id TEXT NOT NULL,
                version TEXT NOT NULL,
                config TEXT NOT NULL,
                published_at TEXT NOT NULL,
                is_current INTEGER DEFAULT 0,
                FOREIGN KEY (app_id) REFERENCES generated_apps(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS media (
                id TEXT PRIMARY KEY,
                app_id TEXT NOT NULL,
                url TEXT NOT NULL,
                filename TEXT DEFAULT '',
                mime_type TEXT DEFAULT '',
                size_bytes INTEGER DEFAULT 0,
                alt_text TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (app_id) REFERENCES generated_apps(id) ON DELETE CASCADE
            );",
        )?;

        // Migrations for older databases
        let _ = conn.execute("ALTER TABLE generated_apps ADD COLUMN config TEXT NOT NULL DEFAULT '{}'", []);
        let _ = conn.execute("ALTER TABLE generated_apps ADD COLUMN slug TEXT DEFAULT ''", []);
        let _ = conn.execute("ALTER TABLE generated_apps ADD COLUMN platform TEXT DEFAULT 'custom'", []);
        let _ = conn.execute("ALTER TABLE generated_apps ADD COLUMN store_url TEXT DEFAULT ''", []);

        // Add indexes for new tables
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_blocks_page_id ON blocks(page_id)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_blocks_parent_id ON blocks(parent_id)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_pages_app_id ON pages(app_id)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_app_settings_app_id ON app_settings(app_id)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_published_configs_app_current ON published_configs(app_id, is_current)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_generated_apps_slug ON generated_apps(slug)", []);

        // Ensure anonymous user exists for unauthenticated requests
        let _ = conn.execute(
            "INSERT OR IGNORE INTO users (id, email, password_hash, name, created_at) VALUES ('anonymous', 'anon@apt.local', 'disabled', 'Anonymous', '2024-01-01T00:00:00Z')",
            [],
        );

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    pub fn create_user(&self, id: &str, email: &str, hash: &str, name: &str, now: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, email, hash, name, now],
        )?;
        Ok(())
    }

    pub fn get_user_by_email(&self, email: &str) -> SqlResult<Option<(String, String, String, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, email, password_hash, name FROM users WHERE email = ?1")?;
        let mut rows = stmt.query(params![email])?;
        match rows.next()? {
            Some(row) => Ok(Some((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
            ))),
            None => Ok(None),
        }
    }

    pub fn get_user_by_id(&self, id: &str) -> SqlResult<Option<(String, String, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, email, name FROM users WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        match rows.next()? {
            Some(row) => Ok(Some((row.get(0)?, row.get(1)?, row.get(2)?))),
            None => Ok(None),
        }
    }

    pub fn create_project(
        &self,
        id: &str,
        user_id: &str,
        name: &str,
        description: &str,
        config: &str,
        screens: &str,
        theme: &str,
        now: &str,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO projects (id, user_id, name, description, config, screens, theme, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
            params![id, user_id, name, description, config, screens, theme, now],
        )?;
        Ok(())
    }

    pub fn list_projects(&self, user_id: &str) -> SqlResult<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, config, screens, theme, created_at, updated_at
             FROM projects WHERE user_id = ?1 ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map(params![user_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "description": row.get::<_, String>(2)?,
                "config": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(3)?).unwrap_or_default(),
                "screens": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(4)?).unwrap_or_default(),
                "theme": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(5)?).unwrap_or_default(),
                "created_at": row.get::<_, String>(6)?,
                "updated_at": row.get::<_, String>(7)?,
            }))
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_project(&self, project_id: &str, user_id: &str) -> SqlResult<Option<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, config, screens, theme, created_at, updated_at
             FROM projects WHERE id = ?1 AND user_id = ?2",
        )?;
        let mut rows = stmt.query(params![project_id, user_id])?;
        match rows.next()? {
            Some(row) => Ok(Some(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "description": row.get::<_, String>(2)?,
                "config": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(3)?).unwrap_or_default(),
                "screens": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(4)?).unwrap_or_default(),
                "theme": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(5)?).unwrap_or_default(),
                "created_at": row.get::<_, String>(6)?,
                "updated_at": row.get::<_, String>(7)?,
            }))),
            None => Ok(None),
        }
    }

    pub fn update_project(
        &self,
        project_id: &str,
        user_id: &str,
        name: Option<&str>,
        description: Option<&str>,
        config: Option<&str>,
        screens: Option<&str>,
        theme: Option<&str>,
        now: &str,
    ) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let mut parts: Vec<String> = Vec::new();
        let mut vals: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(n) = name {
            parts.push("name = ?".to_string());
            vals.push(Box::new(n.to_string()));
        }
        if let Some(d) = description {
            parts.push("description = ?".to_string());
            vals.push(Box::new(d.to_string()));
        }
        if let Some(c) = config {
            parts.push("config = ?".to_string());
            vals.push(Box::new(c.to_string()));
        }
        if let Some(s) = screens {
            parts.push("screens = ?".to_string());
            vals.push(Box::new(s.to_string()));
        }
        if let Some(t) = theme {
            parts.push("theme = ?".to_string());
            vals.push(Box::new(t.to_string()));
        }

        if parts.is_empty() {
            return Ok(false);
        }

        parts.push("updated_at = ?".to_string());
        vals.push(Box::new(now.to_string()));

        let sql = format!(
            "UPDATE projects SET {} WHERE id = ? AND user_id = ?",
            parts.join(", ")
        );
        vals.push(Box::new(project_id.to_string()));
        vals.push(Box::new(user_id.to_string()));

        let param_refs: Vec<&dyn rusqlite::types::ToSql> = vals.iter().map(|v| v.as_ref()).collect();
        let affected = conn.execute(&sql, param_refs.as_slice())?;
        Ok(affected > 0)
    }

    pub fn delete_project(&self, project_id: &str, user_id: &str) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "DELETE FROM projects WHERE id = ?1 AND user_id = ?2",
            params![project_id, user_id],
        )?;
        Ok(affected > 0)
    }

    pub fn create_build(
        &self,
        id: &str,
        project_id: &str,
        user_id: &str,
        platform: &str,
        status: &str,
        output_file: Option<&str>,
        now: &str,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO builds (id, project_id, user_id, platform, status, output_file, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, project_id, user_id, platform, status, output_file, now],
        )?;
        Ok(())
    }

    pub fn update_build_status(&self, build_id: &str, status: &str, output_file: Option<&str>) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "UPDATE builds SET status = ?1, output_file = COALESCE(?2, output_file) WHERE id = ?3",
            params![status, output_file, build_id],
        )?;
        Ok(affected > 0)
    }

    pub fn get_build(&self, build_id: &str, user_id: &str) -> SqlResult<Option<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, project_id, platform, status, output_file, created_at
             FROM builds WHERE id = ?1 AND user_id = ?2",
        )?;
        let mut rows = stmt.query(params![build_id, user_id])?;
        match rows.next()? {
            Some(row) => Ok(Some(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "platform": row.get::<_, String>(2)?,
                "status": row.get::<_, String>(3)?,
                "output_file": row.get::<_, Option<String>>(4)?,
                "created_at": row.get::<_, String>(5)?,
            }))),
            None => Ok(None),
        }
    }

    pub fn create_generated_app(&self, id: &str, user_id: &str, app_name: &str, zip_path: &str, config: &str, now: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let slug = app_name.to_lowercase().replace(" ", "-");
        conn.execute(
            "INSERT INTO generated_apps (id, user_id, app_name, zip_path, config, slug, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, user_id, app_name, zip_path, config, slug, now],
        )?;
        Ok(())
    }

    pub fn list_generated_apps(&self, user_id: &str) -> SqlResult<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, app_name, zip_path, config, created_at
             FROM generated_apps WHERE user_id = ?1 ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map(params![user_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "app_name": row.get::<_, String>(1)?,
                "zip_path": row.get::<_, String>(2)?,
                "config": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(3)?).unwrap_or_default(),
                "created_at": row.get::<_, String>(4)?,
            }))
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn list_all_generated_apps(&self) -> SqlResult<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, user_id, app_name, zip_path, config, created_at
             FROM generated_apps ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "user_id": row.get::<_, String>(1)?,
                "app_name": row.get::<_, String>(2)?,
                "zip_path": row.get::<_, String>(3)?,
                "config": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(4)?).unwrap_or_default(),
                "created_at": row.get::<_, String>(5)?,
            }))
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_generated_app(&self, app_id: &str) -> SqlResult<Option<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, user_id, app_name, zip_path, config, created_at
             FROM generated_apps WHERE id = ?1",
        )?;
        let mut rows = stmt.query(params![app_id])?;
        match rows.next()? {
            Some(row) => Ok(Some(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "user_id": row.get::<_, String>(1)?,
                "app_name": row.get::<_, String>(2)?,
                "zip_path": row.get::<_, String>(3)?,
                "config": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(4)?).unwrap_or_default(),
                "created_at": row.get::<_, String>(5)?,
            }))),
            None => Ok(None),
        }
    }

    pub fn update_generated_app(&self, app_id: &str, app_name: &str, zip_path: &str, config: &str) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let slug = app_name.to_lowercase().replace(" ", "-");
        let affected = conn.execute(
            "UPDATE generated_apps SET app_name = ?1, zip_path = ?2, config = ?3, slug = ?4 WHERE id = ?5",
            params![app_name, zip_path, config, slug, app_id],
        )?;
        Ok(affected > 0)
    }

    pub fn delete_generated_app(&self, app_id: &str) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "DELETE FROM generated_apps WHERE id = ?1",
            params![app_id],
        )?;
        Ok(affected > 0)
    }

    pub fn list_builds_for_app(&self, app_id: &str) -> SqlResult<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, project_id, platform, status, output_file, created_at
             FROM builds WHERE project_id = ?1 ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map(params![app_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "app_id": row.get::<_, String>(1)?,
                "platform": row.get::<_, String>(2)?,
                "status": row.get::<_, String>(3)?,
                "output_file": row.get::<_, Option<String>>(4)?,
                "created_at": row.get::<_, String>(5)?,
            }))
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    // ── New Normalized Schema Methods ─────────────────────────────────

    pub fn get_app_by_slug(&self, slug: &str) -> SqlResult<Option<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        // First try exact slug match, then fall back to app_name match
        // (apps created via POST /api/apps may have empty slug)
        let mut stmt = conn.prepare(
            "SELECT id, user_id, app_name, zip_path, config, slug, platform, store_url, created_at
             FROM generated_apps
             WHERE slug = ?1 OR LOWER(REPLACE(app_name, ' ', '-')) = ?1
             ORDER BY created_at DESC LIMIT 1",
        )?;
        let mut rows = stmt.query(params![slug])?;
        match rows.next()? {
            Some(row) => Ok(Some(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "user_id": row.get::<_, String>(1)?,
                "app_name": row.get::<_, String>(2)?,
                "zip_path": row.get::<_, String>(3)?,
                "config": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(4)?).unwrap_or_default(),
                "slug": row.get::<_, String>(5)?,
                "platform": row.get::<_, String>(6)?,
                "store_url": row.get::<_, String>(7)?,
                "created_at": row.get::<_, String>(8)?,
            }))),
            None => Ok(None),
        }
    }

    // ── App Settings ──
    pub fn upsert_setting(&self, id: &str, app_id: &str, key: &str, value: &str, now: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO app_settings (id, app_id, key, value, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(app_id, key) DO UPDATE SET value = ?4, updated_at = ?5",
            params![id, app_id, key, value, now],
        )?;
        Ok(())
    }

    pub fn list_settings(&self, app_id: &str) -> SqlResult<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT key, value FROM app_settings WHERE app_id = ?1 ORDER BY key",
        )?;
        let rows = stmt.query_map(params![app_id], |row| {
            Ok(serde_json::json!({
                "key": row.get::<_, String>(0)?,
                "value": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(1)?).unwrap_or_default(),
            }))
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn delete_setting(&self, app_id: &str, key: &str) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "DELETE FROM app_settings WHERE app_id = ?1 AND key = ?2",
            params![app_id, key],
        )?;
        Ok(affected > 0)
    }

    // ── Pages ──
    pub fn create_page(&self, id: &str, app_id: &str, page_id: &str, title: &str, type_: &str, attributes: &str, now: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO pages (id, app_id, page_id, title, type, attributes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
            params![id, app_id, page_id, title, type_, attributes, now],
        )?;
        Ok(())
    }

    pub fn update_page(&self, page_db_id: &str, title: &str, attributes: &str, is_published: bool, now: &str) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let published_int = if is_published { 1 } else { 0 };
        let affected = conn.execute(
            "UPDATE pages SET title = ?1, attributes = ?2, is_published = ?3, updated_at = ?4 WHERE id = ?5",
            params![title, attributes, published_int, now, page_db_id],
        )?;
        Ok(affected > 0)
    }

    pub fn delete_page(&self, page_db_id: &str) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "DELETE FROM pages WHERE id = ?1",
            params![page_db_id],
        )?;
        Ok(affected > 0)
    }

    pub fn list_pages(&self, app_id: &str) -> SqlResult<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, page_id, title, type, attributes, is_published, created_at, updated_at
             FROM pages WHERE app_id = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map(params![app_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "page_id": row.get::<_, String>(1)?,
                "title": row.get::<_, String>(2)?,
                "type": row.get::<_, String>(3)?,
                "attributes": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(4)?).unwrap_or_default(),
                "is_published": row.get::<_, i32>(5)? != 0,
                "created_at": row.get::<_, String>(6)?,
                "updated_at": row.get::<_, String>(7)?,
            }))
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_page_by_page_id(&self, app_id: &str, page_id: &str) -> SqlResult<Option<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, page_id, title, type, attributes, is_published, created_at, updated_at
             FROM pages WHERE app_id = ?1 AND page_id = ?2",
        )?;
        let mut rows = stmt.query(params![app_id, page_id])?;
        match rows.next()? {
            Some(row) => Ok(Some(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "page_id": row.get::<_, String>(1)?,
                "title": row.get::<_, String>(2)?,
                "type": row.get::<_, String>(3)?,
                "attributes": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(4)?).unwrap_or_default(),
                "is_published": row.get::<_, i32>(5)? != 0,
                "created_at": row.get::<_, String>(6)?,
                "updated_at": row.get::<_, String>(7)?,
            }))),
            None => Ok(None),
        }
    }

    // ── Blocks ──
    pub fn create_block(&self, id: &str, page_id: &str, client_id: &str, name: &str, attributes: &str, parent_id: Option<&str>, sort_order: i32, now: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO blocks (id, page_id, client_id, name, attributes, parent_id, sort_order, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, page_id, client_id, name, attributes, parent_id, sort_order, now],
        )?;
        Ok(())
    }

    pub fn update_block(&self, block_db_id: &str, name: &str, attributes: &str, sort_order: i32) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "UPDATE blocks SET name = ?1, attributes = ?2, sort_order = ?3 WHERE id = ?4",
            params![name, attributes, sort_order, block_db_id],
        )?;
        Ok(affected > 0)
    }

    pub fn delete_block(&self, block_db_id: &str) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "DELETE FROM blocks WHERE id = ?1",
            params![block_db_id],
        )?;
        Ok(affected > 0)
    }

    pub fn list_blocks(&self, page_id: &str) -> SqlResult<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, client_id, name, attributes, parent_id, sort_order
             FROM blocks WHERE page_id = ?1 ORDER BY sort_order ASC",
        )?;
        let rows = stmt.query_map(params![page_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "client_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "attributes": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(3)?).unwrap_or_default(),
                "parent_id": row.get::<_, Option<String>>(4)?,
                "sort_order": row.get::<_, i32>(5)?,
            }))
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    // ── Navigation ──
    pub fn upsert_navigation(&self, id: &str, app_id: &str, type_: &str, config: &str, now: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO navigation (id, app_id, type, config, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET config = ?4, type = ?3, updated_at = ?5",
            params![id, app_id, type_, config, now],
        )?;
        Ok(())
    }

    pub fn get_navigation(&self, app_id: &str) -> SqlResult<Option<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, type, config FROM navigation WHERE app_id = ?1",
        )?;
        let mut rows = stmt.query(params![app_id])?;
        match rows.next()? {
            Some(row) => Ok(Some(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "type": row.get::<_, String>(1)?,
                "config": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(2)?).unwrap_or_default(),
            }))),
            None => Ok(None),
        }
    }

    // ── Published Configs ──
    pub fn create_published_config(&self, id: &str, app_id: &str, version: &str, config: &str, now: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        // Mark all existing as not current
        let _ = conn.execute(
            "UPDATE published_configs SET is_current = 0 WHERE app_id = ?1",
            params![app_id],
        );
        conn.execute(
            "INSERT INTO published_configs (id, app_id, version, config, published_at, is_current)
             VALUES (?1, ?2, ?3, ?4, ?5, 1)",
            params![id, app_id, version, config, now],
        )?;
        Ok(())
    }

    pub fn get_current_config(&self, app_id: &str) -> SqlResult<Option<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, version, config, published_at FROM published_configs WHERE app_id = ?1 AND is_current = 1",
        )?;
        let mut rows = stmt.query(params![app_id])?;
        match rows.next()? {
            Some(row) => Ok(Some(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "version": row.get::<_, String>(1)?,
                "config": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(2)?).unwrap_or_default(),
                "published_at": row.get::<_, String>(3)?,
            }))),
            None => Ok(None),
        }
    }

    pub fn list_published_configs(&self, app_id: &str) -> SqlResult<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, version, published_at, is_current FROM published_configs WHERE app_id = ?1 ORDER BY published_at DESC",
        )?;
        let rows = stmt.query_map(params![app_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "version": row.get::<_, String>(1)?,
                "published_at": row.get::<_, String>(2)?,
                "is_current": row.get::<_, i32>(3)? != 0,
            }))
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    // ── Media ──
    pub fn create_media(&self, id: &str, app_id: &str, url: &str, filename: &str, mime_type: &str, size_bytes: i64, alt_text: &str, now: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO media (id, app_id, url, filename, mime_type, size_bytes, alt_text, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, app_id, url, filename, mime_type, size_bytes, alt_text, now],
        )?;
        Ok(())
    }

    pub fn list_media(&self, app_id: &str) -> SqlResult<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, url, filename, mime_type, size_bytes, alt_text, created_at
             FROM media WHERE app_id = ?1 ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map(params![app_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "url": row.get::<_, String>(1)?,
                "filename": row.get::<_, String>(2)?,
                "mime_type": row.get::<_, String>(3)?,
                "size_bytes": row.get::<_, i64>(4)?,
                "alt_text": row.get::<_, String>(5)?,
                "created_at": row.get::<_, String>(6)?,
            }))
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn delete_media(&self, media_id: &str) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "DELETE FROM media WHERE id = ?1",
            params![media_id],
        )?;
        Ok(affected > 0)
    }
}
