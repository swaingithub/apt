# AppMake - Shopify-like Mobile App Creator

## Architecture Overview

### Core Components

#### 1. Visual Builder Interface
- **Drag-and-drop canvas** for mobile app design
- **Component palette** with UI elements
- **Property editor** for component customization
- **Layer tree** for hierarchical view management
- **Real-time preview** with device simulation

#### 2. Component Library
- **Layout Components**: Container, Scroll, Stack, Grid
- **Navigation**: Tab Bar, Navigation Bar, Drawer
- **Input Components**: Text Input, Button, Checkbox, Radio, Switch
- **Display Components**: Text, Image, Card, List, Carousel
- **Media Components**: Video, Audio, Map, Camera
- **Advanced Components**: WebView, Chart, Calendar

#### 3. Screen Management
- **Multiple screens** with navigation flow
- **Screen transitions** and animations
- **Route management** and deep linking
- **Screen templates** for common patterns

#### 4. Data Binding & State
- **Component properties** binding to data sources
- **State management** across screens
- **API integration** for backend data
- **Local storage** and caching
- **Real-time updates** with WebSocket

#### 5. Theme System
- **Color palettes** and typography
- **Component styling** overrides
- **Dark/light mode** support
- **Brand customization**
- **Theme marketplace**

#### 6. Backend Services
- **User authentication** and authorization
- **Project management** and versioning
- **Build pipeline** for iOS/Android
- **App store deployment** integration
- **Analytics** and usage tracking

#### 7. Template Marketplace
- **Pre-built templates** for various industries
- **Template customization** and branding
- **Community templates**
- **Template rating** and reviews

## Tech Stack

### Frontend (Builder)
- **React** with TypeScript
- **React DnD** for drag-and-drop
- **Fabric.js** for canvas rendering
- **Styled Components** for styling
- **Redux Toolkit** for state management
- **Socket.io** for real-time preview

### Backend (Rust)
- **Actix-web** for API server
- **PostgreSQL** for database
- **Redis** for caching
- **JWT** for authentication
- **WebSocket** for real-time updates

### Mobile Runtime
- **React Native** with Expo
- **Expo SDK** for native features
- **React Navigation** for routing
- **Redux** for state management
- **React Query** for data fetching

## Data Models

### Project
```rust
struct Project {
    id: String,
    user_id: String,
    name: String,
    description: String,
    screens: Vec<Screen>,
    theme: Theme,
    config: AppConfig,
    created_at: DateTime,
    updated_at: DateTime,
}
```

### Screen
```rust
struct Screen {
    id: String,
    name: String,
    components: Vec<Component>,
    layout: Layout,
    navigation: NavigationConfig,
}
```

### Component
```rust
struct Component {
    id: String,
    type: ComponentType,
    props: ComponentProps,
    children: Vec<Component>,
    styles: ComponentStyles,
    data_bindings: Vec<DataBinding>,
}
```

### ComponentType
- Container
- Text
- Button
- Image
- TextInput
- ScrollView
- FlatList
- TabBar
- NavigationBar
- etc.

## API Endpoints

### Project Management
- `POST /api/projects` - Create project
- `GET /api/projects` - List user projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Screen Management
- `POST /api/projects/:id/screens` - Create screen
- `GET /api/projects/:id/screens` - List screens
- `PUT /api/screens/:id` - Update screen
- `DELETE /screens/:id` - Delete screen

### Component Management
- `POST /api/screens/:id/components` - Add component
- `PUT /api/components/:id` - Update component
- `DELETE /api/components/:id` - Delete component
- `POST /api/components/:id/duplicate` - Duplicate component

### Build & Deploy
- `POST /api/projects/:id/build` - Trigger build
- `GET /api/builds/:id` - Get build status
- `POST /api/builds/:id/deploy` - Deploy to stores

### Templates
- `GET /api/templates` - List templates
- `POST /api/projects/:id/use-template` - Use template

## Development Phases

### Phase 1: Core Builder (Current Focus)
- [ ] Visual drag-and-drop interface
- [ ] Basic component library
- [ ] Screen management
- [ ] Property editor
- [ ] Real-time preview

### Phase 2: Data & State
- [ ] Data binding system
- [ ] State management
- [ ] API integration
- [ ] Local storage

### Phase 3: Advanced Features
- [ ] Theme system
- [ ] Template marketplace
- [ ] User authentication
- [ ] Project management

### Phase 4: Deployment
- [ ] Build pipeline
- [ ] App store integration
- [ ] Analytics
- [ ] Monetization
