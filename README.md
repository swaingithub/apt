# Apt — Visual No-Code React Native App Builder

A full-stack drag-and-drop mobile app builder. Design pages visually in your browser, publish configs to an API, and run the result live on a real device via Expo. Rust backend + React dashboard + React Native runtime.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌────────────────────┐
│  Dashboard       │────▶│  Rust API    │────▶│  Mobile App        │
│  (browser)       │     │  (port 8080) │     │  (Expo / React     │
│  Build pages,    │     │  Serve       │     │   Native)          │
│  add blocks,     │     │  configs     │     │  Fetches config    │
│  publish         │     │  + static    │     │  from API on start │
└─────────────────┘     └──────────────┘     └────────────────────┘
```

- **Dashboard**: Two options — modern React frontend (`npm run dev`, port 5173) or the legacy HTML/JS dashboard served directly by the Rust server (port 8080)
- **Rust API**: Actix-web server with SQLite, serves the dashboard + REST API + Config API for mobile
- **Mobile Runtime**: Expo SDK 54 project in `mobile-expo/` — fetches published config from the server and renders pages/blocks

## Quick Start

```bash
# Terminal 1 — Start the Rust server (API + legacy dashboard)
cargo run
# → http://localhost:8080

# Terminal 2 — React dashboard (optional, modern frontend)
npm install && npm run dev
# → http://localhost:5173 (proxies /api to 8080)

# Terminal 3 — Mobile app (after generating an app)
cd mobile-expo
npm install
npx expo start
# → Scan QR code with Expo Go on your phone
```

## Dashboard Features

| Feature | Description |
|---|---|
| **Page Builder** | Visual block-based builder with phone-frame canvas |
| **Block Palette** | 20+ block types: heading, text, image, button, grid, tabs, chart, map, banner, carousel, etc. |
| **Live Preview** | Side-by-side phone preview updates in real-time |
| **Theme Presets** | 8 color themes, custom color pickers |
| **Publishing** | Snapshot config and serve via Config API |
| **Phone Preview** | Full-screen simulator with navigation, state, and action handling |
| **EAS Builds** | Trigger Android APK builds via Expo EAS |
| **Multi-user** | Auth with JWT, per-user app isolation |
| **Normalized Schema** | settings, pages, blocks, navigation tables with CRUD |

## API Endpoints

### Config API (public, used by mobile apps)
```
GET /api/v1/config/{slug}
```

### Auth
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Apps
```
GET    /api/apps
POST   /api/apps
GET    /api/apps/{id}
PUT    /api/apps/{id}
DELETE /api/apps/{id}
POST   /api/apps/{id}/publish
GET    /api/apps/{id}/builds
POST   /api/apps/{id}/build
GET    /api/apps/{id}/download
```

### Normalized CRUD
```
GET/POST    /api/v1/apps/{id}/settings
GET/PUT/DEL /api/v1/apps/{id}/settings/{setting_id}
GET/POST    /api/v1/apps/{id}/pages
GET/PUT/DEL /api/v1/apps/{id}/pages/{page_id}
GET/POST    /api/v1/apps/{id}/blocks
GET/PUT/DEL /api/v1/apps/{id}/blocks/{block_id}
GET/POST    /api/v1/apps/{id}/navigation
GET/PUT/DEL /api/v1/apps/{id}/navigation/{nav_id}
GET/POST    /api/v1/apps/{id}/media
GET         /api/v1/apps/{id}/publish
```

## Deploy to Railway (Free)

1. Push this repo to GitHub
2. Go to [Railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables:
   - `APT_API_BASE_URL` = `https://your-app.railway.app` (your Railway domain)
4. Railway auto-detects `Cargo.toml` and builds with `nixpacks.toml`
5. Your dashboard + API will be live at the Railway URL

The generated mobile app's `config.ts` will use `APT_API_BASE_URL` to know where to fetch its published config.

## Project Structure

```
├── src/                  # Rust backend + React frontend (coexist)
│   ├── main.rs           # Server entry, binds 0.0.0.0:$PORT
│   ├── api.rs            # API endpoints + ConfigCache
│   ├── db.rs             # SQLite schema + CRUD
│   ├── models.rs         # Data types
│   ├── app_generator.rs  # Expo project generator
│   ├── builder.rs        # EAS build handling
│   ├── auth.rs           # JWT auth
│   └── ...tsx            # React frontend components
├── static/               # Legacy HTML/JS dashboard
├── dist/                 # Built React frontend (auto-generated)
├── mobile-expo/          # React Native runtime (SDK 54)
│   ├── App.tsx           # Entry — loads config from server
│   └── src/apt/          # Framework: renderer, FilterSystem,
│                          #   BlockRegistry, ActionHandler, etc.
├── nixpacks.toml         # Railway build config
├── Procfile              # Railway start command
└── railway.json          # Railway project settings
```
