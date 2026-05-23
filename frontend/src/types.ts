import type { CSSProperties } from 'react';

export type ActionType =
  | 'navigate'
  | 'state'
  | 'script'
  | 'toast'
  | 'modal'
  | 'db_add'
  | 'db_delete'
  | 'none';

export interface AppAction {
  type: ActionType;
  targetPage?: string;
  stateKey?: string;
  stateValue?: string;
  toastText?: string;
  modalContent?: string;
  collectionName?: string;
  collectionData?: string; // JSON mapping or comma-separated name=value expressions
  code?: string;
}

export type ElementType =
  | 'container'
  | 'grid'
  | 'card'
  | 'tabs'
  | 'text'
  | 'heading'
  | 'image'
  | 'divider'
  | 'button'
  | 'icon'
  | 'input'
  | 'select'
  | 'checkbox'
  | 'textarea'
  | 'switch'
  | 'table'
  | 'carousel'
  | 'chart'
  | 'map'
  | 'video'
  | 'banner'
  | 'list';

export interface AppElement {
  id: string;
  type: ElementType;
  label: string;
  styles: CSSProperties & {
    customGradient?: string;
  };
  properties: {
    placeholder?: string;
    src?: string;
    value?: string;
    options?: string[];
    dataSource?: string; // e.g. collection name
    chartType?: 'bar' | 'line' | 'pie';
    mapLocation?: string;
    tabHeaders?: string[];
    activeTab?: number;
    columns?: string[];
    gridCols?: number;
    aspectRatio?: string;
    iconName?: string;
    iconSize?: number;
  };
  actions: {
    onClick?: AppAction;
    onChange?: AppAction;
  };
  children?: AppElement[];
}

export interface CollectionField {
  name: string;
  type: 'text' | 'number' | 'boolean';
}

export interface Collection {
  name: string;
  fields: CollectionField[];
  records: Record<string, any>[];
}

export interface GlobalState {
  name: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue: string | number | boolean;
}

export interface AppPage {
  id: string;
  name: string;
  elements: AppElement[];
}

export type ActiveTabRight = 'design' | 'content' | 'actions';

export interface AppTheme {
  mode: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamily: string;
  radius: 'compact' | 'rounded' | 'soft';
}

export interface BuildSettings {
  appId: string;
  version: string;
  buildNumber: number;
  platform: 'android' | 'ios' | 'both';
  packageType: 'apk' | 'aab' | 'ios-zip';
  environment: 'development' | 'staging' | 'production';
}

export interface PushSettings {
  enabled: boolean;
  provider: 'firebase' | 'onesignal' | 'expo';
  senderId: string;
  defaultTitle: string;
}

export interface DeploymentSettings {
  otaEnabled: boolean;
  channel: 'dev' | 'preview' | 'production';
  androidStore: 'play-console' | 'firebase-app-distribution' | 'manual';
  iosStore: 'app-store-connect' | 'testflight' | 'manual';
  lastBuildLabel?: string;
}

export interface ProjectConfig {
  appName: string;
  pages: AppPage[];
  collections: Collection[];
  globalStates: GlobalState[];
  homePageId: string;
  theme?: AppTheme;
  build?: BuildSettings;
  push?: PushSettings;
  deployment?: DeploymentSettings;
}
