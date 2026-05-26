use crate::db::Database;

impl Database {
    pub fn get_analytics(&self, app_id: &str) -> Result<Option<serde_json::Value>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT value FROM app_settings WHERE app_id = ?1 AND key = 'analytics'"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row([app_id], |row| {
            let val: String = row.get(0)?;
            Ok(val)
        });

        match result {
            Ok(json_str) => {
                let v: serde_json::Value = serde_json::from_str(&json_str)
                    .map_err(|e| e.to_string())?;
                Ok(Some(v))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn set_analytics(&self, app_id: &str, data: &serde_json::Value) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let json_str = serde_json::to_string(data).map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO app_settings (id, app_id, key, value, updated_at)
             VALUES (?1, ?2, 'analytics', ?3, ?4)
             ON CONFLICT(app_id, key) DO UPDATE SET value = ?3, updated_at = ?4",
            rusqlite::params![
                uuid::Uuid::new_v4().to_string(),
                app_id,
                json_str,
                now
            ],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }
}
