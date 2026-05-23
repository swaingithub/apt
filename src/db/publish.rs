use crate::db::Database;
use rusqlite::{params, Result as SqlResult};

impl Database {
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
}
