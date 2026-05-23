const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('apt_token');
}

function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('apt_token', token);
  } else {
    localStorage.removeItem('apt_token');
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data as T;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  config: any;
  screens: any;
  theme: any;
  created_at: string;
  updated_at: string;
}

export interface GenerateResponse {
  status: string;
  app_id: string;
  download_url: string;
  filename: string;
}

export interface BuildResponse {
  build_id: string;
  app_id: string;
  platform: string;
  status: string;
  download_url: string | null;
  qr_code: string | null;
  created_at: string;
}

export const api = {
  // Auth
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>('POST', '/auth/register', { email, password, name });
    setToken(res.token);
    return res;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>('POST', '/auth/login', { email, password });
    setToken(res.token);
    return res;
  },

  async me(): Promise<UserResponse | null> {
    if (!getToken()) return null;
    try {
      return await request<UserResponse>('GET', '/auth/me');
    } catch {
      setToken(null);
      return null;
    }
  },

  logout() {
    setToken(null);
  },

  isAuthenticated(): boolean {
    return !!getToken();
  },

  // Projects
  async listProjects(): Promise<ProjectListItem[]> {
    return request<ProjectListItem[]>('GET', '/projects');
  },

  async getProject(id: string): Promise<ProjectListItem> {
    return request<ProjectListItem>('GET', `/projects/${id}`);
  },

  async createProject(data: { name: string; description?: string; config?: any; screens?: any; theme?: any }): Promise<ProjectListItem> {
    return request<ProjectListItem>('POST', '/projects', data);
  },

  async updateProject(id: string, data: { name?: string; description?: string; config?: any; screens?: any; theme?: any }): Promise<any> {
    return request<any>('PUT', `/projects/${id}`, data);
  },

  async deleteProject(id: string): Promise<any> {
    return request<any>('DELETE', `/projects/${id}`);
  },

  async exportProject(id: string): Promise<any> {
    return request<any>('POST', `/projects/${id}/export`);
  },

  // Generate
  async generateApp(config: {
    app_name: string;
    package_name: string;
    display_name: string;
    version: string;
    primary_color: string;
    project_config: any;
  }): Promise<GenerateResponse> {
    return request<GenerateResponse>('POST', '/generate', config);
  },

  // Build
  async buildApp(appId: string, platform: 'android' | 'ios'): Promise<BuildResponse> {
    return request<BuildResponse>('POST', `/apps/${appId}/build`, { app_id: appId, platform });
  },

  // ── V1 Settings API ─────────────────────────────────────────────────────
  async listSettings(appId: string): Promise<any[]> {
    return request<any[]>('GET', `/v1/apps/${appId}/settings`);
  },

  async upsertSetting(appId: string, key: string, value: any): Promise<any> {
    return request<any>('PUT', `/v1/apps/${appId}/settings`, { key, value });
  },

  async deleteSetting(appId: string, key: string): Promise<any> {
    return request<any>('DELETE', `/v1/apps/${appId}/settings/${encodeURIComponent(key)}`);
  },

  // ── V1 Pages API ─────────────────────────────────────────────────────────
  async listPages(appId: string): Promise<any[]> {
    return request<any[]>('GET', `/v1/apps/${appId}/pages`);
  },

  async createPage(appId: string, data: { page_id: string; title: string; type?: string; attributes?: any }): Promise<any> {
    return request<any>('POST', `/v1/apps/${appId}/pages`, data);
  },

  async updatePage(appId: string, pageDbId: string, data: { title?: string; attributes?: any; is_published?: boolean }): Promise<any> {
    return request<any>('PUT', `/v1/apps/${appId}/pages/${pageDbId}`, data);
  },

  async deletePage(appId: string, pageDbId: string): Promise<any> {
    return request<any>('DELETE', `/v1/apps/${appId}/pages/${pageDbId}`);
  },

  // ── V1 Blocks API ────────────────────────────────────────────────────────
  async listBlocks(appId: string, pageDbId: string): Promise<any[]> {
    return request<any[]>('GET', `/v1/apps/${appId}/pages/${pageDbId}/blocks`);
  },

  async createBlock(appId: string, data: { page_id: string; client_id: string; name: string; attributes?: any; parent_id?: string; sort_order?: number }): Promise<any> {
    return request<any>('POST', `/v1/apps/${appId}/blocks`, data);
  },

  async updateBlock(appId: string, blockDbId: string, data: { name?: string; attributes?: any; sort_order?: number }): Promise<any> {
    return request<any>('PUT', `/v1/apps/${appId}/blocks/${blockDbId}`, data);
  },

  async deleteBlock(appId: string, blockDbId: string): Promise<any> {
    return request<any>('DELETE', `/v1/apps/${appId}/blocks/${blockDbId}`);
  },

  // ── V1 Navigation API ────────────────────────────────────────────────────
  async getNavigation(appId: string): Promise<any> {
    return request<any>('GET', `/v1/apps/${appId}/navigation`);
  },

  async upsertNavigation(appId: string, type: string, config: any[]): Promise<any> {
    return request<any>('PUT', `/v1/apps/${appId}/navigation`, { type, config });
  },

  // ── V1 Publish API ────────────────────────────────────────────────────────
  async publishConfig(appId: string, version?: string): Promise<{ version: string; published_at: string }> {
    return request<{ version: string; published_at: string }>('POST', `/v1/apps/${appId}/publish`, { version });
  },

  async listPublished(appId: string): Promise<any[]> {
    return request<any[]>('GET', `/v1/apps/${appId}/publish`);
  },

  // ── V1 Config (mobile runtime endpoint, for testing from browser) ─────────
  getConfigUrl(slug: string): string {
    return `${API_BASE}/v1/config/${slug}`;
  },
};
