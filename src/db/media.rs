use crate::db::Database;
use rusqlite::{params, Result as SqlResult};

impl Database {
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
