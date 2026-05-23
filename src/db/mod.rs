use rusqlite::{Connection, Result as SqlResult};
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &str) -> SqlResult<Self> {
        let conn = Connection::open(path)?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        let db = Database {
            conn: Mutex::new(conn),
        };

        db.init_tables()?;

        let conn = db.conn.lock().unwrap();

        // Migrations for older databases
        let _ = conn.execute("ALTER TABLE generated_apps ADD COLUMN config TEXT NOT NULL DEFAULT '{}'", []);
        let _ = conn.execute("ALTER TABLE generated_apps ADD COLUMN slug TEXT DEFAULT ''", []);
        let _ = conn.execute("ALTER TABLE generated_apps ADD COLUMN platform TEXT DEFAULT 'custom'", []);
        let _ = conn.execute("ALTER TABLE generated_apps ADD COLUMN store_url TEXT DEFAULT ''", []);

        // Add indexes for new tables
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_blocks_page_id ON blocks(page_id)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_blocks_parent_id ON blocks(parent_id)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_pages_app_id ON pages(app_id)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_app_settings_app_id ON app_settings(app_id)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_published_configs_app_current ON published_configs(app_id, is_current)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_generated_apps_slug ON generated_apps(slug)", []);

        // Ensure anonymous user exists for unauthenticated requests
        let _ = conn.execute(
            "INSERT OR IGNORE INTO users (id, email, password_hash, name, created_at) VALUES ('anonymous', 'anon@apt.local', 'disabled', 'Anonymous', '2024-01-01T00:00:00Z')",
            [],
        );

        drop(conn);
        Ok(db)
    }

    fn init_tables(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                config TEXT NOT NULL DEFAULT '{}',
                screens TEXT NOT NULL DEFAULT '[]',
                theme TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS builds (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                output_file TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS generated_apps (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                app_name TEXT NOT NULL,
                zip_path TEXT NOT NULL,
                config TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            -- Normalized Appmaker tables
            CREATE TABLE IF NOT EXISTS app_settings (
                id TEXT PRIMARY KEY,
                app_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL DEFAULT '{}',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (app_id) REFERENCES generated_apps(id) ON DELETE CASCADE,
                UNIQUE(app_id, key)
            );

            CREATE TABLE IF NOT EXISTS pages (
                id TEXT PRIMARY KEY,
                app_id TEXT NOT NULL,
                page_id TEXT NOT NULL,
                title TEXT DEFAULT '',
                type TEXT DEFAULT 'custom',
                attributes TEXT NOT NULL DEFAULT '{}',
                is_published INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (app_id) REFERENCES generated_apps(id) ON DELETE CASCADE,
                UNIQUE(app_id, page_id)
            );

            CREATE TABLE IF NOT EXISTS blocks (
                id TEXT PRIMARY KEY,
                page_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                name TEXT NOT NULL,
                attributes TEXT NOT NULL DEFAULT '{}',
                parent_id TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS block_definitions (
                id TEXT PRIMARY KEY,
                app_id TEXT,
                name TEXT NOT NULL,
                label TEXT NOT NULL,
                category TEXT DEFAULT '',
                icon TEXT DEFAULT '',
                schema TEXT NOT NULL DEFAULT '[]',
                is_active INTEGER DEFAULT 1,
                UNIQUE(app_id, name)
            );

            CREATE TABLE IF NOT EXISTS navigation (
                id TEXT PRIMARY KEY,
                app_id TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'bottomTab',
                config TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (app_id) REFERENCES generated_apps(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS published_configs (
                id TEXT PRIMARY KEY,
                app_id TEXT NOT NULL,
                version TEXT NOT NULL,
                config TEXT NOT NULL,
                published_at TEXT NOT NULL,
                is_current INTEGER DEFAULT 0,
                FOREIGN KEY (app_id) REFERENCES generated_apps(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS media (
                id TEXT PRIMARY KEY,
                app_id TEXT NOT NULL,
                url TEXT NOT NULL,
                filename TEXT DEFAULT '',
                mime_type TEXT DEFAULT '',
                size_bytes INTEGER DEFAULT 0,
                alt_text TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (app_id) REFERENCES generated_apps(id) ON DELETE CASCADE
            );",
        )?;
        Ok(())
    }
}

pub mod users;
pub mod projects;
pub mod builds;
pub mod apps;
pub mod settings;
pub mod pages;
pub mod blocks;
pub mod navigation;
pub mod publish;
pub mod media;
