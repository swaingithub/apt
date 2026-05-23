use crate::db::Database;
use rusqlite::{params, Result as SqlResult};

impl Database {
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
}
