import React, { useEffect } from 'react';
import { AptApp, ConfigProvider, useConfig } from './src/apt';
import { config as localConfig, activate } from './src/theme';

// Activate theme on startup
activate({ settings: localConfig as any });

// Initialize third-party SDK integrations on startup
function useIntegrations() {
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('./src/apt/integrations');
        if (typeof mod.initializeIntegrations === 'function') {
          await mod.initializeIntegrations();
        }
      } catch {
        // integrations.ts may be a comment-only file when no SDKs are enabled
      }
    })();
  }, []);
}

function AppInner() {
  const { config: remoteConfig, isLoading, error } = useConfig();
  useIntegrations();

  if (isLoading && !remoteConfig) {
    return <AptApp config={localConfig} />;
  }

  if (error && !remoteConfig) {
    return <AptApp config={localConfig} />;
  }

  if (remoteConfig) {
    const remoteTheme = remoteConfig.theme || {};
    const remotePages = remoteConfig.pages
      ? Object.entries(remoteConfig.pages).map(([id, page]: [string, any]) => ({
          id,
          name: id,
          elements: (page?.blocks || []).map((block: any, idx: number) => ({
            id: block.client_id || `${id}-block-${idx}`,
            type: (block.name?.split('/').pop() || 'container') as any,
            label: block.name || 'Block',
            styles: block.attributes?.styles || {},
            properties: { ...(block.attributes || {}), blockName: block.name },
            actions: block.attributes?.actions || {},
            children: [],
          })),
        }))
      : localConfig.pages;

    const remoteRouting = remoteConfig.routing || null;

    const mergedConfig: import('./src/apt/types').ProjectConfig = {
      appName: remoteConfig.project?.name || localConfig.appName,
      homePageId: remotePages[0]?.id || localConfig.homePageId,
      pages: remotePages,
      collections: localConfig.collections,
      globalStates: localConfig.globalStates,
      theme: {
        ...localConfig.theme,
        ...remoteTheme,
        mode: (remoteTheme.mode === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
      },
      build: localConfig.build,
    };
    return <AptApp config={mergedConfig} routing={remoteRouting} />;
  }

  return <AptApp config={localConfig} />;
}

import Constants from 'expo-constants';

const getApiBase = () => {
  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  if (envBase && !envBase.includes('localhost') && !envBase.includes('127.0.0.1')) {
    // If the port in env is still 8080, but our server runs on 8085, adjust it
    return envBase.replace(':8080', ':8085');
  }

  // Detect developer machine's LAN IP dynamically from Metro packager host
  const hostUri = Constants.expoConfig?.hostUri || 
                  Constants.manifest2?.extra?.expoGoLaunchMetadata?.manifest?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8085`;
  }
  return 'http://localhost:8085';
};

export default function App() {
  const slug = localConfig.runtime?.slug || localConfig.appName?.toLowerCase().replace(/\s+/g, '-');
  const apiBase = getApiBase();
  
  return (
    <ConfigProvider slug={slug} apiBase={apiBase}>
      <AppInner />
    </ConfigProvider>
  );
}
