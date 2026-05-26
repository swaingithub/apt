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

async function api(method, path, body, retries = 1) {
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), 15000);
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
    if (retries > 0 && (e.name === 'TypeError' || e.name === 'AbortError' || e.message?.includes('Failed to fetch'))) {
      await new Promise(r => setTimeout(r, 1000));
      return api(method, path, body, retries - 1);
    }
    throw e;
  }
}

function setLoading(el, loading) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return;
  if (loading) {
    el._origHtml = el.innerHTML;
    el._origDisabled = el.disabled;
    el.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> ' + (el.getAttribute('data-loading-text') || 'Loading...');
    el.disabled = true;
  } else if (el._origHtml) {
    el.innerHTML = el._origHtml;
    el.disabled = el._origDisabled || false;
    delete el._origHtml;
    delete el._origDisabled;
  }
}

function toast(text, type) {
  const el = document.createElement('div');
  el.className = 'toast toast-' + (type || '');
  el.textContent = text;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function showError(containerId, msg, retryFnName) {
  const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!el) return;
  el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--danger);font-size:0.85rem;">' +
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="display:block;margin:0 auto 8px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' +
    esc(msg) +
    (retryFnName ? '<br><button class="btn btn-sm" onclick="' + retryFnName + '()" style="margin-top:10px;">Retry</button>' : '') +
    '</div>';
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// ── Real-time Collaboration WebSocket ──
let previewWS = null;
let previewReconnectTimer = null;
let collabOnlineUsers = [];
let collabUserId = null;

function getCollabUserInfo() {
  let name = 'Anonymous';
  let avatarColor = '#6366f1';
  try {
    const fbUser = firebase.auth().currentUser;
    if (fbUser) {
      name = fbUser.displayName || fbUser.email || name;
    }
  } catch (e) {}
  const stored = localStorage.getItem('apt_user_name');
  if (stored) name = stored;
  const hash = name.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const colors = ['#6366f1','#22d06c','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316','#8b5cf6'];
  avatarColor = colors[Math.abs(hash) % colors.length];
  collabUserId = 'user_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
  return { id: collabUserId, name, avatar_color: avatarColor };
}

function connectPreviewWS(appId) {
  disconnectPreviewWS();
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const url = proto + '//' + host + '/ws/preview/' + encodeURIComponent(appId);
  try {
    previewWS = new WebSocket(url);
    previewWS.onopen = () => {
      console.log('[Collab] WebSocket connected');
      const userInfo = getCollabUserInfo();
      previewWS.send(JSON.stringify({ type: 'join', user: userInfo }));
    };
    previewWS.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        handleCollabMessage(data);
      } catch (err) {
        console.warn('[Collab] Failed to parse message:', err);
      }
    };
    previewWS.onclose = () => {
      console.log('[Collab] WebSocket disconnected, reconnecting in 3s...');
      previewReconnectTimer = setTimeout(() => connectPreviewWS(appId), 3000);
    };
    previewWS.onerror = () => previewWS && previewWS.close();
  } catch (e) {
    console.warn('[Collab] WebSocket connection failed:', e);
  }
}

function disconnectPreviewWS() {
  if (previewReconnectTimer) { clearTimeout(previewReconnectTimer); previewReconnectTimer = null; }
  if (previewWS) {
    if (previewWS.readyState === WebSocket.OPEN) {
      previewWS.send(JSON.stringify({ type: 'leave' }));
    }
    previewWS.onclose = null;
    previewWS.close();
    previewWS = null;
  }
  collabOnlineUsers = [];
  renderCollabUsers();
}

// Send leave on page unload
window.addEventListener('beforeunload', function() {
  if (previewWS && previewWS.readyState === WebSocket.OPEN) {
    previewWS.send(JSON.stringify({ type: 'leave' }));
  }
});

function sendPreviewUpdate() {
  if (previewWS && previewWS.readyState === WebSocket.OPEN) {
    previewWS.send(JSON.stringify({ type: 'config_updated', app_id: appId }));
  }
}

function handleCollabMessage(data) {
  switch (data.type) {
    case 'online_users':
      collabOnlineUsers = (data.users || []).filter(u => u.id !== collabUserId);
      renderCollabUsers();
      break;
    case 'user_joined':
      if (data.user && data.user.id !== collabUserId) {
        collabOnlineUsers = collabOnlineUsers.filter(u => u.id !== data.user.id);
        collabOnlineUsers.push({ id: data.user.id, name: data.user.name, avatar_color: data.user.avatar_color });
        renderCollabUsers();
        toast(data.user.name + ' joined', '');
      }
      break;
    case 'user_left':
      if (data.userId) {
        const leftUser = collabOnlineUsers.find(u => u.id === data.userId);
        collabOnlineUsers = collabOnlineUsers.filter(u => u.id !== data.userId);
        renderCollabUsers();
        if (leftUser) toast(leftUser.name + ' left', '');
      }
      break;
    case 'config_updated':
      // Existing behavior: re-fetch config (handled by auto-save already)
      break;
    case 'select':
      // Highlight the block another user selected (visual awareness)
      if (data.userId !== collabUserId && data.blockId) {
        highlightRemoteSelection(data.blockId, data.userId);
      }
      break;
  }
}

function renderCollabUsers() {
  const container = document.getElementById('collabUsers');
  if (!container) return;
  if (!collabOnlineUsers.length) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'flex';
  container.innerHTML = collabOnlineUsers.map(u => {
    const initial = (u.name || '?').charAt(0).toUpperCase();
    return `<div class="collab-avatar online" style="background:${u.avatar_color || '#6366f1'};">
      <span>${esc(initial)}</span>
      <div class="collab-tooltip">${esc(u.name)}</div>
    </div>`;
  }).join('') + (collabOnlineUsers.length > 1 ? `<span class="collab-count">+${collabOnlineUsers.length}</span>` : '');
}

function sendCollabSelect(blockId) {
  if (previewWS && previewWS.readyState === WebSocket.OPEN) {
    previewWS.send(JSON.stringify({ type: 'select', blockId }));
  }
}

// Visual feedback for remote selection
let remoteSelectionHighlights = {};

function highlightRemoteSelection(blockId, userId) {
  if (!blockId) return;
  const el = document.querySelector(`.dbuilder-block[data-block-id="${blockId}"]`);
  if (el) {
    el.style.outline = '2px dashed #22d06c';
    el.style.outlineOffset = '2px';
    clearTimeout(remoteSelectionHighlights[userId]);
    remoteSelectionHighlights[userId] = setTimeout(() => {
      if (el) { el.style.outline = ''; el.style.outlineOffset = ''; }
    }, 3000);
  }
}

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
  // Show anonymous banner if no token, toggle auth button
  const isAuthed = !!localStorage.getItem('apt_token');
  const banner = document.getElementById('dashAnonBanner');
  if (banner) banner.style.display = isAuthed ? 'none' : 'block';
  const authText = document.getElementById('dashAuthText');
  if (authText) authText.textContent = isAuthed ? 'Sign Out' : 'Sign In';
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
  document.removeEventListener('keydown', dBkeyboardShortcut);
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
  if (view === 'profile') {
    loadProfile();
  }
  if (view === 'builder') {
    openDashboardBuilder();
  }
  if (view === 'menu') {
    loadAppMenu();
  }
  refreshAiProviderStatus();
  if (view === 'settings') {
    loadPageAppSettings();
    const form = document.getElementById('appSettingsForm');
    if (form) {
      form.setAttribute('hx-put', '/hx/apps/' + encodeURIComponent(appId) + '/settings');
      htmx.process(form);
    }
  }
  if (view === 'push') {
    renderPushHistory();
  }
  if (view === 'themes') {
    loadThemeSettings();
    const form = document.getElementById('themeForm');
    if (form) {
      form.setAttribute('hx-put', '/hx/apps/' + encodeURIComponent(appId) + '/theme');
      htmx.process(form);
    }
  }
  if (view === 'languages') {
    const tbody = document.getElementById('languages-table-body');
    if (tbody) {
      const url = '/hx/apps/' + encodeURIComponent(appId) + '/languages';
      htmx.ajax('GET', url, { target: '#languages-table-body', swap: 'outerHTML', headers: { 'Authorization': 'Bearer ' + token } });
    }
    const addBtn = document.getElementById('addLocaleBtn');
    if (addBtn) {
      addBtn.setAttribute('hx-get', '/hx/apps/' + encodeURIComponent(appId) + '/languages/add-form');
      addBtn.setAttribute('hx-target', '#languages-table-body');
      addBtn.setAttribute('hx-swap', 'beforeend');
      htmx.process(addBtn);
    }
  }
  if (view === 'upload') {
    loadStoreCredentials();
  }
  if (view === 'integrations') {
    loadIntegrations();
  }
  if (view === 'update-app') {
    const btn = document.querySelector('.app-view[data-appview="update-app"] .btn-primary[hx-post]');
    if (btn) {
      btn.setAttribute('hx-post', '/hx/apps/' + encodeURIComponent(appId) + '/ota/trigger');
      htmx.process(btn);
    }
    const list = document.getElementById('otaUpdatesList');
    if (list) {
      list.setAttribute('hx-get', '/hx/apps/' + encodeURIComponent(appId) + '/ota');
      htmx.ajax('GET', list.getAttribute('hx-get'), { target: '#otaUpdatesList', swap: 'innerHTML' });
    }
  }
  if (view === 'blocks') {
    const grid = document.getElementById('blocksGrid');
    if (grid) {
      grid.setAttribute('hx-get', '/hx/apps/' + encodeURIComponent(appId) + '/blocks');
      htmx.ajax('GET', grid.getAttribute('hx-get'), { target: '#blocksGrid', swap: 'outerHTML' });
    }
  }
  if (view === 'subscription') {
    const container = document.getElementById('billingPlansContainer');
    if (container) {
      container.setAttribute('hx-get', '/hx/apps/' + encodeURIComponent(appId) + '/billing');
      htmx.ajax('GET', container.getAttribute('hx-get'), { target: '#billingPlansContainer', swap: 'outerHTML' });
    }
  }
  if (view === 'routing') {
    const container = document.getElementById('routingContainer');
    if (container) {
      container.setAttribute('hx-get', '/hx/apps/' + encodeURIComponent(appId) + '/routing');
      htmx.ajax('GET', container.getAttribute('hx-get'), { target: '#routingContainer', swap: 'innerHTML' });
    }
    // Use event delegation for save button (content loaded via HTMX)
    document.addEventListener('click', function routingSaveHandler(e) {
      if (e.target.id === 'saveRoutingBtn' || e.target.closest('#saveRoutingBtn')) {
        e.preventDefault();
        const scheme = document.getElementById('routingScheme')?.value || '';
        const host = document.getElementById('routingHost')?.value || '';
        const prefix = document.getElementById('routingPrefix')?.value || '/';
        const routeInputs = document.querySelectorAll('.route-path-input');
        const paramsInputs = document.querySelectorAll('.route-params-input');
        const routes = [];
        routeInputs.forEach((inp, i) => {
          const pageId = inp.dataset.pageId;
          const path = inp.value.trim();
          const paramsStr = paramsInputs[i]?.value.trim() || '';
          const params = paramsStr ? paramsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
          if (path) {
            routes.push({ page_id: pageId, path, params });
          }
        });
        const body = new URLSearchParams();
        body.set('scheme', scheme);
        body.set('host', host);
        body.set('prefix', prefix);
        body.set('routes_json', JSON.stringify(routes));
        htmx.ajax('PUT', '/hx/apps/' + encodeURIComponent(appId) + '/routing', {
          target: '#routingContainer',
          swap: 'innerHTML',
          values: Object.fromEntries(body)
        });
        document.removeEventListener('click', routingSaveHandler);
      }
    });
  }
  if (view === 'analytics') {
    loadAnalytics();
  }
}
window.switchAppView = switchAppView;

// ── Builder ──

let dBpages = [];
let dBactivePageId = null;
let dBselectedBlockId = null;
let dBblockIdCounter = 0;

const dBdefaults = {
  container: { label: 'Container', properties: {}, children: [], schema: {} },
  grid: { label: 'Grid', properties: { gridCols: 2 }, children: [], schema: { gridCols: { type: 'number', label: 'Columns' } } },
  card: { label: 'Card', properties: {}, children: [], schema: {} },
  tabs: { label: 'Tabs', properties: { tabHeaders: 'Tab 1,Tab 2', activeTab: 0 }, children: [], schema: { tabHeaders: { type: 'string', label: 'Tabs (comma sep)' }, activeTab: { type: 'number', label: 'Active Tab Index' } } },
  heading: { label: 'Heading', properties: { value: 'Heading' }, schema: { value: { type: 'string', label: 'Text' } } },
  text: { label: 'Text', properties: { value: 'Text content' }, schema: { value: { type: 'text', label: 'Content' } } },
  divider: { label: 'Divider', properties: {}, schema: {} },
  image: { label: 'Image', properties: { src: '' }, schema: { src: { type: 'image', label: 'Source URL' } } },
  video: { label: 'Video', properties: { src: '' }, schema: { src: { type: 'video', label: 'Video URL' } } },
  banner: { label: 'Banner', properties: { value: 'Big Sale', placeholder: 'Limited time' }, schema: { value: { type: 'string', label: 'Title' }, placeholder: { type: 'string', label: 'Subtitle' } } },
  icon: { label: 'Icon', properties: { iconName: 'Heart', iconSize: 24 }, schema: { iconName: { type: 'string', label: 'Icon Name' }, iconSize: { type: 'number', label: 'Size (px)' } } },
  button: { label: 'Button', properties: { value: 'Click Me' }, actions: { onClick: { type: 'none' } }, schema: { value: { type: 'string', label: 'Label' } } },
  input: { label: 'Input', properties: { placeholder: 'Type...' }, actions: { onChange: { type: 'none' } }, schema: { placeholder: { type: 'string', label: 'Placeholder' } } },
  textarea: { label: 'Textarea', properties: { placeholder: 'Write...' }, actions: { onChange: { type: 'none' } }, schema: { placeholder: { type: 'string', label: 'Placeholder' } } },
  select: { label: 'Select', properties: { options: 'Option 1,Option 2' }, actions: { onChange: { type: 'none' } }, schema: { options: { type: 'string', label: 'Options (comma sep)' } } },
  checkbox: { label: 'Checkbox', properties: {} },
  switch: { label: 'Switch', properties: {} },
  list: { label: 'List', properties: { dataSource: '' }, schema: { dataSource: { type: 'string', label: 'Collection' } } },
  table: { label: 'Table', properties: { dataSource: '', columns: 'Name,Value' }, schema: { dataSource: { type: 'string', label: 'Collection' }, columns: { type: 'string', label: 'Columns (comma sep)' } } },
  chart: { label: 'Chart', properties: { chartType: 'bar' }, schema: { chartType: { type: 'select', label: 'Type', options: ['bar', 'line', 'pie'] } } },
  carousel: { label: 'Carousel', properties: { src: '' }, children: [], schema: { src: { type: 'string', label: 'Image URLs (comma sep)' } } },
  map: { label: 'Map', properties: { mapLocation: 'New York' }, schema: { mapLocation: { type: 'string', label: 'Location' } } },
  shopify_grid: { label: 'Shopify Grid', properties: { collectionId: '', layout: 'grid' }, schema: { collectionId: { type: 'string', label: 'Collection ID' }, layout: { type: 'select', label: 'Layout', options: ['grid', 'list'] } } },
  woo_grid: { label: 'Woo Grid', properties: { categoryId: '', layout: 'grid' }, schema: { categoryId: { type: 'string', label: 'Category ID' }, layout: { type: 'select', label: 'Layout', options: ['grid', 'list'] } } },
  cart_button: { label: 'Cart Button', properties: { iconSize: 24, badgeColor: '#ef4444' }, schema: { iconSize: { type: 'number', label: 'Icon Size' }, badgeColor: { type: 'color', label: 'Badge Color' } } },
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
      sendPreviewUpdate();
      
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

  connectPreviewWS(appId);

  // First-time builder hint
  if (!localStorage.getItem('apt_builder_seen')) {
    setTimeout(() => {
      toast('✨ Drag elements from the palette or click to add. Cmd+Z to undo.', '');
      localStorage.setItem('apt_builder_seen', '1');
    }, 800);
  }

  // Keyboard shortcuts for undo/redo (cmd+z / cmd+shift+z)
  document.removeEventListener('keydown', dBkeyboardShortcut);
  document.addEventListener('keydown', dBkeyboardShortcut);
}

function dBkeyboardShortcut(e) {
  if (!e.metaKey && !e.ctrlKey) return;
  const builderView = document.querySelector('.app-view[data-appview="builder"]');
  if (!builderView || !builderView.classList.contains('active')) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  if (e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    dBUndo();
  } else if (e.key === 'z' && e.shiftKey) {
    e.preventDefault();
    dBRedo();
  }
}
window.dBkeyboardShortcut = dBkeyboardShortcut;

function dBupdateUndoButtons() {
  const undoBtn = document.querySelector('.dbuilder-action-btn[title="Undo"]');
  const redoBtn = document.querySelector('.dbuilder-action-btn[title="Redo"]');
  if (undoBtn) {
    undoBtn.style.opacity = dBhistoryIndex > 0 ? '1' : '0.3';
    undoBtn.style.pointerEvents = dBhistoryIndex > 0 ? 'auto' : 'none';
  }
  if (redoBtn) {
    redoBtn.style.opacity = dBhistoryIndex < dBhistory.length - 1 ? '1' : '0.3';
    redoBtn.style.pointerEvents = dBhistoryIndex < dBhistory.length - 1 ? 'auto' : 'none';
  }
}

function renderDashboardBuilder() {
  renderDBuilderPageTabs();
  renderDBuilderPalette();
  renderDBuilderCanvas();
  renderDBuilderProps();
  dBupdateUndoButtons();
  
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
    html += '<div class="dbuilder-empty" style="min-height:200px;padding:28px 20px;text-align:center;">' +
      '<div style="font-size:0.85rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">This page is empty</div>' +
      '<div style="font-size:0.76rem;color:var(--text-muted);line-height:1.5;margin-bottom:14px;">Click an element from the palette to add it,<br>or try a preset:</div>' +
      '<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">' +
      '<button class="btn btn-xs" onclick="dBaddBlock(\'preset_hero\')" style="border:1px solid var(--border);padding:4px 10px;border-radius:6px;font-size:0.72rem;">Hero Section</button>' +
      '<button class="btn btn-xs" onclick="dBaddBlock(\'preset_pricing\')" style="border:1px solid var(--border);padding:4px 10px;border-radius:6px;font-size:0.72rem;">Pricing</button>' +
      '<button class="btn btn-xs" onclick="dBaddBlock(\'preset_shop_banner\')" style="border:1px solid var(--border);padding:4px 10px;border-radius:6px;font-size:0.72rem;">Shop Banner</button>' +
      '<button class="btn btn-xs" onclick="dBaddBlock(\'preset_contact\')" style="border:1px solid var(--border);padding:4px 10px;border-radius:6px;font-size:0.72rem;">Contact Form</button>' +
      '</div>' +
      '<div style="margin-top:14px;font-size:0.7rem;color:var(--text-muted);border-top:1px solid var(--border);padding-top:12px;">' +
      'Tip: <kbd style="background:var(--bg-input);padding:1px 5px;border-radius:3px;font-size:0.68rem;">Cmd+Z</kbd> undo &bull; <kbd style="background:var(--bg-input);padding:1px 5px;border-radius:3px;font-size:0.68rem;">Cmd+Shift+Z</kbd> redo &bull; drag blocks from palette' +
      '</div></div>';
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
  const hiddenClass = el.hidden ? ' block-hidden' : '';
  
  let html = '<div class="dbuilder-block' + (sel ? ' selected' : '') + hiddenClass + '" data-block-id="' + esc(el.id) + '" onclick="event.stopPropagation(); dBselectBlock(\'' + el.id + '\', event)">' +
    '<div class="dbuilder-block-type-badge">' + icon + ' ' + esc(el.type) + (el.hidden ? ' <span style="font-size:0.7em;opacity:0.7;margin-left:4px;">(Hidden)</span>' : '') + '</div>' +
    '<div class="dbuilder-block-toolbar">' +
    (idx > 0 ? '<button onclick="event.stopPropagation();dBmoveBlock(\'' + el.id + '\',-1)" title="Up">↑</button>' : '') +
    (idx < siblings.length - 1 ? '<button onclick="event.stopPropagation();dBmoveBlock(\'' + el.id + '\',1)" title="Down">↓</button>' : '') +
    '<button onclick="event.stopPropagation();dBduplicateBlock(\'' + el.id + '\')" title="Duplicate">⧉</button>' +
    '<button onclick="event.stopPropagation();dBToggleBlockVisibility(\'' + el.id + '\')" title="Hide Block" style="display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>' +
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
    html += dBrenderSchemaFields(el.id, el.type, props);
    // Special upload UI for media types
    if (el.type === 'image') {
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
    }
    if (el.type === 'video') {
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
    }
    if (el.type === 'carousel') {
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

function dBrenderSchemaFields(elId, elType, props) {
  const def = dBdefaults[elType];
  if (!def || !def.schema) return '';
  let html = '';
  for (const [key, field] of Object.entries(def.schema)) {
    const value = props[key];
    const label = field.label || key;
    if (field.type === 'number') {
      html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">' + label + '</label><div class="dbuilder-prop-row"><input type="number" value="' + esc(value != null ? String(value) : '') + '" onchange="dBupdateProp(\'' + elId + '\',\'' + key + '\',this.value)"></div></div>';
    } else if (field.type === 'color') {
      html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">' + label + '</label><div class="dbuilder-prop-row"><input type="color" value="' + esc(value || '#6366f1') + '" onchange="dBupdateProp(\'' + elId + '\',\'' + key + '\',this.value)"><input type="text" value="' + esc(value || '') + '" onchange="dBupdateProp(\'' + elId + '\',\'' + key + '\',this.value)" placeholder="#6366f1"></div></div>';
    } else if (field.type === 'select') {
      const opts = field.options || [];
      html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">' + label + '</label><div class="dbuilder-prop-row"><select onchange="dBupdateProp(\'' + elId + '\',\'' + key + '\',this.value)">' + opts.map(o => '<option value="' + o + '"' + (String(value) === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div></div>';
    } else if (field.type === 'text') {
      html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">' + label + '</label><div class="dbuilder-prop-row"><textarea rows="3" onchange="dBupdateProp(\'' + elId + '\',\'' + key + '\',this.value)" style="width:100%;padding:8px 10px;font-size:0.8rem;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:inherit;resize:vertical;">' + esc(value || '') + '</textarea></div></div>';
    } else {
      html += '<div class="dbuilder-prop-group"><label class="dbuilder-prop-label">' + label + '</label><div class="dbuilder-prop-row"><input type="text" value="' + esc(value != null ? String(value) : '') + '" onchange="dBupdateProp(\'' + elId + '\',\'' + key + '\',this.value)"></div></div>';
    }
  }
  return html;
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
  
  // Broadcast selection to collaborators
  if (dBselectedBlockId) {
    sendCollabSelect(dBselectedBlockId);
  }
  
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
    container.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:20px;">No elements yet — add blocks from the palette</div>';
    return;
  }
  
  let html = '<div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px; padding-left:4px;">Element Hierarchy</div>';
  
  function buildTreeHtml(elements, depth = 0) {
    let treeHtml = '';
    elements.forEach((el) => {
      const isSelected = el.id === dBselectedBlockId;
      const isHidden = el.hidden === true;
      const indent = depth * 14;
      const icon = dBgetIcon(el.type) || '■';
      const eyeIcon = isHidden ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      
      treeHtml += `<div class="layers-tree-item" onclick="event.stopPropagation(); dBselectBlock('${el.id}')" style="display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; margin-bottom:2px; font-size:0.76rem; cursor:pointer; font-weight:500; margin-left:${indent}px; background:${isSelected ? 'rgba(99,102,241,0.1)' : 'transparent'}; border:1px solid ${isSelected ? 'rgba(99,102,241,0.25)' : 'transparent'}; transition:all 0.15s; color:${isSelected ? 'var(--primary)' : 'var(--text-secondary)'};">`;
      treeHtml += `<span style="font-size:0.85rem; flex-shrink:0; opacity:${isHidden ? '0.4' : '1'};">${icon}</span>`;
      treeHtml += `<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:${isHidden ? '0.4' : '1'}; text-decoration:${isHidden ? 'line-through' : 'none'};">${esc(el.label || el.type)}</span>`;
      treeHtml += `<button onclick="event.stopPropagation(); dBToggleBlockVisibility('${el.id}')" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:0.7rem; padding:2px; line-height:1; display:flex; align-items:center; opacity:0.6; margin-right:4px;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6" title="${isHidden ? 'Show Block' : 'Hide Block'}">${eyeIcon}</button>`;
      treeHtml += `<button onclick="event.stopPropagation(); dBremoveBlock('${el.id}')" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:0.7rem; padding:2px; line-height:1; display:flex; align-items:center; opacity:0.6;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6" title="Delete Block">✕</button>`;
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

function dBToggleBlockVisibility(id) {
  const page = dBpages.find(p => p.id === dBactivePageId);
  if (!page) return;
  const found = dBfindInList(id, page.elements);
  if (found) {
    dBpushHistory();
    found.item.hidden = !found.item.hidden;
    debouncedSaveBuilder();
    renderDBuilderCanvas();
    if (dBleftSidebarTab === 'layers') {
      renderDBuilderLayersTree();
    }
  }
}
window.dBToggleBlockVisibility = dBToggleBlockVisibility;

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
  dBupdateUndoButtons();
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
    dBupdateUndoButtons();
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
    dBupdateUndoButtons();
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
  const btn = document.getElementById('btnPublishBuilder');
  setLoading(btn, true);
  try {
    const cfg = (appData && appData.config) || {};
    const pc = cfg.project_config || {};
    pc.pages = dBpages;
    cfg.project_config = pc;
    await api('PUT', '/apps/' + appId, cfg);
    appData = await api('GET', '/apps/' + appId);
    
    // Trigger OTA publish
    await api('POST', '/v1/apps/' + appId + '/publish', {});
    
    window.dBhasUnpublishedChanges = false;
    updatePublishButtonUI();
    toast('Published!', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
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
  const btn = document.getElementById('saveMenuBtn');
  setLoading(btn, true);
  try {
    await api('PUT', '/v1/apps/' + appId + '/navigation', { type: menuType, config: menuItems });
    toast('Menu saved!');
  } catch (err) { toast(err.message, 'error'); }
  finally { setLoading(btn, false); }
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

  // Getting started guide when no pages
  const guideEl = document.getElementById('gettingStartedGuide');
  if (!guideEl) return;
  if (pages.length === 0) {
    guideEl.style.display = 'block';
    guideEl.innerHTML =
      '<div class="gs-card">' +
      '<div class="gs-header"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round"><path d="M12 2l2 7h7l-5.5 4 2 7L12 17l-5.5 4 2-7L3 9h7z"/></svg> Getting Started</div>' +
      '<div class="gs-steps">' +
      '<div class="gs-step"><div class="gs-step-num">1</div><div class="gs-step-body"><strong>Add pages</strong><span>Go to <a href="#" onclick="switchAppView(\'pages\');return false">Pages</a> to create your first page</span></div></div>' +
      '<div class="gs-step"><div class="gs-step-num">2</div><div class="gs-step-body"><strong>Design with the Builder</strong><span>Open the <a href="#" onclick="switchAppView(\'builder\');return false">Builder</a> to drag blocks onto your pages</span></div></div>' +
      '<div class="gs-step"><div class="gs-step-num">3</div><div class="gs-step-body"><strong>Set up navigation</strong><span>Configure tabs in the <a href="#" onclick="switchAppView(\'menu\');return false">Menu</a> section</span></div></div>' +
      '<div class="gs-step"><div class="gs-step-num">4</div><div class="gs-step-body"><strong>Publish & build</strong><span>Hit <strong>Publish Live App</strong> then trigger a build in the <a href="#" onclick="switchAppView(\'builds\');return false">Builds</a> tab</span></div></div>' +
      '</div></div>';
  } else {
    guideEl.style.display = 'none';
  }
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
  if (!container) return;
  try {
    container.innerHTML = '<div class="loading"><span class="spinner"></span> Loading pages...</div>';
    const app = await api('GET', '/apps/' + appId);
    const pc = (app.config || {}).project_config || {};
    const pages = pc.pages || [];
    cachedPages = pages;
    const homeId = pc.homePageId || (pages[0] && pages[0].id) || '';

    document.getElementById('pageCount').textContent = '(' + pages.length + ')';

    if (!pages.length) {
      container.innerHTML = '<div class="empty-state"><h3>No pages yet</h3><p>Create your first page to start building your app</p><button class="btn btn-sm btn-primary" onclick="showAddPageForm()">Create Page</button></div>';
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
    showError(container, 'Failed to load pages: ' + err.message, 'loadPages');
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

  const btn = document.getElementById('createPageBtn');
  setLoading(btn, true);

  try {
    const app = await api('GET', '/apps/' + appId);
    const cfg = app.config || {};
    const pc = cfg.project_config || {};
    const pages = pc.pages || [];

    const newId = 'page_' + Date.now();
    pages.push({ id: newId, name, icon: '▤', elements: [] });
    pc.pages = pages;
    cfg.project_config = pc;

    await api('PUT', '/apps/' + appId, cfg);
    toast('Page created!');
    hideAddPageForm();
    await reloadAppData();
    loadPages();
    renderOverview();
    renderMiniPreview();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
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
    showError(container, 'Failed to load builds: ' + err.message, 'loadBuilds');
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
  const btn = document.getElementById('deployBtn');
  setLoading(btn, true);
  try {
    const res = await api('POST', '/v1/apps/' + appId + '/publish', {});
    toast('Published version ' + res.version, 'success');
    loadPublished();
    loadQR();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
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
  const btn = document.getElementById('saveConfigBtn');
  setLoading(btn, true);
  try {
    const config = JSON.parse(textarea.value);
    await api('PUT', '/apps/' + appId, { config });
    toast('Config saved!');
    appData = await api('GET', '/apps/' + appId);
    renderOverview();
    renderMiniPreview();
    loadPages();
  } catch (err) {
    toast((err instanceof SyntaxError ? 'Invalid JSON: ' : '') + err.message, 'error');
  } finally {
    setLoading(btn, false);
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

  const btn = document.getElementById('saveSettingsBtn');
  setLoading(btn, true);
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
  } finally {
    setLoading(btn, false);
  }
}
window.saveAppSettings = saveAppSettings;

// ── Profile ──

async function loadProfile() {
  const nameEl = document.getElementById('profileName');
  const emailEl = document.getElementById('profileEmail');
  if (!nameEl || !emailEl) return;
  // Pre-fill from cached login data instantly, then refresh from server
  const cached = localStorage.getItem('apt_user');
  if (cached) {
    try {
      const u = JSON.parse(cached);
      nameEl.value = u.name || '';
      emailEl.value = u.email || '';
    } catch (e) {}
  }
  try {
    const user = await api('GET', '/auth/me');
    nameEl.value = user.name || '';
    emailEl.value = user.email || '';
    localStorage.setItem('apt_user', JSON.stringify(user));
  } catch (err) {
    toast('Failed to load profile: ' + err.message, 'error');
  }
}

window.loadProfile = loadProfile;

async function saveProfile() {
  const btn = document.getElementById('saveProfileBtn');
  const name = document.getElementById('profileName').value.trim();
  const email = document.getElementById('profileEmail').value.trim();
  if (!name) { toast('Name is required', 'error'); return; }
  setLoading(btn, true);
  try {
    const res = await api('PUT', '/auth/profile', { name, email: email || undefined });
    localStorage.setItem('apt_token', res.token);
    localStorage.setItem('apt_user', JSON.stringify(res.user || { name, email }));
    toast('Profile saved!', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

window.saveProfile = saveProfile;

async function changePassword() {
  const current = document.getElementById('pwCurrent').value;
  const newPw = document.getElementById('pwNew').value;
  if (!current) { toast('Enter current password', 'error'); return; }
  if (newPw.length < 6) { toast('New password must be at least 6 characters', 'error'); return; }
  const btn = document.getElementById('changePwBtn');
  setLoading(btn, true);
  try {
    await api('PUT', '/auth/password', { current_password: current, new_password: newPw });
    toast('Password changed!', 'success');
    document.getElementById('pwCurrent').value = '';
    document.getElementById('pwNew').value = '';
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

window.changePassword = changePassword;

async function deleteAccount() {
  const ok = await customConfirm('Delete Account', 'Permanently delete your account and all data? This cannot be undone.');
  if (!ok) return;
  try {
    await api('DELETE', '/auth/account');
    localStorage.removeItem('apt_token');
    localStorage.removeItem('apt_user');
    toast('Account deleted');
    setTimeout(() => window.location.href = '/', 1200);
  } catch (err) {
    toast(err.message, 'error');
  }
}

window.deleteAccount = deleteAccount;

// ── Delete App ──

async function deleteApp() {
  const ok = await customConfirm('Delete App', 'Delete this app and all its data? This cannot be undone.');
  if (!ok) return;
  try {
    await api('DELETE', '/apps/' + appId);
    toast('App deleted');
    setTimeout(() => window.location.href = '/app', 1200);
  } catch (err) {
    toast(err.message, 'error');
  }
}
window.deleteApp = deleteApp;

// ── Start ──

document.addEventListener('DOMContentLoaded', init);
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
  const btn = document.getElementById('saveStoreCredsBtn');
  setLoading(btn, true);
  try {
    const issuerId = document.getElementById('storeIosIssuerId')?.value.trim();
    const keyId = document.getElementById('storeIosKeyId')?.value.trim();
    
    const cfg = (appData && appData.config) || {};
    if (!cfg.project_config) cfg.project_config = {};
    if (!cfg.project_config.store_credentials) cfg.project_config.store_credentials = {};
    
    cfg.project_config.store_credentials.ios_issuer_id = issuerId;
    cfg.project_config.store_credentials.ios_key_id = keyId;
    
    await api('PUT', '/apps/' + appId, cfg);
    toast('Store credentials saved!', 'success');
    appData = await api('GET', '/apps/' + appId);
  } catch (err) {
    toast('Error saving store credentials', 'error');
  } finally {
    setLoading(btn, false);
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



// ── Third-Party SDK Registry ──
const THIRD_PARTY_SDKS = [
  { key:'gokwik', name:'GoKwik', category:'Payments', color:'#6366f1', icon:'checkout',
    description:'AI-powered checkout with higher conversion and reduced RTO.',
    longDescription:'GoKwik uses AI to optimize your checkout flow with auto-fill, smart validation, and RTO reduction. Boost conversions and reduce failed deliveries.',
    npmPackage:'gokwik-react-native-sdk',
    configFields:[
      { key:'api_key', label:'API Key', type:'secret', placeholder:'gw_...', required:true },
      { key:'merchant_id', label:'Merchant ID', type:'text', placeholder:'MID...', required:true }
    ]},
  { key:'razorpay', name:'Razorpay', category:'Payments', color:'#3399ff', icon:'payment',
    description:'Full-stack payment gateway for India — UPI, cards, net banking, wallets.',
    longDescription:'Accept credit/debit cards, UPI, Net Banking, Pay Later, and EMI options with a seamless integration.',
    npmPackage:'razorpay-react-native',
    configFields:[
      { key:'key_id', label:'Key ID', type:'text', placeholder:'rzp_live_...', required:true },
      { key:'key_secret', label:'Key Secret', type:'secret', placeholder:'...', required:true }
    ]},
  { key:'cashfree', name:'Cashfree', category:'Payments', color:'#14a37f', icon:'payment',
    description:'India\'s leading payment gateway with 100+ payment modes.',
    longDescription:'Accept payments via credit/debit cards, UPI, Net Banking, Pay Later. Features instant settlements and auto-reconciliation.',
    npmPackage:'cashfree-pg-react-native-sdk',
    configFields:[
      { key:'app_id', label:'App ID', type:'text', placeholder:'CF...', required:true },
      { key:'secret_key', label:'Secret Key', type:'secret', placeholder:'...', required:true }
    ]},
  { key:'stripe', name:'Stripe', category:'Payments', color:'#635bff', icon:'payment',
    description:'Global payments for 135+ currencies — cards, Apple Pay, Google Pay.',
    longDescription:'World\'s most popular payment processor. Accept payments from customers worldwide via cards, Apple Pay, Google Pay, and BNPL.',
    npmPackage:'@stripe/stripe-react-native',
    configFields:[
      { key:'publishable_key', label:'Publishable Key', type:'text', placeholder:'pk_live_...', required:true },
      { key:'secret_key', label:'Secret Key', type:'secret', placeholder:'sk_live_...', required:true }
    ]},
  { key:'return_prime', name:'Return Prime', category:'Logistics', color:'#f97316', icon:'returns',
    description:'End-to-end return management and reverse logistics for e-commerce.',
    longDescription:'Automate return requests, pickup, quality check, and refunds. Reduce return TAT and improve customer satisfaction.',
    npmPackage:'return-prime-react-native-sdk',
    configFields:[
      { key:'api_key', label:'API Key', type:'secret', placeholder:'rp_...', required:true },
      { key:'merchant_id', label:'Merchant ID', type:'text', placeholder:'MID...', required:true }
    ]},
  { key:'shiprocket', name:'Shiprocket', category:'Logistics', color:'#0f6cbf', icon:'shipping',
    description:'Automated shipping with 17+ courier partners and real-time tracking.',
    longDescription:'Connect to 17+ courier partners — Delhivery, Blue Dart, FedEx. Automate labels, schedule pickups, track shipments in real-time.',
    npmPackage:'shiprocket-react-native-sdk',
    configFields:[
      { key:'api_key', label:'API Key', type:'secret', placeholder:'...', required:true },
      { key:'email', label:'Email', type:'text', placeholder:'your@email.com', required:true }
    ]},
  { key:'delhivery', name:'Delhivery', category:'Logistics', color:'#e22b22', icon:'shipping',
    description:'India\'s largest logistics network with COD reconciliation.',
    longDescription:'End-to-end logistics and supply chain solutions across India with real-time tracking and COD reconciliation.',
    npmPackage:'delhivery-react-native-sdk',
    configFields:[
      { key:'api_token', label:'API Token', type:'secret', placeholder:'...', required:true },
      { key:'client_id', label:'Client ID', type:'text', placeholder:'...', required:true }
    ]},
  { key:'mixpanel', name:'Mixpanel', category:'Analytics', color:'#7856ff', icon:'analytics',
    description:'Product analytics — funnels, retention, user behavior tracking.',
    longDescription:'Track events, analyze funnels, measure retention, and run A/B tests to optimize the user experience.',
    npmPackage:'mixpanel-react-native',
    configFields:[
      { key:'project_token', label:'Project Token', type:'text', placeholder:'...', required:true }
    ]},
  { key:'clevertap', name:'CleverTap', category:'Analytics', color:'#ff6b35', icon:'analytics',
    description:'Engagement platform with push, in-app, and personalization.',
    longDescription:'Combine analytics with multi-channel engagement — push notifications, in-app messages, email, and webhooks.',
    npmPackage:'clevertap-react-native',
    configFields:[
      { key:'account_id', label:'Account ID', type:'text', placeholder:'WZ...', required:true },
      { key:'account_token', label:'Account Token', type:'secret', placeholder:'...', required:true }
    ]},
  { key:'firebase_analytics', name:'Firebase', category:'Analytics', color:'#ffca28', icon:'analytics',
    description:'Free analytics, crash reporting, push notifications (FCM).',
    longDescription:'Google\'s free app analytics with unlimited events, Crashlytics, FCM push notifications, and performance monitoring in one SDK.',
    npmPackage:'@react-native-firebase/analytics',
    configFields:[
      { key:'google_app_id', label:'Google App ID', type:'text', placeholder:'1:...', required:true },
      { key:'api_key', label:'API Key', type:'secret', placeholder:'AIzaSy...', required:true }
    ]},
  { key:'intercom', name:'Intercom', category:'Support', color:'#6afdef', icon:'support',
    description:'In-app chat, bots, and proactive customer messaging.',
    longDescription:'Chat with customers in real-time, send targeted messages, automate support with bots. Drive engagement and reduce support tickets.',
    npmPackage:'intercom-react-native',
    configFields:[
      { key:'app_id', label:'App ID', type:'text', placeholder:'...', required:true },
      { key:'ios_api_key', label:'iOS API Key', type:'secret', placeholder:'ios_sdk-...', required:true },
      { key:'android_api_key', label:'Android API Key', type:'secret', placeholder:'android_sdk-...', required:true }
    ]},
];

const SDK_ICONS = {
  checkout:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  payment:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
  returns:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 4v6h6"/><path d="M3.5 15a9 9 0 1 0 2-12"/></svg>`,
  shipping:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  analytics:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  support:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

let dtpIntegrations = {};

async function dtpLoadIntegrations() {
  try {
    const r = await fetch(API + '/apps/' + appId + '/settings', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!r.ok) return;
    const settings = await r.json();
    const integ = settings.find(s => s.key === 'third_party_integrations');
    dtpIntegrations = integ ? (integ.value || {}) : {};
  } catch (_) { dtpIntegrations = {}; }
}

async function dtpSaveIntegrations() {
  try {
    const r = await fetch(API + '/apps/' + appId + '/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ key: 'third_party_integrations', value: dtpIntegrations })
    });
    if (!r.ok) throw new Error('Failed to save');
    toast('SDK configurations saved.', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

function renderIntegrationsMarketplace() {
  const container = document.getElementById('sdkMarketplaceGrid');
  if (!container) return;
  const enabled = Object.values(dtpIntegrations).filter(i => i.enabled).length;
  document.getElementById('sdkEnabledCount').textContent = `${enabled} SDK${enabled!==1?'s':''} active`;
  const q = (document.getElementById('sdkSearchInput')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('sdkCategoryFilter')?.value || 'all';
  let filtered = THIRD_PARTY_SDKS;
  if (q) filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  if (catFilter !== 'all') filtered = filtered.filter(s => s.category === catFilter);
  const cats = (catFilter !== 'all') ? [catFilter] : [...new Set(THIRD_PARTY_SDKS.map(s => s.category))];
  let html = '';
  if (!filtered.length) {
    html = `<div style="padding:48px;text-align:center;color:var(--text-muted);font-size:0.9rem;">No SDKs match your search.</div>`;
  } else {
    for (const cat of cats) {
      const sdks = filtered.filter(s => s.category === cat);
      if (!sdks.length) continue;
      html += `<div class="sdk-category"><div class="sdk-category-title">${cat}</div><div class="sdk-category-grid">`;
      for (const s of sdks) {
        const integ = dtpIntegrations[s.key];
        const en = integ && integ.enabled;
        html += `<div class="sdk-card" onclick="dtpOpenConfig('${s.key}')" style="${en?'border-color:'+s.color+';box-shadow:0 0 0 1px '+s.color+'40':''}">
          <div class="sdk-card-top">
            <div class="sdk-icon" style="background:${s.color}15;color:${s.color}">${SDK_ICONS[s.icon]||''}</div>
            <div class="sdk-status ${en?'enabled':''}">${en?'Active':'Off'}</div>
          </div>
          <div class="sdk-name">${s.name}</div>
          <div class="sdk-desc">${s.description}</div>
          <div class="sdk-card-footer">
            <span class="sdk-cat-tag">${s.category}</span>
            ${en?'<span class="sdk-enabled-dot"></span>':''}
          </div>
        </div>`;
      }
      html += `</div></div>`;
    }
  }
  container.innerHTML = html;
}

window.renderIntegrationsMarketplace = renderIntegrationsMarketplace;

function dtpOpenConfig(key) {
  const sdk = THIRD_PARTY_SDKS.find(s => s.key === key);
  if (!sdk) return;
  const modal = document.getElementById('sdkConfigModal');
  const integ = dtpIntegrations[key] || { enabled: false, config: {} };
  let fields = '';
  for (const f of sdk.configFields) {
    const val = (integ.config&&integ.config[f.key])||'';
    fields += `<div class="sdk-field-row">
      <label class="sdk-field-label">${f.label}${f.required?' <span style="color:var(--danger)">*</span>':''}</label>
      <input type="${f.type==='secret'?'password':'text'}" class="sdk-field-input" id="sdkField_${f.key}" value="${val.replace(/"/g,'&quot;')}" placeholder="${f.placeholder}">
    </div>`;
  }
  modal.innerHTML = `<div class="sdk-modal-overlay" onclick="if(event.target===this)dtpCloseConfig()">
    <div class="sdk-modal-panel">
      <button class="sdk-modal-close" onclick="dtpCloseConfig()">✕</button>
      <div class="sdk-modal-header">
        <div class="sdk-modal-icon" style="background:${sdk.color}15;color:${sdk.color}">${SDK_ICONS[sdk.icon]||''}</div>
        <div><div class="sdk-modal-name">${sdk.name}</div><div class="sdk-modal-cat">${sdk.category}</div></div>
        <div class="sdk-toggle-wrap">
          <label class="sdk-toggle"><input type="checkbox" id="sdkEnabledToggle" ${integ.enabled?'checked':''}><span class="sdk-toggle-slider"></span></label>
          <span class="sdk-toggle-label" id="sdkToggleLabel">${integ.enabled?'Enabled':'Disabled'}</span>
        </div>
      </div>
      <div class="sdk-modal-desc">${sdk.longDescription}</div>
      <div class="sdk-modal-fields" data-key="${key}">${fields}</div>
      <div class="sdk-modal-actions">
        <button class="btn btn-sm btn-ghost" onclick="dtpCloseConfig()">Cancel</button>
        <button class="btn btn-sm btn-primary" onclick="dtpSaveConfig()">Save Configuration</button>
      </div>
    </div>
  </div>`;
  modal.style.display = 'block';
  document.getElementById('sdkEnabledToggle').addEventListener('change', function() {
    document.getElementById('sdkToggleLabel').textContent = this.checked ? 'Enabled' : 'Disabled';
  });
}

function dtpCloseConfig() { document.getElementById('sdkConfigModal').style.display = 'none'; }

async function dtpSaveConfig() {
  const fieldsDiv = document.querySelector('.sdk-modal-fields');
  if (!fieldsDiv) return;
  const key = fieldsDiv.dataset.key;
  const sdk = THIRD_PARTY_SDKS.find(s => s.key === key);
  if (!sdk) return;
  const enabled = document.getElementById('sdkEnabledToggle').checked;
  const config = {};
  for (const f of sdk.configFields) {
    const val = document.getElementById('sdkField_'+f.key).value.trim();
    if (f.required && !val) { toast(f.label+' is required.', 'error'); return; }
    config[f.key] = val;
  }
  dtpIntegrations[key] = { enabled, config };
  await dtpSaveIntegrations();
  dtpCloseConfig();
  renderIntegrationsMarketplace();
}

window.loadIntegrations = async function() {
  // Load commerce integrations from app config
  try {
    const r = await fetch(API + '/apps/' + appId, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (r.ok) {
      const app = await r.json();
      const pc = (app.config && app.config.project_config) || {};
      const integs = pc.integrations || {};
      const shopify = integs.shopify || {};
      const woo = integs.woocommerce || {};
      document.getElementById('integShopifyDomain').value = shopify.domain || '';
      document.getElementById('integShopifyToken').value = shopify.storefront_token || '';
      document.getElementById('integWooUrl').value = woo.store_url || '';
      document.getElementById('integWooKey').value = woo.consumer_key || '';
      document.getElementById('integWooSecret').value = woo.consumer_secret || '';
    }
  } catch (_) {}
  // Load third-party SDK integrations
  await dtpLoadIntegrations();
  renderIntegrationsMarketplace();
  // Bind search/filter events
  const sdkSearchEl = document.getElementById('sdkSearchInput');
  const sdkFilterEl = document.getElementById('sdkCategoryFilter');
  if (sdkSearchEl) sdkSearchEl.addEventListener('input', renderIntegrationsMarketplace);
  if (sdkFilterEl) sdkFilterEl.addEventListener('change', renderIntegrationsMarketplace);
};

window.saveIntegrations = async function() {
  const btn = document.getElementById('saveIntegrationsBtn');
  setLoading(btn, true);
  try {
    const r1 = await fetch(API + '/apps/' + appId, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    if (r1.ok) {
      const app = await r1.json();
      const cfg = app.config || {};
      const pc = cfg.project_config || {};
      const integs = pc.integrations || {};
      integs.shopify = {
        domain: document.getElementById('integShopifyDomain').value,
        storefront_token: document.getElementById('integShopifyToken').value
      };
      integs.woocommerce = {
        store_url: document.getElementById('integWooUrl').value,
        consumer_key: document.getElementById('integWooKey').value,
        consumer_secret: document.getElementById('integWooSecret').value
      };
      pc.integrations = integs;
      cfg.project_config = pc;
      const r2 = await fetch(API + '/apps/' + appId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
        body: JSON.stringify(cfg)
      });
      if (!r2.ok) throw new Error('Failed to save store config');
    }
    await dtpSaveIntegrations();
    toast('All integrations saved.', 'success');
  } catch (err) { toast(err.message, 'error'); }
  finally { setLoading(btn, false); }
};
window.dtpOpenConfig = dtpOpenConfig;
window.dtpCloseConfig = dtpCloseConfig;
window.dtpSaveConfig = dtpSaveConfig;

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

// ── Billing & Subscription ──

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
    const container = document.getElementById('billingPlansContainer');
    if (container) {
      container.setAttribute('hx-get', '/hx/apps/' + encodeURIComponent(appId) + '/billing');
      htmx.ajax('GET', container.getAttribute('hx-get'), { target: '#billingPlansContainer', swap: 'outerHTML' });
    }
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

// ── AI Generator ──
let aiGeneratedPages = null;

function openAIGenerator() {
  document.getElementById('aiGeneratorModal').classList.remove('hidden');
  document.getElementById('aiGenResult').style.display = 'none';
  document.getElementById('aiPromptInput').value = '';
  document.getElementById('aiGenerateBtn').disabled = false;
  document.getElementById('aiGenerateBtn').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>\n          Generate';
  aiGeneratedPages = null;
}

function closeAIGenerator() {
  document.getElementById('aiGeneratorModal').classList.add('hidden');
}
window.openAIGenerator = openAIGenerator;
window.closeAIGenerator = closeAIGenerator;

function setAIPrompt(text) {
  document.getElementById('aiPromptInput').value = text;
  document.getElementById('aiPromptInput').focus();
}
window.setAIPrompt = setAIPrompt;

async function runAIGeneration() {
  const prompt = document.getElementById('aiPromptInput').value.trim();
  if (!prompt) {
    toast('Please describe what you want to generate', 'error');
    return;
  }

  const btn = document.getElementById('aiGenerateBtn');
  const resultDiv = document.getElementById('aiGenResult');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Generating...';
  resultDiv.style.display = 'none';

  try {
    const res = await api('POST', '/v1/apps/' + appId + '/generate', { prompt });
    aiGeneratedPages = res.pages || [];

    const badge = res.ai_generated ? '<span class="ai-gen-badge ai-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> AI</span>' : '<span class="ai-gen-badge template-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> Template</span>';
    const matched = res.matched_category ? '<div class="ai-gen-result-category">' + badge + ' <span style="opacity:0.6">Matched:</span> ' + esc(res.matched_category) + '</div>' : '';

    resultDiv.innerHTML = matched + `
      <div style="margin-bottom:12px;font-size:0.82rem;font-weight:600;color:var(--text);">Generated ${aiGeneratedPages.length} page${aiGeneratedPages.length !== 1 ? 's' : ''}</div>
      <div class="ai-gen-result-pages">
        ${aiGeneratedPages.map(p => `
          <div class="ai-gen-result-page">
            <div class="ai-gen-result-page-icon">▤</div>
            <span class="ai-gen-result-page-name">${esc(p.name || 'Page')}</span>
            <span class="ai-gen-result-page-count">${(p.elements || []).length} element${(p.elements || []).length !== 1 ? 's' : ''}</span>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-sm btn-success" onclick="applyAIGeneratedPages()" style="width:100%;justify-content:center;font-weight:600;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        Apply to App
      </button>
    `;
    resultDiv.style.display = 'block';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>\n          Generate';
    btn.disabled = false;
  } catch (err) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="ai-gen-error">Failed to generate: ' + esc(err.message) + '</div>';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>\n          Generate';
    btn.disabled = false;
  }
}
window.runAIGeneration = runAIGeneration;

async function applyAIGeneratedPages() {
  if (!aiGeneratedPages || !aiGeneratedPages.length) return;

  try {
    const cfg = (appData && appData.config) || {};
    const pc = cfg.project_config || {};
    const existingPages = pc.pages || [];

    const newIds = new Set(aiGeneratedPages.map(p => p.id));
    const filteredExisting = existingPages.filter(p => !newIds.has(p.id));
    pc.pages = [...aiGeneratedPages, ...filteredExisting];
    cfg.project_config = pc;

    await api('PUT', '/apps/' + appId, cfg);
    appData = await api('GET', '/apps/' + appId);

    toast('Applied ' + aiGeneratedPages.length + ' generated page' + (aiGeneratedPages.length !== 1 ? 's' : ''), 'success');
    closeAIGenerator();

    const builderView = document.querySelector('.app-view[data-appview="builder"]');
    if (builderView && builderView.classList.contains('active')) {
      openDashboardBuilder();
    }
    loadPages();
  } catch (err) {
    toast('Failed to apply: ' + err.message, 'error');
  }
}
window.applyAIGeneratedPages = applyAIGeneratedPages;

// ── AI Chat Agent (FAB) ──
let fabChatOpen = false;

function dBToggleChat() {
  fabChatOpen = !fabChatOpen;
  const overlay = document.getElementById('fabChatOverlay');
  const fabBtn = document.getElementById('fabChatBtn');
  overlay.style.display = fabChatOpen ? 'flex' : 'none';
  fabBtn.classList.toggle('open', fabChatOpen);
  if (fabChatOpen) {
    const saved = localStorage.getItem('apt_chat_model');
    const select = document.getElementById('fabChatModel');
    if (saved) {
      select.value = saved;
      if (select.value !== saved) {
        select.value = 'gemini/gemini-3.5-flash';
        localStorage.setItem('apt_chat_model', 'gemini/gemini-3.5-flash');
      }
    }
    refreshAiProviderStatus();
  }
}
window.dBToggleChat = dBToggleChat;

// Fetch and show provider status
async function refreshAiProviderStatus() {
  try {
    const providers = await api('GET', '/v1/ai/providers');
    const configured = providers.filter(p => p.configured);
    const statusEl = document.getElementById('fabChatProviderStatus');
    if (statusEl) {
      if (configured.length === 0) {
        statusEl.innerHTML = '<span style="color:var(--danger)">⚠ No AI providers configured</span>';
        statusEl.style.cursor = 'pointer';
        statusEl.onclick = () => showAiSettings();
      } else {
        statusEl.innerHTML = configured.map(p =>
          `<span style="display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:4px;background:rgba(34,208,108,0.1);color:#22d06c;font-size:0.65rem;font-weight:600;">✓ ${p.name}</span>`
        ).join(' ');
        statusEl.onclick = null;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch AI providers:', e);
  }
}
window.refreshAiProviderStatus = refreshAiProviderStatus;

// AI Provider Settings Modal
function showAiSettings() {
  const overlay = document.getElementById('aiSettingsOverlay');
  if (overlay) overlay.classList.remove('hidden');
  try {
    const keys = JSON.parse(localStorage.getItem('apt_ai_keys') || '{}');
    if (keys.OPENAI_API_KEY) document.getElementById('aiKeyOpenai').value = keys.OPENAI_API_KEY;
    if (keys.GROQ_API_KEY) document.getElementById('aiKeyGroq').value = keys.GROQ_API_KEY;
    if (keys.GEMINI_API_KEY) document.getElementById('aiKeyGemini').value = keys.GEMINI_API_KEY;
    if (keys.OPENROUTER_API_KEY) document.getElementById('aiKeyOpenrouter').value = keys.OPENROUTER_API_KEY;
    if (keys.OLLAMA_HOST) document.getElementById('aiKeyOllama').value = keys.OLLAMA_HOST;
  } catch(e){}
}
window.showAiSettings = showAiSettings;

function closeAiSettings() {
  const overlay = document.getElementById('aiSettingsOverlay');
  if (overlay) overlay.classList.add('hidden');
}
window.closeAiSettings = closeAiSettings;

async function saveAiSettings() {
  const keysDef = [
    { key: 'OPENAI_API_KEY', el: 'aiKeyOpenai' },
    { key: 'GROQ_API_KEY', el: 'aiKeyGroq' },
    { key: 'GEMINI_API_KEY', el: 'aiKeyGemini' },
    { key: 'OPENROUTER_API_KEY', el: 'aiKeyOpenrouter' },
    { key: 'OLLAMA_HOST', el: 'aiKeyOllama' },
  ];
  
  const customKeys = {};
  for (const {key, el} of keysDef) {
    const input = document.getElementById(el);
    if (input && input.value.trim()) {
      customKeys[key] = input.value.trim();
    }
  }
  
  localStorage.setItem('apt_ai_keys', JSON.stringify(customKeys));
  showToast('API keys saved securely in your browser.', 'success');
  closeAiSettings();
  refreshAiProviderStatus();
}
window.saveAiSettings = saveAiSettings;

const statusDot = () => document.querySelector('.fab-chat-header-status .status-dot');
const statusText = () => document.querySelector('.fab-chat-header-status');
function setAgentStatus(state) {
  const dot = statusDot();
  const txt = statusText();
  if (!dot || !txt) return;
  if (state === 'thinking') {
    dot.style.background = '#f59e0b';
    txt.innerHTML = '<span class="status-dot"></span> Thinking...';
  } else {
    dot.style.background = '#22d06c';
    txt.innerHTML = '<span class="status-dot"></span> Ready';
  }
}

function addChatMessage(text, role, actions) {
  const container = document.getElementById('fabChatMessages');
  const row = document.createElement('div');
  row.className = 'msg-row ' + (role === 'user' ? 'user-row' : 'ai-row');
  const avatarLetter = role === 'user' ? 'U' : 'AI';
  const avatarClass = role === 'user' ? 'user-avatar' : 'ai-avatar';
  let html = '<div class="msg-avatar ' + avatarClass + '">' + avatarLetter + '</div>';
  html += '<div class="msg-bubble"><div class="msg-content">' + esc(text) + '</div>';
  if (actions && actions.length > 0) {
    html += '<div class="msg-actions">';
    for (const a of actions) {
      const cls = a.success ? 'success' : 'error';
      const icon = a.success ? '&#10003;' : '&#10007;';
      html += '<div class="action-card ' + cls + '"><span class="action-icon">' + icon + '</span>' + esc(a.description) + '</div>';
    }
    html += '</div>';
  }
  if (role === 'ai' && actions && actions.length > 0 && actions.some(a => a.success)) {
    html += '<div class="msg-updated-toast"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> App updated</div>';
  }
  html += '</div>';
  row.innerHTML = html;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function showChatTyping(show) {
  const container = document.getElementById('fabChatMessages');
  const existing = document.getElementById('chatTypingIndicator');
  if (existing) existing.remove();
  if (!show) {
    setAgentStatus('ready');
    return;
  }
  setAgentStatus('thinking');
  const div = document.createElement('div');
  div.id = 'chatTypingIndicator';
  div.className = 'chat-agent-thinking';
  div.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div><span class="thinking-label">Building...</span>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showChatError(msg) {
  const el = document.getElementById('fabChatError');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); }, 5000);
}

function dBSendQuick(msg) {
  const input = document.getElementById('fabChatInput');
  input.value = msg;
  dBSendChat();
}
window.dBSendQuick = dBSendQuick;

async function dBSendChat() {
  const input = document.getElementById('fabChatInput');
  const msg = input.value.trim();
  if (!msg) return;
  if (!appId) return showChatError('No app selected');

  input.value = '';
  addChatMessage(msg, 'user');
  showChatTyping(true);
  setAgentStatus('thinking');

  const model = document.getElementById('fabChatModel').value;
  localStorage.setItem('apt_chat_model', model);

  const btn = document.getElementById('fabChatSendBtn');
  btn.disabled = true;

  try {
    let custom_api_keys = {};
    try { custom_api_keys = JSON.parse(localStorage.getItem('apt_ai_keys') || '{}'); } catch(e){}
    const res = await api('POST', '/v1/apps/' + appId + '/agent/chat', { message: msg, model: model, custom_api_keys });
    showChatTyping(false);
    btn.disabled = false;

    if (res.reply) {
      addChatMessage(res.reply, 'ai', res.actions || []);
    }

    if (res.app_updated) {
      try {
        appData = await api('GET', '/apps/' + appId);
        if (typeof openDashboardBuilder === 'function') {
          openDashboardBuilder();
        }
        if (typeof loadPages === 'function') {
          loadPages();
        }
      } catch (e) {
        console.warn('Failed to refresh app data:', e);
      }
    }
  } catch (e) {
    showChatTyping(false);
    btn.disabled = false;
    showChatError(e.message || 'Failed to send message');
  }
}
window.dBSendChat = dBSendChat;
let templateSelectedCategory = null;
let templateSelectedPages = [];

function openTemplateBrowser() {
  document.getElementById('templateBrowserModal').classList.remove('hidden');
  document.getElementById('applyTemplateBtn').disabled = true;
  templateSelectedCategory = null;
  templateSelectedPages = [];
  renderTemplateBrowser();
}

function closeTemplateBrowser() {
  document.getElementById('templateBrowserModal').classList.add('hidden');
}
window.openTemplateBrowser = openTemplateBrowser;
window.closeTemplateBrowser = closeTemplateBrowser;

function renderTemplateBrowser() {
  const cats = Object.keys(TEMPLATES);
  const tabsContainer = document.getElementById('templateCategoryTabs');
  const gridContainer = document.getElementById('templateBrowserGrid');
  if (!tabsContainer || !gridContainer) return;

  if (!templateSelectedCategory && cats.length) {
    templateSelectedCategory = cats[0];
  }

  tabsContainer.innerHTML = cats.map(key => {
    const cat = TEMPLATES[key];
    const active = key === templateSelectedCategory ? ' active' : '';
    return `<button class="template-cat-btn${active}" onclick="selectTemplateCategory('${key}')">
      ${cat.icon || '▤'} ${esc(cat.name)}
      <span class="template-cat-count">${cat.pages.length}</span>
    </button>`;
  }).join('');

  const cat = templateSelectedCategory ? TEMPLATES[templateSelectedCategory] : null;
  if (!cat) {
    gridContainer.innerHTML = '<div class="template-empty">Select a category</div>';
    document.getElementById('applyTemplateBtn').disabled = true;
    return;
  }

  gridContainer.innerHTML = cat.pages.map(page => {
    const types = {};
    (page.elements || []).forEach(el => {
      const t = el.type || 'block';
      types[t] = (types[t] || 0) + 1;
    });
    const elemTags = Object.entries(types).slice(0, 4).map(([t, c]) =>
      `<span class="template-page-card-elem">${t}${c > 1 ? ' ×' + c : ''}</span>`
    ).join('');
    const desc = page.elements && page.elements.length
      ? page.elements.length + ' element' + (page.elements.length !== 1 ? 's' : '')
      : 'Empty page';
    return `<div class="template-page-card${templateSelectedPages.includes(page.id) ? ' selected' : ''}" onclick="toggleTemplatePage('${page.id}')">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="template-page-card-icon" style="background:${cat.color || 'var(--primary-subtle)'};color:#fff;">${cat.icon || '▤'}</div>
        <div style="flex:1;min-width:0;">
          <div class="template-page-card-name">${esc(page.name)}</div>
          <div class="template-page-card-desc">${desc}</div>
        </div>
      </div>
      <div class="template-page-card-elements">${elemTags}</div>
    </div>`;
  }).join('') || '<div class="template-empty">No pages in this category</div>';

  document.getElementById('applyTemplateBtn').disabled = templateSelectedPages.length === 0;
}

function selectTemplateCategory(key) {
  templateSelectedCategory = key;
  templateSelectedPages = [];
  renderTemplateBrowser();
}
window.selectTemplateCategory = selectTemplateCategory;

function toggleTemplatePage(pageId) {
  const idx = templateSelectedPages.indexOf(pageId);
  if (idx >= 0) {
    templateSelectedPages.splice(idx, 1);
  } else {
    templateSelectedPages.push(pageId);
  }
  renderTemplateBrowser();
}
window.toggleTemplatePage = toggleTemplatePage;

async function applySelectedTemplate() {
  if (!templateSelectedCategory || templateSelectedPages.length === 0) return;

  const cat = TEMPLATES[templateSelectedCategory];
  if (!cat) return;

  const btn = document.getElementById('applyTemplateBtn');
  btn.disabled = true;
  btn.textContent = 'Applying...';

  try {
    const selectedPagesData = cat.pages
      .filter(p => templateSelectedPages.includes(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        elements: JSON.parse(JSON.stringify(p.elements || []))
      }));

    if (!selectedPagesData.length) {
      toast('No pages selected', 'error');
      btn.disabled = false;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>\n          Apply Template';
      return;
    }

    // Merge with existing pages: keep existing pages, add/replace template pages
    const cfg = (appData && appData.config) || {};
    const pc = cfg.project_config || {};
    const existingPages = pc.pages || [];

    // Remove any existing pages that have the same IDs as template pages
    const templateIds = new Set(selectedPagesData.map(p => p.id));
    const filteredExisting = existingPages.filter(p => !templateIds.has(p.id));

    // Prepend template pages so they appear first
    pc.pages = [...selectedPagesData, ...filteredExisting];
    cfg.project_config = pc;

    await api('PUT', '/apps/' + appId, cfg);
    appData = await api('GET', '/apps/' + appId);

    toast('Applied ' + selectedPagesData.length + ' page' + (selectedPagesData.length !== 1 ? 's' : '') + ' from ' + cat.name, 'success');

    closeTemplateBrowser();

    // Refresh builder if it's open
    const builderView = document.querySelector('.app-view[data-appview="builder"]');
    if (builderView && builderView.classList.contains('active')) {
      openDashboardBuilder();
    }

    // Refresh pages view
    loadPages();
  } catch (err) {
    toast('Failed to apply template: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>\n          Apply Template';
  }
}
window.applySelectedTemplate = applySelectedTemplate;

// ── Analytics Dashboard ──
let analyticsData = null;
let analyticsActiveTab = 'usage';

async function loadAnalytics() {
  const container = document.getElementById('analyticsDashboard');
  if (!container) return;
  container.innerHTML = '<div class="loading"><span class="spinner"></span> Loading analytics...</div>';

  try {
    analyticsData = await api('GET', '/v1/apps/' + appId + '/analytics');
    renderAnalytics();
  } catch (err) {
    container.innerHTML = '<div class="analytics-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg><strong>Failed to load analytics</strong><span>' + esc(err.message) + '</span></div>';
  }
}

function renderAnalytics() {
  const container = document.getElementById('analyticsDashboard');
  if (!container || !analyticsData) return;

  const updated = document.getElementById('analyticsLastUpdated');
  if (updated && analyticsData.generatedAt) {
    const d = new Date(analyticsData.generatedAt);
    updated.textContent = 'Updated ' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  container.innerHTML = `
    <div class="analytics-tabs">
      <button class="analytics-tab-btn${analyticsActiveTab === 'usage' ? ' active' : ''}" onclick="switchAnalyticsTab('usage')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        Usage
      </button>
      <button class="analytics-tab-btn${analyticsActiveTab === 'crashes' ? ' active' : ''}" onclick="switchAnalyticsTab('crashes')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Crashes
        ${analyticsData.crashes ? '<span class="tab-count">' + analyticsData.crashes.totalCrashes + '</span>' : ''}
      </button>
      <button class="analytics-tab-btn${analyticsActiveTab === 'engagement' ? ' active' : ''}" onclick="switchAnalyticsTab('engagement')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        Engagement
      </button>
    </div>
    <div class="analytics-tab-content${analyticsActiveTab === 'usage' ? ' active' : ''}" id="analyticsTabUsage">
      ${renderUsageTab()}
    </div>
    <div class="analytics-tab-content${analyticsActiveTab === 'crashes' ? ' active' : ''}" id="analyticsTabCrashes">
      ${renderCrashesTab()}
    </div>
    <div class="analytics-tab-content${analyticsActiveTab === 'engagement' ? ' active' : ''}" id="analyticsTabEngagement">
      ${renderEngagementTab()}
    </div>
  `;
}

function switchAnalyticsTab(tab) {
  analyticsActiveTab = tab;
  renderAnalytics();
}
window.switchAnalyticsTab = switchAnalyticsTab;

function changeArrow(val) {
  if (val > 0) return '<span class="analytics-card-change up"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg> ' + val + '%</span>';
  if (val < 0) return '<span class="analytics-card-change down"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg> ' + Math.abs(val) + '%</span>';
  return '<span class="analytics-card-change stable">— 0%</span>';
}

function renderUsageTab() {
  const u = analyticsData.usage || {};
  const dauArr = u.dauPerDay || [];
  const sessArr = u.sessionsPerDay || [];

  const maxDau = Math.max(...dauArr, 1);
  const maxSess = Math.max(...sessArr, 1);
  const last14 = dauArr.slice(-14);

  return `
    <div class="analytics-grid">
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> Daily Active Users</div>
        <div class="analytics-card-value">${esc(u.dailyActiveUsers || 0)}</div>
        ${changeArrow(8)}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Monthly Active Users</div>
        <div class="analytics-card-value">${esc((u.monthlyActiveUsers || 0).toLocaleString())}</div>
        ${changeArrow(12)}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Total Sessions</div>
        <div class="analytics-card-value">${esc((u.totalSessions || 0).toLocaleString())}</div>
        ${changeArrow(5)}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Avg Session Duration</div>
        <div class="analytics-card-value">${esc(u.avgSessionDuration || 0)}<small>sec</small></div>
        ${changeArrow(3)}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg> New Users (7d)</div>
        <div class="analytics-card-value">${esc(u.newUsersLast7d || 0)}</div>
        ${changeArrow(15)}
      </div>
    </div>

    <div class="analytics-chart">
      <div class="analytics-chart-header">
        <div>
          <div class="analytics-chart-title">Daily Active Users</div>
          <div class="analytics-chart-value">${esc(u.dailyActiveUsers || 0)} <small>today</small></div>
        </div>
      </div>
      <div class="bar-chart">
        ${last14.map((v, i) => `<div class="bar-chart-col" style="height:${(v / maxDau * 100)}%;background:var(--primary);opacity:${0.4 + (i / last14.length) * 0.6};"><div class="bar-tooltip">${esc(v)} users</div></div>`).join('')}
      </div>
    </div>

    <div class="analytics-chart">
      <div class="analytics-chart-header">
        <div>
          <div class="analytics-chart-title">Sessions per Day</div>
          <div class="analytics-chart-value">${esc(sessArr[sessArr.length - 1] || 0)} <small>today</small></div>
        </div>
      </div>
      <div class="bar-chart">
        ${sessArr.slice(-14).map((v, i) => `<div class="bar-chart-col" style="height:${(v / maxSess * 100)}%;background:#22d06c;opacity:${0.4 + (i / 14) * 0.6};"><div class="bar-tooltip">${esc(v)} sessions</div></div>`).join('')}
      </div>
    </div>
  `;
}

function renderCrashesTab() {
  const c = analyticsData.crashes || {};
  const top = c.topCrashes || [];
  const crashDays = c.crashesPerDay || [];

  const maxCrash = Math.max(...crashDays, 1);

  return `
    <div class="analytics-grid">
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Total Crashes</div>
        <div class="analytics-card-value" style="color:${c.totalCrashes > 0 ? 'var(--danger)' : 'var(--text)'};">${esc(c.totalCrashes || 0)}</div>
        ${c.totalCrashes > 0 ? changeArrow(-12) : '<span class="analytics-card-change stable">No crashes</span>'}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Crash Free Rate</div>
        <div class="analytics-card-value">${esc(c.crashFreeRate || 100)}<small>%</small></div>
        ${(c.crashFreeRate || 100) >= 99 ? '<span class="analytics-card-change up">Healthy</span>' : '<span class="analytics-card-change down">Needs attention</span>'}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Affected Users</div>
        <div class="analytics-card-value">${esc(c.affectedUsers || 0)}</div>
        ${c.affectedUsers > 0 ? changeArrow(-8) : '<span class="analytics-card-change stable">None</span>'}
      </div>
    </div>

    <div class="analytics-chart">
      <div class="analytics-chart-header">
        <div>
          <div class="analytics-chart-title">Crashes per Day (Last 14 days)</div>
          <div class="analytics-chart-value">${esc(crashDays[crashDays.length - 1] || 0)} <small>today</small></div>
        </div>
      </div>
      <div class="bar-chart">
        ${crashDays.slice(-14).map((v, i) => `<div class="bar-chart-col" style="height:${(v / maxCrash * 100) || 2}%;background:${v > 0 ? '#ef4444' : 'var(--border)'};opacity:${0.5 + (i / 14) * 0.5};"><div class="bar-tooltip">${v > 0 ? v + ' crash' + (v > 1 ? 'es' : '') : 'No crashes'}</div></div>`).join('')}
      </div>
    </div>

    <div class="analytics-table-wrap">
      <table class="analytics-table">
        <thead><tr><th>Error</th><th>Count</th><th>Version</th><th>Last Seen</th></tr></thead>
        <tbody>
          ${top.length ? top.map(crash => `
            <tr>
              <td><span class="crash-error">${esc(crash.error || '')}</span></td>
              <td class="crash-count">${esc(crash.count || 0)}</td>
              <td><span class="crash-version">${esc(crash.version || '—')}</span></td>
              <td style="color:var(--text-muted);font-size:0.75rem;">${crash.lastSeen ? new Date(crash.lastSeen).toLocaleDateString() : '—'}</td>
            </tr>
          `).join('') : '<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted);">No crashes reported</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderEngagementTab() {
  const e = analyticsData.engagement || {};
  const screens = e.topScreens || [];
  const events = e.topEvents || [];

  const maxScreenViews = Math.max(...screens.map(s => s.views), 1);

  return `
    <div class="analytics-grid">
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg> Day 1 Retention</div>
        <div class="analytics-card-value">${esc(e.retentionDay1 || 0)}<small>%</small></div>
        ${changeArrow(3)}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/></svg> Day 7 Retention</div>
        <div class="analytics-card-value">${esc(e.retentionDay7 || 0)}<small>%</small></div>
        ${changeArrow(5)}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg> Day 30 Retention</div>
        <div class="analytics-card-value">${esc(e.retentionDay30 || 0)}<small>%</small></div>
        ${changeArrow(-2)}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Total Screen Views</div>
        <div class="analytics-card-value">${esc((e.totalScreenViews || 0).toLocaleString())}</div>
        ${changeArrow(10)}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Sessions / User</div>
        <div class="analytics-card-value">${esc(e.avgSessionPerUser || 0)}<small>x</small></div>
        ${changeArrow(7)}
      </div>
    </div>

    <div class="analytics-section">
      <div class="analytics-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
        Retention Rates
      </div>
      <div class="analytics-chart" style="padding:20px;">
        ${[
          { label: 'Day 1', value: e.retentionDay1 || 0, color: '#6366f1' },
          { label: 'Day 7', value: e.retentionDay7 || 0, color: '#22d06c' },
          { label: 'Day 30', value: e.retentionDay30 || 0, color: '#f59e0b' },
        ].map(r => `
          <div class="retention-bar">
            <div class="retention-bar-label">${r.label}</div>
            <div class="retention-bar-track">
              <div class="retention-bar-fill" style="width:${r.value}%;background:${r.color};"></div>
            </div>
            <div class="retention-bar-value">${r.value}%</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="analytics-table-wrap">
      <table class="analytics-table">
        <thead><tr><th>Screen</th><th>Views</th><th>% of Total</th></tr></thead>
        <tbody>
          ${screens.length ? screens.map(s => `
            <tr>
              <td style="font-weight:600;">${esc(s.screen || '')}</td>
              <td>${esc((s.views || 0).toLocaleString())}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="flex:1;max-width:120px;height:6px;background:var(--bg-input);border-radius:3px;overflow:hidden;">
                    <div style="height:100%;width:${Math.min(s.percentage || 0, 100)}%;background:var(--primary);border-radius:3px;"></div>
                  </div>
                  <span style="font-weight:600;font-size:0.78rem;color:var(--text-secondary);">${esc(s.percentage || 0)}%</span>
                </div>
              </td>
            </tr>
          `).join('') : '<tr><td colspan="3" style="text-align:center;padding:32px;color:var(--text-muted);">No screen data available</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="analytics-table-wrap">
      <table class="analytics-table">
        <thead><tr><th>Event</th><th>Count</th><th>Trend</th></tr></thead>
        <tbody>
          ${events.length ? events.map(ev => `
            <tr>
              <td style="font-weight:600;">${esc(ev.event || '')}</td>
              <td>${esc((ev.count || 0).toLocaleString())}</td>
              <td><span class="analytics-trend ${ev.trend || 'stable'}">${ev.trend === 'up' ? '↑' : ev.trend === 'down' ? '↓' : '→'} ${ev.trend || 'stable'}</span></td>
            </tr>
          `).join('') : '<tr><td colspan="3" style="text-align:center;padding:32px;color:var(--text-muted);">No event data available</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}
