import type { ThemeConfig } from './types';

const defaultLight: ThemeConfig = {
  mode: 'light',
  primaryColor: '#6366f1',
  backgroundColor: '#f8fafc',
  surfaceColor: '#ffffff',
  textColor: '#0f172a',
};

export function resolveTheme(partial?: Partial<ThemeConfig>): ThemeConfig {
  return { ...defaultLight, ...partial };
}

export function statusBarStyle(theme: ThemeConfig): 'light-content' | 'dark-content' {
  return theme.mode === 'dark' ? 'light-content' : 'dark-content';
}
