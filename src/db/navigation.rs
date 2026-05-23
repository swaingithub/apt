use crate::db::Database;
use rusqlite::{params, Result as SqlResult};

impl Database {
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
}
