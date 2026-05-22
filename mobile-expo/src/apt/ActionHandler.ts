import { Linking } from 'react-native';
import { applyFilters } from './FilterSystem';

type ActionHandlerFn = (params: Record<string, any>, context: { navigation: any }) => void;

const actionHandlers = new Map<string, ActionHandlerFn>();

export function registerAction(type: string, handler: ActionHandlerFn): void {
  actionHandlers.set(type, handler);
}

export function createActionHandler(navigation: any) {
  return function onAction(actionData: Record<string, any>) {
    if (!actionData || !actionData.action) return;

    const finalAction = applyFilters('action', { ...actionData }, { navigation });

    const handler = actionHandlers.get(finalAction.action);
    if (handler) {
      handler(finalAction, { navigation });
    } else {
      console.warn(`No handler registered for action: ${finalAction.action}`);
    }
  };
}

// Core action handlers
registerAction('OPEN_PAGE', ({ pageId }, { navigation }) => {
  navigation.navigate('InAppPage', { pageId });
});

registerAction('OPEN_CART', (_, { navigation }) => {
  navigation.navigate('Cart');
});

registerAction('OPEN_SEARCH', (_, { navigation }) => {
  navigation.navigate('Search');
});

registerAction('OPEN_URL', ({ url }) => {
  if (url) Linking.openURL(url);
});
