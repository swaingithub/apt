import React from 'react';
import {
  Alert, Image, Pressable, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppAction, AppElement, Collection, ThemeConfig } from './types';
import { blockRegistry } from './BlockRegistry';

const unsupportedStyles = new Set([
  'customGradient', 'cursor', 'boxShadow', 'borderBottom', 'borderColor', 'gridTemplateColumns', 'objectFit',
]);

function normalize(raw: Record<string, any> = {}): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(raw).forEach(([k, v]) => {
    if (unsupportedStyles.has(k) || v === undefined || v === '') return;
    if (k === 'display' && v === 'flex') return;
    if (k === 'flexDirection' && (v === 'column' || v === 'row')) { out.flexDirection = v; return; }
    if (k === 'gap') { out.gap = typeof v === 'number' ? v : parseInt(String(v), 10) || 0; return; }
    out[k] = v;
  });
  return out;
}

function toIcon(name?: string) {
  const map: Record<string, any> = {
    BellRing: 'notifications', CloudUpload: 'cloud-upload', UserRound: 'person-circle',
    Heart: 'heart', Home: 'home', Package: 'cube', Smartphone: 'phone-portrait',
  };
  return map[name || ''] || 'apps';
}

export interface RenderCtx {
  stateValues: Record<string, any>;
  collections: Record<string, Collection>;
  theme: ThemeConfig;
  interpolate: (text?: string) => string;
  onAction: (action?: AppAction, value?: any) => void;
  onDelete: (collection: string, id: string) => void;
}

export function renderElement(el: AppElement, ctx: RenderCtx): React.JSX.Element | null {
  const s = normalize(el.styles);

  // ── 1. Check BlockRegistry first (custom / registered blocks) ───────────
  // Block names like "apt/banner", "levi/top-header" are looked up in the
  // registry using either el.properties.blockName (for namespaced blocks from
  // the config API) or el.type (for simple registered names).
  const registryName = (el.properties as any)?.blockName || el.type;
  const RegisteredComponent = blockRegistry.getWithFallback(registryName);
  const isRegistered = blockRegistry.has(registryName);

  if (isRegistered) {
    return (
      <RegisteredComponent
        key={el.id}
        id={el.id}
        label={el.label}
        styles={s}
        properties={el.properties}
        actions={el.actions}
        children={el.children}
        ctx={ctx}
      />
    );
  }

  // ── 2. Built-in element types (native RN components) ────────────────────

  if (el.type === 'container' || el.type === 'card') {
    return (
      <View key={el.id} style={[el.type === 'card' && styles.card, s]}>
        {el.children?.map((c) => renderElement(c, ctx))}
      </View>
    );
  }

  if (el.type === 'grid') {
    return (
      <View key={el.id} style={[styles.grid, s]}>
        {el.children?.map((c) => <View key={c.id} style={styles.gridItem}>{renderElement(c, ctx)}</View>)}
      </View>
    );
  }

  if (el.type === 'heading') {
    return <Text key={el.id} style={[styles.heading, s]}>{ctx.interpolate(el.properties.value || el.label)}</Text>;
  }

  if (el.type === 'text') {
    return <Text key={el.id} style={[styles.text, s]}>{ctx.interpolate(el.properties.value || el.label)}</Text>;
  }

  if (el.type === 'button') {
    return (
      <Pressable key={el.id} style={[styles.button, s]} onPress={() => ctx.onAction(el.actions.onClick)}>
        <Text style={[styles.buttonText, { color: s.color || '#ffffff' }]}>{ctx.interpolate(el.properties.value || el.label)}</Text>
      </Pressable>
    );
  }

  if (el.type === 'input' || el.type === 'textarea') {
    const stateKey = el.actions.onChange?.stateKey;
    return (
      <TextInput
        key={el.id}
        multiline={el.type === 'textarea'}
        placeholder={el.properties.placeholder || 'Type here'}
        placeholderTextColor="#94a3b8"
        value={stateKey ? String(ctx.stateValues[stateKey] || '') : undefined}
        onChangeText={(t) => ctx.onAction(el.actions.onChange, t)}
        style={[styles.input, el.type === 'textarea' && styles.textarea, s]}
      />
    );
  }

  if (el.type === 'switch' || el.type === 'checkbox') {
    const key = el.actions.onChange?.stateKey || el.id;
    const on = Boolean(ctx.stateValues[key]);
    return (
      <View key={el.id} style={[styles.switchRow, s]}>
        <Switch value={on} onValueChange={(v) => ctx.onAction(el.actions.onChange, v)} />
        <Text style={styles.text}>{ctx.interpolate(el.label)}</Text>
      </View>
    );
  }

  if (el.type === 'image' && el.properties.src) {
    return <Image key={el.id} source={{ uri: el.properties.src }} style={[styles.image, s]} />;
  }

  if (el.type === 'icon') {
    return (
      <Ionicons key={el.id} name={toIcon(el.properties.iconName)} size={el.properties.iconSize || 26} color={s.color || ctx.theme.primaryColor} />
    );
  }

  if (el.type === 'table') {
    const colName = el.properties.dataSource;
    const col = colName ? ctx.collections[colName] : undefined;
    const cols = el.properties.columns || [];
    return (
      <View key={el.id} style={[styles.table, s]}>
        <Text style={styles.tableTitle}>{el.label}</Text>
        {!col ? (
          <Text style={styles.mutedText}>Collection not configured.</Text>
        ) : (
          col.records.map((r) => (
            <View key={r._id} style={styles.recordRow}>
              <View style={styles.recordContent}>
                {cols.map((c: string) => (
                  <Text key={c} style={styles.recordLine}>
                    <Text style={styles.recordLabel}>{c}: </Text>
                    {String(r[c] ?? '')}
                  </Text>
                ))}
              </View>
              <Pressable onPress={() => ctx.onDelete(col.name, r._id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    );
  }

  if (el.type === 'divider') {
    return <View key={el.id} style={[styles.divider, s]} />;
  }

  return (
    <View key={el.id} style={[styles.unsupported, s]}>
      <Text style={styles.mutedText}>{el.type} block is web-only for now.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { flexBasis: '48%', flexGrow: 1 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16 },
  heading: { color: '#0f172a', fontSize: 22, fontWeight: '800' },
  text: { color: '#334155', fontSize: 14, lineHeight: 21 },
  mutedText: { color: '#64748b', fontSize: 13 },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  buttonText: { fontSize: 15, fontWeight: '800' },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, color: '#0f172a', backgroundColor: '#ffffff' },
  textarea: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  image: { width: '100%', height: 220, borderRadius: 14 },
  table: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14 },
  tableTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  recordRow: { alignItems: 'center', borderTopColor: '#e2e8f0', borderTopWidth: 1, flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingVertical: 12 },
  recordContent: { flex: 1, gap: 3 },
  recordLine: { color: '#334155', fontSize: 13 },
  recordLabel: { color: '#64748b', fontWeight: '700' },
  deleteText: { color: '#ef4444', fontWeight: '800' },
  divider: { backgroundColor: '#cbd5e1', height: 1, marginVertical: 12 },
  unsupported: { borderColor: '#cbd5e1', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, padding: 14 },
});
