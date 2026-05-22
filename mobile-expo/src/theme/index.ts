import { addFilter, registerAction, blockRegistry, registerTheme } from '../apt';
import config from './config';

export { default as config } from './config';

// Register custom action handlers
registerAction('OPEN_COLLECTION', ({ collectionId, title }, { navigation }) => {
  navigation.navigate('Collection', { collectionId, title });
});

registerAction('OPEN_PRODUCT', ({ productId }, { navigation }) => {
  navigation.navigate('ProductDetail', { productId });
});

registerAction('TOAST', ({ message }) => {
  if (message) {
    const { Alert } = require('react-native');
    Alert.alert('', message);
  }
});

// Add filters to modify page data at runtime
addFilter('page-data', 'theme/default-layout', (data: any, context?: Record<string, any>) => {
  if (!data || !context?.pageId) return data;
  if (context.pageId !== 'home') return data;
  return {
    ...data,
    attributes: {
      ...data.attributes,
      backgroundColor: config.theme?.backgroundColor || '#f8fafc',
    },
  };
});

// ── Theme activation ──
export function activate(params?: Record<string, any>) {
  const settings = params?.settings || {};

  addFilter('page-data', 'theme/settings-inject', (data: any) => {
    if (settings.primaryColor) {
      return {
        ...data,
        attributes: {
          ...data.attributes,
          primaryColor: settings.primaryColor,
        },
      };
    }
    return data;
  });

  return params;
}
