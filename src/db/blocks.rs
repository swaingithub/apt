use crate::db::Database;
use rusqlite::{params, Result as SqlResult};

impl Database {
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
}
