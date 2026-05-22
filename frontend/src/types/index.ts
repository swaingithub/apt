export interface Component {
  id: string;
  type: ComponentType;
  props: Record<string, any>;
  children: Component[];
  styles: ComponentStyles;
  dataBindings?: DataBinding[];
}

export interface ComponentStyles {
  width?: string | number;
  height?: string | number;
  padding?: string | number;
  margin?: string | number;
  backgroundColor?: string;
  color?: string;
  fontSize?: string | number;
  fontWeight?: string;
  borderRadius?: string | number;
  borderWidth?: string | number;
  borderColor?: string;
  borderTopWidth?: string | number;
  borderTopColor?: string;
  flex?: number;
  flexDirection?: 'row' | 'column';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  position?: 'relative' | 'absolute';
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  gap?: string | number;
  boxShadow?: string;
}

export interface DataBinding {
  property: string;
  source: string;
  transform?: string;
}

export type ComponentType =
  | 'Container'
  | 'Text'
  | 'Button'
  | 'Image'
  | 'TextInput'
  | 'ScrollView'
  | 'FlatList'
  | 'TabBar'
  | 'NavigationBar'
  | 'Card'
  | 'Icon'
  | 'Switch'
  | 'Checkbox'
  | 'Slider'
  | 'WebView'
  | 'Map';

export interface Screen {
  id: string;
  name: string;
  components: Component[];
  layout: LayoutConfig;
  navigation: NavigationConfig;
}

export interface LayoutConfig {
  type: 'flex' | 'absolute' | 'grid';
  direction?: 'row' | 'column';
  wrap?: 'wrap' | 'nowrap';
  gap?: string | number;
}

export interface NavigationConfig {
  type: 'stack' | 'tab' | 'drawer';
  title?: string;
  showBackButton?: boolean;
  tabBarItems?: TabBarItem[];
}

export interface TabBarItem {
  id: string;
  title: string;
  icon: string;
  screenId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  screens: Screen[];
  theme: Theme;
  config: AppConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface Theme {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  error: string;
  warning: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  fontWeight: {
    normal: string;
    medium: string;
    bold: string;
  };
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ThemeBorderRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface AppConfig {
  appName: string;
  packageName: string;
  displayName: string;
  version: string;
  description?: string;
  author?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface ComponentTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  defaultComponent: Component;
  defaultProps: Record<string, any>;
}
