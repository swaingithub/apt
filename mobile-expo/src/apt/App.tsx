import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text } from 'react-native';
import type { AppAction, Collection, ProjectConfig } from './types';
import { resolveTheme, statusBarStyle } from './theme';
import { renderElement, type RenderCtx } from './renderer';

interface AptAppProps {
  config: ProjectConfig;
}

export default function AptApp({ config }: AptAppProps) {
  const [activePageId, setActivePageId] = useState(config.homePageId);
  const [collections, setCollections] = useState<Record<string, Collection>>(() =>
    Object.fromEntries(config.collections.map((c) => [c.name, c]))
  );
  const [stateValues, setStateValues] = useState<Record<string, any>>(() =>
    Object.fromEntries(config.globalStates.map((s) => [s.name, s.defaultValue]))
  );

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
    if (action.type === 'navigate' && action.targetPage) setActivePageId(action.targetPage);
    if (action.type === 'state' && action.stateKey) setStateValues((s) => ({ ...s, [action.stateKey!]: value }));
    if (action.type === 'toast' || action.type === 'modal') {
      const msg = interpolate(action.type === 'toast' ? action.toastText : action.modalContent);
      if (msg) Alert.alert(config.appName, msg);
    }
  }, [interpolate, config.appName]);

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
