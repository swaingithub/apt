import { blockRegistry } from './BlockRegistry';

interface ThemePackage {
  id: string;
  activate?: (params: { settings: Record<string, any> }) => void | Promise<void>;
  blocks?: Record<string, React.ComponentType<any>>;
  pages?: Record<string, React.ComponentType<any>>;
}

const registeredThemes: ThemePackage[] = [];

export function registerTheme(theme: ThemePackage): void {
  registeredThemes.push(theme);

  if (theme.blocks) {
    Object.entries(theme.blocks).forEach(([name, component]) => {
      blockRegistry.register(name, component);
    });
  }
}

export async function activateThemes(settings: Record<string, any>): Promise<void> {
  for (const theme of registeredThemes) {
    if (theme.activate) {
      try {
        await theme.activate({ settings });
      } catch (err) {
        console.error(`Failed to activate theme [${theme.id}]:`, err);
      }
    }
  }
}

export function getRegisteredThemes(): ThemePackage[] {
  return registeredThemes;
}
