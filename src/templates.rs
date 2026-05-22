use handlebars::Handlebars;

pub struct TemplateEngine {
    handlebars: Handlebars<'static>,
}

impl TemplateEngine {
    pub fn new() -> Self {
        let mut handlebars = Handlebars::new();
        
        // Register templates
        handlebars.register_template_string("app_tsx", Self::app_tsx_template()).unwrap();
        handlebars.register_template_string("package_json", Self::package_json_template()).unwrap();
        handlebars.register_template_string("app_json", Self::app_json_template()).unwrap();
        
        TemplateEngine { handlebars }
    }
    
    pub fn render_app_tsx(&self, data: &serde_json::Value) -> String {
        self.handlebars.render("app_tsx", data).unwrap_or_default()
    }
    
    pub fn render_package_json(&self, data: &serde_json::Value) -> String {
        self.handlebars.render("package_json", data).unwrap_or_default()
    }
    
    pub fn render_app_json(&self, data: &serde_json::Value) -> String {
        self.handlebars.render("app_json", data).unwrap_or_default()
    }
    
    fn app_tsx_template() -> String {
        r#"
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View style={[styles.container, { backgroundColor: '{{primary_color}}' }]}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>{{display_name}}</Text>
        <Text style={styles.subtitle}>
          Welcome to your new mobile app!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
});
"#.to_string()
    }
    
    fn package_json_template() -> String {
        r#"
{
  "name": "{{app_name}}",
  "version": "{{version}}",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios"
  },
  "dependencies": {
    "expo": "~49.0.15",
    "expo-status-bar": "~1.6.0",
    "react": "18.2.0",
    "react-native": "0.72.6",
    "react-native-safe-area-context": "4.6.3",
    "react-native-screens": "~3.22.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.14",
    "typescript": "^5.1.3"
  },
  "private": true
}
"#.to_string()
    }
    
    fn app_json_template() -> String {
        r#"
{
  "expo": {
    "name": "{{display_name}}",
    "slug": "{{app_slug}}",
    "version": "{{version}}",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "{{primary_color}}"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "{{package_name}}"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "{{primary_color}}"
      },
      "package": "{{package_name}}"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
"#.to_string()
    }
}

impl Default for TemplateEngine {
    fn default() -> Self {
        Self::new()
    }
}
