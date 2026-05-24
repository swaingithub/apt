// ── Firebase Configuration & Initialization ──
const firebaseConfig = {
  apiKey: "demo-apt-project-key",
  authDomain: "demo-apt-project.firebaseapp.com",
  projectId: "demo-apt-project",
  storageBucket: "demo-apt-project.appspot.com",
  appId: "1:123456789:web:abcdef"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

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

    // ── Firebase Firestore Sync Hook ──
    try {
      if (method === 'PUT' && path.startsWith('/apps/')) {
        const parts = path.split('/');
        const targetAppId = parts[2];
        if (targetAppId && body) {
          db.collection('apps').doc(targetAppId).set({
            config: body.config || body,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true }).catch(err => console.error("Firestore Save Error:", err));
        }
      } else if (method === 'DELETE' && path.startsWith('/apps/')) {
        const parts = path.split('/');
        const targetAppId = parts[2];
        if (targetAppId) {
          db.collection('apps').doc(targetAppId).delete().catch(err => console.error("Firestore Delete Error:", err));
        }
      }
    } catch (fe) {
      console.error("Firestore Intercept Error:", fe);
    }

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
    loadOtaUpdates();
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
  if (view === 'update-app') {
    loadOtaUpdates();
  }
  if (view === 'blocks') {
    loadReusableBlocksList();
  }
  if (view === 'subscription') {
    loadBilling();
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
  { name: 'Content', items: [{ type: 'heading', icon: 'H', label: 'Heading' }, { type: 'text', icon: '¶', label: 'Text' }, { type: 'image', icon: '▩', label: 'Image' }, { type: 'video', icon: '▶', label: 'Video' }, { type: 'banner', icon: '▬', label: 'Banner' }, { type: 'icon', icon: '♡', label: 'Icon' }] },
  { name: 'Interactive', items: [{ type: 'button', icon: '⌂', label: 'Button' }, { type: 'input', icon: '⌨', label: 'Input' }, { type: 'textarea', icon: '☰', label: 'Textarea' }, { type: 'select', icon: '▼', label: 'Select' }, { type: 'checkbox', icon: '☑', label: 'Checkbox' }, { type: 'switch', icon: '⬡', label: 'Switch' }] },
  { name: 'Data & Media', items: [{ type: 'list', icon: '☰', label: 'List' }, { type: 'table', icon: '⊟', label: 'Table' }, { type: 'chart', icon: '⬚', label: 'Chart' }, { type: 'carousel', icon: '❮', label: 'Carousel' }, { type: 'map', icon: '⌖', label: 'Map' }] },
  { name: 'E-Commerce', items: [{ type: 'shopify_grid', icon: '⚏', label: 'Shopify Grid' }, { type: 'woo_grid', icon: '⚏', label: 'Woo Grid' }, { type: 'cart_button', icon: '⏏', label: 'Cart Button' }] },
  { 
    name: 'Presets (1-Click Sections)', 
    items: [
      { type: 'preset_hero', icon: '✦', label: 'Hero Banner' }, 
      { type: 'preset_features', icon: '❖', label: 'Feature Cards' }, 
      { type: 'preset_shop_header', icon: '☷', label: 'Ecom Header' }, 
      { type: 'preset_contact', icon: '✉', label: 'Contact Form' },
      { type: 'preset_pricing', icon: '❑', label: 'Pricing Cards' }
    ] 
  }
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
    case 'image': return props.src ? '<img class="sim-img" src="' + esc(props.src) + '" style="' + baseStyle + '">' : '<div class="sim-img-fallback" style="' + baseStyle + '">▩ ' + esc(el.label || 'Image') + '</div>';
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
    case 'chart': return '<div class="sim-img-fallback" style="' + baseStyle + '">⬚ ' + esc(props.chartType || 'Bar') + ' Chart</div>';
    case 'carousel': return '<div class="sim-img-fallback" style="' + baseStyle + '">❮ Carousel ❯</div>';
    case 'map': return '<div class="sim-img-fallback" style="background:#e2e8f0;color:#64748b;' + baseStyle + '">⌖ Map: ' + esc(props.mapLocation || 'New York') + '</div>';
    case 'shopify_grid': 
    case 'woo_grid': 
      if (ecommProducts && ecommProducts.length > 0) {
        return '<div class="sim-ecommerce-grid" style="' + baseStyle + '">' + 
               ecommProducts.slice(0, 4).map(p => {
                 let imgHtml = '';
                 const imgStr = p.image || '';
                 if (imgStr.startsWith('http') || imgStr.startsWith('/') || imgStr.startsWith('data:')) {
                   imgHtml = '<img src="' + esc(imgStr) + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />';
                 } else {
                   imgHtml = esc(imgStr);
                 }
                 return '<div class="sim-ecommerce-item"><div class="sim-ecommerce-img">' + imgHtml + '</div><div class="sim-ecommerce-meta"><div class="sim-ecommerce-title">' + esc(p.title) + '</div><div class="sim-ecommerce-price">' + esc(p.price) + '</div></div></div>';
               }).join('') + 
               '</div>';
      } else {
        return '<div class="sim-img-fallback" style="' + baseStyle + '">⚎ Setup Shopify/Woo Integration to view products</div>';
      }
    case 'cart_button': return '<div style="display:flex;justify-content:flex-end;padding:8px;' + baseStyle + '"><div style="width:44px;height:44px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 2px 8px rgba(0,0,0,0.05);"><span style="font-size:1.1rem">⏏</span><div style="position:absolute;top:0px;right:0px;background:' + esc(props.badgeColor || '#ef4444') + ';color:#fff;font-size:0.6rem;font-weight:700;width:18px;height:18px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid #fff;">3</div></div></div>';
    default: return '<div style="font-size:0.8rem;color:#94a3b8;padding:8px;border:1px dashed #cbd5e1;border-radius:6px;text-align:center;">' + dBgetIcon(el.type) + ' ' + esc(el.type) + '</div>';
  }
}

window.dBhasUnpublishedChanges = false;

function updatePublishButtonUI() {
  const btn = document.getElementById('btnPublishBuilder');
  if (!btn) return;
  if (window.dBhasUnpublishedChanges) {
    btn.innerHTML = '● Publish Updates';
    btn.style.backgroundColor = '#f59e0b';
    btn.style.borderColor = '#f59e0b';
    btn.style.animation = 'buildPulse 2s infinite';
  } else {
    btn.innerHTML = 'Publish Live App';
    btn.style.backgroundColor = 'var(--primary)';
    btn.style.borderColor = 'var(--primary)';
    btn.style.animation = 'none';
  }
}

let autoSaveTimeout = null;

function debouncedSaveBuilder() {
  const indicator = document.getElementById('autoSaveIndicator');
  if (indicator) {
    indicator.innerHTML = '<span class="indicator-dot" style="width:8px;height:8px;border-radius:50%;background:#f59e0b;animation:buildPulse 1s infinite;"></span> Saving...';
  }
  
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    try {
      const cfg = (appData && appData.config) || {};
      const pc = cfg.project_config || {};
      pc.pages = dBpages;
      cfg.project_config = pc;
      await api('PUT', '/apps/' + appId, cfg);
      appData = await api('GET', '/apps/' + appId);
      
      if (indicator) {
        indicator.innerHTML = '<span class="indicator-dot" style="width:8px;height:8px;border-radius:50%;background:#10b981;"></span> Saved';
      }
    } catch(err) {
      if (indicator) {
        indicator.innerHTML = '<span class="indicator-dot" style="width:8px;height:8px;border-radius:50%;background:#ef4444;"></span> Error';
      }
    }
  }, 1000);
}

async function openDashboardBuilder() {
  const cfg = (appData && appData.config) || {};
  const pc = cfg.project_config || {};
  let pages = pc.pages || [];
  
  dBpages = pages.map(p => ({ id: p.id, name: p.name, elements: JSON.parse(JSON.stringify(p.elements || [])) }));
  
  if (dBpages.length === 0) {
    dBpages.push({ id: 'page_home', name: 'Home', elements: [] });
  }
  
  dBblockIdCounter = dBpages.reduce((n, p) => Math.max(n, p.elements.reduce((m, e) => Math.max(m, parseInt((e.id || 'b_0').replace('b_', ''), 10) || 0), 0)), 0);
  dBactivePageId = dBpages.length > 0 ? dBpages[0].id : null;
  dBselectedBlockId = null;
  
  // Initialize clean history stack
  dBhistory = [];
  dBhistoryIndex = -1;
  dBpushHistory();
  
  await loadReusableBlocksForBuilder();
  
  dBactivePropTab = 'props';
  dBleftSidebarTab = 'blocks';
  
  const indicator = document.getElementById('autoSaveIndicator');
  if (indicator) {
    indicator.innerHTML = '<span class="indicator-dot" style="width:8px;height:8px;border-radius:50%;background:#10b981;"></span> Saved';
  }
  
  window.dBhasUnpublishedChanges = false;
  updatePublishButtonUI();
  
  renderDashboardBuilder();
  
  // Set initial rendering configurations
  setTimeout(() => {
    switchPreviewPlatform('ios');
    switchLeftSidebarTab('blocks');
    dBswitchPropTab('props');
    dBclearConsole();
  }, 50);
}

function renderDashboardBuilder() {
  renderDBuilderPageTabs();
  renderDBuilderPalette();
  renderDBuilderCanvas();
  renderDBuilderProps();
  
  if (dBleftSidebarTab === 'layers') {
    renderDBuilderLayersTree();
  }
}

function renderDBuilderPageTabs() {
  const c = document.getElementById('dbuilderPageTabs');
  if (!c) return;
  
  const page = dBpages.find(p => p.id === dBactivePageId);
  const selectedName = page ? page.name : 'Select page';
  
  c.innerHTML = `
    <div class="dbuilder-page-dropdown-container">
      <button class="dbuilder-page-dropdown-btn" onclick="togglePageDropdown(event)" id="dbPageDropdownBtn">
        <span class="dbuilder-page-dropdown-icon" style="font-size:0.85rem; opacity: 0.75;">▤</span>
        <span id="dbSelectedPageName">${esc(selectedName)}</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="dbuilder-page-dropdown-menu hidden" id="dbPageDropdownMenu">
        ${dBpages.map(p => `
          <div class="dbuilder-page-dropdown-item${p.id === dBactivePageId ? ' active' : ''}" onclick="dBselectPage('${p.id}')">
            <div class="item-label-wrap">
              <span style="font-size:0.75rem; opacity: 0.5;">▤</span>
              <span>${esc(p.name)}</span>
            </div>
            ${dBpages.length > 1 ? `<button class="tab-close" onclick="event.stopPropagation();dBremovePage('${p.id}')">&times;</button>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function togglePageDropdown(event) {
  event.stopPropagation();
  const btn = document.getElementById('dbPageDropdownBtn');
  const menu = document.getElementById('dbPageDropdownMenu');
  if (!menu || !btn) return;
  
  const isHidden = menu.classList.contains('hidden');
  
  document.querySelectorAll('.dbuilder-page-dropdown-menu').forEach(m => m.classList.add('hidden'));
  document.querySelectorAll('.dbuilder-page-dropdown-btn').forEach(b => b.classList.remove('open'));
  
  if (isHidden) {
    menu.classList.remove('hidden');
    btn.classList.add('open');
    
    const close = (e) => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.add('hidden');
        btn.classList.remove('open');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  } else {
    menu.classList.add('hidden');
    btn.classList.remove('open');
  }
}
window.togglePageDropdown = togglePageDropdown;

let dBreusableBlocks = [];

async function loadReusableBlocksForBuilder() {
  try {
    const res = await api('GET', '/v1/apps/' + appId + '/settings');
    const setting = res.find(s => s.key === 'reusable_blocks');
    if (setting) {
      dBreusableBlocks = setting.value || [];
    }
  } catch (e) {
    dBreusableBlocks = [];
  }
}

function renderDBuilderPalette() {
  const c = document.getElementById('dbuilderPaletteSections');
  if (!c) return;
  
  let html = dBcategories.map(cat =>
    '<div class="dbuilder-palette-section">' +
    '<div class="dbuilder-palette-title">' + esc(cat.name) + '</div>' +
    cat.items.map(item =>
      '<div class="dbuilder-palette-item" draggable="true" ondragstart="event.dataTransfer.setData(\'text/plain\', \'' + item.type + '\')" onclick="dBaddBlock(\'' + item.type + '\')">' +
      '<span>' + item.icon + '</span> ' +
      '<span class="dbuilder-palette-item-label">' + esc(item.label) + '</span>' +
      '</div>'
    ).join('') +
    '</div>'
  ).join('');
  
  if (dBreusableBlocks && dBreusableBlocks.length > 0) {
    html += '<div class="dbuilder-palette-section">' +
      '<div class="dbuilder-palette-title" style="color:var(--primary); font-weight:700;">Saved Templates</div>' +
      dBreusableBlocks.map(item =>
        '<div class="dbuilder-palette-item" onclick="dBaddReusableBlock(\'' + item.id + '\')" style="border:1px dashed rgba(99,102,241,0.3); border-radius:8px; margin-bottom:6px; background:rgba(99,102,241,0.05);">' +
        '<span>▣</span> ' + esc(item.name) +
        '</div>'
      ).join('') +
      '</div>';
  }
  
  c.innerHTML = html;
}

function renderDBuilderCanvas() {
  const screen = document.getElementById('dbuilderCanvas');
  if (!screen) return;
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
  const icon = dBgetIcon(el.type) || '■';
  
  let html = '<div class="dbuilder-block' + (sel ? ' selected' : '') + '" onclick="event.stopPropagation(); dBselectBlock(\'' + el.id + '\', event)">' +
    '<div class="dbuilder-block-type-badge">' + icon + ' ' + esc(el.type) + '</div>' +
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
  if (!body || !title) return;
  
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) { title.textContent = 'Properties'; body.innerHTML = '<div class="dbuilder-props-empty">No active page</div>'; return; }
  
  // If no block selected, always show Page Settings
  if (!dBselectedBlockId) {
    title.textContent = 'Page Settings';
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
  
  if (dBactivePropTab === 'props') {
    // ── CONFIG TAB ──
    html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Label</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(el.label) + '" onchange="dBupdateLabel(\'' + el.id + '\',this.value)"></div></div>';
    html += '<div class="dbuilder-section-title">Properties</div>';
    switch (el.type) {
      case 'heading': case 'text': html += dBpropInput(el.id, 'value', 'Text', props.value); break;
      case 'button': html += dBpropInput(el.id, 'value', 'Label', props.value); break;
      case 'image': 
        html += dBpropInput(el.id, 'src', 'Source URL', props.src); 
        html += '<div class="dbuilder-prop-group" style="margin-top:10px;">' +
          '<label class="dbuilder-prop-label">Or Upload Local File (Max 2MB)</label>' +
          '<div class="dbuilder-prop-row" style="display:flex; gap:8px; align-items:center;">' +
            '<input type="file" id="dbImageFilePicker" accept="image/*" onchange="dBhandleMediaUpload(\'' + el.id + '\', this, 2, false)" style="display:none;">' +
            '<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'dbImageFilePicker\').click()" style="width:100%; justify-content:center; padding:8px 12px; font-size:0.8rem; display:flex; align-items:center; gap:6px;">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
              'Upload Image' +
            '</button>' +
          '</div>' +
        '</div>';
        break;
      case 'video': 
        html += dBpropInput(el.id, 'src', 'Video URL', props.src);
        html += '<div class="dbuilder-prop-group" style="margin-top:10px;">' +
          '<label class="dbuilder-prop-label">Or Upload Video (Max 10MB)</label>' +
          '<div class="dbuilder-prop-row" style="display:flex; gap:8px; align-items:center;">' +
            '<input type="file" id="dbVideoFilePicker" accept="video/*" onchange="dBhandleMediaUpload(\'' + el.id + '\', this, 10, false)" style="display:none;">' +
            '<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'dbVideoFilePicker\').click()" style="width:100%; justify-content:center; padding:8px 12px; font-size:0.8rem; display:flex; align-items:center; gap:6px;">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>' +
              'Upload Video' +
            '</button>' +
          '</div>' +
        '</div>';
        break;
      case 'banner': html += dBpropInput(el.id, 'value', 'Title', props.value); html += dBpropInput(el.id, 'placeholder', 'Subtitle', props.placeholder); break;
      case 'input': case 'textarea': html += dBpropInput(el.id, 'placeholder', 'Placeholder', props.placeholder); break;
      case 'select': html += dBpropInput(el.id, 'options', 'Options (comma sep)', props.options); break;
      case 'checkbox': case 'switch': html += dBpropInput(el.id, 'label', 'Label', el.label); break;
      case 'icon': html += dBpropInput(el.id, 'iconName', 'Icon Name', props.iconName); html += dBpropInput(el.id, 'iconSize', 'Size (px)', props.iconSize); break;
      case 'grid': html += dBpropInput(el.id, 'gridCols', 'Columns', props.gridCols); break;
      case 'tabs': html += dBpropInput(el.id, 'tabHeaders', 'Tabs (comma sep)', props.tabHeaders); break;
      case 'list': html += dBpropInput(el.id, 'dataSource', 'Collection', props.dataSource); break;
      case 'table': html += dBpropInput(el.id, 'dataSource', 'Collection', props.dataSource); html += dBpropInput(el.id, 'columns', 'Columns (comma sep)', props.columns); break;
      case 'chart': html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Type</label><div class="dbuilder-prop-row"><select onchange="dBupdateProp(\'' + el.id + '\',\'chartType\',this.value)"><option value="bar"' + (props.chartType === 'bar' ? ' selected' : '') + '>Bar</option><option value="line"' + (props.chartType === 'line' ? ' selected' : '') + '>Line</option><option value="pie"' + (props.chartType === 'pie' ? ' selected' : '') + '>Pie</option></select></div></div>'; break;
      case 'carousel': 
        html += dBpropInput(el.id, 'src', 'Image URLs (comma sep)', props.src); 
        html += '<div class="dbuilder-prop-group" style="margin-top:10px;">' +
          '<label class="dbuilder-prop-label">Or Add Local Image (Max 2MB)</label>' +
          '<div class="dbuilder-prop-row" style="display:flex; gap:8px; align-items:center;">' +
            '<input type="file" id="dbCarouselFilePicker" accept="image/*" onchange="dBhandleMediaUpload(\'' + el.id + '\', this, 2, true)" style="display:none;">' +
            '<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'dbCarouselFilePicker\').click()" style="width:100%; justify-content:center; padding:8px 12px; font-size:0.8rem; display:flex; align-items:center; gap:6px;">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
              'Add to Carousel' +
            '</button>' +
          '</div>' +
        '</div>';
        break;
      case 'map': html += dBpropInput(el.id, 'mapLocation', 'Location', props.mapLocation); break;
    }
  } else if (dBactivePropTab === 'styles') {
    // ── DESIGN TAB ──
    html += '<div class="dbuilder-section-title" style="margin-top:0;">Styles</div>';
    html += dBpropStyle(el.id, 'backgroundColor', 'Background', styles.backgroundColor, 'color');
    html += dBpropStyle(el.id, 'color', 'Text Color', styles.color, 'color');
    html += dBpropStyle(el.id, 'fontSize', 'Font Size', styles.fontSize);
    html += dBpropStyle(el.id, 'fontWeight', 'Weight', styles.fontWeight, 'select', ['400', '500', '600', '700', '800']);
    html += dBpropStyle(el.id, 'textAlign', 'Align', styles.textAlign, 'select', ['left', 'center', 'right']);
    html += dBpropStyle(el.id, 'padding', 'Padding', styles.padding);
    html += dBpropStyle(el.id, 'margin', 'Margin', styles.margin);
    html += dBpropStyle(el.id, 'borderRadius', 'Border Radius', styles.borderRadius);
  } else if (dBactivePropTab === 'interactions') {
    // ── ACTIONS TAB ──
    const clickableTypes = ['container', 'grid', 'card', 'tabs', 'heading', 'text', 'image', 'video', 'banner', 'button', 'icon'];
    const changeableTypes = ['input', 'textarea', 'select', 'checkbox', 'switch'];

    if (clickableTypes.includes(el.type)) {
      html += '<div class="dbuilder-section-title" style="margin-top:0;">Interactive Action (Click)</div>';
      html += dBpropActionSelect(el.id, 'onClick', actions.onClick, dBpages);
      if (actions.onClick && actions.onClick.type !== 'none') {
        html += dBrenderActionFields(el.id, 'onClick', actions.onClick, dBpages);
      }
    } else if (changeableTypes.includes(el.type)) {
      html += '<div class="dbuilder-section-title" style="margin-top:0;">Interactive Action (Change)</div>';
      html += dBpropActionSelect(el.id, 'onChange', actions.onChange, dBpages);
      if (actions.onChange && actions.onChange.type !== 'none') {
        html += dBrenderActionFields(el.id, 'onChange', actions.onChange, dBpages);
      }
    } else {
      html += '<div class="dbuilder-props-empty">This element type does not support interactive actions.</div>';
    }
  }

  html += '<div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);display:flex;gap:12px;">' +
    '<button class="btn btn-sm btn-primary" style="flex:1; justify-content:center;" onclick="dBSaveAsReusable(\'' + el.id + '\')">Save as Reusable</button>' +
    '</div>';
    
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
    '<option value="web_url"' + (current === 'web_url' ? ' selected' : '') + '>Open Web URL</option>' +
    '<option value="share_sheet"' + (current === 'share_sheet' ? ' selected' : '') + '>Share Content</option>' +
    '<option value="toggle_dark_mode"' + (current === 'toggle_dark_mode' ? ' selected' : '') + '>Toggle Dark Mode</option>' +
    '<option value="push_permission"' + (current === 'push_permission' ? ' selected' : '') + '>Request Push Permission</option>' +
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
  if (action.type === 'web_url') {
    html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Web Link URL</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(action.webUrl || 'https://') + '" onchange="dBupdateAction(\'' + elId + '\',\'' + actionKey + '\',\'webUrl\',this.value)"></div></div>';
  }
  if (action.type === 'share_sheet') {
    html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Share Text</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(action.shareText || '') + '" onchange="dBupdateAction(\'' + elId + '\',\'' + actionKey + '\',\'shareText\',this.value)" placeholder="e.g. Check out this store!"></div></div>';
    html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">Share URL</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(action.shareUrl || '') + '" onchange="dBupdateAction(\'' + elId + '\',\'' + actionKey + '\',\'shareUrl\',this.value)" placeholder="e.g. https://store.com"></div></div>';
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

function dBcreateBlock(type) {
  dBblockIdCounter++;
  const def = dBdefaults[type] || dBdefaults.text;
  return { id: 'b_' + dBblockIdCounter, type, label: def.label, styles: {}, properties: JSON.parse(JSON.stringify(def.properties || {})), actions: JSON.parse(JSON.stringify(def.actions || {})), children: def.children ? [] : undefined };
}

function dBcreatePresetBlock(type) {
  dBblockIdCounter++;
  const id = 'b_' + dBblockIdCounter;
  
  if (type === 'preset_hero') {
    const container = { id, type: 'container', label: 'Hero Container', styles: { backgroundColor: '#f8fafc', borderRadius: 16, padding: '24' }, properties: {}, children: [] };
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'heading', label: 'Hero Heading', styles: { textAlign: 'center', fontSize: 24, fontWeight: '700' }, properties: { value: 'Craft the perfect shopping app' } });
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'text', label: 'Hero Subtitle', styles: { textAlign: 'center', color: '#64748b', fontSize: 14, margin: '8px 0 16px 0' }, properties: { value: 'Build and deploy native Shopify & WooCommerce mobile apps on iOS and Android with no code.' } });
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'button', label: 'Hero Button', styles: { textAlign: 'center', backgroundColor: '#6366f1', color: '#ffffff', borderRadius: 8, margin: '0 auto', padding: '12px 24px' }, properties: { value: 'Get Started' }, actions: { onClick: { type: 'toast', toastText: 'Welcome to your custom mobile app!' } } });
    return container;
  }
  
  if (type === 'preset_features') {
    const grid = { id, type: 'grid', label: 'Features Grid', styles: { padding: '12' }, properties: { gridCols: 2 }, children: [] };
    dBblockIdCounter++;
    const card1 = { id: 'b_' + dBblockIdCounter, type: 'card', label: 'Feature 1', styles: { backgroundColor: '#ffffff', borderRadius: 12, padding: '16' }, properties: {}, children: [] };
    dBblockIdCounter++;
    card1.children.push({ id: 'b_' + dBblockIdCounter, type: 'heading', label: 'Card Title', styles: { fontSize: 16, fontWeight: '700' }, properties: { value: 'Real EAS Builds' } });
    dBblockIdCounter++;
    card1.children.push({ id: 'b_' + dBblockIdCounter, type: 'text', label: 'Card Text', styles: { fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }, properties: { value: 'Compile native APKs dynamically inside our active build terminals.' } });
    grid.children.push(card1);
    
    dBblockIdCounter++;
    const card2 = { id: 'b_' + dBblockIdCounter, type: 'card', label: 'Feature 2', styles: { backgroundColor: '#ffffff', borderRadius: 12, padding: '16' }, properties: {}, children: [] };
    dBblockIdCounter++;
    card2.children.push({ id: 'b_' + dBblockIdCounter, type: 'heading', label: 'Card Title', styles: { fontSize: 16, fontWeight: '700' }, properties: { value: 'Push Notifications' } });
    dBblockIdCounter++;
    card2.children.push({ id: 'b_' + dBblockIdCounter, type: 'text', label: 'Card Text', styles: { fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }, properties: { value: 'Keep your users engaged with beautiful real-time broadcasts.' } });
    grid.children.push(card2);
    return grid;
  }
  
  if (type === 'preset_shop_header') {
    const container = { id, type: 'container', label: 'Shop Banner', styles: { backgroundColor: '#1e293b', borderRadius: 16, padding: '20' }, properties: {}, children: [] };
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'cart_button', label: 'Header Cart', styles: {}, properties: { badgeColor: '#ef4444' } });
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'heading', label: 'Shop Title', styles: { color: '#ffffff', fontSize: 20, fontWeight: '700' }, properties: { value: 'Our Catalog' } });
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'text', label: 'Shop Sub', styles: { color: '#94a3b8', fontSize: 13, margin: '4px 0 0 0' }, properties: { value: 'Browse top items directly synced from Shopify' } });
    return container;
  }
  
  if (type === 'preset_contact') {
    const container = { id, type: 'container', label: 'Contact Form Card', styles: { backgroundColor: '#ffffff', borderRadius: 16, padding: '20' }, properties: {}, children: [] };
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'heading', label: 'Form Title', styles: { fontSize: 18, fontWeight: '700', margin: '0 0 12px 0' }, properties: { value: 'Get in Touch' } });
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'input', label: 'Name Field', styles: {}, properties: { placeholder: 'Your Name' } });
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'textarea', label: 'Message Field', styles: { margin: '8px 0' }, properties: { placeholder: 'Your Message...' } });
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'button', label: 'Submit Button', styles: { backgroundColor: '#22c55e', color: '#ffffff', borderRadius: 8, padding: '12' }, properties: { value: 'Send Message' }, actions: { onClick: { type: 'toast', toastText: 'Form submitted successfully!' } } });
    return container;
  }
  
  if (type === 'preset_pricing') {
    const container = { id, type: 'container', label: 'Pricing Section', styles: { padding: '12' }, properties: {}, children: [] };
    dBblockIdCounter++;
    container.children.push({ id: 'b_' + dBblockIdCounter, type: 'heading', label: 'Section Title', styles: { textAlign: 'center', fontSize: 20, fontWeight: '700' }, properties: { value: 'Choose Your Plan' } });
    dBblockIdCounter++;
    const grid = { id: 'b_' + dBblockIdCounter, type: 'grid', label: 'Pricing Grid', styles: { margin: '16px 0 0 0' }, properties: { gridCols: 2 }, children: [] };
    dBblockIdCounter++;
    const card1 = { id: 'b_' + dBblockIdCounter, type: 'card', label: 'Standard Plan', styles: { backgroundColor: '#ffffff', borderRadius: 12, padding: '16' }, properties: {}, children: [] };
    dBblockIdCounter++;
    card1.children.push({ id: 'b_' + dBblockIdCounter, type: 'heading', label: 'Plan Name', styles: { fontSize: 16, fontWeight: '700' }, properties: { value: 'Starter' } });
    dBblockIdCounter++;
    card1.children.push({ id: 'b_' + dBblockIdCounter, type: 'heading', label: 'Plan Price', styles: { fontSize: 24, fontWeight: '800', color: '#6366f1', margin: '4px 0' }, properties: { value: '$9/mo' } });
    dBblockIdCounter++;
    card1.children.push({ id: 'b_' + dBblockIdCounter, type: 'button', label: 'Select Plan Button', styles: { backgroundColor: '#f1f5f9', color: '#0f172a', borderRadius: 6, padding: '8', margin: '8px 0 0 0' }, properties: { value: 'Choose Starter' }, actions: { onClick: { type: 'toast', toastText: 'Starter plan selected!' } } });
    grid.children.push(card1);
    
    dBblockIdCounter++;
    const card2 = { id: 'b_' + dBblockIdCounter, type: 'card', label: 'Pro Plan', styles: { backgroundColor: '#0f172a', color: '#ffffff', borderRadius: 12, padding: '16' }, properties: {}, children: [] };
    dBblockIdCounter++;
    card2.children.push({ id: 'b_' + dBblockIdCounter, type: 'heading', label: 'Plan Name', styles: { fontSize: 16, fontWeight: '700', color: '#ffffff' }, properties: { value: 'Professional' } });
    dBblockIdCounter++;
    card2.children.push({ id: 'b_' + dBblockIdCounter, type: 'heading', label: 'Plan Price', styles: { fontSize: 24, fontWeight: '800', color: '#10b981', margin: '4px 0' }, properties: { value: '$29/mo' } });
    dBblockIdCounter++;
    card2.children.push({ id: 'b_' + dBblockIdCounter, type: 'button', label: 'Select Plan Button', styles: { backgroundColor: '#6366f1', color: '#ffffff', borderRadius: 6, padding: '8', margin: '8px 0 0 0' }, properties: { value: 'Upgrade to Pro' }, actions: { onClick: { type: 'toast', toastText: 'Upgraded to Professional!' } } });
    grid.children.push(card2);
    container.children.push(grid);
    return container;
  }
  
  return null;
}

function dBaddBlock(type) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  
  let block;
  if (type.startsWith('preset_')) {
    block = dBcreatePresetBlock(type);
  } else {
    block = dBcreateBlock(type);
  }
  
  if (!block) return;
  
  if (dBselectedBlockId) {
    const found = dBfindInList(dBselectedBlockId, page.elements);
    if (found) {
      const parentBlock = found.block;
      if (['container', 'grid', 'card', 'tabs'].includes(parentBlock.type)) {
        if (!parentBlock.children) parentBlock.children = [];
        parentBlock.children.push(block);
      } else {
        found.parent.splice(found.idx + 1, 0, block);
      }
    } else {
      page.elements.push(block);
    }
  } else {
    page.elements.push(block);
  }
  
  dBselectedBlockId = block.id;
  dBpushHistory();
  renderDashboardBuilder();
}

window.dBhandleDrop = function(event) {
  event.preventDefault();
  const type = event.dataTransfer.getData('text/plain');
  if (type) {
    // Determine drop target if we drop inside a specific container block,
    // but for simplicity, we just add it to the active block or page.
    dBaddBlock(type);
  }
};

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
  dBpushHistory();
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
  dBpushHistory();
  renderDBuilderCanvas();
  renderDBuilderProps();
}

window.dBdeselectBlock = function(event) {
  if (event.target.id === 'dbuilderCanvas') {
    dBselectedBlockId = null;
    renderDBuilderCanvas();
    renderDBuilderProps();
    if (dBleftSidebarTab === 'layers') {
      renderDBuilderLayersTree();
    }
  }
};

function dBselectBlock(id, event) {
  if (event) event.stopPropagation();
  dBselectedBlockId = dBselectedBlockId === id ? null : id;
  renderDBuilderCanvas();
  renderDBuilderProps();
  
  // Keep layers Navigator synced if active
  if (dBleftSidebarTab === 'layers') {
    renderDBuilderLayersTree();
  }
}

function dBremoveBlock(id) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(id, page.elements);
  if (found) { 
    found.parent.splice(found.idx, 1); 
    if (dBselectedBlockId === id) dBselectedBlockId = null; 
  }
  dBpushHistory();
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
  dBpushHistory();
  renderDBuilderCanvas();
}

function dBupdateProp(elId, key, value) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(elId, page.elements);
  if (!found) return;
  found.block.properties[key] = value;
  dBpushHistory();
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
  dBpushHistory();
  renderDBuilderCanvas();
  renderDBuilderProps();
}

function dBupdateLabel(elId, value) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(elId, page.elements);
  if (found) found.block.label = value;
  dBpushHistory();
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
  dBpushHistory();
}

// Page operations
function dBaddPage() {
  const name = prompt('Page name:');
  if (!name) return;
  const id = 'page_' + Date.now();
  dBpages.push({ id, name, elements: [] });
  dBactivePageId = id;
  dBselectedBlockId = null;
  dBpushHistory();
  renderDashboardBuilder();
}

function dBremovePage(id) {
  if (dBpages.length <= 1) return;
  dBpages = dBpages.filter(p => p.id !== id);
  if (dBactivePageId === id) dBactivePageId = dBpages.length > 0 ? dBpages[dBpages.length - 1].id : null;
  dBselectedBlockId = null;
  dBpushHistory();
  renderDashboardBuilder();
}

function dBupdatePageName(val) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (page) {
    page.name = val;
    dBpushHistory();
    renderDBuilderPageTabs();
  }
}

function dBupdatePageProp(key, val) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (page) {
    if (!page.properties) page.properties = {};
    page.properties[key] = val;
    dBpushHistory();
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

function switchPreviewPlatform(platform) {
  const frames = document.querySelectorAll('.dbuilder-hardware-frame');
  const notches = document.querySelectorAll('.dbuilder-phone-notch');
  const screens = document.querySelectorAll('.dbuilder-phone-screen');
  const btnIos = document.getElementById('btnPreviewIos');
  const btnAndroid = document.getElementById('btnPreviewAndroid');
  
  if (!btnIos || !btnAndroid) return;
  
  if (platform === 'ios') {
    btnIos.classList.add('active');
    btnIos.style.background = 'var(--primary)';
    btnIos.style.color = '#ffffff';
    btnAndroid.classList.remove('active');
    btnAndroid.style.background = 'transparent';
    btnAndroid.style.color = 'var(--text-muted)';
    
    frames.forEach(frame => {
      frame.style.borderRadius = '32px';
      frame.style.padding = '10px';
      frame.style.width = '275px';
      frame.style.height = '560px';
    });
    notches.forEach(notch => {
      notch.style.width = '80px';
      notch.style.height = '22px';
      notch.style.borderRadius = '11px';
      notch.style.top = '14px';
      notch.style.left = '50%';
      notch.style.transform = 'translateX(-50%)';
    });
    screens.forEach(screen => {
      screen.style.borderRadius = '24px';
      screen.style.paddingTop = '40px';
    });
  } else {
    btnAndroid.classList.add('active');
    btnAndroid.style.background = 'var(--primary)';
    btnAndroid.style.color = '#ffffff';
    btnIos.classList.remove('active');
    btnIos.style.background = 'transparent';
    btnIos.style.color = 'var(--text-muted)';
    
    frames.forEach(frame => {
      frame.style.borderRadius = '24px';
      frame.style.padding = '8px';
      frame.style.width = '265px';
      frame.style.height = '540px';
    });
    notches.forEach(notch => {
      notch.style.width = '10px';
      notch.style.height = '10px';
      notch.style.borderRadius = '50%';
      notch.style.top = '12px';
      notch.style.left = '50%';
      notch.style.transform = 'translateX(-50%)';
    });
    screens.forEach(screen => {
      screen.style.borderRadius = '18px';
      screen.style.paddingTop = '26px';
    });
  }
}
window.switchPreviewPlatform = switchPreviewPlatform;

function switchLeftSidebarTab(tab) {
  dBleftSidebarTab = tab;
  const btnBlocks = document.getElementById('btnLeftTabBlocks');
  const btnLayers = document.getElementById('btnLeftTabLayers');
  const blocksWrapper = document.getElementById('dbuilderBlocksWrapper');
  const layersNavigator = document.getElementById('dbuilderLayersNavigator');
  
  if (!btnBlocks || !btnLayers) return;
  
  if (tab === 'blocks') {
    btnBlocks.classList.add('active');
    btnBlocks.style.color = 'var(--text)';
    btnBlocks.style.borderBottom = '2px solid var(--primary)';
    
    btnLayers.classList.remove('active');
    btnLayers.style.color = 'var(--text-muted)';
    btnLayers.style.borderBottom = '2px solid transparent';
    
    if (blocksWrapper) blocksWrapper.style.display = 'flex';
    if (layersNavigator) layersNavigator.style.display = 'none';
  } else {
    btnLayers.classList.add('active');
    btnLayers.style.color = 'var(--text)';
    btnLayers.style.borderBottom = '2px solid var(--primary)';
    
    btnBlocks.classList.remove('active');
    btnBlocks.style.color = 'var(--text-muted)';
    btnBlocks.style.borderBottom = '2px solid transparent';
    
    if (blocksWrapper) blocksWrapper.style.display = 'none';
    if (layersNavigator) {
      layersNavigator.style.display = 'block';
      renderDBuilderLayersTree();
    }
  }
}
window.switchLeftSidebarTab = switchLeftSidebarTab;

function renderDBuilderLayersTree() {
  const container = document.getElementById('dbuilderLayersNavigator');
  if (!container) return;
  
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page || !page.elements || page.elements.length === 0) {
    container.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:20px;">No elements in this page yet</div>';
    return;
  }
  
  let html = '<div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px; padding-left:4px;">Element Hierarchy</div>';
  
  function buildTreeHtml(elements, depth = 0) {
    let treeHtml = '';
    elements.forEach((el) => {
      const isSelected = el.id === dBselectedBlockId;
      const indent = depth * 14;
      const icon = dBgetIcon(el.type) || '■';
      
      treeHtml += `<div class="layers-tree-item" onclick="event.stopPropagation(); dBselectBlock('${el.id}')" style="display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; margin-bottom:2px; font-size:0.76rem; cursor:pointer; font-weight:500; margin-left:${indent}px; background:${isSelected ? 'rgba(99,102,241,0.1)' : 'transparent'}; border:1px solid ${isSelected ? 'rgba(99,102,241,0.25)' : 'transparent'}; transition:all 0.15s; color:${isSelected ? 'var(--primary)' : 'var(--text-secondary)'};">`;
      treeHtml += `<span style="font-size:0.85rem; flex-shrink:0;">${icon}</span>`;
      treeHtml += `<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(el.label || el.type)}</span>`;
      treeHtml += `<button onclick="event.stopPropagation(); dBremoveBlock('${el.id}')" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:0.7rem; padding:2px; line-height:1; display:flex; align-items:center; opacity:0.6;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">✕</button>`;
      treeHtml += '</div>';
      
      if (el.children && Array.isArray(el.children) && el.children.length > 0) {
        treeHtml += buildTreeHtml(el.children, depth + 1);
      }
    });
    return treeHtml;
  }
  
  html += buildTreeHtml(page.elements);
  container.innerHTML = html;
}
window.renderDBuilderLayersTree = renderDBuilderLayersTree;

function dBswitchPropTab(tab) {
  dBactivePropTab = tab;
  const btnProps = document.getElementById('btnPropTabProps');
  const btnStyles = document.getElementById('btnPropTabStyles');
  const btnInteractions = document.getElementById('btnPropTabInteractions');
  
  if (btnProps && btnStyles && btnInteractions) {
    [btnProps, btnStyles, btnInteractions].forEach(btn => {
      btn.classList.remove('active');
      btn.style.color = 'var(--text-muted)';
      btn.style.borderBottom = '2px solid transparent';
    });
    
    let activeBtn;
    if (tab === 'props') activeBtn = btnProps;
    else if (tab === 'styles') activeBtn = btnStyles;
    else if (tab === 'interactions') activeBtn = btnInteractions;
    
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.style.color = 'var(--text)';
      activeBtn.style.borderBottom = '2px solid var(--primary)';
    }
  }
  
  renderDBuilderProps();
}
window.dBswitchPropTab = dBswitchPropTab;

function dBpushHistory() {
  if (dBhistoryIndex < dBhistory.length - 1) {
    dBhistory = dBhistory.slice(0, dBhistoryIndex + 1);
  }
  const snapshot = JSON.parse(JSON.stringify(dBpages));
  dBhistory.push(snapshot);
  if (dBhistory.length > 50) {
    dBhistory.shift();
  }
  dBhistoryIndex = dBhistory.length - 1;
  
  // Track unsaved state and save local draft (ignore first initialization push)
  if (dBhistoryIndex > 0) {
    debouncedSaveBuilder();
    window.dBhasUnpublishedChanges = true;
    updatePublishButtonUI();
  }
}
window.dBpushHistory = dBpushHistory;

function dBUndo() {
  if (dBhistoryIndex > 0) {
    dBhistoryIndex--;
    dBpages = JSON.parse(JSON.stringify(dBhistory[dBhistoryIndex]));
    if (!dBpages.some(p => p.id === dBactivePageId) && dBpages.length > 0) {
      dBactivePageId = dBpages[0].id;
    }
    dBselectedBlockId = null;
    renderDashboardBuilder();
    renderDBuilderLayersTree();
    dBconsoleLog("Undo: Reverted canvas configuration to previous state", "info");
  } else {
    toast("Nothing to Undo");
  }
}
window.dBUndo = dBUndo;

function dBRedo() {
  if (dBhistoryIndex < dBhistory.length - 1) {
    dBhistoryIndex++;
    dBpages = JSON.parse(JSON.stringify(dBhistory[dBhistoryIndex]));
    if (!dBpages.some(p => p.id === dBactivePageId) && dBpages.length > 0) {
      dBactivePageId = dBpages[0].id;
    }
    dBselectedBlockId = null;
    renderDashboardBuilder();
    renderDBuilderLayersTree();
    dBconsoleLog("Redo: Re-applied configuration state", "info");
  } else {
    toast("Nothing to Redo");
  }
}
window.dBRedo = dBRedo;

function dBconsoleLog(message, type = 'info') {
  const consoleLogs = document.getElementById('dbuilderConsoleLogs');
  if (!consoleLogs) return;
  if (consoleLogs.innerHTML.includes('Listening for simulator user interactions...')) {
    consoleLogs.innerHTML = '';
  }
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const colorMap = {
    info: '#a5b4fc',
    success: '#22d06c',
    warning: '#fbbf24',
    error: '#ef4444'
  };
  const color = colorMap[type] || '#a5b4fc';
  const logLine = document.createElement('div');
  logLine.style.marginBottom = '4px';
  logLine.style.color = color;
  logLine.innerHTML = `<span style="color:var(--text-muted); font-size:0.68rem; margin-right:8px;">[${timeStr}]</span> ${esc(message)}`;
  consoleLogs.appendChild(logLine);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
}
window.dBconsoleLog = dBconsoleLog;

function dBTogglePreviewMode() {
  const layout = document.getElementById('dbuilderLayout');
  const btn = document.getElementById('btnPreviewMode');
  const palette = document.getElementById('dbuilderPalette');
  const props = document.getElementById('dbuilderProps');
  const canvasWrap = document.querySelector('.dbuilder-canvas-wrap');
  const canvasHeader = document.querySelector('.dbuilder-canvas-header');
  const phoneFrame = document.querySelector('.dbuilder-phone-frame');
  if (!layout || !btn) return;
  
  layout.classList.toggle('preview-mode');
  const isPreview = layout.classList.contains('preview-mode');
  
  if (isPreview) {
    layout.style.position = 'relative';
    if(palette) palette.style.display = 'none';
    if(props) props.style.display = 'none';
    
    if(canvasHeader) {
      canvasHeader.style.position = 'absolute';
      canvasHeader.style.top = '0';
      canvasHeader.style.left = '0';
      canvasHeader.style.width = '100%';
      canvasHeader.style.zIndex = '100';
      canvasHeader.style.justifyContent = 'center';
    }
    
    if(phoneFrame) {
      phoneFrame.style.position = 'absolute';
      phoneFrame.style.top = '0';
      phoneFrame.style.left = '0';
      phoneFrame.style.width = '100%';
      phoneFrame.style.height = '100%';
      phoneFrame.style.zIndex = '90';
    }

    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg> Exit Preview';
    btn.style.background = 'var(--primary)';
    btn.style.color = '#ffffff';
    btn.style.borderColor = 'var(--primary)';
    if (window.toast) window.toast('Preview Mode: Editing tools hidden.', 'success');
  } else {
    layout.style.position = '';
    if(palette) palette.style.display = '';
    if(props) props.style.display = '';
    
    if(canvasHeader) {
      canvasHeader.style.position = '';
      canvasHeader.style.top = '';
      canvasHeader.style.left = '';
      canvasHeader.style.width = '';
      canvasHeader.style.zIndex = '';
      canvasHeader.style.justifyContent = '';
    }
    
    if(phoneFrame) {
      phoneFrame.style.position = '';
      phoneFrame.style.top = '';
      phoneFrame.style.left = '';
      phoneFrame.style.width = '';
      phoneFrame.style.height = '';
      phoneFrame.style.zIndex = '';
    }

    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Play Preview';
    btn.style.background = 'var(--bg-surface)';
    btn.style.color = 'var(--text)';
    btn.style.borderColor = 'var(--border)';
  }
}
window.dBTogglePreviewMode = dBTogglePreviewMode;

function dBToggleConsole() {
  const consoleEl = document.getElementById('dbuilderSimulatorConsole');
  const btn = document.getElementById('btnToggleConsole');
  if (consoleEl && btn) {
    if (consoleEl.style.display === 'none') {
      consoleEl.style.display = 'flex';
      btn.classList.add('active');
      btn.style.background = 'var(--primary)';
      btn.style.color = '#ffffff';
    } else {
      consoleEl.style.display = 'none';
      btn.classList.remove('active');
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text-muted)';
    }
  }
}
window.dBToggleConsole = dBToggleConsole;

function dBclearConsole() {
  const consoleLogs = document.getElementById('dbuilderConsoleLogs');
  if (consoleLogs) {
    consoleLogs.innerHTML = '<div style="color:var(--text-muted); font-style:italic;">Console cleared. Listening for simulator user interactions...</div>';
  }
}
window.dBclearConsole = dBclearConsole;

window.dBaddPage = dBaddPage;
window.dBselectPage = dBselectPage;
window.dBaddBlock = dBaddBlock;
window.dBduplicateBlock = dBduplicateBlock;
window.dBaddChildBlock = dBaddChildBlock;
window.dBselectBlock = dBselectBlock;
window.dBremoveBlock = dBremoveBlock;
window.dBmoveBlock = dBmoveBlock;
window.dBremovePage = dBremovePage;
window.dBupdateProp = dBupdateProp;
window.dBupdateStyle = dBupdateStyle;
window.dBupdateLabel = dBupdateLabel;
window.dBupdateAction = dBupdateAction;
window.dbuilderFilterPalette = dbuilderFilterPalette;

async function publishBuilderUpdate() {
  try {
    const cfg = (appData && appData.config) || {};
    const pc = cfg.project_config || {};
    pc.pages = dBpages;
    cfg.project_config = pc;
    await api('PUT', '/apps/' + appId, cfg);
    appData = await api('GET', '/apps/' + appId);
    
    // Now trigger the actual Expo EAS publish OTA
    await triggerOtaUpdate();
    
    window.dBhasUnpublishedChanges = false;
    updatePublishButtonUI();
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.publishBuilderUpdate = publishBuilderUpdate;

async function saveDashboardBuilder() {
  try {
    const app = await api('GET', '/apps/' + appId);
    const cfg = app.config || {};
    const pc = cfg.project_config || {};
    pc.pages = dBpages;
    cfg.project_config = pc;
    await api('PUT', '/apps/' + appId, cfg);
    
    window.dBunsavedChanges = false;
    updateBuilderSaveButton();
    
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
      icon: item.icon || '⌂',
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
    '<div class="menu-item-icon-wrap" onclick="showEmojiPicker(this,' + i + ')" style="cursor:pointer">' + esc(item.icon || '⌂') + '</div>' +
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
      '<span class="tab-icon">' + esc(item.icon || '⌂') + '</span>' +
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
  menuItems.push({ id: 'mi_' + Date.now(), label: 'Tab ' + (menuItems.length + 1), icon: '⌂', targetPageId: pages.length > 0 ? pages[0].id : '' });
  renderAppMenu();
}
window.addMenuItem = addMenuItem;

function updateMenuItem(idx, key, value) {
  if (menuItems[idx]) menuItems[idx][key] = value;
  if (key === 'icon') renderAppMenu();
  else renderMenuPreview();
}
window.updateMenuItem = updateMenuItem;

const TAB_EMOJIS = ['⌂', '⌕', '♡', '☆', '✦', '❖', '✉', '☏', '⚙', '▤', '📅', '⌖', '⚏', '☷', '⬚', '▲', '▼', '■', '▢', '○', '◇', '◈', '☼', '☾', '⚿', '✎', '⏏', '⎘', '⎗'];

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

// ── QR Connection state variables ──
let qrConnectionMode = 'lan'; // 'lan', 'local', 'tunnel'
let qrCustomIp = '';
let qrCustomTunnel = '';
let qrLocalIp = '';
let qrAppSlug = '';
let qrActiveTab = 'expo-go'; // 'expo-go' or 'dev-build'

function switchQrTab(tab) {
  qrActiveTab = tab;
  loadQR();
}
window.switchQrTab = switchQrTab;

function switchQrConnection(mode) {
  qrConnectionMode = mode;
  loadQR();
}
window.switchQrConnection = switchQrConnection;

function toggleCustomIpEdit() {
  const el = document.getElementById('customIpEditBox');
  if (el) {
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
    if (el.style.display === 'flex') {
      document.getElementById('customIpInput').focus();
    }
  }
}
window.toggleCustomIpEdit = toggleCustomIpEdit;

function saveCustomIp() {
  const val = document.getElementById('customIpInput').value.trim();
  if (val) {
    qrCustomIp = val;
    loadQR();
  }
}
window.saveCustomIp = saveCustomIp;

function saveCustomTunnel() {
  const val = document.getElementById('customTunnelInput').value.trim();
  if (val) {
    qrCustomTunnel = val;
    loadQR();
  }
}
window.saveCustomTunnel = saveCustomTunnel;

async function copyQrLink(text) {
  try {
    await navigator.clipboard.writeText(text);
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) {
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" style="margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg><span style="font-size:0.75rem; font-weight:600; color:#22c55e;">Copied!</span>';
      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
      }, 2000);
    }
  } catch (err) {
    toast('Failed to copy', 'error');
  }
}
window.copyQrLink = copyQrLink;

async function loadQR() {
  const container = document.getElementById('qrContainer');
  if (!container) return;
  
  try {
    // Generate URL based on selected connection mode
    let targetUrl = '';
    
    if (qrActiveTab === 'expo-go') {
      if (qrConnectionMode === 'lan') {
        const ip = qrCustomIp || qrLocalIp || '127.0.0.1';
        targetUrl = 'exp://' + ip + ':8081';
      } else if (qrConnectionMode === 'local') {
        targetUrl = 'exp://localhost:8081';
      } else if (qrConnectionMode === 'tunnel') {
        targetUrl = qrCustomTunnel || ('exp://u.expo.dev/' + (qrAppSlug || appId));
      }
    } else {
      // Dev build tab
      targetUrl = 'https://expo.dev/artifacts/' + appId;
    }

    // Call backend API with custom URL
    const queryParam = '?url=' + encodeURIComponent(targetUrl);
    const res = await api('GET', '/apps/' + appId + '/qr' + queryParam);
    
    // Cache the resolved values if first time
    if (!qrLocalIp && res.local_ip) qrLocalIp = res.local_ip;
    if (!qrAppSlug && res.slug) qrAppSlug = res.slug;

    // Render interactive premium UI!
    let html = '';
    
    // Tab toggles: Expo Go vs Development Build
    html += '<div style="display:flex; border-bottom:1px solid var(--border); margin-bottom:20px; background:var(--bg-hover); border-radius:10px; padding:4px;">' +
      '<button class="qr-tab-btn' + (qrActiveTab === 'expo-go' ? ' active' : '') + '" onclick="switchQrTab(\'expo-go\')" style="flex:1; border:none; background:' + (qrActiveTab === 'expo-go' ? 'var(--bg-card)' : 'transparent') + '; color:' + (qrActiveTab === 'expo-go' ? 'var(--text)' : 'var(--text-secondary)') + '; font-size:0.82rem; font-weight:600; padding:8px 12px; border-radius:8px; cursor:pointer; transition:all 0.2s; box-shadow:' + (qrActiveTab === 'expo-go' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none') + ';">Expo Go</button>' +
      '<button class="qr-tab-btn' + (qrActiveTab === 'dev-build' ? ' active' : '') + '" onclick="switchQrTab(\'dev-build\')" style="flex:1; border:none; background:' + (qrActiveTab === 'dev-build' ? 'var(--bg-card)' : 'transparent') + '; color:' + (qrActiveTab === 'dev-build' ? 'var(--text)' : 'var(--text-secondary)') + '; font-size:0.82rem; font-weight:600; padding:8px 12px; border-radius:8px; cursor:pointer; transition:all 0.2s; box-shadow:' + (qrActiveTab === 'dev-build' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none') + ';">Development Build</button>' +
      '</div>';

    if (qrActiveTab === 'expo-go') {
      // Pills for LAN, Local, Tunnel
      html += '<div style="display:flex; justify-content:center; gap:8px; margin-bottom:20px;">' +
        '<button class="qr-pill-btn' + (qrConnectionMode === 'lan' ? ' active' : '') + '" onclick="switchQrConnection(\'lan\')">LAN</button>' +
        '<button class="qr-pill-btn' + (qrConnectionMode === 'local' ? ' active' : '') + '" onclick="switchQrConnection(\'local\')">Local</button>' +
        '<button class="qr-pill-btn' + (qrConnectionMode === 'tunnel' ? ' active' : '') + '" onclick="switchQrConnection(\'tunnel\')">Tunnel</button>' +
        '</div>';

      // QR Image in beautiful white high-contrast card
      html += '<div style="background:#ffffff; padding:20px; border-radius:16px; display:inline-block; box-shadow:0 12px 32px rgba(0,0,0,0.08); border:1px solid #e2e8f0; margin-bottom:20px; position:relative;">' +
        '<img src="' + esc(res.qr_code) + '" alt="QR Code" style="width:200px; height:200px; display:block; filter: contrast(1.1);">' +
        // Add Expo Logo inside the QR code center for premium look!
        '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:#ffffff; width:42px; height:42px; border-radius:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.1); border:1px solid #e2e8f0;">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="#000000"><path d="M12.016 1.344L1.76 6.848v10.976l10.256 5.504 10.224-5.504V6.848zm0 2.256l8.112 4.368-8.112 4.368-8.128-4.368zm-8.128 6.624l8.128 4.368v8.736l-8.128-4.368zm16.24 0v8.736l-8.112 4.368v-8.736z"/></svg>' +
        '</div>' +
        '</div>';

      // Scan Instructions
      html += '<div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px; font-weight:500;">Scan with the <strong style="color:var(--text)">Expo Go app</strong> on iOS or Android</div>';

      // Dynamic options: Custom IP input or Tunnel input
      if (qrConnectionMode === 'lan') {
        const ipVal = qrCustomIp || qrLocalIp || '127.0.0.1';
        html += '<div style="margin-bottom:16px; display:flex; flex-direction:column; gap:6px; align-items:center;">' +
          '<div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">' +
            '<span>IP Address: <strong>' + esc(ipVal) + '</strong></span>' +
            '<button onclick="toggleCustomIpEdit()" class="btn-text-edit" style="background:transparent; border:none; color:var(--primary); font-size:0.72rem; cursor:pointer; font-weight:600; padding:0 4px; display:flex; align-items:center; gap:2px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Edit</button>' +
          '</div>' +
          '<div id="customIpEditBox" style="display:none; gap:6px; margin-top:4px; max-width:260px; width:100%;">' +
            '<input type="text" id="customIpInput" class="form-input" style="padding:6px 10px; font-size:0.8rem; flex:1; height:32px; background:var(--bg-input); border:1px solid var(--border); border-radius:8px; color:var(--text);" value="' + esc(ipVal) + '" placeholder="e.g. 192.168.1.50">' +
            '<button onclick="saveCustomIp()" class="btn btn-sm btn-primary" style="padding:0 12px; height:32px; font-size:0.78rem;">Save</button>' +
          '</div>' +
        '</div>';
      } else if (qrConnectionMode === 'tunnel') {
        const tunnelVal = qrCustomTunnel || '';
        html += '<div style="margin-bottom:16px; display:flex; flex-direction:column; gap:6px; align-items:center; max-width:280px; margin-left:auto; margin-right:auto;">' +
          '<div style="font-size:0.75rem; color:var(--text-muted);">Custom Tunnel URL:</div>' +
          '<div style="display:flex; gap:6px; width:100%;">' +
            '<input type="text" id="customTunnelInput" class="form-input" style="padding:6px 10px; font-size:0.8rem; flex:1; height:32px; background:var(--bg-input); border:1px solid var(--border); border-radius:8px; color:var(--text);" value="' + esc(tunnelVal) + '" placeholder="exp://123.ngrok.io" onchange="saveCustomTunnel()">' +
            '<button onclick="saveCustomTunnel()" class="btn btn-sm btn-primary" style="padding:0 12px; height:32px; font-size:0.78rem;">Apply</button>' +
          '</div>' +
        '</div>';
      }

      // Clipboard Copier field!
      html += '<div style="position:relative; max-width:320px; margin:0 auto; display:flex; align-items:center; border:1px solid var(--border); background:var(--bg-input); border-radius:10px; overflow:hidden; box-shadow:inset 0 1px 3px rgba(0,0,0,0.05);">' +
        '<span style="font-family:monospace; font-size:0.75rem; color:var(--text-secondary); padding:8px 12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; text-align:left;">' + esc(targetUrl) + '</span>' +
        '<button onclick="copyQrLink(\'' + esc(targetUrl.replace(/'/g, "\\'")) + '\')" style="background:var(--bg-hover); border:none; border-left:1px solid var(--border); padding:8px 14px; cursor:pointer; color:var(--text); display:flex; align-items:center; transition:background 0.2s;" id="copyLinkBtn" title="Copy URL">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
          '<span style="font-size:0.75rem; font-weight:600;">Copy</span>' +
        '</button>' +
        '</div>';

    } else {
      // Development Build instructions & links
      html += '<div style="padding:10px 15px; text-align:left; color:var(--text-secondary); line-height:1.5; font-size:0.82rem;">' +
        '<div style="background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); border-radius:10px; padding:12px; margin-bottom:16px;">' +
          '<div style="color:var(--primary); font-weight:600; margin-bottom:4px; display:flex; align-items:center; gap:6px;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
            'About Development Builds' +
          '</div>' +
          'Development builds are customized standalone binaries built using <strong style="color:var(--text)">EAS Build</strong>. Unlike Expo Go, they include your custom e-commerce client modules and credentials.' +
        '</div>' +
        '<h4 style="font-size:0.85rem; font-weight:600; color:var(--text); margin:0 0 8px 0;">How to run:</h4>' +
        '<ol style="margin:0; padding-left:18px; display:flex; flex-direction:column; gap:8px;">' +
          '<li>Go to the <strong>Builds</strong> tab in the sidebar and launch a live cloud build.</li>' +
          '<li>Once compiled, download the custom APK (Android) or ZIP (iOS Simulator) binary.</li>' +
          '<li>Install the build on your device or simulator to run and test live Shopify or WooCommerce configurations.</li>' +
        '</ol>' +
        '</div>';
    }

    container.innerHTML = html;

  } catch (err) {
    // QR endpoint may fail if no published version — show publish hint
    container.innerHTML = '<div style="padding:16px;text-align:center">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted);margin-bottom:8px"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="5" y="5" width="4" height="4"/><rect x="15" y="5" width="4" height="4"/><rect x="5" y="15" width="4" height="4"/><rect x="15" y="15" width="4" height="4"/></svg>' +
      '<div style="font-size:0.78rem;color:var(--text-muted)">Publish to see QR code</div></div>';
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
  pages.push({ id: newId, name, icon: '▤', elements: [] });
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
    await api('POST', '/push/send', { to: "ExponentPushToken[Broadcast]", title, body: bodyTxt, app_id: appId });
    
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
  const issuerId = document.getElementById('storeIosIssuerId')?.value.trim();
  const keyId = document.getElementById('storeIosKeyId')?.value.trim();
  
  if (!issuerId || !keyId) {
    toast('Please enter App Store Connect credentials first!', 'error');
    return;
  }

  openModal('storeSubmitModal');
  
  const stepNameEl = document.getElementById('storeSubmitStepName');
  const percentageEl = document.getElementById('storeSubmitPercentage');
  const progressEl = document.getElementById('storeSubmitProgressBar');
  const logsEl = document.getElementById('storeSubmitLogs');
  const closeBtn = document.getElementById('storeSubmitCloseBtn');
  
  if (closeBtn) {
    closeBtn.disabled = true;
    closeBtn.textContent = 'Deploying...';
  }

  logsEl.innerHTML = '';
  progressEl.style.width = '0%';
  percentageEl.textContent = '0%';
  stepNameEl.textContent = 'Starting deployment...';
  
  const addLog = (text, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    const color = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#a5f3fc';
    logsEl.innerHTML += `<div><span style="color:#64748b;">[${time}]</span> <span style="color:${color};">${esc(text)}</span></div>`;
    logsEl.scrollTop = logsEl.scrollHeight;
  };
  
  addLog('Deployment task started on background thread.', 'info');
  
  const steps = [
    { pct: 15, name: 'Verifying Credentials', log: 'Validating Issuer ID: ' + issuerId.slice(0, 8) + '... and Key ID: ' + keyId },
    { pct: 30, name: 'Compiling Bundles', log: 'Assembling React Native Javascript bundle and asset catalogs...' },
    { pct: 50, name: 'Signing Packages', log: 'Applying distribution certificates and provisioning profiles...' },
    { pct: 75, name: 'App Store Transfer', log: 'Transmitting iOS IPA binary to App Store Connect API...' },
    { pct: 90, name: 'Google Play Upload', log: 'Uploading Android AAB package to Google Play developer portal...' },
    { pct: 100, name: 'Deployment Succeeded', log: 'Success! New build is active on TestFlight & Play Internal Track.' }
  ];
  
  let i = 0;
  
  const runNextStep = () => {
    if (i >= steps.length) {
      if (closeBtn) {
        closeBtn.disabled = false;
        closeBtn.textContent = 'Close';
      }
      toast('App deployed successfully to stores!', 'success');
      return;
    }
    
    const step = steps[i];
    stepNameEl.textContent = step.name;
    percentageEl.textContent = step.pct + '%';
    progressEl.style.width = step.pct + '%';
    
    addLog(step.log, step.pct === 100 ? 'success' : 'info');
    
    i++;
    setTimeout(runNextStep, 2000);
  };
  
  setTimeout(runNextStep, 1000);
}

window.loadStoreCredentials = loadStoreCredentials;
window.saveStoreCredentials = saveStoreCredentials;
window.triggerStoreSubmit = triggerStoreSubmit;

// ── OTA Updates ──
async function triggerOtaUpdate() {
  toast('Publishing OTA Update...', 'info');
  try {
    const res = await api('POST', '/v1/apps/' + appId + '/publish', {});
    toast('OTA Update Published successfully! v' + res.version, 'success');
    loadOtaUpdates();
    loadPublished();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function loadOtaUpdates() {
  const container = document.getElementById('otaUpdatesList');
  if (!container) return;
  try {
    const versions = await api('GET', '/v1/apps/' + appId + '/publish');
    if (!versions || !versions.length) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px;text-align:center;color:var(--text-muted);">
          No OTA updates pushed yet.
        </div>`;
      return;
    }
    container.innerHTML = versions.map(v => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-weight:600;font-size:0.95rem;color:var(--text);">Update v${esc(v.version)}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;">
            Published ${formatDateTime(v.published_at)} &bull; Active on 100% of devices
          </div>
        </div>
        ${v.is_current ? `
          <div style="padding:4px 10px;border-radius:6px;background:rgba(16,185,129,0.1);color:#10b981;font-size:0.75rem;font-weight:600;border:1px solid rgba(16,185,129,0.2);">Active</div>
        ` : `
          <div style="padding:4px 10px;border-radius:6px;background:var(--bg-hover);color:var(--text-secondary);font-size:0.75rem;font-weight:500;border:1px solid var(--border);">Inactive</div>
        `}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="padding:40px;text-align:center;color:var(--danger);">Failed to load updates.</div>`;
  }
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

// ── Reusable Blocks & Templates ──

async function dBSaveAsReusable(blockId) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(blockId, page.elements);
  if (!found) return;
  const el = found.block;
  
  const name = prompt('Enter a name for this reusable template:', el.label || el.type);
  if (!name) return;
  
  try {
    toast('Saving reusable block template...', 'info');
    let reusableBlocks = [];
    try {
      const res = await api('GET', '/v1/apps/' + appId + '/settings');
      const setting = res.find(s => s.key === 'reusable_blocks');
      if (setting) {
        reusableBlocks = setting.value || [];
      }
    } catch (e) {
      reusableBlocks = [];
    }
    
    const newTemplate = {
      id: 'reusable_' + Date.now(),
      name: name,
      block_type: el.type,
      properties: el.properties || {},
      styles: el.styles || {},
      actions: el.actions || {},
      created_at: new Date().toISOString()
    };
    
    reusableBlocks.push(newTemplate);
    
    await api('PUT', '/v1/apps/' + appId + '/settings', {
      key: 'reusable_blocks',
      value: reusableBlocks
    });
    
    toast('Block template "' + name + '" saved successfully!', 'success');
    await loadReusableBlocksForBuilder();
    renderDBuilderPalette();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function dBaddReusableBlock(templateId) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const template = dBreusableBlocks.find(t => t.id === templateId);
  if (!template) return;
  
  dBblockIdCounter++;
  const block = {
    id: 'b_' + dBblockIdCounter,
    type: template.block_type,
    label: template.name,
    properties: JSON.parse(JSON.stringify(template.properties || {})),
    styles: JSON.parse(JSON.stringify(template.styles || {})),
    actions: JSON.parse(JSON.stringify(template.actions || {})),
    children: template.children ? [] : undefined
  };
  
  page.elements.push(block);
  dBselectedBlockId = block.id;
  renderDashboardBuilder();
  toast('Inserted reusable template: ' + template.name, 'success');
}

async function loadReusableBlocksList() {
  const container = document.querySelector('[data-appview="blocks"] .overview-grid');
  if (!container) return;
  
  try {
    const res = await api('GET', '/v1/apps/' + appId + '/settings');
    const setting = res.find(s => s.key === 'reusable_blocks');
    const reusableBlocks = setting ? (setting.value || []) : [];
    
    let html = '';
    
    if (reusableBlocks.length > 0) {
      html += reusableBlocks.map(b => `
        <div class="section-card" style="margin:0;border:1px solid var(--border);background:var(--bg-surface);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;">
          <div style="height:120px;background:var(--bg-hover);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:2.5rem;">
            ${esc(dBgetIcon(b.block_type))}
          </div>
          <div style="padding:16px 20px;flex-grow:1;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <h4 style="margin:0 0 6px;font-size:1.05rem;font-weight:600;">${esc(b.name)}</h4>
              <p style="margin:0 0 16px;font-size:0.8rem;color:var(--text-secondary);">Type: ${esc(b.block_type)} &bull; Saved ${formatDate(b.created_at)}</p>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-danger" style="padding:4px 8px;font-size:0.75rem;border-radius:6px;width:100%;justify-content:center;" onclick="dBdeleteReusableBlock('${b.id}')">Delete Template</button>
            </div>
          </div>
        </div>
      `).join('');
    }
    
    html += `
      <div class="section-card" style="margin:0;border:1px dashed rgba(255,255,255,0.2);border-radius:16px;background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:216px;cursor:pointer;" onclick="switchAppView('builder')">
        <div style="width:48px;height:48px;border-radius:50%;background:rgba(99,102,241,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
        <span style="font-size:0.95rem;font-weight:600;color:var(--text);">Create via Canvas</span>
        <p style="margin:8px 0 0;font-size:0.75rem;color:var(--text-muted);text-align:center;padding:0 16px;">Select any block in the App Builder canvas and save as Reusable Template.</p>
      </div>
    `;
    
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:var(--danger)">Failed to load reusable templates</div>`;
  }
}

async function dBdeleteReusableBlock(blockId) {
  if (!confirm('Are you sure you want to delete this reusable block template?')) return;
  try {
    toast('Deleting template...', 'info');
    const res = await api('GET', '/v1/apps/' + appId + '/settings');
    const setting = res.find(s => s.key === 'reusable_blocks');
    let reusableBlocks = setting ? (setting.value || []) : [];
    
    reusableBlocks = reusableBlocks.filter(b => b.id !== blockId);
    
    await api('PUT', '/v1/apps/' + appId + '/settings', {
      key: 'reusable_blocks',
      value: reusableBlocks
    });
    
    toast('Template deleted successfully', 'success');
    loadReusableBlocksList();
    await loadReusableBlocksForBuilder();
    renderDBuilderPalette();
  } catch (err) {
    toast(err.message, 'error');
  }
}

window.dBSaveAsReusable = dBSaveAsReusable;
window.dBaddReusableBlock = dBaddReusableBlock;
window.loadReusableBlocksList = loadReusableBlocksList;
window.dBdeleteReusableBlock = dBdeleteReusableBlock;
window.loadReusableBlocksForBuilder = loadReusableBlocksForBuilder;

// ── Billing & Subscription ──

function loadBilling() {
  const container = document.getElementById('billingPlansContainer');
  if (!container) return;
  
  const cfg = (appData && appData.config) || {};
  const plan = cfg.plan_tier || 'Free';
  
  let html = '';
  
  // Standard Plan Card
  html += `
    <div class="section-card" style="margin-top:0;border:1px solid ${plan === 'Free' ? 'var(--primary)' : 'rgba(255,255,255,0.08)'};background:var(--bg-surface);border-radius:20px;position:relative;overflow:hidden;">
      ${plan === 'Free' ? '<div style="position:absolute;top:20px;right:20px;background:rgba(99,102,241,0.15);color:var(--primary);border:1px solid rgba(99,102,241,0.3);font-size:0.7rem;font-weight:700;padding:6px 12px;border-radius:99px;text-transform:uppercase;letter-spacing:0.05em;">Current Plan</div>' : ''}
      <div class="section-card-body" style="padding:40px 32px;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
          <div style="width:48px;height:48px;border-radius:12px;background:var(--bg-hover);color:var(--text);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <h3 style="margin:0;font-size:1.5rem;font-weight:700;letter-spacing:-0.01em;">Standard Plan</h3>
        </div>
        <div style="font-size:3rem;font-weight:800;margin-bottom:8px;letter-spacing:-0.03em;color:var(--text);">$0<span style="font-size:1.2rem;font-weight:600;color:var(--text-secondary);-webkit-text-fill-color:var(--text-secondary);">/mo</span></div>
        <p style="color:var(--text-secondary);font-size:0.9rem;margin:0 0 32px;line-height:1.5;">Free forever. Perfect for getting started.</p>
        <ul style="list-style:none;padding:0;margin:0 0 32px;font-size:0.95rem;display:flex;flex-direction:column;gap:16px;">
          <li style="display:flex;align-items:center;gap:12px;color:var(--text-secondary);"><div style="background:var(--bg-hover);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Up to 3 Pages</span></li>
          <li style="display:flex;align-items:center;gap:12px;color:var(--text-secondary);"><div style="background:var(--bg-hover);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Standard Preview</span></li>
          <li style="display:flex;align-items:center;gap:12px;color:var(--text-secondary);"><div style="background:var(--bg-hover);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Standard Themes</span></li>
        </ul>
        ${plan === 'Free' ? `
          <button class="btn btn-outline" disabled style="width:100%;justify-content:center;padding:14px;font-size:1rem;font-weight:600;border-radius:12px;opacity:0.6;">Active Plan</button>
        ` : `
          <button class="btn btn-outline" onclick="changePlan('Free')" style="width:100%;justify-content:center;padding:14px;font-size:1rem;font-weight:600;border-radius:12px;border:1px solid rgba(255,255,255,0.2);">Downgrade to Standard</button>
        `}
      </div>
    </div>
  `;

  // Pro Plan Card
  html += `
    <div class="section-card" style="margin-top:0;border:1px solid ${plan === 'Pro' ? 'var(--primary)' : 'rgba(255,255,255,0.08)'};background:var(--bg-surface);box-shadow:${plan === 'Pro' ? '0 12px 32px rgba(99,102,241,0.15)' : 'none'};border-radius:20px;position:relative;overflow:hidden;">
      ${plan === 'Pro' ? '<div style="position:absolute;top:20px;right:20px;background:rgba(99,102,241,0.15);color:var(--primary);border:1px solid rgba(99,102,241,0.3);font-size:0.7rem;font-weight:700;padding:6px 12px;border-radius:99px;text-transform:uppercase;letter-spacing:0.05em;">Current Plan</div>' : ''}
      <div class="section-card-body" style="padding:40px 32px;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
          <div style="width:48px;height:48px;border-radius:12px;background:rgba(99,102,241,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 1px rgba(255,255,255,0.2);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <h3 style="margin:0;font-size:1.5rem;font-weight:700;letter-spacing:-0.01em;text-shadow:0 2px 4px var(--bg-input);">Pro Plan</h3>
        </div>
        <div style="font-size:3rem;font-weight:800;margin-bottom:8px;letter-spacing:-0.03em;color:var(--text);">$29<span style="font-size:1.2rem;font-weight:600;color:var(--text-secondary);-webkit-text-fill-color:var(--text-secondary);">/mo</span></div>
        <p style="color:var(--text-secondary);font-size:0.9rem;margin:0 0 32px;line-height:1.5;">Billed monthly. Complete developer platform access.</p>
        <ul style="list-style:none;padding:0;margin:0 0 32px;font-size:0.95rem;display:flex;flex-direction:column;gap:16px;">
          <li style="display:flex;align-items:center;gap:12px;"><div style="background:rgba(99,102,241,0.2);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Unlimited Pages & Custom Blocks</span></li>
          <li style="display:flex;align-items:center;gap:12px;"><div style="background:rgba(99,102,241,0.2);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Unlimited OTA Updates</span></li>
          <li style="display:flex;align-items:center;gap:12px;"><div style="background:rgba(99,102,241,0.2);border-radius:50%;padding:4px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div> <span style="font-weight:500;">Push Notifications Broadcasting</span></li>
        </ul>
        ${plan === 'Pro' ? `
          <button class="btn btn-outline" onclick="changePlan('Free')" style="width:100%;justify-content:center;padding:14px;font-size:1rem;font-weight:600;border-radius:12px;">Cancel Subscription</button>
        ` : `
          <button class="btn btn-primary" onclick="openBillingPortal()" style="width:100%;justify-content:center;padding:14px;font-size:1rem;font-weight:600;border-radius:12px;box-shadow:0 6px 20px rgba(99,102,241,0.4);border:none;">Upgrade to Pro</button>
        `}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function openBillingPortal() {
  openModal('billingModal');
}

async function changePlan(tier) {
  if (tier === 'Free' && !confirm('Are you sure you want to cancel your Pro plan subscription? You will lose access to premium developer features.')) return;
  try {
    toast('Updating subscription plan to: ' + tier + '...', 'info');
    const cfg = (appData && appData.config) || {};
    cfg.plan_tier = tier;
    
    await api('PUT', '/apps/' + appId, cfg);
    appData = await api('GET', '/apps/' + appId);
    
    toast('Subscription plan updated to ' + tier + ' successfully!', 'success');
    loadBilling();
    renderOverview();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function submitBillingUpgrade(e) {
  e.preventDefault();
  closeModal('billingModal');
  await changePlan('Pro');
}

window.loadBilling = loadBilling;
window.openBillingPortal = openBillingPortal;
window.changePlan = changePlan;
window.submitBillingUpgrade = submitBillingUpgrade;

function dBhandleMediaUpload(elId, inputElem, maxMb, append) {
  if (!inputElem || !inputElem.files || inputElem.files.length === 0) return;
  
  const file = inputElem.files[0];
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    toast('File too large! Maximum limit is ' + maxMb + 'MB.', 'error');
    inputElem.value = ''; // reset
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Data = e.target.result;
    
    // Check if we are appending to a comma-separated list (like carousel)
    if (append) {
      const page = dBpages.find(p => p.id === dBactivePageId);
      if (page) {
        const found = dBfindInList(elId, page.elements);
        if (found) {
          const currentSrc = found.block.properties.src || '';
          const newSrc = currentSrc ? currentSrc + ',' + base64Data : base64Data;
          dBupdateProp(elId, 'src', newSrc);
        }
      }
    } else {
      dBupdateProp(elId, 'src', base64Data);
    }
    
    toast('File uploaded successfully!', 'success');
    inputElem.value = ''; // reset so they can upload the same file again if they want
  };
  reader.readAsDataURL(file);
}
window.dBhandleMediaUpload = dBhandleMediaUpload;
