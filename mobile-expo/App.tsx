import React from 'react';
import { AptApp, ConfigProvider, useConfig } from './src/apt';
import { config as localConfig, activate } from './src/theme';

// Activate theme on startup
activate({ settings: localConfig as any });

function AppInner() {
  const { config: remoteConfig, isLoading, error } = useConfig();

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
    return <AptApp config={mergedConfig} />;
  }

  return <AptApp config={localConfig} />;
}

export default function App() {
  const slug = localConfig.runtime?.slug || localConfig.appName?.toLowerCase().replace(/\s+/g, '-');
  const apiBase = localConfig.runtime?.apiBaseUrl || 'http://localhost:8080';
  return (
    <ConfigProvider slug={slug} apiBase={apiBase}>
      <AppInner />
    </ConfigProvider>
  );
}
