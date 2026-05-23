import { useState, useEffect } from 'react';
import type {
  AppPage, AppElement, Collection, GlobalState,
  ElementType, ProjectConfig,
  AppTheme, BuildSettings, PushSettings, DeploymentSettings
} from './types';
import type { UserResponse, ProjectListItem } from './apiClient';
import { api } from './apiClient';
import { WorkspaceCanvas } from './components/WorkspaceCanvas';
import { CollectionModal } from './components/CollectionModal';
import { AuthModal } from './components/AuthModal';
import { exportStandaloneHTML } from './components/StandaloneCompiler';
import { inventoryDashboardTemplate, taskTrackerTemplate } from './initialTemplates';
import { ECOMMERCE_BLOCKS } from './ecommerceBlocks';
import {
  Sparkles, Edit3, Download, Upload,
  Cpu, CheckCircle, Smartphone, Package, Bell, LogIn, Save,
  Layers, FileText, Database, DatabaseZap, FolderOpen,
  X, Home, Trash2, Plus, ExternalLink, User,
  Settings
} from 'lucide-react';
import { RenderComponent } from './components/RenderComponent';
import { IconSelector } from './components/IconSelector';
import type { AppAction, ActiveTabRight } from './types';

const defaultTheme: AppTheme = {
  mode: 'light',
  primaryColor: '#2563eb',
  accentColor: '#14b8a6',
  backgroundColor: '#f8fafc',
  surfaceColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'Inter',
  radius: 'rounded'
};

const defaultBuild: BuildSettings = {
  appId: 'com.apt.mobile',
  version: '1.0.0',
  buildNumber: 1,
  platform: 'both',
  packageType: 'apk',
  environment: 'production'
};

const defaultPush: PushSettings = {
  enabled: true,
  provider: 'firebase',
  senderId: '',
  defaultTitle: 'New update'
};

const defaultDeployment: DeploymentSettings = {
  otaEnabled: true,
  channel: 'production',
  androidStore: 'play-console',
  iosStore: 'testflight'
};

type LeftTab = 'components' | 'pages' | 'settings' | 'projects';

export default function App() {
  const [appName, setAppName] = useState(inventoryDashboardTemplate.appName);
  const [pages, setPages] = useState<AppPage[]>(inventoryDashboardTemplate.pages);
  const [collections, setCollections] = useState<Collection[]>(inventoryDashboardTemplate.collections);
  const [globalStates, setGlobalStates] = useState<GlobalState[]>(inventoryDashboardTemplate.globalStates);
  const [homePageId, setHomePageId] = useState(inventoryDashboardTemplate.homePageId);
  const [theme, setTheme] = useState<AppTheme>(inventoryDashboardTemplate.theme || defaultTheme);
  const [buildSettings, setBuildSettings] = useState<BuildSettings>(inventoryDashboardTemplate.build || defaultBuild);
  const [pushSettings, setPushSettings] = useState<PushSettings>(inventoryDashboardTemplate.push || defaultPush);
  const [deploymentSettings, setDeploymentSettings] = useState<DeploymentSettings>(inventoryDashboardTemplate.deployment || defaultDeployment);

  const [activePageId, setActivePageId] = useState(inventoryDashboardTemplate.homePageId);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isPlayMode, setIsPlayMode] = useState(false);
  const [stateValues, setStateValues] = useState<Record<string, any>>({});
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  // Desktop layout state
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>('components');
  const [inspectorPanelTab, setInspectorPanelTab] = useState<ActiveTabRight>('design');
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Auth state
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Project state
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveProjectName, setSaveProjectName] = useState('');

  // Panel sub-state
  const [activeCollectionDataModal, setActiveCollectionDataModal] = useState<Collection | null>(null);
  const [newPageName, setNewPageName] = useState('');
  const [newColName, setNewColName] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<'string' | 'number' | 'boolean'>('string');
  const [newVarDefault, setNewVarDefault] = useState('');

  const showToast = (text: string) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  };

  useEffect(() => {
    const initial: Record<string, any> = {};
    globalStates.forEach(s => { initial[s.name] = s.defaultValue; });
    setStateValues(initial);
  }, [globalStates, isPlayMode]);

  useEffect(() => {
    const cached = localStorage.getItem('apt_studio_autosave');
    if (cached) {
      try {
        const p: ProjectConfig = JSON.parse(cached);
        setAppName(p.appName || 'App');
        setPages(p.pages || []);
        setCollections(p.collections || []);
        setGlobalStates(p.globalStates || []);
        setHomePageId(p.homePageId || '');
        setTheme(p.theme || defaultTheme);
        setBuildSettings(p.build || defaultBuild);
        setPushSettings(p.push || defaultPush);
        setDeploymentSettings(p.deployment || defaultDeployment);
        if (p.pages?.length) setActivePageId(p.homePageId || p.pages[0].id);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    api.me().then(u => { if (u) setCurrentUser(u); });
  }, []);

  useEffect(() => {
    if (currentUser) api.listProjects().then(setProjects).catch(() => {});
    else { setProjects([]); setCurrentProjectId(null); }
  }, [currentUser]);

  const saveConfig = (p = pages, c = collections, s = globalStates, h = homePageId, n = appName, t = theme, b = buildSettings, pu = pushSettings, d = deploymentSettings) => {
    const cfg: ProjectConfig = { appName: n, pages: p, collections: c, globalStates: s, homePageId: h, theme: t, build: b, push: pu, deployment: d };
    localStorage.setItem('apt_studio_autosave', JSON.stringify(cfg));
  };

  const handleLoadTemplate = (type: 'inventory' | 'tasks') => {
    const t = type === 'inventory' ? inventoryDashboardTemplate : taskTrackerTemplate;
    setAppName(t.appName); setPages(t.pages); setCollections(t.collections);
    setGlobalStates(t.globalStates); setHomePageId(t.homePageId);
    setTheme(t.theme || defaultTheme); setBuildSettings(t.build || defaultBuild);
    setPushSettings(t.push || defaultPush); setDeploymentSettings(t.deployment || defaultDeployment);
    setActivePageId(t.homePageId); setSelectedElementId(null); setIsPlayMode(false);
    saveConfig(t.pages, t.collections, t.globalStates, t.homePageId, t.appName, t.theme || defaultTheme);
    showToast(`Loaded ${t.appName}`);
  };

  const findElementById = (els: AppElement[], id: string): AppElement | null => {
    for (const el of els) {
      if (el.id === id) return el;
      if (el.children) { const f = findElementById(el.children, id); if (f) return f; }
    }
    return null;
  };

  const updateElementInList = (els: AppElement[], id: string, updated: AppElement): AppElement[] =>
    els.map(el => el.id === id ? updated : el.children ? { ...el, children: updateElementInList(el.children, id, updated) } : el);

  const handleSelectElement = (id: string) => { setSelectedElementId(id || null); };

  const handleUpdateElement = (updated: AppElement) => {
    const page = pages.find(p => p.id === activePageId);
    if (!page) return;
    const els = updateElementInList(page.elements, updated.id, updated);
    const ps = pages.map(p => p.id === activePageId ? { ...p, elements: els } : p);
    setPages(ps); saveConfig(ps);
  };

  const createDefaultElement = (type: ElementType): AppElement => {
    const id = `${type}-${Date.now()}`;
    const base: AppElement = { id, type, label: type.toUpperCase(), styles: {}, properties: {}, actions: {} };
    switch (type) {
      case 'container': base.styles = { display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px' }; base.children = []; break;
      case 'grid': base.styles = { display: 'grid', padding: '12px', gap: '12px' }; base.properties = { gridCols: 2 }; base.children = []; break;
      case 'card': base.styles = { display: 'flex', flexDirection: 'column', padding: '16px', gap: '8px', borderRadius: '12px', backgroundColor: '#ffffff' }; base.children = []; break;
      case 'tabs': base.styles = { display: 'flex', flexDirection: 'column' }; base.properties = { tabHeaders: ['Tab 1', 'Tab 2'], activeTab: 0 }; base.children = [
        { id: `tc1-${Date.now()}`, type: 'container', label: 'Tab 1', styles: { padding: '8px' }, properties: {}, actions: {}, children: [] },
        { id: `tc2-${Date.now()}`, type: 'container', label: 'Tab 2', styles: { padding: '8px' }, properties: {}, actions: {}, children: [] }
      ]; break;
      case 'heading': base.styles = { fontSize: '18px', fontWeight: '700', color: '#1e293b' }; base.properties = { value: 'Title' }; break;
      case 'text': base.styles = { fontSize: '14px', color: '#64748b' }; base.properties = { value: 'Paragraph text.' }; break;
      case 'divider': base.styles = { margin: '12px 0', borderBottom: '1px solid #cbd5e1' }; break;
      case 'image': base.properties = { src: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80' }; base.styles = { borderRadius: '8px' }; break;
      case 'video': base.properties = { src: 'https://www.w3schools.com/html/mov_bbb.mp4' }; base.styles = { borderRadius: '8px' }; break;
      case 'icon': base.properties = { iconName: 'Heart', iconSize: 24 }; base.styles = { color: '#6366f1' }; break;
      case 'button': base.styles = { backgroundColor: '#6366f1', color: '#fff', padding: '10px 16px', borderRadius: '8px', fontWeight: '500', fontSize: '14px', border: 'none' }; base.properties = { value: 'Button' }; base.actions = { onClick: { type: 'none' } }; break;
      case 'input': base.properties = { placeholder: 'Type...' }; base.actions = { onChange: { type: 'none' } }; break;
      case 'textarea': base.properties = { placeholder: 'Text...' }; base.actions = { onChange: { type: 'none' } }; break;
      case 'select': base.properties = { options: ['Option 1', 'Option 2'] }; base.actions = { onChange: { type: 'none' } }; break;
      case 'checkbox': base.label = 'Checkbox'; base.actions = { onChange: { type: 'none' } }; break;
      case 'switch': base.label = 'Toggle'; base.actions = { onChange: { type: 'none' } }; break;
      case 'table': base.properties = { dataSource: '', columns: [] }; break;
      case 'chart': base.properties = { chartType: 'bar' }; base.label = 'Chart'; break;
      case 'map': base.properties = { mapLocation: 'Cupertino, CA' }; break;
      case 'carousel': base.properties = { src: '' }; break;
      case 'banner': base.properties = { value: 'Big Sale', placeholder: 'Up to 50% off', src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80' }; break;
      case 'list': base.properties = { dataSource: '' }; base.actions = { onClick: { type: 'none' } }; break;
    }
    return base;
  };

  const handleAddElement = (type: ElementType) => {
    const page = pages.find(p => p.id === activePageId);
    if (!page) return;
    const el = createDefaultElement(type);
    let els = [...page.elements];
    if (selectedElementId) {
      const sel = findElementById(page.elements, selectedElementId);
      if (sel && ['container', 'grid', 'card', 'tabs'].includes(sel.type)) {
        if (sel.type === 'tabs') {
          const idx = sel.properties.activeTab || 0;
          if (sel.children?.[idx]) sel.children[idx].children = [...(sel.children[idx].children || []), el];
        } else sel.children = [...(sel.children || []), el];
        els = updateElementInList(page.elements, selectedElementId, sel);
      } else els = [...page.elements, el];
    } else els = [...page.elements, el];
    const ps = pages.map(p => p.id === activePageId ? { ...p, elements: els } : p);
    setPages(ps); setSelectedElementId(el.id); saveConfig(ps);
    showToast(`Added ${type}`);
  };

  const handleAddBlock = (elements: AppElement[]) => {
    const page = pages.find(p => p.id === activePageId);
    if (!page) return;
    const els = [...page.elements, ...elements];
    const ps = pages.map(p => p.id === activePageId ? { ...p, elements: els } : p);
    setPages(ps); saveConfig(ps);
    showToast(`Added block (${elements.length} elements)`);
  };

  const deleteElementFromList = (els: AppElement[], id: string): AppElement[] =>
    els.filter(e => e.id !== id).map(e => e.children ? { ...e, children: deleteElementFromList(e.children, id) } : e);

  const handleDeleteElement = (id: string) => {
    const page = pages.find(p => p.id === activePageId);
    if (!page) return;
    const els = deleteElementFromList(page.elements, id);
    const ps = pages.map(p => p.id === activePageId ? { ...p, elements: els } : p);
    setPages(ps); if (selectedElementId === id) setSelectedElementId(null);
    saveConfig(ps); showToast('Deleted');
  };

  const cloneElement = (el: AppElement): AppElement => ({
    ...el, id: `${el.type}-${Date.now()}-${Math.random() * 100}`,
    children: el.children?.map(cloneElement)
  });

  const duplicateElementInList = (els: AppElement[], id: string): AppElement[] => {
    const r: AppElement[] = [];
    for (const el of els) { r.push(el); if (el.id === id) r.push(cloneElement(el)); else if (el.children) el.children = duplicateElementInList(el.children, id); }
    return r;
  };

  const handleDuplicateElement = (id: string) => {
    const page = pages.find(p => p.id === activePageId);
    if (!page) return;
    const els = duplicateElementInList(page.elements, id);
    const ps = pages.map(p => p.id === activePageId ? { ...p, elements: els } : p);
    setPages(ps); saveConfig(ps); showToast('Duplicated');
  };

  const shiftElementInList = (els: AppElement[], id: string, dir: 'up' | 'down'): { list: AppElement[]; moved: boolean } => {
    const idx = els.findIndex(e => e.id === id);
    if (idx !== -1) {
      const c = [...els];
      if (dir === 'up' && idx > 0) { [c[idx], c[idx - 1]] = [c[idx - 1], c[idx]]; return { list: c, moved: true }; }
      if (dir === 'down' && idx < c.length - 1) { [c[idx], c[idx + 1]] = [c[idx + 1], c[idx]]; return { list: c, moved: true }; }
      return { list: els, moved: false };
    }
    let moved = false;
    const m = els.map(e => { if (e.children) { const r = shiftElementInList(e.children, id, dir); if (r.moved) moved = true; return { ...e, children: r.list }; } return e; });
    return { list: m, moved };
  };

  const handleMoveElement = (id: string, dir: 'up' | 'down') => {
    const page = pages.find(p => p.id === activePageId);
    if (!page) return;
    const { list: els, moved } = shiftElementInList(page.elements, id, dir);
    if (!moved) return;
    const ps = pages.map(p => p.id === activePageId ? { ...p, elements: els } : p);
    setPages(ps); saveConfig(ps);
  };

  const handleAddPage = (name: string) => {
    const id = `page-${Date.now()}`;
    const np: AppPage = { id, name, elements: [] };
    const ps = [...pages, np];
    setPages(ps); setActivePageId(id); saveConfig(ps); showToast(`Page: ${name}`);
  };

  const handleDeletePage = (id: string) => {
    if (pages.length <= 1) return;
    const rem = pages.filter(p => p.id !== id);
    setPages(rem); if (activePageId === id) setActivePageId(rem[0].id);
    saveConfig(rem); showToast('Page deleted');
  };

  const handleSetHomePage = (id: string) => { setHomePageId(id); saveConfig(pages, collections, globalStates, id); showToast('Home updated'); };

  const handleAddCollection = (name: string) => {
    if (collections.some(c => c.name.toLowerCase() === name.toLowerCase())) { showToast('Collection exists'); return; }
    const nc: Collection = { name, fields: [], records: [] };
    const cs = [...collections, nc]; setCollections(cs); saveConfig(pages, cs); showToast(`Collection: ${name}`);
  };

  const handleDeleteCollection = (name: string) => {
    const cs = collections.filter(c => c.name !== name);
    setCollections(cs); saveConfig(pages, cs); showToast('Deleted collection');
  };

  const handleUpdateCollection = (col: Collection) => {
    const cs = collections.map(c => c.name === col.name ? col : c);
    setCollections(cs); saveConfig(pages, cs);
    if (activeCollectionDataModal?.name === col.name) setActiveCollectionDataModal(col);
  };

  const handleAddGlobalState = (s: GlobalState) => {
    if (globalStates.some(v => v.name.toLowerCase() === s.name.toLowerCase())) { showToast('Variable exists'); return; }
    const gs = [...globalStates, s]; setGlobalStates(gs); saveConfig(pages, collections, gs); showToast(`Variable: ${s.name}`);
  };

  const handleDeleteGlobalState = (name: string) => {
    const gs = globalStates.filter(v => v.name !== name);
    setGlobalStates(gs); saveConfig(pages, collections, gs); showToast('Removed variable');
  };

  const handleRunScript = (jsCode: string) => {
    try {
      const nav = (pageId: string) => { const f = pages.find(p => p.id === pageId || p.name === pageId); if (f) setActivePageId(f.id); else showToast(`Page not found: ${pageId}`); };
      const toast = (t: string) => showToast(t);
      const db: Record<string, any> = {};
      collections.forEach(col => {
        db[col.name] = {
          add: (rec: any) => { const _id = `rec-${Date.now()}`; handleUpdateCollection({ ...col, records: [...col.records, { _id, ...rec }] }); },
          delete: (id: string) => { handleUpdateCollection({ ...col, records: col.records.filter(r => r._id !== id) }); }
        };
      });
      const st = { ...stateValues };
      const fn = new Function('state', 'collections', 'navigate', 'toast', jsCode);
      fn(st, db, nav, toast);
      setStateValues({ ...st });
    } catch (err: any) { showToast(`Script error: ${err.message}`); }
  };

  const handleUpdatePlayState = (key: string, value: any) => setStateValues(p => ({ ...p, [key]: value }));

  const handleTriggerCollectionAction = (type: 'add' | 'delete', colName: string, data?: any) => {
    const col = collections.find(c => c.name === colName);
    if (!col) return;
    if (type === 'delete') handleUpdateCollection({ ...col, records: col.records.filter(r => r._id !== data) });
  };

  // ── Auth handlers ──
  const handleAuthSuccess = (user: UserResponse) => { setCurrentUser(user); setShowAuthModal(false); };
  const handleLogout = () => { api.logout(); setCurrentUser(null); setCurrentProjectId(null); showToast('Signed out'); };

  // ── Project handlers ──
  const handleSaveProject = async () => {
    if (!currentUser) { setShowAuthModal(true); return; }
    const cfg: ProjectConfig = { appName, pages, collections, globalStates, homePageId, theme, build: buildSettings, push: pushSettings, deployment: deploymentSettings };
    try {
      if (currentProjectId) { await api.updateProject(currentProjectId, { name: appName, config: cfg, screens: pages, theme: theme as any }); showToast('Updated'); }
      else { const p = await api.createProject({ name: appName, config: cfg, screens: pages, theme: theme as any }); setCurrentProjectId(p.id); showToast('Saved'); }
      setProjects(await api.listProjects());
    } catch (err: any) { showToast(`Save failed: ${err.message}`); }
  };

  const handleSaveProjectAs = () => { setSaveProjectName(appName); setSaveDialogOpen(true); };
  const confirmSaveAs = async () => {
    if (!saveProjectName.trim()) return;
    const cfg: ProjectConfig = { appName: saveProjectName, pages, collections, globalStates, homePageId, theme, build: buildSettings, push: pushSettings, deployment: deploymentSettings };
    try { await api.createProject({ name: saveProjectName, config: cfg, screens: pages, theme: theme as any }); setSaveDialogOpen(false); showToast('Saved as new'); setProjects(await api.listProjects()); } catch (err: any) { showToast(`Save failed: ${err.message}`); }
  };

  const handleLoadProject = async (id: string) => {
    try {
      const p = await api.getProject(id); setCurrentProjectId(p.id);
      if (p.config) {
        const c = p.config as any; setAppName(c.appName || p.name);
        if (Array.isArray(p.screens)) { setPages(p.screens as AppPage[]); setActivePageId(c.homePageId || (p.screens as AppPage[])[0]?.id || ''); }
        if (c.collections) setCollections(c.collections); if (c.globalStates) setGlobalStates(c.globalStates);
        if (c.homePageId) setHomePageId(c.homePageId); if (c.theme) setTheme(c.theme);
        if (c.build) setBuildSettings(c.build); if (c.push) setPushSettings(c.push); if (c.deployment) setDeploymentSettings(c.deployment);
      }
      setSelectedElementId(null); setIsPlayMode(false); showToast('Loaded');
    } catch (err: any) { showToast(`Load failed: ${err.message}`); }
  };

  const handleDeleteProject = async (id: string) => {
    try { await api.deleteProject(id); if (currentProjectId === id) setCurrentProjectId(null); setProjects(p => p.filter(x => x.id !== id)); showToast('Deleted'); } catch (err: any) { showToast(`Delete failed: ${err.message}`); }
  };

  const handleExportConfig = () => {
    const cfg: ProjectConfig = { appName, pages, collections, globalStates, homePageId, theme, build: buildSettings, push: pushSettings, deployment: deploymentSettings };
    const a = document.createElement('a'); a.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(cfg, null, 2))}`; a.download = `${appName.replace(/\s+/g, '_')}.json`; a.click(); showToast('Exported');
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fr = new FileReader();
    if (!e.target.files?.[0]) return;
    fr.readAsText(e.target.files[0], 'UTF-8');
    fr.onload = (ev) => {
      try {
        const p: ProjectConfig = JSON.parse(ev.target?.result as string);
        setAppName(p.appName || 'App'); setPages(p.pages || []); setCollections(p.collections || []); setGlobalStates(p.globalStates || []);
        setHomePageId(p.homePageId || ''); setTheme(p.theme || defaultTheme); setBuildSettings(p.build || defaultBuild);
        setPushSettings(p.push || defaultPush); setDeploymentSettings(p.deployment || defaultDeployment);
        if (p.pages?.length) setActivePageId(p.homePageId || p.pages[0].id); showToast('Imported');
      } catch { showToast('Invalid file'); }
    };
  };

  const handlePublishApp = async () => {
    const pc = { appName, homePageId, pages, collections, globalStates, theme, build: buildSettings, push: pushSettings, deployment: deploymentSettings };
    try {
      const r = await api.generateApp({ app_name: appName.replace(/\s+/g, '_'), package_name: buildSettings.appId || 'com.apt.mobile', display_name: appName, version: buildSettings.version || '1.0.0', primary_color: theme.primaryColor || '#2563eb', project_config: pc });
      const a = document.createElement('a'); a.href = api.downloadAppSourceUrl(r.app_id); a.download = r.filename; a.click(); showToast('Generated!');
    } catch {
      exportStandaloneHTML({ appName, pages, collections, globalStates, homePageId, theme, build: buildSettings, push: pushSettings, deployment: deploymentSettings });
      showToast('HTML exported');
    }
  };

  const downloadBuildArtifact = (target: 'android-apk' | 'ios-zip' | 'ota' | 'push') => {
    const cfg: ProjectConfig = { appName, pages, collections, globalStates, homePageId, theme, build: buildSettings, push: pushSettings, deployment: deploymentSettings };
    const a = document.createElement('a');
    a.href = `data:application/json,${encodeURIComponent(JSON.stringify(cfg, null, 2))}`;
    a.download = `${appName.replace(/\s+/g, '_')}_${target}.json`; a.click(); showToast(`${target} artifact`);
  };

  const activePage = pages.find(p => p.id === activePageId) || null;
  const selectedElement = activePage ? findElementById(activePage.elements, selectedElementId || '') : null;

  // ── Render Helpers ──

  const ELEMENT_ICONS: Record<string, { icon: string; cls: string }> = {
    container: { icon: '▦', cls: 'el-layout' },
    grid: { icon: '⊞', cls: 'el-layout' },
    card: { icon: '▢', cls: 'el-layout' },
    tabs: { icon: '☰', cls: 'el-layout' },
    heading: { icon: 'T', cls: 'el-content' },
    text: { icon: '¶', cls: 'el-content' },
    image: { icon: '◇', cls: 'el-content' },
    video: { icon: '▶', cls: 'el-content' },
    icon: { icon: '♥', cls: 'el-content' },
    divider: { icon: '—', cls: 'el-content' },
    button: { icon: '▤', cls: 'el-form' },
    input: { icon: '⌨', cls: 'el-form' },
    textarea: { icon: '❐', cls: 'el-form' },
    select: { icon: '☷', cls: 'el-form' },
    checkbox: { icon: '☑', cls: 'el-form' },
    switch: { icon: '⬡', cls: 'el-form' },
    table: { icon: '⊟', cls: 'el-data' },
    chart: { icon: '◈', cls: 'el-data' },
    map: { icon: '⊕', cls: 'el-data' },
    carousel: { icon: '⊠', cls: 'el-content' },
    banner: { icon: '▣', cls: 'el-content' },
    list: { icon: '☰', cls: 'el-data' },
  };

  // Component Toolbox Groups
  const TOOLBOX_GROUPS = [
    { category: 'Layout', items: [
      { t: 'container', l: 'Container' }, { t: 'grid', l: 'Grid' }, { t: 'card', l: 'Card' }, { t: 'tabs', l: 'Tabs' }
    ]},
    { category: 'Content', items: [
      { t: 'heading', l: 'Heading' }, { t: 'text', l: 'Text' }, { t: 'image', l: 'Image' },
      { t: 'video', l: 'Video' }, { t: 'icon', l: 'Icon' }, { t: 'divider', l: 'Divider' },
      { t: 'carousel', l: 'Carousel' }, { t: 'banner', l: 'Banner' }
    ]},
    { category: 'Forms', items: [
      { t: 'button', l: 'Button' }, { t: 'input', l: 'Input' }, { t: 'textarea', l: 'Textarea' },
      { t: 'select', l: 'Select' }, { t: 'checkbox', l: 'Checkbox' }, { t: 'switch', l: 'Switch' }
    ]},
    { category: 'Data', items: [
      { t: 'table', l: 'Table' }, { t: 'list', l: 'List' }, { t: 'chart', l: 'Chart' }, { t: 'map', l: 'Map' }
    ]}
  ];

  const renderComponentsPanel = () => (
    <div className="sidebar-panel-content">
      {TOOLBOX_GROUPS.map(g => (
        <div key={g.category} style={{ marginBottom: '16px' }}>
          <div className="section-header">{g.category}</div>
          <div className="toolbox-grid">
            {g.items.map(i => {
              const ei = ELEMENT_ICONS[i.t] || { icon: '?', cls: 'el-layout' };
              return (
                <button key={i.t} className="toolbox-element-btn" onClick={() => { handleAddElement(i.t as ElementType); }}>
                  <div className={`el-icon ${ei.cls}`}>{ei.icon}</div>
                  <span className="el-label">{i.l}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="section-header" style={{ marginTop: '12px' }}>E-Commerce Blocks</div>
      {ECOMMERCE_BLOCKS.map(group => (
        <div key={group.category} style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', padding: '0 2px' }}>
            {group.category}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {group.blocks.map(b => (
              <button key={b.id} className="mobile-block-btn" onClick={() => handleAddBlock(b.create())}>
                <strong>{b.title}</strong>
                <small>{b.desc}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderPagesPanel = () => (
    <div className="sidebar-panel-content">
      <form onSubmit={(e) => { e.preventDefault(); if (newPageName.trim()) { handleAddPage(newPageName.trim()); setNewPageName(''); } }} style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        <input type="text" className="form-input" placeholder="New page..." value={newPageName} onChange={e => setNewPageName(e.target.value)} style={{ fontSize: '0.8rem' }} />
        <button type="submit" className="glow-btn" style={{ padding: '10px 12px' }}><Plus size={16} /></button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {pages.map(p => {
          const isActive = p.id === activePageId;
          const isHome = p.id === homePageId;
          return (
            <div key={p.id} className={`page-item ${isActive ? 'active' : ''}`} onClick={() => { setActivePageId(p.id); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <FileText size={14} style={{ color: isActive ? 'var(--accent-hover)' : 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', fontWeight: isActive ? 500 : 400 }}>{p.name}</span>
                {isHome && <span style={{ fontSize: '0.5rem', color: 'var(--success)', background: 'var(--success-bg)', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>HOME</span>}
              </div>
              <div style={{ display: 'flex', gap: '2px' }}>
                {!isHome && <button onClick={e => { e.stopPropagation(); handleSetHomePage(p.id); }} className="icon-btn" style={{ width: '28px', height: '28px' }}><Home size={12} /></button>}
                {pages.length > 1 && <button onClick={e => { e.stopPropagation(); handleDeletePage(p.id); }} className="icon-btn" style={{ width: '28px', height: '28px', color: 'var(--text-muted)' }}><Trash2 size={12} /></button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderInspectorPanel = () => {
    if (!selectedElement) return null;
    return (
      <div className="inspector-panel">
        <div className="inspector-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="inspector-element-badge">{selectedElement.type}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>{selectedElement.label}</span>
          </div>
        </div>
        <div className="panel-tabs">
          <button className={`panel-tab-btn ${inspectorPanelTab === 'design' ? 'active' : ''}`} onClick={() => setInspectorPanelTab('design')}>Design</button>
          <button className={`panel-tab-btn ${inspectorPanelTab === 'content' ? 'active' : ''}`} onClick={() => setInspectorPanelTab('content')}>Props</button>
          <button className={`panel-tab-btn ${inspectorPanelTab === 'actions' ? 'active' : ''}`} onClick={() => setInspectorPanelTab('actions')}>Actions</button>
        </div>
        <div className="sidebar-panel-content">
          {/* Design Tab */}
          {inspectorPanelTab === 'design' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <InspectorSection title="Dimensions">
                <div className="property-row">
                  <div style={{ flex: 1 }}>
                    <span className="form-label">Width</span>
                    <input type="text" className="form-input" placeholder="auto" value={selectedElement.styles.width || ''} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, width: e.target.value || undefined } })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="form-label">Height</span>
                    <input type="text" className="form-input" placeholder="auto" value={selectedElement.styles.height || ''} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, height: e.target.value || undefined } })} />
                  </div>
                </div>
              </InspectorSection>
              <InspectorSection title="Spacing">
                <div className="property-row">
                  <div style={{ flex: 1 }}><span className="form-label">Padding</span><input type="text" className="form-input" placeholder="12px" value={selectedElement.styles.padding || ''} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, padding: e.target.value || undefined } })} /></div>
                  <div style={{ flex: 1 }}><span className="form-label">Margin</span><input type="text" className="form-input" placeholder="0" value={selectedElement.styles.margin || ''} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, margin: e.target.value || undefined } })} /></div>
                </div>
              </InspectorSection>
              <InspectorSection title="Colors">
                <div className="form-group">
                  <span className="form-label">Background</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="color" style={{ width: '36px', height: '36px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }} value={selectedElement.styles.backgroundColor?.startsWith('#') ? selectedElement.styles.backgroundColor : '#ffffff'} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, backgroundColor: e.target.value } })} />
                    <input type="text" className="form-input" placeholder="#fff" value={selectedElement.styles.backgroundColor || ''} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, backgroundColor: e.target.value || undefined } })} />
                  </div>
                </div>
                <div className="property-row">
                  <div style={{ flex: 1 }}><span className="form-label">Radius</span><input type="text" className="form-input" placeholder="8px" value={selectedElement.styles.borderRadius || ''} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, borderRadius: e.target.value || undefined } })} /></div>
                  <div style={{ flex: 1 }}><span className="form-label">Border</span><input type="text" className="form-input" placeholder="1px solid" value={selectedElement.styles.border || ''} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, border: e.target.value || undefined } })} /></div>
                </div>
              </InspectorSection>
              {['heading', 'text', 'button', 'input', 'select', 'textarea'].includes(selectedElement.type) && (
                <InspectorSection title="Typography">
                  <div className="property-row">
                    <div style={{ flex: 1 }}><span className="form-label">Size</span><input type="text" className="form-input" placeholder="14px" value={selectedElement.styles.fontSize || ''} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, fontSize: e.target.value || undefined } })} /></div>
                    <div style={{ flex: 1 }}><span className="form-label">Weight</span><select className="form-select" value={selectedElement.styles.fontWeight || '400'} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, fontWeight: e.target.value || undefined } })}><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semi</option><option value="700">Bold</option></select></div>
                  </div>
                  <div className="form-group"><span className="form-label">Color</span><input type="text" className="form-input" placeholder="#000" value={selectedElement.styles.color || ''} onChange={e => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, color: e.target.value || undefined } })} /></div>
                </InspectorSection>
              )}
              {['container', 'grid', 'card'].includes(selectedElement.type) && (
                <InspectorSection title="Flex Layout">
                  <div className="property-row"><span className="form-label">Direction</span>
                    <div className="property-control-group">
                      <button className={`property-control-btn ${selectedElement.styles.flexDirection === 'row' ? 'active' : ''}`} onClick={() => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, flexDirection: 'row' } })}>Row</button>
                      <button className={`property-control-btn ${selectedElement.styles.flexDirection === 'column' ? 'active' : ''}`} onClick={() => handleUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, flexDirection: 'column' } })}>Col</button>
                    </div>
                  </div>
                </InspectorSection>
              )}
            </div>
          )}

          {/* Props Tab */}
          {inspectorPanelTab === 'content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {['heading', 'text', 'button'].includes(selectedElement.type) && (
                <div className="form-group"><span className="form-label">Text <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{'{{state.var}}'}</span></span>
                  <textarea className="form-input" style={{ minHeight: '60px' }} placeholder="Content..." value={selectedElement.properties.value || ''} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, value: e.target.value } })} />
                </div>
              )}
              {selectedElement.type === 'grid' && (
                <div className="form-group"><span className="form-label">Columns</span>
                  <select className="form-select" value={selectedElement.properties.gridCols || 2} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, gridCols: Number(e.target.value) } })}>
                    <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                  </select>
                </div>
              )}
              {['image', 'video'].includes(selectedElement.type) && (
                <div className="form-group"><span className="form-label">Source URL</span><input type="text" className="form-input" placeholder="https://..." value={selectedElement.properties.src || ''} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, src: e.target.value } })} /></div>
              )}
              {['input', 'textarea'].includes(selectedElement.type) && (
                <div className="form-group"><span className="form-label">Placeholder</span><input type="text" className="form-input" placeholder="Hint..." value={selectedElement.properties.placeholder || ''} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, placeholder: e.target.value } })} /></div>
              )}
              {selectedElement.type === 'icon' && (
                <div>
                  <div className="form-group"><span className="form-label">Icon</span>
                    <button className="glow-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowIconPicker(true)}>
                      Choose ({selectedElement.properties.iconName || 'Heart'})
                    </button>
                  </div>
                  <div className="form-group"><span className="form-label">Size ({selectedElement.properties.iconSize || 24}px)</span>
                    <input type="range" min="14" max="80" style={{ width: '100%' }} value={selectedElement.properties.iconSize || 24} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, iconSize: Number(e.target.value) } })} />
                  </div>
                </div>
              )}
              {selectedElement.type === 'table' && (
                <div className="form-group"><span className="form-label">Collection</span>
                  <select className="form-select" value={selectedElement.properties.dataSource || ''} onChange={e => { const c = collections.find(x => x.name === e.target.value); handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, dataSource: e.target.value, columns: c?.fields.map(f => f.name) || [] } }); }}>
                    <option value="">-- Select --</option>
                    {collections.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {selectedElement.type === 'chart' && (
                <div className="form-group"><span className="form-label">Chart Type</span>
                  <select className="form-select" value={selectedElement.properties.chartType || 'bar'} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, chartType: e.target.value } })}>
                    <option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option>
                  </select>
                </div>
              )}
              {selectedElement.type === 'select' && (
                <div className="form-group"><span className="form-label">Options (comma)</span><input type="text" className="form-input" placeholder="A, B, C" value={selectedElement.properties.options?.join(', ') || ''} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, options: e.target.value.split(',').map(s => s.trim()) } })} /></div>
              )}
              {selectedElement.type === 'map' && (
                <div className="form-group"><span className="form-label">Location</span><input type="text" className="form-input" placeholder="City" value={selectedElement.properties.mapLocation || ''} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, mapLocation: e.target.value } })} /></div>
              )}
              {selectedElement.type === 'carousel' && (
                <div className="form-group"><span className="form-label">Image URLs (comma separated)</span><textarea className="form-input" style={{ minHeight: '50px' }} placeholder="https://..." value={selectedElement.properties.src || ''} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, src: e.target.value } })} /></div>
              )}
              {selectedElement.type === 'banner' && (
                <>
                  <div className="form-group"><span className="form-label">Title</span><input type="text" className="form-input" value={selectedElement.properties.value || ''} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, value: e.target.value } })} /></div>
                  <div className="form-group"><span className="form-label">Subtitle</span><input type="text" className="form-input" value={selectedElement.properties.placeholder || ''} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, placeholder: e.target.value } })} /></div>
                  <div className="form-group"><span className="form-label">Background Image URL</span><input type="text" className="form-input" value={selectedElement.properties.src || ''} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, src: e.target.value } })} /></div>
                </>
              )}
              {selectedElement.type === 'list' && (
                <div className="form-group"><span className="form-label">Collection</span>
                  <select className="form-select" value={selectedElement.properties.dataSource || ''} onChange={e => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, dataSource: e.target.value } })}>
                    <option value="">-- Select --</option>
                    {collections.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Actions Tab */}
          {inspectorPanelTab === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {['button', 'icon', 'list'].includes(selectedElement.type) && <ActionEditor eventKey="onClick" label="On Click" element={selectedElement} onUpdate={handleUpdateElement} pages={pages} globalStates={globalStates} />}
              {['input', 'textarea', 'select', 'checkbox', 'switch'].includes(selectedElement.type) && <ActionEditor eventKey="onChange" label="On Change" element={selectedElement} onUpdate={handleUpdateElement} pages={pages} globalStates={globalStates} />}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSettingsPanel = () => (
    <div className="sidebar-panel-content">
      <div className="panel-tabs">
        <button className="panel-tab-btn active" onClick={() => {}}>Theme</button>
        <button className="panel-tab-btn" onClick={() => {}}>Data</button>
        <button className="panel-tab-btn" onClick={() => {}}>State</button>
        <button className="panel-tab-btn" onClick={() => {}}>Build</button>
      </div>
        {/* Theme */}
        <InspectorSection title="Theme Colors">
          <div className="theme-swatch-row">
            {[['primaryColor', 'Primary'], ['accentColor', 'Accent'], ['backgroundColor', 'BG'], ['surfaceColor', 'Surface'], ['textColor', 'Text'], ['fontFamily', 'Font']].map(([key, label]) => (
              key === 'fontFamily' ? (
                <div key={key} className="theme-swatch">
                  <span>{label}</span>
                  <select className="form-select" style={{ padding: '4px', fontSize: '0.65rem' }} value={(theme as any)[key]} onChange={e => { const t = { ...theme, [key]: e.target.value }; setTheme(t); saveConfig(pages, collections, globalStates, homePageId, appName, t); }}>
                    <option value="Inter">Inter</option><option value="Outfit">Outfit</option><option value="System">System</option>
                  </select>
                </div>
              ) : (
                <label key={key} className="theme-swatch">
                  <span>{label}</span>
                  <input type="color" value={(theme as any)[key]} onChange={e => { const t = { ...theme, [key]: e.target.value }; setTheme(t); saveConfig(pages, collections, globalStates, homePageId, appName, t); }} />
                </label>
              )
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <div style={{ flex: 1 }}><span className="form-label">Mode</span>
              <select className="form-select" value={theme.mode} onChange={e => { const t = { ...theme, mode: e.target.value as any }; setTheme(t); saveConfig(pages, collections, globalStates, homePageId, appName, t); }}>
                <option value="light">Light</option><option value="dark">Dark</option>
              </select>
            </div>
            <div style={{ flex: 1 }}><span className="form-label">Radius</span>
              <select className="form-select" value={theme.radius} onChange={e => { const t = { ...theme, radius: e.target.value as any }; setTheme(t); saveConfig(pages, collections, globalStates, homePageId, appName, t); }}>
                <option value="compact">Compact</option><option value="rounded">Rounded</option><option value="soft">Soft</option>
              </select>
            </div>
          </div>
        </InspectorSection>

        {/* Collections */}
        <InspectorSection title="Data Collections">
          <form onSubmit={(e) => { e.preventDefault(); if (newColName.trim()) { handleAddCollection(newColName.trim().replace(/[^a-zA-Z0-9]/g, '')); setNewColName(''); } }} style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <input type="text" className="form-input" placeholder="Collection name..." value={newColName} onChange={e => setNewColName(e.target.value)} />
            <button type="submit" className="glow-btn" style={{ padding: '10px 12px' }}><Plus size={16} /></button>
          </form>
          {collections.length === 0 ? <div className="empty-state">No collections</div> : collections.map(col => (
            <div key={col.name} className="collection-item" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={14} style={{ color: 'var(--accent-hover)' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>{col.name}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>({col.records.length})</span>
                </div>
                <button className="icon-btn" style={{ width: '28px', height: '28px', color: 'var(--text-muted)' }} onClick={() => handleDeleteCollection(col.name)}><Trash2 size={12} /></button>
              </div>
              <button className="glow-btn" style={{ width: '100%', justifyContent: 'center', padding: '7px', fontSize: '0.7rem' }} onClick={() => setActiveCollectionDataModal(col)}><DatabaseZap size={12} /> Manage</button>
            </div>
          ))}
        </InspectorSection>

        {/* State */}
        <InspectorSection title="Variables">
          <form onSubmit={(e) => { e.preventDefault(); handleCreateState(); }} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            <input type="text" className="form-input" placeholder="Variable name" value={newVarName} onChange={e => setNewVarName(e.target.value)} />
            <div style={{ display: 'flex', gap: '6px' }}>
              <select className="form-select" style={{ flex: 1 }} value={newVarType} onChange={e => setNewVarType(e.target.value as any)}>
                <option value="string">Text</option><option value="number">Number</option><option value="boolean">Bool</option>
              </select>
              <input type="text" className="form-input" style={{ flex: 2 }} placeholder="Default" value={newVarDefault} onChange={e => setNewVarDefault(e.target.value)} />
            </div>
            <button type="submit" className="glow-btn" style={{ justifyContent: 'center', padding: '8px', fontSize: '0.72rem' }}><Plus size={14} /> Add</button>
          </form>
          {globalStates.length === 0 ? <div className="empty-state">No variables</div> : globalStates.map(v => (
            <div key={v.name} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', marginBottom: '6px'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>{v.name}</span>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginLeft: '4px' }}>({v.type})</span>
              </div>
              <button className="icon-btn" style={{ width: '26px', height: '26px', color: 'var(--text-muted)' }} onClick={() => handleDeleteGlobalState(v.name)}><Trash2 size={11} /></button>
            </div>
          ))}
        </InspectorSection>

        {/* Build */}
        <InspectorSection title="Build Settings">
          <div className="build-card">
            <h5><Package size={14} /> Native Build</h5>
            <input className="form-input" value={buildSettings.appId} onChange={e => { const b = { ...buildSettings, appId: e.target.value }; setBuildSettings(b); saveConfig(pages, collections, globalStates, homePageId, appName, theme, b); }} placeholder="com.app.id" />
            <div className="property-row">
              <input className="form-input" value={buildSettings.version} onChange={e => { const b = { ...buildSettings, version: e.target.value }; setBuildSettings(b); saveConfig(pages, collections, globalStates, homePageId, appName, theme, b); }} placeholder="1.0.0" />
              <input className="form-input" type="number" value={buildSettings.buildNumber} onChange={e => { const b = { ...buildSettings, buildNumber: Number(e.target.value) }; setBuildSettings(b); saveConfig(pages, collections, globalStates, homePageId, appName, theme, b); }} />
            </div>
            <div className="build-actions">
              <button className="glow-btn" onClick={() => downloadBuildArtifact('android-apk')}><Smartphone size={12} /> APK</button>
              <button className="secondary-btn" onClick={() => downloadBuildArtifact('ios-zip')}><Package size={12} /> iOS</button>
            </div>
          </div>
          <div className="build-card" style={{ marginTop: '8px' }}>
            <h5><Bell size={14} /> Push</h5>
            <select className="form-select" value={pushSettings.provider} onChange={e => { const p = { ...pushSettings, provider: e.target.value as any }; setPushSettings(p); saveConfig(pages, collections, globalStates, homePageId, appName, theme, buildSettings, p); }}>
              <option value="firebase">Firebase</option><option value="expo">Expo</option><option value="onesignal">OneSignal</option>
            </select>
            <input className="form-input" value={pushSettings.senderId} onChange={e => { const p = { ...pushSettings, senderId: e.target.value }; setPushSettings(p); saveConfig(pages, collections, globalStates, homePageId, appName, theme, buildSettings, p); }} placeholder="Sender ID" />
          </div>
        </InspectorSection>
    </div>
  );

  const handleCreateState = () => {
    const name = newVarName.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (!name) return;
    let val: any = newVarDefault;
    if (newVarType === 'number') val = Number(newVarDefault || 0);
    else if (newVarType === 'boolean') val = newVarDefault === 'true';
    handleAddGlobalState({ name, type: newVarType, defaultValue: val });
    setNewVarName(''); setNewVarDefault('');
  };

  return (
    <div className="workspace-container">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="topbar-brand">
          <div className="brand-mark"><Cpu size={14} /></div>
          <div className="brand-copy">
            <input
              type="text" value={appName}
              onChange={e => { setAppName(e.target.value); saveConfig(pages, collections, globalStates, homePageId, e.target.value); }}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', width: '120px', padding: '2px 0' }}
              placeholder="App name"
            />
            <p>Mobile app</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={handleExportConfig} title="Export"><Download size={14} /></button>
          <label className="icon-btn" style={{ cursor: 'pointer' }} title="Import"><Upload size={14} /><input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportConfig} /></label>
          <button className="glow-btn" style={{ fontSize: '0.65rem', padding: '5px 10px' }} onClick={handlePublishApp}><Sparkles size={12} /> Publish</button>
          {currentUser ? (
            <button className="user-avatar-btn" onClick={handleLogout} title={currentUser.name}>{currentUser.name.charAt(0).toUpperCase()}</button>
          ) : (
            <button className="icon-btn" onClick={() => setShowAuthModal(true)}><LogIn size={14} /></button>
          )}
        </div>
      </header>

      {/* Workspace Body */}
      <div className="workspace-body">
        {/* Left Sidebar */}
        <aside className="left-sidebar">
          <div className="sidebar-tab-bar">
            <button className={`sidebar-tab-btn ${activeLeftTab === 'components' ? 'active' : ''}`} onClick={() => setActiveLeftTab('components')} title="Components">
              <Layers size={16} />
            </button>
            <button className={`sidebar-tab-btn ${activeLeftTab === 'pages' ? 'active' : ''}`} onClick={() => setActiveLeftTab('pages')} title="Pages">
              <FileText size={16} />
            </button>
            <button className={`sidebar-tab-btn ${activeLeftTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveLeftTab('settings')} title="Settings">
              <Settings size={16} />
            </button>
            <button className={`sidebar-tab-btn ${activeLeftTab === 'projects' ? 'active' : ''}`} onClick={() => {
              if (currentUser) setActiveLeftTab('projects');
              else setShowAuthModal(true);
            }} title="Projects">
              <FolderOpen size={16} />
            </button>
          </div>
          <div className="sidebar-panel">
            {activeLeftTab === 'components' && renderComponentsPanel()}
            {activeLeftTab === 'pages' && renderPagesPanel()}
            {activeLeftTab === 'settings' && renderSettingsPanel()}
            {activeLeftTab === 'projects' && (
              <div className="sidebar-panel-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                  <div className="user-avatar-btn" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                    {currentUser ? currentUser.name.charAt(0).toUpperCase() : <User size={16} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 500 }}>{currentUser ? currentUser.name : 'Not signed in'}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{currentUser ? currentUser.email : 'Sign in to save'}</div>
                  </div>
                </div>
                {currentUser && (
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                    <button className="glow-btn" onClick={handleSaveProject} style={{ flex: 1, justifyContent: 'center' }}><Save size={14} /> Save</button>
                    <button className="secondary-btn" onClick={handleSaveProjectAs} style={{ flex: 1, justifyContent: 'center' }}><ExternalLink size={14} /> Save As</button>
                  </div>
                )}
                <div className="section-header">Projects ({projects.length})</div>
                {projects.length === 0 ? (
                  <div className="empty-state">{currentUser ? 'No projects yet' : 'Sign in to view projects'}</div>
                ) : (
                  projects.map(p => (
                    <div key={p.id} className={`project-list-item ${p.id === currentProjectId ? 'active' : ''}`} style={{ marginBottom: '6px' }} onClick={() => handleLoadProject(p.id)}>
                      <div className="project-info">
                        <span className="project-name">{p.name}</span>
                        <span className="project-meta">{new Date(p.updated_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="project-load-btn" onClick={e => { e.stopPropagation(); handleLoadProject(p.id); }}>Open</button>
                        <button className="project-delete-btn" onClick={e => { e.stopPropagation(); handleDeleteProject(p.id); }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="canvas-area">
          <WorkspaceCanvas
            activePage={activePage}
            selectedElementId={selectedElementId}
            onSelectElement={handleSelectElement}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicateElement}
            onMoveElement={handleMoveElement}
            isPlayMode={isPlayMode}
            globalStates={globalStates}
            collections={collections}
            onUpdateState={handleUpdatePlayState}
            onRunScript={handleRunScript}
            onNavigate={setActivePageId}
            onShowToast={showToast}
            stateValues={stateValues}
            onTriggerCollectionAction={handleTriggerCollectionAction}
          />

          {/* Play Mode toolbar */}
          {isPlayMode && (
            <div className="play-mode-toolbar">
              <button className="icon-btn active" onClick={() => { setIsPlayMode(false); setSelectedElementId(null); }} title="Exit play mode"><Edit3 size={14} /></button>
            </div>
          )}
        </main>

        {/* Right Inspector */}
        {selectedElement && (
          <aside className="right-inspector">
            {renderInspectorPanel()}
          </aside>
        )}
      </div>

      {/* Modals */}
      {activeCollectionDataModal && (
        <CollectionModal collection={activeCollectionDataModal} onUpdateCollection={handleUpdateCollection} onClose={() => setActiveCollectionDataModal(null)} />
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onAuth={handleAuthSuccess} />
      )}

      {saveDialogOpen && (
        <div className="modal-overlay" onClick={() => setSaveDialogOpen(false)}>
          <div className="auth-modal-container">
            <div className="auth-modal" onClick={e => e.stopPropagation()}>
              <div className="auth-modal-header">
                <h2>Save As</h2>
                <button className="icon-btn" onClick={() => setSaveDialogOpen(false)}><X size={16} /></button>
              </div>
              <div className="auth-form">
                <input className="form-input" type="text" placeholder="Project name" value={saveProjectName} onChange={e => setSaveProjectName(e.target.value)} autoFocus />
                <button className="glow-btn auth-submit" onClick={confirmSaveAs}><Save size={14} /> Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIconPicker && selectedElement && (
        <IconSelector currentIcon={selectedElement.properties.iconName || 'Heart'} onSelectIcon={(name) => handleUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, iconName: name } })} onClose={() => setShowIconPicker(false)} />
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <CheckCircle size={14} style={{ color: 'var(--success)' }} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ──

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="inspector-section">
      <div className="section-header">{title}</div>
      {children}
    </div>
  );
}

function ActionEditor({ eventKey, label, element, onUpdate, pages, globalStates }: {
  eventKey: 'onClick' | 'onChange';
  label: string;
  element: AppElement;
  onUpdate: (el: AppElement) => void;
  pages: AppPage[];
  globalStates: GlobalState[];
}) {
  const action = element.actions[eventKey] || { type: 'none' };
  const setAction = (a: AppAction) => onUpdate({ ...element, actions: { ...element.actions, [eventKey]: a } });

  return (
    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--accent-hover)', marginBottom: '8px' }}>{label}</div>
      <div className="form-group"><span className="form-label">Action</span>
        <select className="form-select" value={action.type} onChange={e => setAction({ type: e.target.value as any })}>
          <option value="none">None</option><option value="navigate">Navigate</option>
          {eventKey === 'onChange' && <option value="state">Set Variable</option>}
          <option value="toast">Toast</option><option value="modal">Modal</option><option value="script">Custom JS</option>
        </select>
      </div>
      {action.type === 'navigate' && (
        <div className="form-group"><span className="form-label">Page</span>
          <select className="form-select" value={action.targetPage || ''} onChange={e => setAction({ ...action, targetPage: e.target.value })}>
            <option value="">-- Select --</option>
            {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      {action.type === 'state' && (
        <div className="form-group"><span className="form-label">Variable</span>
          <select className="form-select" value={action.stateKey || ''} onChange={e => setAction({ ...action, stateKey: e.target.value })}>
            <option value="">-- Select --</option>
            {globalStates.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
          </select>
        </div>
      )}
      {action.type === 'toast' && (
        <div className="form-group"><span className="form-label">Message</span>
          <input type="text" className="form-input" value={action.toastText || ''} onChange={e => setAction({ ...action, toastText: e.target.value })} placeholder="Hello!" />
        </div>
      )}
      {action.type === 'modal' && (
        <div className="form-group"><span className="form-label">Content</span>
          <textarea className="form-input" style={{ minHeight: '50px' }} value={action.modalContent || ''} onChange={e => setAction({ ...action, modalContent: e.target.value })} placeholder="Modal text" />
        </div>
      )}
      {action.type === 'script' && (
        <div className="form-group"><span className="form-label">JS Code</span>
          <textarea className="custom-code-editor" value={action.code || ''} onChange={e => setAction({ ...action, code: e.target.value })} placeholder="// state, navigate, toast" />
        </div>
      )}
    </div>
  );
}
