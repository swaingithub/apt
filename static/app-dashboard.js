const API = '/api';

function getToken() { return localStorage.getItem('apt_token'); }

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

async function api(method, path, body) {
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), 10000);
  try {
    const res = await fetch(API + path, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined, signal: ac.signal });
    clearTimeout(tid);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
    return data;
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

function toast(text, type) {
  const el = document.createElement('div');
  el.className = 'toast toast-' + (type || '');
  el.textContent = text;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function formatDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleDateString(); } catch { return d; } }

function formatDateTime(d) { if (!d) return '-'; try { return new Date(d).toLocaleString(); } catch { return d; } }

let ecommProducts = [];
async function reloadAppData() { 
  appData = await api('GET', '/apps/' + appId); 
  try {
    ecommProducts = await api('GET', '/apps/' + appId + '/products');
  } catch(e) {
    ecommProducts = [];
  }
}

// ── Modals ──

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
window.closeModal = closeModal;

let pendingConfirm = null;

function customConfirm(title, message) {
  return new Promise(resolve => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    pendingConfirm = resolve;
    openModal('confirmModal');
  });
}
document.getElementById('confirmBtn')?.addEventListener('click', () => {
  closeModal('confirmModal');
  if (pendingConfirm) { pendingConfirm(true); pendingConfirm = null; }
});
document.getElementById('confirmModal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) { closeModal('confirmModal'); if (pendingConfirm) { pendingConfirm(false); pendingConfirm = null; } }
});

// ── Theme ──

function getTheme() { return localStorage.getItem('apt_theme') || 'dark'; }
function setTheme(t) { localStorage.setItem('apt_theme', t); document.documentElement.setAttribute('data-theme', t); }
function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); updateThemeIcon(); }
function updateThemeIcon() {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  if (getTheme() === 'dark') {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  } else {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }
}

// ── App State ──

let appId = null;
let appData = null;
let buildsPollTimer = null;

// ── Init ──

function init() {
  const params = new URLSearchParams(window.location.search);
  appId = params.get('id');
  if (!appId) {
    document.getElementById('loadingState').innerHTML = '<p style="color:var(--danger)">No app ID specified. <a href="/" style="color:var(--primary)">Go back</a></p>';
    return;
  }
  setTheme(getTheme());
  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
  loadApp();
}

async function loadApp() {
  try {
    appData = await api('GET', '/apps/' + appId);
    const cfg = appData.config || {};
    const name = cfg.display_name || cfg.app_name || appData.app_name || 'App';
    const slug = cfg.app_name || appData.app_name || 'app';
    const version = cfg.version || '1.0.0';
    const avatar = name.charAt(0).toUpperCase();

    document.title = name + ' — App Dashboard';
    document.getElementById('dashTitle').textContent = name;
    document.getElementById('dashVersion').textContent = 'v' + version;
    document.getElementById('dashAvatar').textContent = avatar;
    document.getElementById('dashName').textContent = name;
    document.getElementById('dashSlug').textContent = slug;

    document.getElementById('loadingState').style.display = 'none';
    const dc = document.getElementById('dashboardContent');
    dc.style.display = 'flex';
    dc.style.flex = '1';
    dc.style.flexDirection = 'column';

    renderOverview();
    loadPages();
    loadPublished();
    loadQR();
    loadConfigForm();
    loadBuilds();
    renderMiniPreview();
  } catch (err) {
    document.getElementById('loadingState').innerHTML = '<p style="color:var(--danger)">Failed to load app: ' + esc(err.message) + ' <a href="/" style="color:var(--primary)">Go back</a></p>';
  }
}

// ── Navigation ──

function switchAppView(view) {
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  document.querySelector('.app-view[data-appview="' + view + '"]')?.classList.add('active');
  document.querySelectorAll('.app-nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector('.app-nav-item[data-appview="' + view + '"]')?.classList.add('active');
  if (view === 'builds') {
    loadBuilds();
    startBuildsPoll();
  } else {
    stopBuildsPoll();
  }
  if (view === 'builder') {
    openDashboardBuilder();
  }
  if (view === 'menu') {
    loadAppMenu();
  }
  if (view === 'settings') {
    loadPageAppSettings();
  }
  if (view === 'push') {
    renderPushHistory();
  }
  if (view === 'themes') {
    loadThemeSettings();
  }
  if (view === 'languages') {
    loadLanguages();
  }
  if (view === 'upload') {
    loadStoreCredentials();
  }
  if (view === 'integrations') {
    loadIntegrations();
  }
}
window.switchAppView = switchAppView;

// ── Builder ──

let dBpages = [];
let dBactivePageId = null;
let dBselectedBlockId = null;
let dBblockIdCounter = 0;

const dBdefaults = {
  container: { label: 'Container', properties: {}, children: [] },
  grid: { label: 'Grid', properties: { gridCols: 2 }, children: [] },
  card: { label: 'Card', properties: {}, children: [] },
  tabs: { label: 'Tabs', properties: { tabHeaders: 'Tab 1,Tab 2', activeTab: 0 }, children: [] },
  heading: { label: 'Heading', properties: { value: 'Heading' } },
  text: { label: 'Text', properties: { value: 'Text content' } },
  divider: { label: 'Divider', properties: {} },
  image: { label: 'Image', properties: { src: '' } },
  video: { label: 'Video', properties: { src: '' } },
  banner: { label: 'Banner', properties: { value: 'Big Sale', placeholder: 'Limited time' } },
  icon: { label: 'Icon', properties: { iconName: 'Heart', iconSize: 24 } },
  button: { label: 'Button', properties: { value: 'Click Me' }, actions: { onClick: { type: 'none' } } },
  input: { label: 'Input', properties: { placeholder: 'Type...' }, actions: { onChange: { type: 'none' } } },
  textarea: { label: 'Textarea', properties: { placeholder: 'Write...' }, actions: { onChange: { type: 'none' } } },
  select: { label: 'Select', properties: { options: 'Option 1,Option 2' }, actions: { onChange: { type: 'none' } } },
  checkbox: { label: 'Checkbox', properties: {} },
  switch: { label: 'Switch', properties: {} },
  list: { label: 'List', properties: { dataSource: '' } },
  table: { label: 'Table', properties: { dataSource: '', columns: 'Name,Value' } },
  chart: { label: 'Chart', properties: { chartType: 'bar' } },
  carousel: { label: 'Carousel', properties: { src: '' } },
  map: { label: 'Map', properties: { mapLocation: 'New York' } },
  shopify_grid: { label: 'Shopify Grid', properties: { collectionId: '', layout: 'grid' } },
  woo_grid: { label: 'Woo Grid', properties: { categoryId: '', layout: 'grid' } },
  cart_button: { label: 'Cart Button', properties: { iconSize: 24, badgeColor: '#ef4444' } },
};

const dBcategories = [
  { name: 'Layout', items: [{ type: 'container', icon: '▣', label: 'Container' }, { type: 'grid', icon: '⊞', label: 'Grid' }, { type: 'card', icon: '▢', label: 'Card' }, { type: 'tabs', icon: '≡', label: 'Tabs' }, { type: 'divider', icon: '―', label: 'Divider' }] },
  { name: 'Content', items: [{ type: 'heading', icon: 'H', label: 'Heading' }, { type: 'text', icon: '¶', label: 'Text' }, { type: 'image', icon: '🖼', label: 'Image' }, { type: 'video', icon: '▶', label: 'Video' }, { type: 'banner', icon: '▬', label: 'Banner' }, { type: 'icon', icon: '♡', label: 'Icon' }] },
  { name: 'Interactive', items: [{ type: 'button', icon: '⌂', label: 'Button' }, { type: 'input', icon: '⌨', label: 'Input' }, { type: 'textarea', icon: '☰', label: 'Textarea' }, { type: 'select', icon: '▼', label: 'Select' }, { type: 'checkbox', icon: '☑', label: 'Checkbox' }, { type: 'switch', icon: '⬡', label: 'Switch' }] },
  { name: 'Data & Media', items: [{ type: 'list', icon: '☰', label: 'List' }, { type: 'table', icon: '⊟', label: 'Table' }, { type: 'chart', icon: '⬚', label: 'Chart' }, { type: 'carousel', icon: '❮', label: 'Carousel' }, { type: 'map', icon: '⌖', label: 'Map' }] },
  { name: 'E-Commerce', items: [{ type: 'shopify_grid', icon: '🛍', label: 'Shopify Grid' }, { type: 'woo_grid', icon: '🛒', label: 'Woo Grid' }, { type: 'cart_button', icon: '👜', label: 'Cart Button' }] },
];

function dBgetIcon(type) {
  for (const cat of dBcategories) { const f = cat.items.find(i => i.type === type); if (f) return f.icon; }
  return '•';
}

function dBrenderMini(el) {
  const props = el.properties || {};
  const s = el.styles || {};
  const acts = el.actions || {};
  const baseStyle = 'background:' + (s.backgroundColor || 'transparent') + ';color:' + (s.color || 'inherit') + ';font-size:' + (s.fontSize ? s.fontSize+'px' : 'inherit') + ';font-weight:' + (s.fontWeight || 'normal') + ';text-align:' + (s.textAlign || 'left') + ';padding:' + (s.padding || '0') + ';margin:' + (s.margin || '0') + ';border-radius:' + (s.borderRadius ? s.borderRadius+'px' : '0') + ';';
  
  const clickAction = (acts.onClick && acts.onClick.type !== 'none') ? ' onclick="simAction(event, \'' + el.id + '\', \'onClick\')"' : '';
  const changeAction = (acts.onChange && acts.onChange.type !== 'none') ? ' onchange="simAction(event, \'' + el.id + '\', \'onChange\')"' : '';

  switch (el.type) {
    case 'heading': return '<div style="' + baseStyle + (s.fontSize ? '' : 'font-size:1.4rem;') + (s.fontWeight ? '' : 'font-weight:700;') + (s.color ? '' : 'color:#0f172a;') + '">' + esc(props.value || 'Heading') + '</div>';
    case 'text': return '<div style="' + baseStyle + (s.color ? '' : 'color:#475569;') + 'line-height:1.5;">' + esc(props.value || 'Text') + '</div>';
    case 'button': return '<button class="sim-btn" style="' + baseStyle + (s.backgroundColor ? '' : 'background:#6366f1;') + (s.color ? '' : 'color:#fff;') + (s.padding ? '' : 'padding:12px 16px;') + (s.borderRadius ? '' : 'border-radius:8px;') + (s.fontWeight ? '' : 'font-weight:600;') + '"' + clickAction + '>' + esc(props.value || 'Button') + '</button>';
    case 'image': return props.src ? '<img class="sim-img" src="' + esc(props.src) + '" style="' + baseStyle + '">' : '<div class="sim-img-fallback" style="' + baseStyle + '">🖼 ' + esc(el.label || 'Image') + '</div>';
    case 'video': return '<div class="sim-img-fallback" style="background:#0f172a;color:#fff;' + baseStyle + '">▶ ' + esc(el.label || 'Video') + '</div>';
    case 'divider': return '<div style="border-top:1px solid #e2e8f0;margin:16px 0;' + baseStyle + '"></div>';
    case 'banner': return '<div style="' + baseStyle + (s.backgroundColor ? '' : 'background:#6366f1;') + (s.color ? '' : 'color:#fff;') + (s.padding ? '' : 'padding:20px;') + (s.borderRadius ? '' : 'border-radius:12px;') + 'text-align:center;">' + '<div style="font-weight:700;font-size:1.1rem;margin-bottom:4px;">' + esc(props.value || 'Banner') + '</div>' + '<div style="font-size:0.85rem;opacity:0.9;">' + esc(props.placeholder || '') + '</div></div>';
    case 'card': return '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;' + baseStyle + '">' + ((el.children && el.children.length) ? '' : '<div style="color:#94a3b8;font-size:0.8rem;text-align:center;">Empty Card</div>') + '</div>';
    case 'container': return '<div style="border:1px dashed #cbd5e1;border-radius:8px;padding:12px;' + baseStyle + '">' + ((el.children && el.children.length) ? '' : '<div style="color:#94a3b8;font-size:0.8rem;text-align:center;">Empty Container</div>') + '</div>';
    case 'grid': return '<div style="display:grid;grid-template-columns:repeat(' + (props.gridCols || 2) + ',1fr);gap:12px;' + baseStyle + '">' + ((el.children && el.children.length) ? '' : '<div style="grid-column:1/-1;color:#94a3b8;font-size:0.8rem;text-align:center;">Empty Grid</div>') + '</div>';
    case 'tabs': 
      const tabs = (props.tabHeaders || 'Tab 1,Tab 2').split(',');
      return '<div class="sim-tab-container" style="' + baseStyle + '">' + tabs.map((t, i) => '<div class="sim-tab' + (i === 0 ? ' active' : '') + '">' + esc(t.trim()) + '</div>').join('') + '</div>';
    case 'icon': return '<div style="font-size:' + (props.iconSize || 24) + 'px;' + baseStyle + '">♡</div>';
    case 'input': return '<input type="text" class="sim-input" placeholder="' + esc(props.placeholder || 'Type here...') + '" style="' + baseStyle + '"' + changeAction + '>';
    case 'textarea': return '<textarea class="sim-textarea" placeholder="' + esc(props.placeholder || 'Write something...') + '" style="' + baseStyle + '"' + changeAction + '></textarea>';
    case 'select': 
      const opts = (props.options || 'Option 1,Option 2').split(',');
      return '<select class="sim-select" style="' + baseStyle + '"' + changeAction + '>' + opts.map(o => '<option>' + esc(o.trim()) + '</option>').join('') + '</select>';
    case 'checkbox': return '<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#475569;' + baseStyle + '"><input type="checkbox" class="sim-checkbox"' + changeAction + '> ' + esc(el.label || 'Checkbox') + '</label>';
    case 'switch': return '<label style="display:flex;align-items:center;gap:12px;font-size:0.85rem;color:#475569;' + baseStyle + '"><div class="sim-switch"><input type="checkbox"' + changeAction + '><span class="sim-switch-slider"></span></div> ' + esc(el.label || 'Switch') + '</label>';
    case 'list': return '<div style="border:1px solid #e2e8f0;border-radius:8px;' + baseStyle + '"><div style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:0.85rem;">List Item 1</div><div style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:0.85rem;">List Item 2</div><div style="padding:12px;font-size:0.85rem;">List Item 3</div></div>';
    case 'table': return '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;' + baseStyle + '"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;"><tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;"><th style="padding:8px;text-align:left;">ID</th><th style="padding:8px;text-align:left;">Name</th></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">1</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Item A</td></tr><tr><td style="padding:8px;">2</td><td style="padding:8px;">Item B</td></tr></table></div>';
    case 'chart': return '<div class="sim-img-fallback" style="' + baseStyle + '">📊 ' + esc(props.chartType || 'Bar') + ' Chart</div>';
    case 'carousel': return '<div class="sim-img-fallback" style="' + baseStyle + '">❮ Carousel ❯</div>';
    case 'map': return '<div class="sim-img-fallback" style="background:#e2e8f0;color:#64748b;' + baseStyle + '">⌖ Map: ' + esc(props.mapLocation || 'New York') + '</div>';
    case 'shopify_grid': 
    case 'woo_grid': 
      if (ecommProducts && ecommProducts.length > 0) {
        return '<div class="sim-ecommerce-grid" style="' + baseStyle + '">' + 
               ecommProducts.slice(0, 4).map(p => 
                 '<div class="sim-ecommerce-item"><div class="sim-ecommerce-img">' + esc(p.image) + '</div><div class="sim-ecommerce-meta"><div class="sim-ecommerce-title">' + esc(p.title) + '</div><div class="sim-ecommerce-price">' + esc(p.price) + '</div></div></div>'
               ).join('') + 
               '</div>';
      } else {
        return '<div class="sim-img-fallback" style="' + baseStyle + '">🛒 Setup Shopify/Woo Integration to view products</div>';
      }
    case 'cart_button': return '<div style="display:flex;justify-content:flex-end;padding:8px;' + baseStyle + '"><div style="width:44px;height:44px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 2px 8px rgba(0,0,0,0.05);"><span style="font-size:1.1rem">🛒</span><div style="position:absolute;top:0px;right:0px;background:' + esc(props.badgeColor || '#ef4444') + ';color:#fff;font-size:0.6rem;font-weight:700;width:18px;height:18px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid #fff;">3</div></div></div>';
    default: return '<div style="font-size:0.8rem;color:#94a3b8;padding:8px;border:1px dashed #cbd5e1;border-radius:6px;text-align:center;">' + dBgetIcon(el.type) + ' ' + esc(el.type) + '</div>';
  }
}

function simAction(event, blockId, actionKey) {
  event.stopPropagation();
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(blockId, page.elements);
  if (!found) return;
  const el = found.block;
  if (!el.actions || !el.actions[actionKey]) return;
  
  const act = el.actions[actionKey];
  if (act.type === 'toast') {
    toast('Simulated Toast: ' + (act.toastText || ''));
  } else if (act.type === 'navigate') {
    const target = dBpages.find(p => p.id === act.targetPage);
    toast('Simulated Navigation to: ' + (target ? target.name : 'Unknown'));
  } else if (act.type === 'modal') {
    toast('Simulated Modal: ' + (act.modalContent || ''));
  } else if (act.type === 'state') {
    toast('Simulated State Update: ' + act.stateKey + ' = ' + act.stateValue);
  }
}
window.simAction = simAction;

function dBcreateBlock(type) {
  dBblockIdCounter++;
  const def = dBdefaults[type] || dBdefaults.text;
  return { id: 'b_' + dBblockIdCounter, type, label: def.label, styles: {}, properties: JSON.parse(JSON.stringify(def.properties || {})), actions: JSON.parse(JSON.stringify(def.actions || {})), children: def.children ? [] : undefined };
}

function openDashboardBuilder() {
  const cfg = (appData && appData.config) || {};
  const pc = cfg.project_config || {};
  const pages = pc.pages || [];
  dBpages = pages.map(p => ({ id: p.id, name: p.name, elements: JSON.parse(JSON.stringify(p.elements || [])) }));
  dBblockIdCounter = dBpages.reduce((n, p) => Math.max(n, p.elements.reduce((m, e) => Math.max(m, parseInt((e.id || 'b_0').replace('b_', ''), 10) || 0), 0)), 0);
  dBactivePageId = dBpages.length > 0 ? dBpages[0].id : null;
  dBselectedBlockId = null;
  renderDashboardBuilder();
}

function renderDashboardBuilder() {
  renderDBuilderPageTabs();
  renderDBuilderPalette();
  renderDBuilderCanvas();
  renderDBuilderProps();
}

function renderDBuilderPageTabs() {
  const c = document.getElementById('dbuilderPageTabs');
  c.innerHTML = dBpages.map(p =>
    '<div class="dbuilder-page-tab' + (p.id === dBactivePageId ? ' active' : '') + '" onclick="dBselectPage(\'' + p.id + '\')">' +
    esc(p.name) +
    (dBpages.length > 1 ? '<button class="tab-close" onclick="event.stopPropagation();dBremovePage(\'' + p.id + '\')">&times;</button>' : '') +
    '</div>'
  ).join('');
  if (!dBpages.length) c.innerHTML = '<div style="font-size:0.75rem;color:var(--text-muted);padding:4px 0">No pages</div>';
}

function renderDBuilderPalette() {
  const c = document.getElementById('dbuilderPaletteSections');
  c.innerHTML = dBcategories.map(cat =>
    '<div class="dbuilder-palette-section">' +
    '<div class="dbuilder-palette-title">' + esc(cat.name) + '</div>' +
    cat.items.map(item =>
      '<div class="dbuilder-palette-item" onclick="dBaddBlock(\'' + item.type + '\')">' +
      '<span>' + item.icon + '</span> ' + esc(item.label) +
      '</div>'
    ).join('') +
    '</div>'
  ).join('');
}

function renderDBuilderCanvas() {
  const screen = document.getElementById('dbuilderCanvas');
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) { screen.innerHTML = '<div class="dbuilder-empty">Select a page to begin</div>'; screen.style.background = ''; return; }
  
  const pageProps = page.properties || {};
  screen.style.background = pageProps.backgroundColor || '#f1f5f9';
  
  let html = '';
  
  if (pageProps.headerTitle) {
    const headerBg = pageProps.headerColor || '#ffffff';
    const headerTxt = pageProps.headerTextColor || '#0f172a';
    html += '<div style="background:' + esc(headerBg) + ';color:' + esc(headerTxt) + ';padding:14px;font-weight:600;text-align:center;font-size:1.1rem;box-shadow:0 1px 3px rgba(0,0,0,0.05);position:sticky;top:0;z-index:10;">' + esc(pageProps.headerTitle) + '</div>';
  }

  if (!page.elements.length) { 
    html += '<div class="dbuilder-empty" style="min-height:200px">Click blocks from the palette to add them</div>';
  } else {
    html += page.elements.map((el, idx) => renderDBuilderBlock(el, idx, page.elements)).join('');
  }
  
  screen.innerHTML = html;
}

function renderDBuilderBlock(el, idx, siblings) {
  const sel = el.id === dBselectedBlockId;
  const hasChildren = el.children && Array.isArray(el.children);
  const isContainer = hasChildren && ['container', 'grid', 'card', 'tabs'].includes(el.type);
  let html = '<div class="dbuilder-block' + (sel ? ' selected' : '') + '" onclick="dBselectBlock(\'' + el.id + '\')">' +
    '<div class="dbuilder-block-toolbar">' +
    (idx > 0 ? '<button onclick="event.stopPropagation();dBmoveBlock(\'' + el.id + '\',-1)" title="Up">↑</button>' : '') +
    (idx < siblings.length - 1 ? '<button onclick="event.stopPropagation();dBmoveBlock(\'' + el.id + '\',1)" title="Down">↓</button>' : '') +
    '<button onclick="event.stopPropagation();dBduplicateBlock(\'' + el.id + '\')" title="Duplicate">⧉</button>' +
    '<button class="danger" onclick="event.stopPropagation();dBremoveBlock(\'' + el.id + '\')" title="Delete">✕</button>' +
    '</div>' +
    '<div class="dbuilder-block-content">' + dBrenderMini(el);
  if (isContainer) {
    html += '<div class="dbuilder-children">';
    if (el.children.length) {
      html += el.children.map((child, ci) => renderDBuilderBlock(child, ci, el.children)).join('');
    } else {
      html += '<div class="dbuilder-empty-child">No children</div>';
    }
    html += '<div class="dbuilder-add-child" onclick="event.stopPropagation();dBaddChildBlock(\'' + el.id + '\')">+ Add child</div>';
    html += '</div>';
  }
  html += '</div></div>';
  return html;
}

function renderDBuilderProps() {
  const body = document.getElementById('dbuilderPropsBody');
  const title = document.getElementById('dbuilderPropsTitle');
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) { title.textContent = 'Properties'; body.innerHTML = '<div class="dbuilder-props-empty">No active page</div>'; return; }
  if (!dBselectedBlockId) {
    title.textContent = '📄 Page Settings';
    const pageProps = page.properties || {};
    let phtml = '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Page Name</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(page.name) + '" onchange="dBupdatePageName(this.value)"></div></div>';
    phtml += '<div class="dbuilder-section-title">Background</div>';
    phtml += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Color</label><div class="dbuilder-prop-row"><input type="color" value="' + esc(pageProps.backgroundColor || '#f1f5f9') + '" onchange="dBupdatePageProp(\'backgroundColor\',this.value)"></div></div>';
    phtml += '<div class="dbuilder-section-title">Header (Top Bar)</div>';
    phtml += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Header Title</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(pageProps.headerTitle || '') + '" placeholder="e.g. Home" onchange="dBupdatePageProp(\'headerTitle\',this.value)"></div></div>';
    phtml += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Header Color</label><div class="dbuilder-prop-row"><input type="color" value="' + esc(pageProps.headerColor || '#ffffff') + '" onchange="dBupdatePageProp(\'headerColor\',this.value)"></div></div>';
    phtml += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Header Text Color</label><div class="dbuilder-prop-row"><input type="color" value="' + esc(pageProps.headerTextColor || '#0f172a') + '" onchange="dBupdatePageProp(\'headerTextColor\',this.value)"></div></div>';
    body.innerHTML = phtml;
    return;
  }
  const found = dBfindInList(dBselectedBlockId, page.elements);
  if (!found) { title.textContent = 'Properties'; body.innerHTML = '<div class="dbuilder-props-empty">Block not found</div>'; return; }
  const el = found.block;
  title.textContent = dBgetIcon(el.type) + ' ' + esc(el.label || el.type);
  const props = el.properties || {};
  const styles = el.styles || {};
  const actions = el.actions || {};
  let html = '';
  html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Label</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(el.label) + '" onchange="dBupdateLabel(\'' + el.id + '\',this.value)"></div></div>';
  html += '<div class="dbuilder-section-title">Properties</div>';
  switch (el.type) {
    case 'heading': case 'text': html += dBpropInput(el.id, 'value', 'Text', props.value); break;
    case 'button': html += dBpropInput(el.id, 'value', 'Label', props.value); html += dBpropActionSelect(el.id, 'onClick', actions.onClick, dBpages); if (actions.onClick && actions.onClick.type !== 'none') html += dBrenderActionFields(el.id, 'onClick', actions.onClick, dBpages); break;
    case 'image': html += dBpropInput(el.id, 'src', 'Source URL', props.src); break;
    case 'video': html += dBpropInput(el.id, 'src', 'Video URL', props.src); break;
    case 'banner': html += dBpropInput(el.id, 'value', 'Title', props.value); html += dBpropInput(el.id, 'placeholder', 'Subtitle', props.placeholder); break;
    case 'input': case 'textarea': html += dBpropInput(el.id, 'placeholder', 'Placeholder', props.placeholder); html += dBpropActionSelect(el.id, 'onChange', actions.onChange, dBpages); break;
    case 'select': html += dBpropInput(el.id, 'options', 'Options (comma sep)', props.options); html += dBpropActionSelect(el.id, 'onChange', actions.onChange, dBpages); break;
    case 'checkbox': case 'switch': html += dBpropInput(el.id, 'label', 'Label', el.label); html += dBpropActionSelect(el.id, 'onChange', actions.onChange, dBpages); break;
    case 'icon': html += dBpropInput(el.id, 'iconName', 'Icon Name', props.iconName); html += dBpropInput(el.id, 'iconSize', 'Size (px)', props.iconSize); break;
    case 'grid': html += dBpropInput(el.id, 'gridCols', 'Columns', props.gridCols); break;
    case 'tabs': html += dBpropInput(el.id, 'tabHeaders', 'Tabs (comma sep)', props.tabHeaders); break;
    case 'list': html += dBpropInput(el.id, 'dataSource', 'Collection', props.dataSource); break;
    case 'table': html += dBpropInput(el.id, 'dataSource', 'Collection', props.dataSource); html += dBpropInput(el.id, 'columns', 'Columns (comma sep)', props.columns); break;
    case 'chart': html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Type</label><div class="dbuilder-prop-row"><select onchange="dBupdateProp(\'' + el.id + '\',\'chartType\',this.value)"><option value="bar"' + (props.chartType === 'bar' ? ' selected' : '') + '>Bar</option><option value="line"' + (props.chartType === 'line' ? ' selected' : '') + '>Line</option><option value="pie"' + (props.chartType === 'pie' ? ' selected' : '') + '>Pie</option></select></div></div>'; break;
    case 'carousel': html += dBpropInput(el.id, 'src', 'Image URLs (comma sep)', props.src); break;
    case 'map': html += dBpropInput(el.id, 'mapLocation', 'Location', props.mapLocation); break;
  }
  html += '<div class="dbuilder-section-title">Styles</div>';
  html += dBpropStyle(el.id, 'backgroundColor', 'Background', styles.backgroundColor, 'color');
  html += dBpropStyle(el.id, 'color', 'Text Color', styles.color, 'color');
  html += dBpropStyle(el.id, 'fontSize', 'Font Size', styles.fontSize);
  html += dBpropStyle(el.id, 'fontWeight', 'Weight', styles.fontWeight, 'select', ['400', '500', '600', '700', '800']);
  html += dBpropStyle(el.id, 'textAlign', 'Align', styles.textAlign, 'select', ['left', 'center', 'right']);
  html += dBpropStyle(el.id, 'padding', 'Padding', styles.padding);
  html += dBpropStyle(el.id, 'margin', 'Margin', styles.margin);
  html += dBpropStyle(el.id, 'borderRadius', 'Border Radius', styles.borderRadius);
  body.innerHTML = html;
}

function dBpropInput(elId, key, label, value) {
  return '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">' + label + '</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(value != null ? String(value) : '') + '" onchange="dBupdateProp(\'' + elId + '\',\'' + key + '\',this.value)"></div></div>';
}

function dBpropStyle(elId, key, label, value, type, options) {
  const val = value != null ? String(value) : '';
  if (type === 'color') return '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">' + label + '</label><div class="dbuilder-prop-row"><input type="color" value="' + (val || '#6366f1') + '" onchange="dBupdateStyle(\'' + elId + '\',\'' + key + '\',this.value)"><input type="text" value="' + val + '" onchange="dBupdateStyle(\'' + elId + '\',\'' + key + '\',this.value)" placeholder="#6366f1"></div></div>';
  if (type === 'select') return '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">' + label + '</label><div class="dbuilder-prop-row"><select onchange="dBupdateStyle(\'' + elId + '\',\'' + key + '\',this.value)">' + (options || []).map(o => '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div></div>';
  return '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">' + label + '</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(val) + '" onchange="dBupdateStyle(\'' + elId + '\',\'' + key + '\',this.value)"></div></div>';
}

function dBpropActionSelect(elId, actionKey, action, pages) {
  const current = (action && action.type) || 'none';
  return '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">On ' + (actionKey === 'onClick' ? 'Click' : 'Change') + '</label><div class="dbuilder-prop-row"><select class="dbuilder-prop-action-select" onchange="dBupdateAction(\'' + elId + '\',\'' + actionKey + '\',\'type\',this.value);renderDBuilderProps();">' +
    '<option value="none"' + (current === 'none' ? ' selected' : '') + '>None</option>' +
    '<option value="navigate"' + (current === 'navigate' ? ' selected' : '') + '>Navigate to Page</option>' +
    '<option value="toast"' + (current === 'toast' ? ' selected' : '') + '>Show Toast</option>' +
    '<option value="modal"' + (current === 'modal' ? ' selected' : '') + '>Show Alert</option>' +
    '<option value="state"' + (current === 'state' ? ' selected' : '') + '>Set State</option>' +
    '</select></div></div>';
}

function dBrenderActionFields(elId, actionKey, action, pages) {
  if (!action || action.type === 'none') return '';
  let html = '';
  if (action.type === 'navigate') {
    html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Target Page</label><div class="dbuilder-prop-row"><select onchange="dBupdateAction(\'' + elId + '\',\'' + actionKey + '\',\'targetPage\',this.value)">' +
      pages.map(p => '<option value="' + p.id + '"' + (action.targetPage === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') +
      '</select></div></div>';
  }
  if (action.type === 'toast') {
    html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Message</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(action.toastText || '') + '" onchange="dBupdateAction(\'' + elId + '\',\'' + actionKey + '\',\'toastText\',this.value)"></div></div>';
  }
  if (action.type === 'modal') {
    html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Content</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(action.modalContent || '') + '" onchange="dBupdateAction(\'' + elId + '\',\'' + actionKey + '\',\'modalContent\',this.value)"></div></div>';
  }
  if (action.type === 'state') {
    html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">State Key</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(action.stateKey || '') + '" onchange="dBupdateAction(\'' + elId + '\',\'' + actionKey + '\',\'stateKey\',this.value)"></div></div>';
    html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Value</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(action.stateValue || '') + '" onchange="dBupdateAction(\'' + elId + '\',\'' + actionKey + '\',\'stateValue\',this.value)"></div></div>';
  }
  return html;
}

// Block operations

function dBfindInList(id, list) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return { block: list[i], parent: list, idx: i };
    if (list[i].children) { const r = dBfindInList(id, list[i].children); if (r) return r; }
  }
  return null;
}

function dBaddBlock(type) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const block = dBcreateBlock(type);
  page.elements.push(block);
  dBselectedBlockId = block.id;
  renderDashboardBuilder();
}

function dBduplicateBlock(id) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const findAndDup = (list) => {
    const idx = list.findIndex(e => e.id === id);
    if (idx >= 0) {
      const clone = JSON.parse(JSON.stringify(list[idx]));
      dBblockIdCounter++;
      clone.id = 'b_' + dBblockIdCounter;
      list.splice(idx + 1, 0, clone);
      return true;
    }
    for (const el of list) {
      if (el.children && findAndDup(el.children)) return true;
    }
    return false;
  };
  findAndDup(page.elements);
  renderDBuilderCanvas();
  renderDBuilderProps();
}

function dBaddChildBlock(parentId) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const findAndAdd = (list) => {
    for (const el of list) {
      if (el.id === parentId) {
        if (!el.children) el.children = [];
        const block = dBcreateBlock('text');
        el.children.push(block);
        dBselectedBlockId = block.id;
        return true;
      }
      if (el.children && findAndAdd(el.children)) return true;
    }
    return false;
  };
  findAndAdd(page.elements);
  renderDBuilderCanvas();
  renderDBuilderProps();
}

function dBselectBlock(id) {
  dBselectedBlockId = dBselectedBlockId === id ? null : id;
  renderDBuilderCanvas();
  renderDBuilderProps();
}

function dBremoveBlock(id) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(id, page.elements);
  if (found) { found.parent.splice(found.idx, 1); if (dBselectedBlockId === id) dBselectedBlockId = null; }
  renderDBuilderCanvas();
  renderDBuilderProps();
}

function dBmoveBlock(id, dir) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(id, page.elements);
  if (!found) return;
  const ni = found.idx + dir;
  if (ni < 0 || ni >= found.parent.length) return;
  [found.parent[found.idx], found.parent[ni]] = [found.parent[ni], found.parent[found.idx]];
  renderDBuilderCanvas();
}

function dBupdateProp(elId, key, value) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(elId, page.elements);
  if (!found) return;
  found.block.properties[key] = value;
  renderDBuilderCanvas();
  renderDBuilderProps();
}

function dBupdateStyle(elId, key, value) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(elId, page.elements);
  if (!found) return;
  if (value === '' || value === undefined) delete found.block.styles[key];
  else found.block.styles[key] = value;
  renderDBuilderCanvas();
  renderDBuilderProps();
}

function dBupdateLabel(elId, value) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(elId, page.elements);
  if (found) found.block.label = value;
}

function dBupdateAction(elId, actionKey, field, value) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(elId, page.elements);
  if (!found) return;
  const el = found.block;
  if (!el.actions) el.actions = {};
  if (!el.actions[actionKey]) el.actions[actionKey] = { type: 'none' };
  el.actions[actionKey][field] = value;
}

// Page operations
function dBaddPage() {
  const name = prompt('Page name:');
  if (!name) return;
  const id = 'page_' + Date.now();
  dBpages.push({ id, name, elements: [] });
  dBactivePageId = id;
  dBselectedBlockId = null;
  renderDashboardBuilder();
}

function dBremovePage(id) {
  if (dBpages.length <= 1) return;
  dBpages = dBpages.filter(p => p.id !== id);
  if (dBactivePageId === id) dBactivePageId = dBpages.length > 0 ? dBpages[dBpages.length - 1].id : null;
  dBselectedBlockId = null;
  renderDashboardBuilder();
}

function dBupdatePageName(val) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (page) {
    page.name = val;
    renderDBuilderPageTabs();
  }
}

function dBupdatePageProp(key, val) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (page) {
    if (!page.properties) page.properties = {};
    page.properties[key] = val;
    renderDBuilderCanvas();
  }
}

function dBselectPage(id) {
  dBactivePageId = id;
  dBselectedBlockId = null;
  renderDashboardBuilder();
}

function dbuilderFilterPalette(query) {
  document.querySelectorAll('.dbuilder-palette-item').forEach(item => {
    item.style.display = !query || item.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
  });
  document.querySelectorAll('.dbuilder-palette-section').forEach(s => {
    s.style.display = !query || s.querySelectorAll('.dbuilder-palette-item[style*="display: none"]').length < s.querySelectorAll('.dbuilder-palette-item').length ? '' : 'none';
  });
}

window.dBaddPage = dBaddPage;
window.dBselectPage = dBselectPage;
window.dBaddBlock = dBaddBlock;
window.dBduplicateBlock = dBduplicateBlock;
window.dBaddChildBlock = dBaddChildBlock;
window.dBselectBlock = dBselectBlock;
window.dBselectBlock = dBselectBlock;
window.dBremoveBlock = dBremoveBlock;
window.dBmoveBlock = dBmoveBlock;
window.dBremovePage = dBremovePage;
window.dBupdateProp = dBupdateProp;
window.dBupdateStyle = dBupdateStyle;
window.dBupdateLabel = dBupdateLabel;
window.dBupdateAction = dBupdateAction;
window.dbuilderFilterPalette = dbuilderFilterPalette;
async function saveDashboardBuilder() {
  try {
    const app = await api('GET', '/apps/' + appId);
    const cfg = app.config || {};
    const pc = cfg.project_config || {};
    pc.pages = dBpages;
    cfg.project_config = pc;
    await api('PUT', '/apps/' + appId, cfg);
    toast('Builder changes saved!');
    appData = await api('GET', '/apps/' + appId);
    loadPages();
    renderOverview();
    renderMiniPreview();
  } catch (err) {
    toast(err.message, 'error');
  }
}

window.saveDashboardBuilder = saveDashboardBuilder;

// ── App Menu ──

let menuItems = [];
let menuType = 'bottomTab';

async function loadAppMenu() {
  menuType = 'bottomTab';
  menuItems = [];
  renderAppMenu();
  try {
    const nav = await api('GET', '/v1/apps/' + appId + '/navigation');
    menuType = nav.type || 'bottomTab';
    menuItems = (nav.config || []).map(item => ({
      id: item.id || 'mi_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      label: item.label || 'Tab',
      icon: item.icon || '📱',
      targetPageId: item.targetPageId || '',
    }));
    renderAppMenu();
  } catch {}
}

function renderAppMenu() {
  const typeHtml = [
    { id: 'bottomTab', label: 'Bottom Tabs', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="20" height="18" rx="3"/><line x1="2" y1="17" x2="22" y2="17"/></svg>' },
    { id: 'topTab', label: 'Top Tabs', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="20" height="18" rx="3"/><line x1="2" y1="7" x2="22" y2="7"/></svg>' },
    { id: 'none', label: 'No Menu', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>' },
  ];
  document.getElementById('menuTypeSelector').innerHTML = typeHtml.map(t =>
    '<button class="menu-type-btn' + (menuType === t.id ? ' active' : '') + '" onclick="setMenuType(\'' + t.id + '\')">' +
    t.icon + t.label + '</button>'
  ).join('');

  let pages = [];
  try { if (dBpages && dBpages.length) pages = dBpages; } catch (e) {}
  if (!pages.length && appData && appData.config) { try { const pc = appData.config.project_config; if (pc && pc.pages) pages = pc.pages; } catch (e) {} }
  const container = document.getElementById('menuItemsList');
  const countEl = document.getElementById('menuItemCount');
  const addRow = document.getElementById('menuAddRow');

  if (menuType === 'none') {
    container.innerHTML = '<div class="menu-empty">' +
      '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="4" width="16" height="16" rx="3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>' +
      '<strong>Navigation disabled</strong><span>Select a type above to enable the menu.</span></div>';
    if (countEl) countEl.textContent = '';
    if (addRow) addRow.style.display = 'none';
    renderMenuPreview();
    return;
  }
  if (addRow) addRow.style.display = 'block';

  if (!menuItems.length) {
    container.innerHTML = '<div class="menu-empty">' +
      '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '<strong>No menu items yet</strong><span>Click "Add Menu Item" below to create your first tab.</span></div>';
    if (countEl) countEl.textContent = '0 items';
    renderMenuPreview();
    return;
  }

  if (countEl) countEl.textContent = menuItems.length + ' item' + (menuItems.length > 1 ? 's' : '');
  container.innerHTML = menuItems.map((item, i) =>
    '<div class="menu-item-card">' +
    '<div class="menu-item-drag" title="Drag to reorder">⠿</div>' +
    '<div class="menu-item-icon-wrap" onclick="showEmojiPicker(this,' + i + ')" style="cursor:pointer">' + esc(item.icon || '📱') + '</div>' +
    '<div class="menu-item-fields">' +
    '<input type="text" value="' + esc(item.label) + '" placeholder="Tab label" onchange="updateMenuItem(' + i + ',\'label\',this.value)">' +
    '<select onchange="updateMenuItem(' + i + ',\'targetPageId\',this.value)">' +
    '<option value="">— Select page —</option>' +
    pages.map(p => '<option value="' + p.id + '"' + (item.targetPageId === p.id ? ' selected' : '') + '>' + esc(p.name || 'Unnamed') + '</option>').join('') +
    '</select>' +
    '</div>' +
    '<div class="menu-item-actions">' +
    (i > 0 ? '<button class="page-action-btn" onclick="moveMenuItem(' + i + ',-1)" title="Move up"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg></button>' : '') +
    (i < menuItems.length - 1 ? '<button class="page-action-btn" onclick="moveMenuItem(' + i + ',1)" title="Move down"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg></button>' : '') +
    '<button class="page-action-btn page-action-danger" onclick="removeMenuItem(' + i + ')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
    '</div></div>'
  ).join('');
  renderMenuPreview();
}
window.renderAppMenu = renderAppMenu;

function renderMenuPreview() {
  const body = document.getElementById('menuPreviewBody');
  if (menuType === 'none' || !menuItems.length) {
    body.innerHTML = '<div class="menu-empty">' +
      (menuType === 'none'
        ? '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="4" width="16" height="16" rx="3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg><strong>Menu disabled</strong>'
        : '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="4" width="16" height="16" rx="3"/><line x1="8" y1="12" x2="16" y2="12"/></svg><strong>No items to preview</strong>') +
      '</div>';
    return;
  }
  body.innerHTML =
    '<div class="menu-preview-frame">' +
    '<div class="menu-preview-screen">' +
    '<div class="menu-preview-header">' + esc(menuItems.find(i => i.targetPageId) ? (menuItems[0].label || 'Tab') : 'App') + '</div>' +
    '<div class="menu-preview-content"><span>Page Content</span></div>' +
    '<div class="menu-preview-tabbar">' +
    menuItems.map((item, i) =>
      '<div class="menu-preview-tab' + (i === 0 ? ' active' : '') + '">' +
      '<span class="tab-icon">' + esc(item.icon || '📱') + '</span>' +
      '<span class="tab-label">' + esc(item.label || 'Tab') + '</span>' +
      '</div>'
    ).join('') +
    '</div></div></div>';
}
window.renderMenuPreview = renderMenuPreview;

function setMenuType(type) {
  menuType = type;
  if (type === 'none') menuItems = [];
  renderAppMenu();
}
window.setMenuType = setMenuType;

function addMenuItem() {
  let pages = [];
  try { if (dBpages && dBpages.length) pages = dBpages; } catch (e) {}
  if (!pages.length && appData && appData.config) { try { const pc = appData.config.project_config; if (pc && pc.pages) pages = pc.pages; } catch (e) {} }
  menuItems.push({ id: 'mi_' + Date.now(), label: 'Tab ' + (menuItems.length + 1), icon: '📱', targetPageId: pages.length > 0 ? pages[0].id : '' });
  renderAppMenu();
}
window.addMenuItem = addMenuItem;

function updateMenuItem(idx, key, value) {
  if (menuItems[idx]) menuItems[idx][key] = value;
  if (key === 'icon') renderAppMenu();
  else renderMenuPreview();
}
window.updateMenuItem = updateMenuItem;

const TAB_EMOJIS = ['🏠','🔍','❤️','⭐','🔥','💬','📷','🎵','🛒','👤','⚙️','📱','💼','🎯','📅','📍','🏷️','🔄','📊','🎮','📚','✉️','🔔','🌙','☀️','🍔','🎬','🏆','💡','🎨','📝','🔒','🎉','🚀','💎','🌈','🎁','🔑'];

function showEmojiPicker(anchor, idx) {
  const existing = document.getElementById('emojiPickerPopup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'emojiPickerPopup';
  popup.className = 'emoji-picker-popup';
  const rect = anchor.getBoundingClientRect();
  popup.style.left = rect.left + 'px';
  popup.style.top = (rect.bottom + 4) + 'px';

  TAB_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.onclick = () => {
      updateMenuItem(idx, 'icon', emoji);
      popup.remove();
    };
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);

  const close = (e) => {
    if (!popup.contains(e.target) && e.target !== anchor) popup.remove();
    document.removeEventListener('click', close);
  };
  setTimeout(() => document.addEventListener('click', close), 10);
}
window.showEmojiPicker = showEmojiPicker;

function moveMenuItem(idx, dir) {
  const ni = idx + dir;
  if (ni < 0 || ni >= menuItems.length) return;
  [menuItems[idx], menuItems[ni]] = [menuItems[ni], menuItems[idx]];
  renderAppMenu();
}
window.moveMenuItem = moveMenuItem;

function removeMenuItem(idx) {
  menuItems.splice(idx, 1);
  renderAppMenu();
}
window.removeMenuItem = removeMenuItem;

async function saveAppMenu() {
  try {
    await api('PUT', '/v1/apps/' + appId + '/navigation', { type: menuType, config: menuItems });
    toast('Menu saved!');
  } catch (err) { toast(err.message, 'error'); }
}
window.saveAppMenu = saveAppMenu;

// ── Overview ──

function openBuilder() { switchAppView('builder'); }
window.openBuilder = openBuilder;

function renderOverview() {
  const cfg = (appData && appData.config) || {};
  const pc = cfg.project_config || {};
  const pages = pc.pages || [];
  const totalBlocks = pages.reduce((sum, p) => sum + (p.elements || []).length, 0);
  const name = cfg.display_name || cfg.app_name || appData.app_name || 'App';
  const version = cfg.version || '1.0.0';
  const primary = cfg.primary_color || '#6366f1';

  // Identity bar
  const av = document.getElementById('overviewAvatar');
  document.getElementById('overviewMeta').innerHTML =
    '<span style="display:flex; align-items:center; gap:6px;">Version ' + version + '</span>' +
    '<span style="color:var(--border);">|</span>' +
    '<span style="display:flex; align-items:center; gap:6px;">' + pages.length + ' page' + (pages.length !== 1 ? 's' : '') + '</span>' +
    '<span style="color:var(--border);">|</span>' +
    '<span style="display:flex; align-items:center; gap:6px;">' + totalBlocks + ' block' + (totalBlocks !== 1 ? 's' : '') + '</span>';

  document.getElementById('overviewActions').innerHTML =
    '<button class="btn btn-sm btn-ghost" onclick="triggerBuild()" style="font-size:0.8rem; padding:6px 12px; border:1px solid var(--border); border-radius:6px; font-weight:500;">Build APK</button>' +
    '<a href="' + API + '/apps/' + appId + '/download" class="btn btn-sm btn-ghost" style="font-size:0.8rem; padding:6px 12px; border:1px solid var(--border); border-radius:6px; font-weight:500;">Download Source</a>';

  // Info card
  const rows = [
    { label: 'App Name', value: cfg.app_name || '-' },
    { label: 'Display Name', value: cfg.display_name || '-' },
    { label: 'Package', value: cfg.package_name || '-', mono: true },
    { label: 'Version', value: cfg.version || '-' },
    { label: 'App ID', value: appData.id, mono: true },
    { label: 'Created', value: formatDateTime(appData.created_at || appData.created) },
  ];

  document.getElementById('appInfoCard').innerHTML = rows.map(r =>
    '<div class="app-info-row">' +
    '<div class="info-label">' + esc(r.label) + '</div>' +
    '<div class="info-value' + (r.mono ? ' info-mono' : '') + '">' + esc(r.value) + '</div>' +
    '</div>'
  ).join('');
}

// ── Mini Preview ──

function renderMiniPreview() {
  const container = document.getElementById('miniPreview');
  const cfg = (appData && appData.config) || {};
  const pc = cfg.project_config || {};
  const pages = pc.pages || [];
  const theme = pc.theme || {};
  const mode = theme.mode || 'light';
  const primary = theme.primaryColor || '#6366f1';
  const bg = mode === 'dark' ? '#000000' : '#f2f2f7';
  const surface = mode === 'dark' ? '#1c1c1e' : '#ffffff';
  const text = mode === 'dark' ? '#ffffff' : '#000000';
  const textSec = mode === 'dark' ? '#8e8e93' : '#6c6c70';
  const separator = mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(60,60,67,0.12)';

  container.style.background = bg;
  container.style.color = text;

  const homePage = pages[0];
  if (!homePage) {
    container.innerHTML = '<div class="ios-empty">No pages</div>';
    return;
  }

  const blocks = homePage.elements || [];
  const navTitle = homePage.name || 'App';

  let html = '<div class="ios-nav" style="background:' + surface + ';border-bottom:0.5px solid ' + separator + '">' +
    '<div class="ios-nav-title" style="color:' + text + '">' + esc(navTitle) + '</div>' +
    '</div>';

  if (!blocks.length) {
    html += '<div class="ios-empty" style="color:' + textSec + '">No content</div>';
  } else {
    html += '<div class="ios-content">';
    blocks.slice(0, 8).forEach(b => {
      const type = b.type || 'text';
      switch (type) {
        case 'heading':
          html += '<div class="ios-heading" style="color:' + text + '">' + esc(b.content || 'Title') + '</div>';
          break;
        case 'text':
        case 'paragraph':
          html += '<div class="ios-text" style="color:' + textSec + '">' + esc((b.content || 'Text').substring(0, 80)) + '</div>';
          break;
        case 'image':
          html += '<div class="ios-image"><div class="ios-image-placeholder" style="background:' + primary + '20;color:' + primary + '">Image</div></div>';
          break;
        case 'button':
          html += '<div class="ios-button-wrap"><div class="ios-button" style="background:' + primary + ';color:#fff">' + esc(b.content || 'Button') + '</div></div>';
          break;
        case 'card':
          html += '<div class="ios-card" style="background:' + surface + ';border:0.5px solid ' + separator + '">' +
            '<div class="ios-card-title" style="color:' + text + '">' + esc(b.content || 'Card') + '</div>' +
            '<div class="ios-card-text" style="color:' + textSec + '">Card content</div></div>';
          break;
        case 'row':
        case 'columns':
          html += '<div class="ios-row"><div class="ios-row-item" style="background:' + surface + ';border:0.5px solid ' + separator + '"></div>' +
            '<div class="ios-row-item" style="background:' + surface + ';border:0.5px solid ' + separator + '"></div></div>';
          break;
        case 'divider':
          html += '<div class="ios-divider" style="background:' + separator + '"></div>';
          break;
        case 'spacer':
          html += '<div style="height:16px"></div>';
          break;
        case 'list':
          const items = (b.items || ['Item 1', 'Item 2', 'Item 3']).slice(0, 3);
          html += '<div class="ios-list" style="background:' + surface + ';border:0.5px solid ' + separator + ';border-radius:10px;overflow:hidden">' +
            items.map((item, i) => '<div class="ios-list-item" style="color:' + text + ';border-bottom:' + (i < items.length - 1 ? '0.5px solid ' + separator : 'none') + '">' + esc(item) + '</div>').join('') +
            '</div>';
          break;
        case 'icon':
          html += '<div class="ios-icon-wrap"><div class="ios-icon" style="background:' + primary + '20;color:' + primary + '">✦</div></div>';
          break;
        default:
          html += '<div class="ios-text" style="color:' + textSec + '">' + esc((b.content || type).substring(0, 60)) + '</div>';
      }
    });
    html += '</div>';
  }

  if (blocks.length > 8) {
    html += '<div class="ios-more" style="color:' + textSec + '">+' + (blocks.length - 8) + ' more</div>';
  }

  container.innerHTML = html;
}

// ── Published Versions ──

async function loadPublished() {
  const container = document.getElementById('publishedList');
  try {
    const versions = await api('GET', '/v1/apps/' + appId + '/publish');
    if (!versions || !versions.length) {
      container.innerHTML = '<div class="section-card-empty">No published versions yet</div>';
      return;
    }
    container.innerHTML = versions.map(v =>
      '<div class="pub-item">' +
      '<div><div class="pub-version">v' + esc(v.version) + (v.is_current ? ' <span class="pub-current">Live</span>' : '') + '</div>' +
      '<div class="pub-date">' + formatDateTime(v.published_at) + '</div></div>' +
      '</div>'
    ).join('');
  } catch (err) {
    container.innerHTML = '<div class="section-card-empty">Failed to load</div>';
  }
}

async function loadQR() {
  const container = document.getElementById('qrContainer');
  try {
    const res = await api('GET', '/apps/' + appId + '/qr');
    container.innerHTML = '<img src="' + esc(res.qr_code) + '" alt="QR Code">' +
      '<div class="qr-label">' + esc(res.config_url || 'Config URL') + '</div>';
  } catch (err) {
    // QR endpoint may fail if no published version — show publish hint
    container.innerHTML = '<div style="padding:16px;text-align:center">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted);margin-bottom:8px"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="5" y="5" width="4" height="4"/><rect x="15" y="5" width="4" height="4"/><rect x="5" y="15" width="4" height="4"/><rect x="15" y="15" width="4" height="4"/></svg>' +
      '<div style="font-size:0.78rem;color:var(--text-muted)">Publish to see QR</div></div>';
  }
}

// ── Pages ──

let cachedPages = [];

async function loadPages() {
  const container = document.getElementById('appPagesList');
  try {
    const app = await api('GET', '/apps/' + appId);
    const pc = (app.config || {}).project_config || {};
    const pages = pc.pages || [];
    cachedPages = pages;
    const homeId = pc.homePageId || (pages[0] && pages[0].id) || '';

    document.getElementById('pageCount').textContent = '(' + pages.length + ')';

    if (!pages.length) {
      container.innerHTML = '<div class="empty-state"><h3>No pages yet</h3><p>Add pages to your app to get started</p></div>';
      return;
    }

    container.innerHTML = pages.map((p, i) => {
      const elements = p.elements || [];
      const isHome = p.id === homeId;
      const types = {};
      elements.forEach(el => { types[el.type || 'text'] = (types[el.type || 'text'] || 0) + 1; });
      const summary = Object.keys(types).length
        ? ' · ' + Object.entries(types).map(([t, c]) => t + (c > 1 ? ' ×' + c : '')).join(', ')
        : '';

      return '<div class="page-card" data-page-id="' + esc(p.id) + '">' +
        '<div class="page-card-header" onclick="togglePageBlocks(\'' + esc(p.id) + '\')">' +
        '<div class="page-card-icon">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '</div>' +
        '<div class="page-card-info">' +
        '<div class="page-card-name">' +
        '<span id="pageName_' + esc(p.id) + '">' + esc(p.name || 'Unnamed') + '</span>' +
        (isHome ? ' <span class="page-home-badge">Home</span>' : '') +
        '</div>' +
        '<div class="page-card-meta">' + elements.length + ' block' + (elements.length !== 1 ? 's' : '') + summary + '</div>' +
        '</div>' +
        '<button class="page-card-chevron" onclick="event.stopPropagation();togglePageBlocks(\'' + esc(p.id) + '\')" title="Toggle blocks">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</button>' +
        '</div>' +
        '<div class="page-card-actions" onclick="event.stopPropagation()">' +
        (i > 0
          ? '<button class="page-action-btn" onclick="movePage(' + i + ', -1)" title="Move up">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>' +
            '</button>'
          : '') +
        (i < pages.length - 1
          ? '<button class="page-action-btn" onclick="movePage(' + i + ', 1)" title="Move down">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</button>'
          : '') +
        (!isHome
          ? '<button class="page-action-btn" onclick="setHomePage(\'' + esc(p.id) + '\')" title="Set as home page">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
            '</button>'
          : '') +
        '<button class="page-action-btn" onclick="renamePage(\'' + esc(p.id) + '\')" title="Rename">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
        '</button>' +
        '<button class="page-action-btn page-action-danger" onclick="deletePage(\'' + esc(p.id) + '\')" title="Delete page">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
        '</button>' +
        '</div>' +
        '<div class="page-blocks-list hidden" id="blocks_' + esc(p.id) + '">' +
        (elements.length
          ? elements.map((b, bi) => {
              let blockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
              if (b.type === 'heading') blockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4v16M18 4v16M6 12h12"/></svg>';
              else if (b.type === 'text') blockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>';
              else if (b.type === 'button') blockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M8 12h8"/></svg>';
              else if (b.type === 'image') blockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
              else if (b.type === 'divider') blockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>';
              else if (b.type === 'row' || b.type === 'columns') blockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="9" height="16"/><rect x="13" y="4" width="9" height="16"/></svg>';
              else if (b.type === 'card') blockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/></svg>';
              else if (b.type === 'input') blockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="8" width="20" height="8" rx="2"/><path d="M12 12h.01"/></svg>';
              const preview = b.content || b.text || b.src || b.type || '';
              return '<div class="block-item">' +
                '<div class="block-type-icon">' + blockIcon + '</div>' +
                '<div class="block-info">' +
                '<div class="block-type">' + esc(b.type || 'block') + '</div>' +
                (preview ? '<div class="block-preview">' + esc(preview.substring(0, 50)) + '</div>' : '') +
                '</div>' +
                '<div class="block-actions">' +
                '<button class="page-action-btn" onclick="window.open(\'/?builder=' + appId + '\',\'_blank\')" title="Edit in Builder">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                '</button>' +
                (elements.length > 1
                  ? '<button class="page-action-btn page-action-danger" onclick="deleteBlock(' + i + ',' + bi + ')" title="Delete block">' +
                    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                    '</button>'
                  : '') +
                '</div></div>';
            }).join('')
          : '<div class="page-blocks-empty">No blocks yet — <button class="btn btn-sm btn-secondary" onclick="window.open(\'/?builder=' + appId + '\',\'_blank\')">Open Builder</button></div>'
        ) +
        '</div>' +
        '</div>';
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p>Failed to load pages</p></div>';
  }
}

function togglePageBlocks(pageId) {
  const list = document.getElementById('blocks_' + pageId);
  if (!list) return;
  const isHidden = list.classList.contains('hidden');
  list.classList.toggle('hidden');
  const card = list.closest('.page-card');
  if (card) {
    const chevron = card.querySelector('.page-card-chevron');
    if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : '';
  }
}
window.togglePageBlocks = togglePageBlocks;

function showAddPageForm() {
  const form = document.getElementById('addPageForm');
  form.classList.remove('hidden');
  document.getElementById('newPageNameInput').value = '';
  document.getElementById('newPageNameInput').focus();
}
window.showAddPageForm = showAddPageForm;

function hideAddPageForm() {
  document.getElementById('addPageForm').classList.add('hidden');
}
window.hideAddPageForm = hideAddPageForm;

async function createPage() {
  const input = document.getElementById('newPageNameInput');
  const name = input.value.trim();
  if (!name) { toast('Enter a page name', 'error'); return; }

  const app = await api('GET', '/apps/' + appId);
  const cfg = app.config || {};
  const pc = cfg.project_config || {};
  const pages = pc.pages || [];

  const newId = 'page_' + Date.now();
  pages.push({ id: newId, name, icon: '📄', elements: [] });
  pc.pages = pages;
  cfg.project_config = pc;

  try {
    await api('PUT', '/apps/' + appId, cfg);
    toast('Page created!');
    hideAddPageForm();
    await reloadAppData();
    loadPages();
    renderOverview();
    renderMiniPreview();
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.createPage = createPage;

async function renamePage(pageId) {
  const span = document.getElementById('pageName_' + pageId);
  if (!span) return;
  const current = span.textContent;
  const input = document.createElement('input');
  input.className = 'rename-input';
  input.value = current;
  input.autofocus = true;
  span.replaceWith(input);
  input.focus();
  input.select();

  const done = async () => {
    const newName = input.value.trim();
    if (newName && newName !== current) {
      const app = await api('GET', '/apps/' + appId);
      const cfg = app.config || {};
      const pc = cfg.project_config || {};
      const pages = pc.pages || [];
      const page = pages.find(p => p.id === pageId);
      if (page) {
        page.name = newName;
        cfg.project_config = pc;
        try {
          await api('PUT', '/apps/' + appId, cfg);
          toast('Page renamed');
          await reloadAppData();
          loadPages();
        } catch (err) { toast(err.message, 'error'); }
        return;
      }
    }
    // Restore span
    const newSpan = document.createElement('span');
    newSpan.id = 'pageName_' + pageId;
    newSpan.textContent = newName || current;
    input.replaceWith(newSpan);
  };

  input.addEventListener('blur', done);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') { input.value = current; input.blur(); }
  });
}
window.renamePage = renamePage;

async function deletePage(pageId) {
  const app = await api('GET', '/apps/' + appId);
  const cfg = app.config || {};
  const pc = cfg.project_config || {};
  const pages = pc.pages || [];
  const page = pages.find(p => p.id === pageId);
  if (!page) return;

  const ok = await customConfirm('Delete Page', 'Delete "' + (page.name || 'Unnamed') + '" and all its blocks?');
  if (!ok) return;

  pc.pages = pages.filter(p => p.id !== pageId);
  if (pc.homePageId === pageId) pc.homePageId = pc.pages.length > 0 ? pc.pages[0].id : '';
  cfg.project_config = pc;

  try {
    await api('PUT', '/apps/' + appId, cfg);
    toast('Page deleted');
    await reloadAppData();
    loadPages();
    renderOverview();
    renderMiniPreview();
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.deletePage = deletePage;

async function setHomePage(pageId) {
  const app = await api('GET', '/apps/' + appId);
  const cfg = app.config || {};
  const pc = cfg.project_config || {};
  const pages = pc.pages || [];
  const page = pages.find(p => p.id === pageId);
  if (!page) return;

  const prevHomeId = pc.homePageId;
  pc.homePageId = pageId;
  cfg.project_config = pc;

  try {
    await api('PUT', '/apps/' + appId, cfg);
    toast('Home page set to "' + (page.name || 'Unnamed') + '"');
    loadPages();
  } catch (err) {
    pc.homePageId = prevHomeId;
    toast(err.message, 'error');
  }
}
window.setHomePage = setHomePage;

async function movePage(index, direction) {
  const app = await api('GET', '/apps/' + appId);
  const cfg = app.config || {};
  const pc = cfg.project_config || {};
  const pages = pc.pages || [];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= pages.length) return;

  const temp = pages[index];
  pages[index] = pages[newIndex];
  pages[newIndex] = temp;
  pc.pages = pages;
  cfg.project_config = pc;

  try {
    await api('PUT', '/apps/' + appId, cfg);
    loadPages();
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.movePage = movePage;

async function deleteBlock(pageIndex, blockIndex) {
  const app = await api('GET', '/apps/' + appId);
  const cfg = app.config || {};
  const pc = cfg.project_config || {};
  const pages = pc.pages || [];
  const page = pages[pageIndex];
  if (!page || !page.elements) return;
  const block = page.elements[blockIndex];
  if (!block) return;

  const ok = await customConfirm('Delete Block', 'Delete this ' + (block.type || 'block') + '?');
  if (!ok) return;

  page.elements.splice(blockIndex, 1);
  cfg.project_config = pc;

  try {
    await api('PUT', '/apps/' + appId, cfg);
    toast('Block deleted');
    loadPages();
    renderOverview();
    renderMiniPreview();
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.deleteBlock = deleteBlock;

// ── Builds ──

const BUILD_STAGES = {
  queued:     { label: 'Queued',      desc: 'Waiting in queue…',           icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
  pending:    { label: 'Pending',     desc: 'Preparing build environment…', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' },
  building:   { label: 'Building',    desc: 'Compiling & building…',       icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
  downloading:{ label: 'Downloading', desc: 'Downloading build artifact…', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' },
  completed:  { label: 'Completed',   desc: 'Build ready — download the artifact below',    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
  failed:     { label: 'Failed',      desc: 'Build encountered an error',  icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' },
  cancelled:  { label: 'Cancelled',   desc: 'Build was cancelled',         icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>' },
};

const BUILD_PROGRESS_PCT = { queued: 5, pending: 20, building: 55, downloading: 90, completed: 100, failed: 100, cancelled: 100 };

async function loadBuilds() {
  const container = document.getElementById('appBuildsList');
  const hasActive = buildsPollTimer !== null;
  try {
    const builds = await api('GET', '/apps/' + appId + '/builds');
    if (!builds.length) {
      container.innerHTML = '<div class="build-empty">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' +
        '<strong>No builds yet</strong>' +
        '<span>Trigger your first build to generate an APK or IPA. Builds run on EAS Cloud and typically take 5–15 minutes.</span>' +
        '<button class="btn btn-sm btn-primary" onclick="showBuildTrigger()">New Build</button>' +
        '</div>';
      return;
    }
    const anyRunning = builds.some(b => ['queued', 'pending', 'building', 'downloading'].includes(b.status));
    if (anyRunning && !hasActive) startBuildsPoll();
    else if (!anyRunning && hasActive) stopBuildsPoll();

    container.innerHTML = '<div class="builds-list">' + builds.map(b => {
      const s = (b.status || 'queued').toLowerCase();
      const stage = BUILD_STAGES[s] || BUILD_STAGES.queued;
      const pct = BUILD_PROGRESS_PCT[s] || 0;
      const isRunning = ['queued','pending','building','downloading'].includes(s);
      const platIcon = b.platform === 'ios'
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="1" width="16" height="22" rx="3"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';

      const stageDesc = b.message ? esc(b.message) : stage.desc;
      const barClass = isRunning ? 'active' : s;

      return '<div class="build-card' + (isRunning ? ' active-build' : '') + '">' +
        '<div class="build-card-body">' +
        '<div class="build-icon ' + s + '">' + stage.icon + '</div>' +
        '<div class="build-info">' +
        '<div class="build-info-top">' +
        '<span class="build-status-badge ' + s + '">' +
        (isRunning ? '<span class="spinner" style="width:10px;height:10px;border-width:1.5px;border-color:currentColor transparent currentColor currentColor;margin:0"></span>' : '') +
        ' ' + stage.label + '</span>' +
        '<span class="build-platform">' + platIcon + ' ' + esc(b.platform || 'android') + '</span>' +
        (b.version ? '<span class="build-version">v' + esc(b.version) + '</span>' : '') +
        (isRunning ? '<span style="font-size:0.7rem;color:var(--text-muted);animation:buildPulse 1.5s ease-in-out infinite">● In progress</span>' : '') +
        '</div>' +
        '<div class="build-stage">' + stageDesc + '</div>' +
        '<div class="build-meta">' +
        '<span class="build-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + formatDateTime(b.created_at) + '</span>' +
        (b.build_id ? '<span class="build-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>ID ' + esc(b.build_id.slice(0, 8)) + '…</span>' : '') +
        '</div>' +
        '<div class="build-progress-wrap">' +
        '<div class="build-progress-label"><span>' + stage.label + '</span><span>' + pct + '%</span></div>' +
        '<div class="build-progress-bar"><div class="build-progress-fill ' + barClass + '" style="width:' + pct + '%"></div></div>' +
        '</div>' +
        '</div>' +
        '<div class="build-actions">' +
        (b.download_url ? '<a href="' + esc(b.download_url) + '" class="btn btn-sm btn-success">Download</a>' : '') +
        '</div>' +
        '</div></div>';
    }).join('') + '</div>';
  } catch (err) {
    container.innerHTML = '<div class="build-empty"><strong>Failed to load builds</strong><span>' + esc(err.message) + '</span></div>';
  }
}

function startBuildsPoll() {
  if (buildsPollTimer) return;
  buildsPollTimer = setInterval(() => { if (document.querySelector('.app-view[data-appview="builds"].active')) loadBuilds(); }, 5000);
}

function stopBuildsPoll() {
  if (buildsPollTimer) { clearInterval(buildsPollTimer); buildsPollTimer = null; }
}

let buildPlatformPicked = 'android';

function showBuildTrigger() {
  const existing = document.getElementById('buildTriggerModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'buildTriggerModal';
  modal.className = 'build-trigger-modal';
  modal.innerHTML =
    '<div class="build-trigger-panel">' +
    '<div class="build-trigger-header">' +
    '<h3>New Build</h3>' +
    '<p>Choose a platform to build for. EAS Cloud builds may take a few minutes.</p>' +
    '</div>' +
    '<div class="build-trigger-platforms">' +
    '<div class="build-platform-option' + (buildPlatformPicked === 'android' ? ' selected' : '') + '" data-plat="android" onclick="pickBuildPlatform(\'android\')">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>' +
    '<span>Android</span><small>APK &middot; AAB</small>' +
    '</div>' +
    '<div class="build-platform-option' + (buildPlatformPicked === 'ios' ? ' selected' : '') + '" data-plat="ios" onclick="pickBuildPlatform(\'ios\')">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="1" width="16" height="22" rx="3"/></svg>' +
    '<span>iOS</span><small>IPA &middot; TestFlight</small>' +
    '</div>' +
    '</div>' +
    '<div class="build-trigger-footer">' +
    '<button class="btn btn-sm btn-ghost" onclick="closeBuildTrigger()">Cancel</button>' +
    '<button class="btn btn-sm btn-primary" id="buildTriggerSubmit" onclick="confirmBuild()">Start Build</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeBuildTrigger(); });
}
window.showBuildTrigger = showBuildTrigger;

function pickBuildPlatform(plat) {
  buildPlatformPicked = plat;
  document.querySelectorAll('.build-platform-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.plat === plat);
  });
}
window.pickBuildPlatform = pickBuildPlatform;

function closeBuildTrigger() {
  const modal = document.getElementById('buildTriggerModal');
  if (modal) modal.remove();
}
window.closeBuildTrigger = closeBuildTrigger;

async function confirmBuild() {
  const btn = document.getElementById('buildTriggerSubmit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
  try {
    const res = await api('POST', '/apps/' + appId + '/build', { platform: buildPlatformPicked });
    closeBuildTrigger();
    toast('Build submitted: ' + res.build_id.slice(0, 8) + '…', 'success');
    loadBuilds();
    startBuildsPoll();
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Start Build'; }
  }
}
window.confirmBuild = confirmBuild;

async function triggerBuild() { showBuildTrigger(); }
window.triggerBuild = triggerBuild;

// ── Publish ──

async function publishConfig() {
  try {
    const res = await api('POST', '/v1/apps/' + appId + '/publish', {});
    toast('Published version ' + res.version, 'success');
    loadPublished();
    loadQR();
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.publishConfig = publishConfig;

// ── Push Notifications ──

async function sendPushNotification() {
  const titleInput = document.getElementById('pushTitle');
  const bodyInput = document.getElementById('pushBody');
  if (!titleInput || !bodyInput) return;
  const title = titleInput.value.trim();
  const bodyTxt = bodyInput.value.trim();
  if (!title || !bodyTxt) {
    toast('Please enter a title and message body', 'error');
    return;
  }
  try {
    const btn = event.target;
    const oldText = btn.innerHTML;
    btn.innerHTML = 'Sending...';
    btn.disabled = true;

    // Call backend
    await api('POST', '/push/send', { to: "ExponentPushToken[Broadcast]", title, body: bodyTxt });
    
    // Store in history
    if (!appData.config) appData.config = {};
    if (!appData.config.pushHistory) appData.config.pushHistory = [];
    appData.config.pushHistory.unshift({
      title,
      body: bodyTxt,
      date: new Date().toISOString()
    });
    
    // Keep only last 20
    if (appData.config.pushHistory.length > 20) {
      appData.config.pushHistory.pop();
    }
    
    await api('PUT', '/apps/' + appId, { config: appData.config });
    
    toast('Push notification broadcasted!');
    titleInput.value = '';
    bodyInput.value = '';
    
    renderPushHistory();
  } catch(err) {
    toast(err.message, 'error');
  } finally {
    const btn = event.target;
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
}
window.sendPushNotification = sendPushNotification;

function renderPushHistory() {
  const container = document.getElementById('pushHistoryContainer');
  if (!container) return;
  const history = (appData && appData.config && appData.config.pushHistory) || [];
  if (history.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color:var(--text-muted);margin-bottom:12px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p style="margin:0;">No recent history.</p></div>';
    return;
  }
  container.innerHTML = history.map(item => `
    <div style="border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px;background:var(--bg-panel);">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong style="color:var(--text);font-size:0.95rem;">${esc(item.title)}</strong>
        <span style="color:var(--text-muted);font-size:0.75rem;">${formatDateTime(item.date)}</span>
      </div>
      <p style="margin:0;color:var(--text-secondary);font-size:0.85rem;line-height:1.4;">${esc(item.body)}</p>
    </div>
  `).join('');
}

// ── Config ──

async function loadConfigForm() {
  const container = document.getElementById('appConfigForm');
  try {
    const app = await api('GET', '/apps/' + appId);
    const cfg = app.config || {};
    container.innerHTML =
      '<div class="form-group"><label for="appConfigJson">Config JSON</label>' +
      '<textarea id="appConfigJson">' + esc(JSON.stringify(cfg, null, 2)) + '</textarea></div>' +
      '<p style="font-size:0.78rem;color:var(--text-muted);margin-top:8px">Edit the config JSON directly. Be careful — invalid JSON will be rejected.</p>';
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p>Failed to load config</p></div>';
  }
}

async function saveConfig() {
  const textarea = document.getElementById('appConfigJson');
  if (!textarea) return;
  try {
    const config = JSON.parse(textarea.value);
    await api('PUT', '/apps/' + appId, { config });
    toast('Config saved!');
    // Reload app data
    appData = await api('GET', '/apps/' + appId);
    renderOverview();
    renderMiniPreview();
    loadPages();
  } catch (err) {
    toast('Invalid JSON: ' + err.message, 'error');
  }
}
window.saveConfig = saveConfig;

function editAppSettings() {
  const cfg = (appData && appData.config) || {};
  document.getElementById('editAppName').value = cfg.app_name || '';
  document.getElementById('editDisplayName').value = cfg.display_name || '';
  document.getElementById('editPackageName').value = cfg.package_name || '';
  document.getElementById('editVersion').value = cfg.version || '1.0.0';
  openModal('settingsModal');
}
window.editAppSettings = editAppSettings;

async function saveAppSettings() {
  const appName = document.getElementById('editAppName').value.trim();
  const displayName = document.getElementById('editDisplayName').value.trim();
  const packageName = document.getElementById('editPackageName').value.trim();
  const version = document.getElementById('editVersion').value.trim();

  if (!appName) { toast('App name is required', 'error'); return; }
  if (!/^[a-zA-Z]/.test(appName)) { toast('App name must start with a letter', 'error'); return; }
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) { toast('Version must be semver (e.g. 1.0.0)', 'error'); return; }

  try {
    const cfg = (appData && appData.config) || {};
    cfg.app_name = appName;
    cfg.display_name = displayName;
    cfg.package_name = packageName;
    cfg.version = version;
    await api('PUT', '/apps/' + appId, cfg);
    closeModal('settingsModal');
    toast('Settings saved!');
    appData = await api('GET', '/apps/' + appId);
    // Update header
    const name = cfg.display_name || cfg.app_name || 'App';
    document.getElementById('dashTitle').textContent = name;
    document.getElementById('dashVersion').textContent = 'v' + version;
    document.getElementById('dashAvatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('dashName').textContent = name;
    document.getElementById('dashSlug').textContent = appName;
    document.title = name + ' — App Dashboard';
    renderOverview();
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.saveAppSettings = saveAppSettings;

// ── Delete ──

async function deleteApp() {
  const ok = await customConfirm('Delete App', 'Delete this app and all its data? This cannot be undone.');
  if (!ok) return;
  try {
    await api('DELETE', '/apps/' + appId);
    toast('App deleted');
    setTimeout(() => window.location.href = '/', 1200);
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.deleteApp = deleteApp;

// ── Start ──

document.addEventListener('DOMContentLoaded', init);
async function savePageAppSettings() {
  const appName = document.getElementById('pageEditAppName').value.trim();
  const displayName = document.getElementById('pageEditDisplayName').value.trim();
  const packageName = document.getElementById('pageEditPackageName').value.trim();
  const version = document.getElementById('pageEditVersion').value.trim();

  if (!appName) { toast('App name is required', 'error'); return; }
  if (!/^[a-zA-Z]/.test(appName)) { toast('App name must start with a letter', 'error'); return; }
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) { toast('Version must be semver (e.g. 1.0.0)', 'error'); return; }

  try {
    const cfg = (appData && appData.config) || {};
    cfg.app_name = appName;
    cfg.display_name = displayName;
    cfg.package_name = packageName;
    cfg.version = version;
    await api('PUT', '/apps/' + appId, cfg);
    toast('Settings saved!');
    appData = await api('GET', '/apps/' + appId);
    // Update header
    const name = cfg.display_name || cfg.app_name || 'App';
    document.getElementById('dashTitle').textContent = name;
    document.getElementById('dashVersion').textContent = 'v' + version;
    document.getElementById('dashAvatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('dashName').textContent = name;
    document.getElementById('dashSlug').textContent = appName;
    document.title = name + ' — App Dashboard';
    renderOverview();
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.savePageAppSettings = savePageAppSettings;

// We also need a function to load these when switching to the settings tab
function loadPageAppSettings() {
  const cfg = (appData && appData.config) || {};
  document.getElementById('pageEditAppName').value = cfg.app_name || '';
  document.getElementById('pageEditDisplayName').value = cfg.display_name || '';
  document.getElementById('pageEditPackageName').value = cfg.package_name || '';
  document.getElementById('pageEditVersion').value = cfg.version || '1.0.0';
}
window.loadPageAppSettings = loadPageAppSettings;
function updateThemePreview(fromHex = false) {
  const colorPicker = document.getElementById('themePrimaryColor');
  const hexInput = document.getElementById('themePrimaryColorHex');
  
  if (fromHex) {
    colorPicker.value = hexInput.value;
  } else {
    hexInput.value = colorPicker.value;
  }
  
  const color = colorPicker.value;
  const font = document.getElementById('themeFontFamily').value;
  const radius = document.getElementById('themeBorderRadius').value;
  
  document.getElementById('themeBorderRadiusVal').textContent = radius + 'px';
  
  // Update Preview Pane
  const container = document.getElementById('themePreviewContainer');
  if (container) {
    if (font !== 'system') {
      container.style.fontFamily = font + ', sans-serif';
    } else {
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
  }
  
  const btn = document.getElementById('themePreviewBtn');
  if (btn) {
    btn.style.backgroundColor = color;
    btn.style.borderRadius = radius + 'px';
  }
  
  const link = document.getElementById('themePreviewLink');
  if (link) {
    link.style.color = color;
  }
  
  const in1 = document.getElementById('themePreviewInput1');
  const in2 = document.getElementById('themePreviewInput2');
  if (in1) in1.style.borderRadius = radius + 'px';
  if (in2) in2.style.borderRadius = radius + 'px';
}
window.updateThemePreview = updateThemePreview;

function loadThemeSettings() {
  const cfg = (appData && appData.config) || {};
  const pc = cfg.project_config || {};
  const theme = pc.theme || {};
  
  const primaryColor = theme.primaryColor || '#6366f1';
  document.getElementById('themePrimaryColor').value = primaryColor;
  document.getElementById('themePrimaryColorHex').value = primaryColor;
  
  const font = theme.fontFamily || 'system';
  document.getElementById('themeFontFamily').value = font;
  
  const radius = theme.borderRadius !== undefined ? theme.borderRadius : 8;
  document.getElementById('themeBorderRadius').value = radius;
  
  updateThemePreview();
}
window.loadThemeSettings = loadThemeSettings;

async function saveThemeSettings() {
  const color = document.getElementById('themePrimaryColor').value;
  const font = document.getElementById('themeFontFamily').value;
  const radius = parseInt(document.getElementById('themeBorderRadius').value, 10);
  
  try {
    const cfg = (appData && appData.config) || {};
    const pc = cfg.project_config || {};
    const theme = pc.theme || {};
    
    theme.primaryColor = color;
    theme.fontFamily = font;
    theme.borderRadius = radius;
    
    pc.theme = theme;
    cfg.project_config = pc;
    
    await api('PUT', '/apps/' + appId, cfg);
    toast('Theme settings saved!');
    appData = await api('GET', '/apps/' + appId);
    renderOverview();
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.saveThemeSettings = saveThemeSettings;
async function loadLanguages() {
  const cfg = (appData && appData.config) || {};
  const pc = cfg.project_config || {};
  const locales = pc.locales || [{ code: 'en', name: 'English (Default)', progress: 100 }];
  
  const tbody = document.getElementById('languagesTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = locales.map((loc, idx) => `
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:20px 24px;font-weight:600;display:flex;align-items:center;gap:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:var(--bg-input);color:var(--text);display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;">${loc.code.toUpperCase()}</div>
        ${esc(loc.name)}
      </td>
      <td style="padding:20px 24px;color:var(--text-secondary);font-family:monospace;font-size:0.9rem;">${esc(loc.code)}</td>
      <td style="padding:20px 24px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;box-shadow:inset 0 1px 2px var(--bg-input);">
            <div style="height:100%;width:${loc.progress || 0}%;background:var(--primary);border-radius:4px;"></div>
          </div>
          <span style="font-size:0.85rem;font-weight:600;color:var(--primary);width:40px;">${loc.progress || 0}%</span>
        </div>
      </td>
      <td style="padding:20px 24px;text-align:right;">
        <button class="btn" style="padding:8px 16px;font-size:0.85rem;border-radius:8px;background:var(--bg-hover);border:1px solid var(--border);color:var(--text);" onclick="editLanguage(${idx})">Edit</button>
      </td>
    </tr>
  `).join('');
}
window.loadLanguages = loadLanguages;

async function addLanguage() {
  const code = prompt('Enter language code (e.g. fr, es, de):');
  if (!code) return;
  const name = prompt('Enter language name (e.g. French, Spanish):');
  if (!name) return;
  
  try {
    const cfg = (appData && appData.config) || {};
    const pc = cfg.project_config || {};
    const locales = pc.locales || [{ code: 'en', name: 'English (Default)', progress: 100 }];
    
    locales.push({ code: code.toLowerCase(), name, progress: 0 });
    pc.locales = locales;
    cfg.project_config = pc;
    
    await api('PUT', '/apps/' + appId, cfg);
    toast('Language added!');
    appData = await api('GET', '/apps/' + appId);
    loadLanguages();
  } catch(err) {
    toast(err.message, 'error');
  }
}
window.addLanguage = addLanguage;

async function editLanguage(idx) {
  const cfg = (appData && appData.config) || {};
  const pc = cfg.project_config || {};
  const locales = pc.locales || [];
  if (!locales[idx]) return;
  
  const progStr = prompt('Enter translation progress (0-100):', locales[idx].progress || 0);
  if (progStr === null) return;
  
  let p = parseInt(progStr, 10);
  if (isNaN(p)) p = 0;
  if (p < 0) p = 0;
  if (p > 100) p = 100;
  
  try {
    locales[idx].progress = p;
    pc.locales = locales;
    cfg.project_config = pc;
    
    await api('PUT', '/apps/' + appId, cfg);
    toast('Language updated!');
    appData = await api('GET', '/apps/' + appId);
    loadLanguages();
  } catch(err) {
    toast(err.message, 'error');
  }
}
window.editLanguage = editLanguage;

// ── Store Uploads ──
async function loadStoreCredentials() {
  const cfg = (appData && appData.config) || {};
  const pc = cfg.project_config || {};
  const creds = pc.store_credentials || {};
  
  const issuerIdEl = document.getElementById('storeIosIssuerId');
  const keyIdEl = document.getElementById('storeIosKeyId');
  
  if (issuerIdEl) issuerIdEl.value = creds.ios_issuer_id || '';
  if (keyIdEl) keyIdEl.value = creds.ios_key_id || '';
}

async function saveStoreCredentials() {
  const issuerId = document.getElementById('storeIosIssuerId')?.value.trim();
  const keyId = document.getElementById('storeIosKeyId')?.value.trim();
  
  const cfg = (appData && appData.config) || {};
  if (!cfg.project_config) cfg.project_config = {};
  if (!cfg.project_config.store_credentials) cfg.project_config.store_credentials = {};
  
  cfg.project_config.store_credentials.ios_issuer_id = issuerId;
  cfg.project_config.store_credentials.ios_key_id = keyId;
  
  try {
    await api('PUT', '/apps/' + appId, cfg);
    toast('Store credentials saved!', 'success');
    appData = await api('GET', '/apps/' + appId);
  } catch (err) {
    toast('Error saving store credentials', 'error');
  }
}

async function triggerStoreSubmit() {
  toast('Store submission triggered! (Mocked)', 'success');
}

window.loadStoreCredentials = loadStoreCredentials;
window.saveStoreCredentials = saveStoreCredentials;
window.triggerStoreSubmit = triggerStoreSubmit;

// ── OTA Updates ──
async function triggerOtaUpdate() {
  toast('Publishing OTA Update...', 'info');
  // Mock API call delay
  setTimeout(() => {
    toast('OTA Update Published successfully!', 'success');
    loadOtaUpdates();
  }, 1500);
}

function loadOtaUpdates() {
  const container = document.getElementById('otaUpdatesList');
  if (!container) return;
  // Mock data
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-weight:600;font-size:0.9rem;">Update v1.0.4 - Fixes & Improvements</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">Published just now &bull; Active on 100% of devices</div>
      </div>
      <div style="padding:4px 8px;border-radius:4px;background:rgba(16,185,129,0.1);color:#10b981;font-size:0.75rem;font-weight:600;">Active</div>
    </div>
  `;
}

// ── Integrations ──
function loadIntegrations() {
  const cfg = (appData && appData.config) || {};
  const pc = cfg.project_config || {};
  const integrations = pc.integrations || {};
  const shopify = integrations.shopify || {};
  const woo = integrations.woocommerce || {};

  document.getElementById('integShopifyDomain').value = shopify.domain || '';
  document.getElementById('integShopifyToken').value = shopify.storefront_token || '';

  document.getElementById('integWooUrl').value = woo.store_url || '';
  document.getElementById('integWooKey').value = woo.consumer_key || '';
  document.getElementById('integWooSecret').value = woo.consumer_secret || '';
}

async function saveIntegrations() {
  const cfg = (appData && appData.config) || {};
  const pc = cfg.project_config || {};
  const integrations = pc.integrations || {};

  integrations.shopify = {
    domain: document.getElementById('integShopifyDomain').value,
    storefront_token: document.getElementById('integShopifyToken').value
  };

  integrations.woocommerce = {
    store_url: document.getElementById('integWooUrl').value,
    consumer_key: document.getElementById('integWooKey').value,
    consumer_secret: document.getElementById('integWooSecret').value
  };

  pc.integrations = integrations;
  cfg.project_config = pc;
  
  try {
    const r = await fetch(API + '/apps/' + appId + '/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(cfg)
    });
    if (!r.ok) throw new Error('Failed to save');
    toast('Integrations saved successfully.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

window.loadIntegrations = loadIntegrations;
window.saveIntegrations = saveIntegrations;
window.triggerOtaUpdate = triggerOtaUpdate;
window.loadOtaUpdates = loadOtaUpdates;
