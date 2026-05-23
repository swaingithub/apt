use crate::db::Database;
use rusqlite::{params, Result as SqlResult};

impl Database {
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
}
