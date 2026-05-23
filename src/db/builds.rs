use crate::db::Database;
use rusqlite::{params, Result as SqlResult};

impl Database {
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
}
