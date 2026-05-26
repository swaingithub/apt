use crate::db::Database;
use rusqlite::{params, Result as SqlResult};

impl Database {
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

    #[allow(dead_code)]
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
}
