import type { ProjectConfig } from '../apt';

const config: ProjectConfig = {
  appName: 'My App',
  homePageId: 'home',
  theme: {
    mode: 'light',
    primaryColor: '#6366f1',
    backgroundColor: '#f8fafc',
    surfaceColor: '#ffffff',
    textColor: '#0f172a',
  },
  globalStates: [],
  collections: [],
  pages: [
    {
      id: 'home',
      name: 'Home',
      elements: [
        {
          id: 'welcome',
          type: 'heading',
          label: 'Welcome',
          styles: { fontSize: 24, fontWeight: '800' },
          properties: { value: 'Welcome to My App' },
          actions: {},
        },
      ],
    },
  ],
};

export default config;
