use crate::db::Database;
use rusqlite::{params, Result as SqlResult};

impl Database {
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
}
