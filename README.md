# AppMake Clone - Rust-Based Mobile App Generator

A powerful Rust-based backend system that generates React Native/Expo mobile applications with build capabilities for Android (.apk) and iOS (ZIP), plus Expo QR code scanning for instant preview.

## Features

- 🚀 Generate React Native/Expo mobile apps from web interface
- 📦 Download source code as ZIP file
- 🤖 Build Android APK files
- 🍎 Build iOS ZIP packages
- 📱 Generate Expo QR codes for instant app preview
- 🎨 Customizable app configuration (colors, names, package IDs)
- ⚡ Fast Rust-based backend with Actix-web
- 🌐 Modern web frontend with responsive design

## Architecture

### Backend (Rust)
- **Actix-web**: High-performance web framework
- **Expo App Generator**: Creates React Native/Expo project structure
- **Build System**: Integrates with Expo EAS for Android/iOS builds
- **QR Code Generator**: Generates scannable QR codes for Expo Go app

### Frontend (Web)
- Modern HTML/CSS/JavaScript interface
- Real-time app configuration
- Download management for source code and builds
- QR code display for Expo preview

## Prerequisites

- Rust 1.70 or higher
- Node.js and npm (for Expo builds)
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd appmake-clone
```

2. Install Rust dependencies:
```bash
cargo build
```

3. Create output directories:
```bash
mkdir -p output temp
```

## Running the Server

Start the Rust backend server:
```bash
cargo run
```

The server will start on `http://localhost:8080`

## Using the Web Interface

1. Open your browser and navigate to `http://localhost:8080`
2. Fill in the app configuration form:
   - App Name (e.g., "MyAwesomeApp")
   - Display Name (e.g., "My Awesome App")
   - Package Name (e.g., "com.example.myawesomeapp")
   - Version (e.g., "1.0.0")
   - Primary and Secondary Colors
   - Description and Author (optional)
3. Click "Generate App" to create your React Native/Expo app
4. After generation, you can:
   - Download the source code as a ZIP file
   - Build Android APK
   - Build iOS ZIP
   - Show Expo QR code for instant preview

## API Endpoints

### Health Check
```
GET /api/health
```

### Create App
```
POST /api/apps
Content-Type: application/json

{
  "config": {
    "appName": "MyApp",
    "displayName": "My App",
    "packageName": "com.example.myapp",
    "version": "1.0.0",
    "primaryColor": "#4F46E5",
    "secondaryColor": "#ffffff",
    "description": "My awesome app",
    "author": "John Doe"
  },
  "features": []
}
```

### Build App
```
POST /api/apps/{app_id}/build
Content-Type: application/json

{
  "platform": "android"  // or "ios"
}
```

### Download Source Code
```
GET /api/apps/{app_id}/download
```

### Download Build
```
GET /api/builds/{build_id}/download
```

### Get QR Code
```
GET /api/apps/{app_id}/qr
```

## Generated App Structure

The generated Expo app includes:
- `package.json` - Dependencies and scripts
- `app.json` - Expo configuration
- `App.tsx` - Main application component
- `tsconfig.json` - TypeScript configuration
- `assets/` - App assets directory
- `README.md` - App documentation
- `.gitignore` - Git ignore rules

## Building for Production

### Android APK
Requires:
- Android SDK
- Expo EAS account
- Keystore file

### iOS ZIP
Requires:
- macOS with Xcode
- Apple Developer account
- Expo EAS account
- Certificates and provisioning profiles

## Development

### Project Structure
```
appmake-clone/
├── src/
│   ├── main.rs              # Server entry point
│   ├── models.rs            # Data models
│   ├── api.rs               # API endpoints
│   ├── app_generator.rs     # Expo app generator
│   ├── builder.rs           # Build system
│   ├── qr_generator.rs      # QR code generator
│   └── templates.rs         # Template engine
├── static/
│   ├── index.html           # Web frontend
│   ├── styles.css           # Styles
│   └── app.js               # Frontend logic
├── output/                  # Generated files
├── temp/                    # Temporary files
└── Cargo.toml               # Rust dependencies
```

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
# apt
