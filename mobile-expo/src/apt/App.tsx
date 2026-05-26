import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text } from 'react-native';
import type { AppAction, Collection, ProjectConfig } from './types';
import { resolveTheme, statusBarStyle } from './theme';
import { renderElement, type RenderCtx } from './renderer';
import { matchUrl, type RouteConfig } from './routing';

interface AptAppProps {
  config: ProjectConfig;
  routing?: RouteConfig;
  onNavigateToPage?: (pageId: string) => void;
}

export default function AptApp({ config, routing, onNavigateToPage }: AptAppProps) {
  const [activePageId, setActivePageId] = useState(config.homePageId);
  const [collections, setCollections] = useState<Record<string, Collection>>(() =>
    Object.fromEntries(config.collections.map((c) => [c.name, c]))
  );
  const [stateValues, setStateValues] = useState<Record<string, any>>(() =>
    Object.fromEntries(config.globalStates.map((s) => [s.name, s.defaultValue]))
  );

  const navigateToPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
    onNavigateToPage?.(pageId);
  }, [onNavigateToPage]);

  // Deep link handler
  useEffect(() => {
    if (!routing) return;
    const handleUrl = (url: string) => {
      const matched = matchUrl(url, routing);
      if (matched && config.pages.some((p) => p.id === matched.pageId)) {
        navigateToPage(matched.pageId);
      }
    };
    Linking.addEventListener('url', (event) => {
      if (event.url) handleUrl(event.url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
  }, [routing, config.pages, navigateToPage]);

  const theme = resolveTheme(config.theme);
  const activePage = useMemo(
    () => config.pages.find((p) => p.id === activePageId) || config.pages[0],
    [activePageId, config.pages]
  );

  useEffect(() => {
    StatusBar.setBarStyle(statusBarStyle(theme));
  }, [theme]);

  const interpolate = useCallback((rawText?: string) => {
    if (!rawText) return '';
    return rawText.replace(/\{\{([^}]+)\}\}/g, (_m, expr) => {
      const c = expr.trim();
      if (c.startsWith('state.')) {
        const key = c.slice(6);
        return stateValues[key] !== undefined ? String(stateValues[key]) : '';
      }
      if (c.startsWith('collection.')) {
        const [, name, prop] = c.split('.');
        const col = collections[name];
        if (col && prop === 'length') return String(col.records.length);
      }
      return '';
    });
  }, [stateValues, collections]);

  const onAction = useCallback((action?: AppAction, value?: any) => {
    if (!action || action.type === 'none') return;
    if (action.type === 'navigate' && action.targetPage) navigateToPage(action.targetPage);
    if (action.type === 'state' && action.stateKey) setStateValues((s) => ({ ...s, [action.stateKey!]: value }));
    if (action.type === 'toast' || action.type === 'modal') {
      const msg = interpolate(action.type === 'toast' ? action.toastText : action.modalContent);
      if (msg) Alert.alert(config.appName, msg);
    }
  }, [interpolate, config.appName, navigateToPage]);

  const onDelete = useCallback((collectionName: string, recordId: string) => {
    setCollections((cur) => {
      const col = cur[collectionName];
      if (!col) return cur;
      return { ...cur, [collectionName]: { ...col, records: col.records.filter((r) => r._id !== recordId) } };
    });
  }, []);

  const renderCtx: RenderCtx = { stateValues, collections, theme, interpolate, onAction, onDelete };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: theme.textColor }]}>
          {activePage?.name || 'App'}
        </Text>
        {activePage?.elements.map((el) => renderElement(el, renderCtx))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 18, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 12, opacity: 0.7, textTransform: 'uppercase' },
});
