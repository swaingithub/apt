use crate::db::Database;
use rusqlite::{params, Result as SqlResult};

impl Database {
    pub fn create_user(&self, id: &str, email: &str, hash: &str, name: &str, now: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, email, hash, name, now],
        )?;
        Ok(())
    }

    pub fn get_user_by_email(&self, email: &str) -> SqlResult<Option<(String, String, String, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, email, password_hash, name FROM users WHERE email = ?1")?;
        let mut rows = stmt.query(params![email])?;
        match rows.next()? {
            Some(row) => Ok(Some((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
            ))),
            None => Ok(None),
        }
    }

    pub fn get_user_by_id(&self, id: &str) -> SqlResult<Option<(String, String, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, email, name FROM users WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        match rows.next()? {
            Some(row) => Ok(Some((row.get(0)?, row.get(1)?, row.get(2)?))),
            None => Ok(None),
        }
    }

    pub fn update_user(&self, id: &str, email: &str, name: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE users SET email = ?1, name = ?2 WHERE id = ?3",
            params![email, name, id],
        )?;
        Ok(())
    }

    pub fn update_password(&self, id: &str, hash: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE users SET password_hash = ?1 WHERE id = ?2",
            params![hash, id],
        )?;
        Ok(())
    }

    pub fn delete_user(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM users WHERE id = ?1", params![id])?;
        Ok(())
    }
}
