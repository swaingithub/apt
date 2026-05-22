export type ActionType = 'navigate' | 'state' | 'script' | 'toast' | 'modal' | 'db_add' | 'db_delete' | 'none';

export type ElementType =
  | 'container' | 'grid' | 'card' | 'tabs' | 'text' | 'heading'
  | 'image' | 'divider' | 'button' | 'icon' | 'input' | 'select'
  | 'checkbox' | 'textarea' | 'switch' | 'table' | 'carousel'
  | 'chart' | 'map' | 'video';

export interface AppAction {
  type: ActionType;
  targetPage?: string;
  stateKey?: string;
  stateValue?: string;
  toastText?: string;
  modalContent?: string;
  collectionName?: string;
  collectionData?: string;
  code?: string;
}

export interface AppElement {
  id: string;
  type: ElementType;
  label: string;
  styles: Record<string, any>;
  properties: Record<string, any>;
  actions: { onClick?: AppAction; onChange?: AppAction };
  children?: AppElement[];
}

export interface Collection {
  name: string;
  fields: Array<{ name: string; type: 'text' | 'number' | 'boolean' }>;
  records: Record<string, any>[];
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
}

export interface ProjectConfig {
  appName: string;
  homePageId: string;
  pages: Array<{ id: string; name: string; elements: AppElement[] }>;
  collections: Collection[];
  globalStates: Array<{ name: string; type: string; defaultValue: any }>;
  theme?: Partial<ThemeConfig>;
  build?: Record<string, any>;
  runtime?: {
    slug?: string;
    apiBaseUrl?: string;
  };
}
