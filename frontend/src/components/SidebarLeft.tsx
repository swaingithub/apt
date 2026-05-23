import React, { useState } from 'react';
import type {
  AppPage, Collection, GlobalState, ActiveTabLeft, ElementType,
  AppTheme, BuildSettings, PushSettings, DeploymentSettings
} from '../types';
import type { UserResponse, ProjectListItem } from '../apiClient';
import {
  Layers, Database,
  Plus, Trash2, Home, FileText, DatabaseZap,
  Blocks, Palette, Package, Bell, CloudUpload, Smartphone,
  User, LogIn, Save, FolderOpen as FolderIcon, ExternalLink, X
} from 'lucide-react';

interface SidebarLeftProps {
  activeTab: ActiveTabLeft;
  setActiveTab: (tab: ActiveTabLeft) => void;
  pages: AppPage[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: (name: string) => void;
  onDeletePage: (id: string) => void;
  onSetHomePage: (id: string) => void;
  collections: Collection[];
  onAddCollection: (name: string) => void;
  onDeleteCollection: (name: string) => void;
  onOpenCollectionData: (col: Collection) => void;
  globalStates: GlobalState[];
  onAddGlobalState: (state: GlobalState) => void;
  onDeleteGlobalState: (name: string) => void;
  onAddElement: (type: ElementType) => void;
  onAddBlock: (type: 'mobile-home' | 'commerce-list' | 'profile' | 'push-card' | 'ota-status') => void;
  theme: AppTheme;
  onUpdateTheme: (theme: AppTheme) => void;
  buildSettings: BuildSettings;
  onUpdateBuild: (settings: BuildSettings) => void;
  pushSettings: PushSettings;
  onUpdatePush: (settings: PushSettings) => void;
  deploymentSettings: DeploymentSettings;
  onUpdateDeployment: (settings: DeploymentSettings) => void;
  onGenerateArtifact: (target: 'android-apk' | 'ios-zip' | 'ota' | 'push') => void;
  homePageId: string;
  currentUser: UserResponse | null;
  onLoginClick: () => void;
  onLogout: () => void;
  projects: ProjectListItem[];
  currentProjectId: string | null;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  onLoadProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

const TOOLBOX_GROUPS = [
  {
    category: 'Layout',
    items: [
      { type: 'container', label: 'Container', desc: 'Flex layout wrapper' },
      { type: 'grid', label: 'Grid', desc: 'Column builder' },
      { type: 'card', label: 'Card', desc: 'Bordered box' },
      { type: 'tabs', label: 'Tabs', desc: 'Tab switcher' }
    ]
  },
  {
    category: 'Content',
    items: [
      { type: 'heading', label: 'Heading', desc: 'Bold title' },
      { type: 'text', label: 'Text', desc: 'Paragraph block' },
      { type: 'image', label: 'Image', desc: 'Media block' },
      { type: 'video', label: 'Video', desc: 'Video player' },
      { type: 'icon', label: 'Icon', desc: 'Vector icon' },
      { type: 'divider', label: 'Divider', desc: 'Line break' }
    ]
  },
  {
    category: 'Forms',
    items: [
      { type: 'button', label: 'Button', desc: 'Action trigger' },
      { type: 'input', label: 'Input', desc: 'Text field' },
      { type: 'textarea', label: 'Textarea', desc: 'Multi-line' },
      { type: 'select', label: 'Select', desc: 'Dropdown' },
      { type: 'checkbox', label: 'Checkbox', desc: 'Toggle box' },
      { type: 'switch', label: 'Switch', desc: 'On/off toggle' }
    ]
  },
  {
    category: 'Data',
    items: [
      { type: 'table', label: 'Table', desc: 'Data grid' },
      { type: 'chart', label: 'Chart', desc: 'Analytics' },
      { type: 'map', label: 'Map', desc: 'Location' }
    ]
  }
];

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  activeTab, setActiveTab,
  pages, activePageId, onSelectPage, onAddPage, onDeletePage, onSetHomePage,
  collections, onAddCollection, onDeleteCollection, onOpenCollectionData,
  globalStates, onAddGlobalState, onDeleteGlobalState,
  onAddElement, onAddBlock,
  theme, onUpdateTheme,
  buildSettings, onUpdateBuild,
  pushSettings, onUpdatePush,
  deploymentSettings, onUpdateDeployment,
  onGenerateArtifact, homePageId,
  currentUser, onLoginClick, onLogout,
  projects, currentProjectId,
  onSaveProject, onSaveProjectAs, onLoadProject, onDeleteProject
}) => {
  const [newPageName, setNewPageName] = useState('');
  const [newColName, setNewColName] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<'string' | 'number' | 'boolean'>('string');
  const [newVarDefault, setNewVarDefault] = useState('');

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPageName.trim()) { onAddPage(newPageName.trim()); setNewPageName(''); }
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newColName.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (cleanName) { onAddCollection(cleanName); setNewColName(''); }
  };

  const handleCreateGlobalState = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newVarName.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanName) return;
    let defaultTypedVal: any = newVarDefault;
    if (newVarType === 'number') defaultTypedVal = Number(newVarDefault || 0);
    else if (newVarType === 'boolean') defaultTypedVal = newVarDefault === 'true';
    onAddGlobalState({ name: cleanName, type: newVarType, defaultValue: defaultTypedVal });
    setNewVarName(''); setNewVarDefault('');
  };

  return (
    <div className="left-sidebar">
      <div className="sidebar-tabs">
        <button className={`sidebar-tab-btn ${activeTab === 'components' ? 'active' : ''}`} onClick={() => setActiveTab('components')}>
          <Layers size={14} /> Toolbox
        </button>
        <button className={`sidebar-tab-btn ${activeTab === 'blocks' ? 'active' : ''}`} onClick={() => setActiveTab('blocks')}>
          <Blocks size={14} /> Blocks
        </button>
        <button className={`sidebar-tab-btn ${activeTab === 'pages' ? 'active' : ''}`} onClick={() => setActiveTab('pages')}>
          <FileText size={14} /> Pages
        </button>
        <button className={`sidebar-tab-btn ${activeTab === 'collections' ? 'active' : ''}`} onClick={() => setActiveTab('collections')}>
          <Database size={14} /> Data
        </button>
        <button className={`sidebar-tab-btn ${activeTab === 'state' ? 'active' : ''}`} onClick={() => setActiveTab('state')}>
          <DatabaseZap size={14} /> State
        </button>
        <button className={`sidebar-tab-btn ${activeTab === 'theme' ? 'active' : ''}`} onClick={() => setActiveTab('theme')}>
          <Palette size={14} /> Theme
        </button>
        <button className={`sidebar-tab-btn ${activeTab === 'build' ? 'active' : ''}`} onClick={() => setActiveTab('build')}>
          <Package size={14} /> Build
        </button>
        <button className={`sidebar-tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects' as any)}>
          <FolderIcon size={14} /> Projects
        </button>
      </div>

      <div className="sidebar-content">

        {/* ── TOOLBOX ── */}
        {activeTab === 'components' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {TOOLBOX_GROUPS.map((group) => (
              <div key={group.category}>
                <h5 style={{
                  fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)',
                  fontWeight: 600, letterSpacing: '0.06em', marginBottom: '8px'
                }}>{group.category}</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {group.items.map((item) => (
                    <button key={item.type} onClick={() => onAddElement(item.type as ElementType)} className="toolbox-element-btn" title={item.desc}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BLOCKS ── */}
        {activeTab === 'blocks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { id: 'mobile-home', icon: Smartphone, title: 'Home Screen', desc: 'Hero + actions' },
              { id: 'commerce-list', icon: Database, title: 'Data List', desc: 'Collection list' },
              { id: 'profile', icon: Home, title: 'Profile', desc: 'Account card' },
              { id: 'push-card', icon: Bell, title: 'Push Card', desc: 'Notification block' },
              { id: 'ota-status', icon: CloudUpload, title: 'OTA Status', desc: 'Release channel' }
            ].map((block) => {
              const BlockIcon = block.icon;
              return (
                <button key={block.id} className="mobile-block-btn" onClick={() => onAddBlock(block.id as any)} title={block.desc}>
                  <BlockIcon size={16} />
                  <span><strong>{block.title}</strong><small>{block.desc}</small></span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── PAGES ── */}
        {activeTab === 'pages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <form onSubmit={handleCreatePage} style={{ display: 'flex', gap: '6px' }}>
              <input type="text" className="form-input" placeholder="New page..." value={newPageName} onChange={(e) => setNewPageName(e.target.value)} style={{ fontSize: '0.75rem', padding: '7px 10px' }} />
              <button type="submit" className="glow-btn" style={{ padding: '7px 10px' }}><Plus size={14} /></button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pages.map((p) => {
                const isActive = p.id === activePageId;
                const isHome = p.id === homePageId;
                return (
                  <div key={p.id} onClick={() => onSelectPage(p.id)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: isActive ? 'var(--accent-subtle)' : 'var(--bg-input)',
                    border: isActive ? '1px solid var(--border-active)' : '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 120ms ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <FileText size={12} style={{ color: isActive ? 'var(--accent-hover)' : 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      {isHome && <span style={{ fontSize: '0.55rem', color: 'var(--success)', background: 'var(--success-bg)', padding: '1px 4px', borderRadius: '3px', fontWeight: 600, flexShrink: 0 }}>Home</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      {!isHome && <button onClick={(e) => { e.stopPropagation(); onSetHomePage(p.id); }} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }} title="Set as home"><Home size={11} /></button>}
                      {pages.length > 1 && <button onClick={(e) => { e.stopPropagation(); onDeletePage(p.id); }} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }} title="Delete"><Trash2 size={11} /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── COLLECTIONS ── */}
        {activeTab === 'collections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <form onSubmit={handleCreateCollection} style={{ display: 'flex', gap: '6px' }}>
              <input type="text" className="form-input" placeholder="Collection name..." value={newColName} onChange={(e) => setNewColName(e.target.value)} style={{ fontSize: '0.75rem', padding: '7px 10px' }} />
              <button type="submit" className="glow-btn" style={{ padding: '7px 10px' }}><Plus size={14} /></button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {collections.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                  No collections yet
                </div>
              ) : (
                collections.map((col) => (
                  <div key={col.name} style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)', padding: '10px',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Database size={12} style={{ color: 'var(--accent-hover)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{col.name}</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>({col.records.length})</span>
                      </div>
                      <button onClick={() => onDeleteCollection(col.name)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}><Trash2 size={11} /></button>
                    </div>
                    <button className="glow-btn" onClick={() => onOpenCollectionData(col)} style={{ padding: '5px 10px', fontSize: '0.65rem', width: '100%', justifyContent: 'center' }}>
                      <DatabaseZap size={11} /> Manage Data
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── STATE ── */}
        {activeTab === 'state' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px' }}>
              <form onSubmit={handleCreateGlobalState} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input type="text" className="form-input" placeholder="Variable name" value={newVarName} onChange={(e) => setNewVarName(e.target.value)} style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select className="form-select" style={{ flex: 1, padding: '7px', fontSize: '0.75rem' }} value={newVarType} onChange={(e) => setNewVarType(e.target.value as any)}>
                    <option value="string">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <input type="text" className="form-input" style={{ flex: 1.5, padding: '7px 8px', fontSize: '0.75rem' }} placeholder="Default" value={newVarDefault} onChange={(e) => setNewVarDefault(e.target.value)} />
                </div>
                <button type="submit" className="glow-btn" style={{ padding: '6px', fontSize: '0.7rem', justifyContent: 'center' }}>
                  <Plus size={12} /> Add Variable
                </button>
              </form>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {globalStates.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                  No variables defined
                </div>
              ) : (
                globalStates.map((v) => (
                  <div key={v.name} style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)', padding: '7px 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>{v.name}</span>
                        <span style={{ fontSize: '0.55rem', color: 'var(--accent-hover)', opacity: 0.7 }}>({v.type})</span>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Default: {String(v.defaultValue)}</span>
                    </div>
                    <button onClick={() => onDeleteGlobalState(v.name)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px' }}><Trash2 size={11} /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── THEME ── */}
        {activeTab === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="theme-swatch-row">
              {[['primaryColor', 'Primary'], ['accentColor', 'Accent'], ['backgroundColor', 'BG'], ['surfaceColor', 'Surface'], ['textColor', 'Text']].map(([key, label]) => (
                <label key={key} className="theme-swatch">
                  <span>{label}</span>
                  <input type="color" value={(theme as any)[key]} onChange={(e) => onUpdateTheme({ ...theme, [key]: e.target.value })} />
                </label>
              ))}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <span className="form-label">Mode</span>
              <select className="form-select" value={theme.mode} onChange={(e) => onUpdateTheme({ ...theme, mode: e.target.value as any })}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <span className="form-label">Radius</span>
              <select className="form-select" value={theme.radius} onChange={(e) => onUpdateTheme({ ...theme, radius: e.target.value as any })}>
                <option value="compact">Compact</option>
                <option value="rounded">Rounded</option>
                <option value="soft">Soft</option>
              </select>
            </div>
            <div className="mobile-theme-preview" style={{ background: theme.backgroundColor, color: theme.textColor }}>
              <div style={{ background: theme.surfaceColor }}>
                <span style={{ background: theme.primaryColor }} />
                <strong>{theme.fontFamily}</strong>
                <small style={{ color: theme.accentColor }}>Mobile preview</small>
              </div>
            </div>
          </div>
        )}

        {/* ── BUILD ── */}
        {activeTab === 'build' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="build-card">
              <h5><Package size={12} /> Native Build</h5>
              <input className="form-input" value={buildSettings.appId} onChange={(e) => onUpdateBuild({ ...buildSettings, appId: e.target.value })} placeholder="com.company.app" style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
              <div className="property-row" style={{ marginBottom: 0 }}>
                <input className="form-input" value={buildSettings.version} onChange={(e) => onUpdateBuild({ ...buildSettings, version: e.target.value })} placeholder="1.0.0" style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
                <input className="form-input" type="number" value={buildSettings.buildNumber} onChange={(e) => onUpdateBuild({ ...buildSettings, buildNumber: Number(e.target.value) })} style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
              </div>
              <select className="form-select" value={buildSettings.platform} onChange={(e) => onUpdateBuild({ ...buildSettings, platform: e.target.value as any })} style={{ padding: '7px 8px', fontSize: '0.75rem' }}>
                <option value="both">Android + iOS</option>
                <option value="android">Android only</option>
                <option value="ios">iOS only</option>
              </select>
              <div className="build-actions">
                <button className="glow-btn" onClick={() => onGenerateArtifact('android-apk')}><Smartphone size={12} /> APK</button>
                <button className="secondary-btn" onClick={() => onGenerateArtifact('ios-zip')}><Package size={12} /> iOS</button>
              </div>
            </div>

            <div className="build-card">
              <h5><CloudUpload size={12} /> OTA & Upload</h5>
              <label className="toggle-row">
                <input type="checkbox" checked={deploymentSettings.otaEnabled} onChange={(e) => onUpdateDeployment({ ...deploymentSettings, otaEnabled: e.target.checked })} />
                <span>Enable OTA updates</span>
              </label>
              <select className="form-select" value={deploymentSettings.channel} onChange={(e) => onUpdateDeployment({ ...deploymentSettings, channel: e.target.value as any })} style={{ padding: '7px 8px', fontSize: '0.75rem' }}>
                <option value="dev">Dev</option>
                <option value="preview">Preview</option>
                <option value="production">Production</option>
              </select>
              <select className="form-select" value={deploymentSettings.androidStore} onChange={(e) => onUpdateDeployment({ ...deploymentSettings, androidStore: e.target.value as any })} style={{ padding: '7px 8px', fontSize: '0.75rem' }}>
                <option value="play-console">Google Play</option>
                <option value="firebase-app-distribution">Firebase</option>
                <option value="manual">Manual</option>
              </select>
              <select className="form-select" value={deploymentSettings.iosStore} onChange={(e) => onUpdateDeployment({ ...deploymentSettings, iosStore: e.target.value as any })} style={{ padding: '7px 8px', fontSize: '0.75rem' }}>
                <option value="app-store-connect">App Store</option>
                <option value="testflight">TestFlight</option>
                <option value="manual">Manual</option>
              </select>
              <button className="secondary-btn" onClick={() => onGenerateArtifact('ota')} style={{ justifyContent: 'center', fontSize: '0.7rem', padding: '7px' }}><CloudUpload size={12} /> OTA Manifest</button>
            </div>

            <div className="build-card">
              <h5><Bell size={12} /> Push Notifications</h5>
              <label className="toggle-row">
                <input type="checkbox" checked={pushSettings.enabled} onChange={(e) => onUpdatePush({ ...pushSettings, enabled: e.target.checked })} />
                <span>Enable push</span>
              </label>
              <select className="form-select" value={pushSettings.provider} onChange={(e) => onUpdatePush({ ...pushSettings, provider: e.target.value as any })} style={{ padding: '7px 8px', fontSize: '0.75rem' }}>
                <option value="firebase">Firebase</option>
                <option value="onesignal">OneSignal</option>
                <option value="expo">Expo</option>
              </select>
              <input className="form-input" value={pushSettings.senderId} onChange={(e) => onUpdatePush({ ...pushSettings, senderId: e.target.value })} placeholder="Sender ID" style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
              <input className="form-input" value={pushSettings.defaultTitle} onChange={(e) => onUpdatePush({ ...pushSettings, defaultTitle: e.target.value })} placeholder="Default title" style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
            </div>
          </div>
        )}

        {/* ── PROJECTS ── */}
        {activeTab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', padding: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="user-avatar-btn" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                  {currentUser ? currentUser.name.charAt(0).toUpperCase() : <User size={16} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500 }}>{currentUser ? currentUser.name : 'Not signed in'}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{currentUser ? currentUser.email : 'Sign in to save'}</div>
                </div>
              </div>
              {currentUser ? (
                <button className="icon-btn" onClick={onLogout} title="Sign out" style={{ color: 'var(--text-muted)' }}><LogIn size={13} /></button>
              ) : (
                <button className="glow-btn" onClick={onLoginClick} style={{ padding: '5px 10px', fontSize: '0.65rem' }}><LogIn size={12} /> Sign In</button>
              )}
            </div>

            {currentUser && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="glow-btn" onClick={onSaveProject} style={{ flex: 1, justifyContent: 'center', fontSize: '0.7rem', padding: '7px' }}><Save size={12} /> Save</button>
                <button className="secondary-btn" onClick={onSaveProjectAs} style={{ flex: 1, justifyContent: 'center', fontSize: '0.7rem', padding: '7px' }}><ExternalLink size={12} /> Save As</button>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '8px' }}>
                Projects ({projects.length})
              </h4>
              {projects.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                  {currentUser ? 'No projects yet. Click Save to create one.' : 'Sign in to view projects.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {projects.map((p) => {
                    const isActive = p.id === currentProjectId;
                    return (
                      <div key={p.id} className={`project-list-item ${isActive ? 'active' : ''}`} onClick={() => onLoadProject(p.id)}>
                        <div className="project-info">
                          <span className="project-name">{p.name}</span>
                          <span className="project-meta">{new Date(p.updated_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button className="project-load-btn" onClick={(e) => { e.stopPropagation(); onLoadProject(p.id); }}>Open</button>
                          <button className="project-delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}><Trash2 size={11} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
