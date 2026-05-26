export interface RouteConfig {
  scheme: string;
  host: string;
  prefix: string;
  pages: Array<{ page_id: string; path: string; params: string[] }>;
}

export interface ParsedRoute {
  pageId: string;
  params: Record<string, string>;
}

function pathToRegex(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexStr = path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_m, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${regexStr}$`), paramNames };
}

export function matchUrl(
  url: string,
  config: RouteConfig
): ParsedRoute | null {
  let path: string;
  try {
    const parsed = new URL(url);
    if (config.scheme && parsed.protocol.replace(':', '') !== config.scheme && parsed.protocol.replace(':', '') !== 'https') {
      return null;
    }
    if (config.host && parsed.hostname !== config.host && parsed.hostname !== 'localhost') {
      if (parsed.protocol === `${config.scheme}:`) {
        path = parsed.hostname + parsed.pathname;
      } else {
        return null;
      }
    } else {
      path = parsed.pathname;
    }
  } catch {
    if (url.startsWith('/')) {
      path = url;
    } else if (url.includes('://')) {
      const schemeEnd = url.indexOf('://');
      path = url.slice(schemeEnd + 3);
      if (!path.startsWith('/')) path = '/' + path;
    } else {
      path = '/' + url;
    }
  }

  let prefix = config.prefix || '/';
  if (!prefix.endsWith('/')) prefix += '/';
  if (path.startsWith(prefix)) {
    path = path.slice(prefix.length - 1) || '/';
  }

  for (const route of config.pages) {
    const { regex, paramNames } = pathToRegex(route.path);
    const match = path.match(regex);
    if (match) {
      const params: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      return { pageId: route.page_id, params };
    }
  }

  return null;
}

export function buildDeepLink(
  config: RouteConfig,
  pageId: string,
  routeParams?: Record<string, string>
): string | null {
  const route = config.pages.find((p) => p.page_id === pageId);
  if (!route) return null;

  let resolvedPath = route.path;
  if (routeParams) {
    for (const [key, value] of Object.entries(routeParams)) {
      resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(value));
    }
  }

  const prefix = config.prefix || '/';
  const fullPath = prefix.endsWith('/')
    ? prefix.slice(0, -1) + (resolvedPath.startsWith('/') ? resolvedPath : '/' + resolvedPath)
    : prefix + (resolvedPath.startsWith('/') ? resolvedPath : '/' + resolvedPath);

  if (config.scheme) {
    return `${config.scheme}://${fullPath.replace(/^\//, '')}`;
  }
  if (config.host) {
    return `https://${config.host}${fullPath}`;
  }
  return fullPath;
}
