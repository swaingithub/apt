import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateThemes } from './ThemeRegistry';

const CONFIG_CACHE_KEY = 'apt_app_config_v1';
// Use EXPO_PUBLIC_API_BASE env var for real devices — localhost won't work on a physical phone
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:8080';

export interface RuntimeConfig {
  version: string;
  project: {
    id: string;
    name: string;
    platform: string;
    storeUrl: string;
    slug: string;
  };
  settings: Record<string, any>;
  pages: Record<string, { attributes: Record<string, any>; blocks: any[] }>;
  navigation: { bottomTabs: any[] };
  theme: {
    mode?: string;
    primaryColor?: string;
    backgroundColor?: string;
    surfaceColor?: string;
    textColor?: string;
  };
}

interface ConfigContextValue {
  config: RuntimeConfig | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: null,
  isLoading: true,
  error: null,
  refresh: async () => {},
});

export function ConfigProvider({
  slug,
  apiBase = API_BASE,
  initialConfig,
  children,
}: {
  slug?: string;
  apiBase?: string;
  initialConfig?: RuntimeConfig;
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<RuntimeConfig | null>(initialConfig || null);
  const [isLoading, setIsLoading] = useState(!initialConfig);
  const [error, setError] = useState<string | null>(null);

  // Use a ref so fetchConfig can always read the latest config without stale closure
  const configRef = useRef<RuntimeConfig | null>(config);
  useEffect(() => { configRef.current = config; }, [config]);

  const fetchConfig = useCallback(async () => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Load from cache immediately for instant display
      const cached = await AsyncStorage.getItem(`${CONFIG_CACHE_KEY}:${slug}`);
      if (cached) {
        const parsed = JSON.parse(cached) as RuntimeConfig;
        // Only apply cache if we have nothing yet
        if (!configRef.current) {
          setConfig(parsed);
          setIsLoading(false);
        }
      }

      // 2. Fetch fresh from API (always runs in background)
      const res = await fetch(`${apiBase}/api/v1/config/${slug}`);
      if (!res.ok) throw new Error(`Config fetch failed: ${res.status} ${res.statusText}`);
      const fresh = await res.json() as RuntimeConfig;

      // 3. Only re-render + save if version actually changed (avoids flicker)
      const currentVersion = configRef.current?.version;
      if (!currentVersion || currentVersion !== fresh.version) {
        setConfig(fresh);
        setError(null);
        await AsyncStorage.setItem(`${CONFIG_CACHE_KEY}:${slug}`, JSON.stringify(fresh));
        await activateThemes(fresh.settings || {});
      }
    } catch (err: any) {
      // Only show error if we have no config at all — otherwise stay on cached version
      if (!configRef.current) {
        setError(err.message || 'Failed to load config');
      }
      console.warn('[ConfigProvider] fetch error:', err.message);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, apiBase]); // intentionally exclude `config` — we use configRef instead

  useEffect(() => {
    fetchConfig();
  }, [slug]);

  return (
    <ConfigContext.Provider value={{ config, isLoading, error, refresh: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  return {
    config: ctx.config,
    isLoading: ctx.isLoading,
    error: ctx.error,
    refresh: ctx.refresh,
    settings: ctx.config?.settings || {},
    pages: ctx.config?.pages || {},
    navigation: ctx.config?.navigation || { bottomTabs: [] },
    theme: ctx.config?.theme || {},
    version: ctx.config?.version,
  };
}
