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
let currentUser = null;
let authMode = 'login';
let pendingConfirm = null;

// ── API ──

function getToken() { return localStorage.getItem('apt_token'); }
function setToken(t) { if (t) localStorage.setItem('apt_token', t); else localStorage.removeItem('apt_token'); }
function setUserData(u) { if (u) localStorage.setItem('apt_user', JSON.stringify(u)); else localStorage.removeItem('apt_user'); }
function getDeviceId() {
    let id = localStorage.getItem('apt_device_id');
    if (!id) { id = crypto.randomUUID ? crypto.randomUUID() : 'd' + Date.now() + Math.random().toString(36).slice(2); localStorage.setItem('apt_device_id', id); }
    return id;
}

function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    const t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
}

async function api(method, path, body) {
    const res = await fetch(API + path, {
        method,
        headers: authHeaders(),
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Request failed');

    // ── Firebase Firestore Sync Hook ──
    try {
        if (method === 'POST' && path === '/apps' && data && data.app_id) {
            db.collection('apps').doc(data.app_id).set({
                userId: currentUser ? currentUser.id : 'anonymous',
                appName: body.config ? body.config.app_name : 'App',
                config: body,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.error("Firestore Create Error:", err));
        } else if (method === 'PUT' && path.startsWith('/apps/')) {
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
}

// ── Toast ──

function toast(text, type) {
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || '');
    el.textContent = text;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// ── Modals ──

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
window.openModal = openModal;
window.closeModal = closeModal;

function confirm(title, message) {
    return new Promise(resolve => {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        pendingConfirm = resolve;
        openModal('confirmModal');
    });
}
document.getElementById('confirmBtn').addEventListener('click', () => {
    closeModal('confirmModal');
    if (pendingConfirm) { pendingConfirm(true); pendingConfirm = null; }
});
document.getElementById('confirmModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) { closeModal('confirmModal'); if (pendingConfirm) { pendingConfirm(false); pendingConfirm = null; } }
});

// ── View Switching ──

// ── Theme Toggle ──

function getTheme() {
  return localStorage.getItem('apt_theme') || 'dark';
}

function setTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('apt_theme', name);
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  icon.innerHTML = name === 'light'
    ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

window.toggleTheme = toggleTheme;

// Init theme after DOM ready
function initTheme() {
  setTheme(getTheme());
  document.getElementById('themeToggle')?.addEventListener('click', function(e) {
    e.preventDefault();
    toggleTheme();
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}

// Listen for save command from parent dashboard iframe
window.addEventListener('message', (e) => {
  if (e.data === 'save') {
    const btn = document.getElementById('builderSaveBtn') || document.querySelector('.builder-toolbar .btn-success');
    if (btn) btn.click();
    else saveBuilderChanges();
  }
});

function switchView(name) {
    // Special handling: if entering app-dashboard, hide sidebar + header for full-page look
    if (name === 'app-dashboard') {
        document.querySelector('.sidebar').style.display = 'none';
        document.getElementById('mainHeader').style.display = 'none';
    } else {
        document.querySelector('.sidebar').style.display = '';
        document.getElementById('mainHeader').style.display = '';
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-view="' + name + '"]')?.classList.add('active');

    // Update header
    const headers = {
        apps: { title: 'My Apps', subtitle: 'Your React Native apps, generated and ready to build' },
        create: { title: document.getElementById('editAppId').value ? 'Edit App' : 'New App', subtitle: document.getElementById('editAppId').value ? 'Modify your app configuration' : 'Describe your app idea — we\'ll write the React Native code' },
        builder: { title: 'App Builder', subtitle: 'Visually edit your app pages and blocks' },
        builds: { title: 'Build History', subtitle: 'Track your EAS cloud builds' },
    };
    const h = headers[name] || headers.apps;
    document.getElementById('headerTitle').textContent = h.title;
    document.getElementById('headerSubtitle').textContent = h.subtitle;

    // Update header actions
    const actions = document.getElementById('headerActions');
    if (name === 'apps') {
        actions.innerHTML = '<button class="btn btn-primary" onclick="resetForm();switchView(\'create\')">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
            'New App</button>' +
            '<button class="btn btn-ghost" title="Refresh" onclick="loadApps()">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>';
    } else if (name === 'create') {
        actions.innerHTML = '<button class="btn btn-secondary" onclick="switchView(\'apps\')">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>' +
            'Back</button>';
    } else if (name === 'app-dashboard') {
        actions.innerHTML = '';
    } else {
        actions.innerHTML = '<button class="btn btn-secondary" onclick="switchView(\'apps\')">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>' +
            'Back</button>';
    }

    if (name === 'create' && !document.getElementById('editAppId').value) {
        document.getElementById('formSubmitBtn').textContent = 'Generate App';
        document.getElementById('formCancelBtn').classList.add('hidden');
    }
    if (name === 'apps') loadApps();
    if (name === 'builds') loadAllBuilds();
    if (name === 'builder' && !builderAppId) {
        document.getElementById('headerSubtitle').textContent = 'Select an app to edit';
    }
}
window.switchView = switchView;

// ── Auth ──

async function checkAuth() {
    // Pre-fill from cached login data
    const cached = localStorage.getItem('apt_user');
    if (cached) {
        try { currentUser = JSON.parse(cached); renderUser(); } catch (e) {}
    }
    try {
        currentUser = await api('GET', '/auth/me');
        setUserData(currentUser);
        renderUser();
    } catch { renderUser(); }
}

function renderUser() {
    const info = document.getElementById('userInfo');
    const btn = document.getElementById('authBtn');
    const banner = document.getElementById('anonBanner');
    if (currentUser) {
        info.textContent = currentUser.name || currentUser.email;
        info.classList.remove('hidden');
        btn.textContent = 'Sign Out';
        if (banner) banner.style.display = 'none';
    } else {
        info.classList.add('hidden');
        btn.textContent = 'Sign In';
        if (banner) banner.style.display = 'block';
    }
}

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    document.getElementById('authTitle').textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
    document.getElementById('authSubmitBtn').textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
    document.getElementById('authNameGroup').classList.toggle('hidden', authMode === 'login');
    document.getElementById('authToggle').textContent = authMode === 'login' ? 'Create account' : 'Already have an account?';
}
window.toggleAuthMode = toggleAuthMode;

document.getElementById('authBtn').addEventListener('click', () => {
    if (currentUser) {
        try { auth.signOut(); } catch (e) {}
        setToken(null);
        setUserData(null);
        currentUser = null;
        renderUser();
        toast('Signed out successfully');
        loadApps();
    } else {
        authMode = 'login';
        document.getElementById('authTitle').textContent = 'Sign In';
        document.getElementById('authSubmitBtn').textContent = 'Sign In';
        document.getElementById('authNameGroup').classList.add('hidden');
        document.getElementById('authToggle').textContent = 'Create account';
        openModal('authModal');
    }
});

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;
    try {
        let isLocalMode = firebaseConfig.apiKey === "demo-apt-project-key";
        let res;

        if (isLocalMode) {
            // Local Mode Auth directly against Rust SQLite database!
            const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
            const payload = authMode === 'login' ? { email, password } : { email, password, name, device_id: getDeviceId() };
            
            const localRes = await fetch(API + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            res = await localRes.json();
            if (!localRes.ok) throw new Error(res.message || res.error || 'Authentication failed');
            toast(authMode === 'login' ? 'Signed in locally!' : 'Local account created!');
        } else {
            // Real Firebase Auth with a fallback on error
            try {
                let user;
                if (authMode === 'login') {
                    const result = await auth.signInWithEmailAndPassword(email, password);
                    user = result.user;
                } else {
                    const result = await auth.createUserWithEmailAndPassword(email, password);
                    user = result.user;
                    if (name) {
                        await user.updateProfile({ displayName: name });
                    }
                }

                // Sync with local Rust backend to get standard JWT token
                const syncRes = await fetch(API + '/auth/firebase-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: user.email,
                        uid: user.uid,
                        name: user.displayName || name || user.email.split('@')[0]
                    })
                });
                res = await syncRes.json();
                if (!syncRes.ok) throw new Error(res.message || 'Firebase sync failed');
                toast(authMode === 'login' ? 'Signed in via Firebase!' : 'Account created via Firebase!');
            } catch (fe) {
                console.warn("Firebase Auth failed, attempting local fallback:", fe);
                // Graceful fallback to local Auth if Firebase has invalid credentials or configuration!
                const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
                const payload = authMode === 'login' ? { email, password } : { email, password, name, device_id: getDeviceId() };
                
                const localRes = await fetch(API + endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                res = await localRes.json();
                if (!localRes.ok) throw new Error(res.message || res.error || 'Authentication failed');
                
                toast('Firebase auth unavailable. Logged in locally.', 'info');
            }
        }

        setToken(res.token);
        currentUser = res.user;
        setUserData(res.user);
        renderUser();
        closeModal('authModal');
        
        document.getElementById('authEmail').value = '';
        document.getElementById('authPassword').value = '';
        document.getElementById('authName').value = '';
        loadApps();
    } catch (err) {
        toast(err.message, 'error');
    }
});

// ── Step Wizard ──

let currentStep = 1;

function goToStep(n) {
    currentStep = n;
    document.querySelectorAll('.step').forEach(s => {
        const stepNum = parseInt(s.dataset.step);
        s.classList.toggle('active', stepNum === n);
        s.classList.toggle('completed', stepNum < n);
    });
    document.querySelectorAll('.step-panel').forEach(p => p.classList.toggle('hidden', parseInt(p.dataset.step) !== n));

    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const submitBtn = document.getElementById('formSubmitBtn');
    const cancelBtn = document.getElementById('formCancelBtn');

    prevBtn.classList.toggle('hidden', n === 1);
    nextBtn.classList.toggle('hidden', n === 4);
    submitBtn.classList.toggle('hidden', n !== 4);
    cancelBtn.classList.toggle('hidden', !document.getElementById('editAppId').value || n !== 4);

    if (n === 4) updateReview();
    if (n === 3) updateLivePreview();
}

function nextStep() {
    if (currentStep === 1) {
        const appName = document.getElementById('appName').value.trim();
        const displayName = document.getElementById('displayName').value.trim();
        const packageName = document.getElementById('packageName').value.trim();
        const version = document.getElementById('version').value.trim();

        if (!appName) { toast('Enter an app name', 'error'); return; }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(appName)) { toast('App name must start with a letter and contain only letters and numbers', 'error'); return; }
        if (!displayName) { toast('Enter a display name', 'error'); return; }
        if (!packageName) { toast('Enter a package name', 'error'); return; }
        if (!/^\d+\.\d+\.\d+$/.test(version)) { toast('Version must be semver format (e.g. 1.0.0)', 'error'); return; }

        // Auto-generate display name from app name if not set
        if (!displayName) document.getElementById('displayName').value = appName;
        // Auto-generate package name
        if (!packageName) {
            document.getElementById('packageName').value = 'com.' + appName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.app';
        }
    }
    if (currentStep < 4) goToStep(currentStep + 1);
}
window.nextStep = nextStep;

function prevStep() { if (currentStep > 1) goToStep(currentStep - 1); }
window.prevStep = prevStep;

// ── App Purpose / Templates ──

const APP_TEMPLATES = {
    business: {
        pages: [
            { name: 'Home', icon: '⌂', elements: [{ type: 'heading', properties: { value: 'Welcome' } }, { type: 'text', properties: { value: 'Your trusted partner since 2024' } }] },
            { name: 'Services', icon: '⚙', elements: [{ type: 'heading', properties: { value: 'Our Services' } }, { type: 'text', properties: { value: 'Discover what we offer' } }] },
            { name: 'Contact', icon: '☏', elements: [{ type: 'heading', properties: { value: 'Get in Touch' } }, { type: 'text', properties: { value: 'Reach out to us anytime' } }] },
            { name: 'About', icon: 'ℹ', elements: [{ type: 'heading', properties: { value: 'About Us' } }, { type: 'text', properties: { value: 'Learn our story' } }] },
        ]
    },
    ecommerce: {
        pages: [
            { name: 'Home', icon: '⌂', elements: [{ type: 'banner', properties: { value: 'Big Sale!', placeholder: 'Up to 50% off' } }] },
            { name: 'Products', icon: '▣', elements: [{ type: 'heading', properties: { value: 'All Products' } }, { type: 'grid', properties: { gridCols: 2 } }] },
            { name: 'Cart', icon: '⎗', elements: [{ type: 'heading', properties: { value: 'Shopping Cart' } }] },
            { name: 'Profile', icon: '○', elements: [{ type: 'heading', properties: { value: 'My Account' } }] },
        ]
    },
    social: {
        pages: [
            { name: 'Feed', icon: '▤', elements: [{ type: 'heading', properties: { value: 'Feed' } }] },
            { name: 'Explore', icon: '⌕', elements: [{ type: 'heading', properties: { value: 'Explore' } }] },
            { name: 'Chat', icon: '✉', elements: [{ type: 'heading', properties: { value: 'Messages' } }] },
            { name: 'Profile', icon: '○', elements: [{ type: 'heading', properties: { value: 'My Profile' } }] },
        ]
    },
    portfolio: {
        pages: [
            { name: 'Home', icon: '⌂', elements: [{ type: 'heading', properties: { value: "Hello, I'm" } }, { type: 'text', properties: { value: 'Designer & Developer' } }] },
            { name: 'Work', icon: '✦', elements: [{ type: 'heading', properties: { value: 'My Work' } }, { type: 'grid', properties: { gridCols: 2 } }] },
            { name: 'Resume', icon: '▤', elements: [{ type: 'heading', properties: { value: 'Experience' } }] },
            { name: 'Contact', icon: '☏', elements: [{ type: 'heading', properties: { value: 'Get in Touch' } }] },
        ]
    },
    custom: {
        pages: [
            { name: 'Home', icon: '⌂', elements: [{ type: 'heading', properties: { value: 'Welcome' } }] },
        ]
    }
};

let selectedPurpose = null;
let formPages = [];
let pageIdCounter = 0;
let builderActivePageId = null;
let selectedBlockId = null;
let blockIdCounter = 0;

// ── Purpose Selection ──

function selectPurpose(purpose) {
    selectedPurpose = purpose;
    document.querySelectorAll('.purpose-card').forEach(c => c.classList.toggle('selected', c.dataset.purpose === purpose));
    const template = APP_TEMPLATES[purpose];
    if (template) {
        formPages = template.pages.map((p, i) => ({
            id: 'page_' + (i + 1),
            name: p.name,
            icon: p.icon,
            elements: JSON.parse(JSON.stringify(p.elements || [])),
        }));
        pageIdCounter = formPages.length;
        blockIdCounter = countAllBlocks();
        builderActivePageId = formPages.length > 0 ? formPages[0].id : null;
        selectedBlockId = null;
        renderBuilder();
        updateLivePreview();
    }
}
window.selectPurpose = selectPurpose;

function countAllBlocks() {
    let n = 0;
    formPages.forEach(p => { p.elements.forEach(e => { n = Math.max(n, extractBlockId(e.id)); countChildrenIds(e.children, n); }); });
    return n;
    function extractBlockId(id) { const m = parseInt((id || 'b_0').replace('b_', ''), 10); return isNaN(m) ? 0 : m; }
    function countChildrenIds(children, max) { if (!children) return; children.forEach(c => { max = Math.max(max, extractBlockId(c.id)); countChildrenIds(c.children, max); }); }
}

// ── Block Defaults ──

const BLOCK_DEFAULTS = {
    container: { label: 'Container', properties: {}, children: [] },
    grid: { label: 'Grid', properties: { gridCols: 2 }, children: [] },
    card: { label: 'Card', properties: {}, children: [] },
    tabs: { label: 'Tabs', properties: { tabHeaders: 'Tab 1,Tab 2', activeTab: 0 }, children: [] },
    heading: { label: 'Heading', properties: { value: 'Heading' } },
    text: { label: 'Text', properties: { value: 'Text content' } },
    divider: { label: 'Divider', properties: {} },
    image: { label: 'Image', properties: { src: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80' } },
    video: { label: 'Video', properties: { src: '' } },
    icon: { label: 'Icon', properties: { iconName: 'Heart', iconSize: 24 } },
    button: { label: 'Button', properties: { value: 'Click Me' }, actions: { onClick: { type: 'none' } } },
    input: { label: 'Input', properties: { placeholder: 'Type here...' }, actions: { onChange: { type: 'none' } } },
    textarea: { label: 'Textarea', properties: { placeholder: 'Write...' }, actions: { onChange: { type: 'none' } } },
    select: { label: 'Select', properties: { options: 'Option 1,Option 2' }, actions: { onChange: { type: 'none' } } },
    checkbox: { label: 'Checkbox', properties: {} },
    switch: { label: 'Switch', properties: {} },
    table: { label: 'Table', properties: { dataSource: '', columns: 'Name,Value' } },
    list: { label: 'List', properties: { dataSource: '' } },
    chart: { label: 'Chart', properties: { chartType: 'bar' } },
    carousel: { label: 'Carousel', properties: { src: '' } },
    banner: { label: 'Banner', properties: { value: 'Big Sale', placeholder: 'Limited time offer', src: '' } },
    map: { label: 'Map', properties: { mapLocation: 'New York' } },
};

const BLOCK_CATEGORIES = [
    {
        name: 'Layout', items: [
            { type: 'container', icon: '▣', label: 'Container' },
            { type: 'grid', icon: '⊞', label: 'Grid' },
            { type: 'card', icon: '▢', label: 'Card' },
            { type: 'tabs', icon: '≡', label: 'Tabs' },
            { type: 'divider', icon: '―', label: 'Divider' },
        ]
    },
    {
        name: 'Content', items: [
            { type: 'heading', icon: 'H', label: 'Heading' },
            { type: 'text', icon: '¶', label: 'Text' },
            { type: 'image', icon: '▩', label: 'Image' },
            { type: 'video', icon: '▶', label: 'Video' },
            { type: 'icon', icon: '♡', label: 'Icon' },
        ]
    },
    {
        name: 'Interactive', items: [
            { type: 'button', icon: '▭', label: 'Button' },
            { type: 'input', icon: '▭', label: 'Input' },
            { type: 'textarea', icon: '☰', label: 'Textarea' },
            { type: 'select', icon: '▼', label: 'Select' },
            { type: 'checkbox', icon: '☐', label: 'Checkbox' },
            { type: 'switch', icon: '⬡', label: 'Switch' },
        ]
    },
    {
        name: 'Data & Media', items: [
            { type: 'table', icon: '⊟', label: 'Table' },
            { type: 'list', icon: '☰', label: 'List' },
            { type: 'chart', icon: '⬚', label: 'Chart' },
            { type: 'carousel', icon: '❮', label: 'Carousel' },
            { type: 'banner', icon: '▬', label: 'Banner' },
            { type: 'map', icon: '⌖', label: 'Map' },
        ]
    },
];

function createDefaultBlock(type) {
    blockIdCounter++;
    const def = BLOCK_DEFAULTS[type] || BLOCK_DEFAULTS.text;
    return {
        id: 'b_' + blockIdCounter,
        type: type,
        label: def.label,
        styles: {},
        properties: JSON.parse(JSON.stringify(def.properties || {})),
        actions: JSON.parse(JSON.stringify(def.actions || {})),
        children: def.children ? [] : undefined,
    };
}

// ── Page Management ──

function addPage(name) {
    pageIdCounter++;
    const id = 'page_' + pageIdCounter;
    formPages.push({ id, name: name || 'Page ' + pageIdCounter, icon: '▤', elements: [] });
    builderActivePageId = id;
    selectedBlockId = null;
    renderBuilder();
    updateLivePreview();
}
window.addPage = addPage;

function removePage(pageId) {
    if (formPages.length <= 1) { toast('Need at least one page', 'error'); return; }
    formPages = formPages.filter(p => p.id !== pageId);
    if (builderActivePageId === pageId) builderActivePageId = formPages.length > 0 ? formPages[formPages.length - 1].id : null;
    selectedBlockId = null;
    renderBuilder();
    updateLivePreview();
}
window.removePage = removePage;

function selectBuilderPage(pageId) {
    builderActivePageId = pageId;
    selectedBlockId = null;
    renderBuilder();
}
window.selectBuilderPage = selectBuilderPage;

// ── Block Operations ──

function addBlock(type) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) { toast('Select a page first', 'error'); return; }
    const block = createDefaultBlock(type);
    page.elements.push(block);
    selectedBlockId = block.id;
    renderBuilder();
    updateLivePreview();
}
window.addBlock = addBlock;

function removeBlock(elementId) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) return;
    page.elements = page.elements.filter(e => e.id !== elementId);
    if (selectedBlockId === elementId) selectedBlockId = null;
    renderBuilder();
    updateLivePreview();
}
window.removeBlock = removeBlock;

function moveBlock(elementId, dir) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) return;
    const idx = page.elements.findIndex(e => e.id === elementId);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= page.elements.length) return;
    [page.elements[idx], page.elements[newIdx]] = [page.elements[newIdx], page.elements[idx]];
    renderBuilder();
    updateLivePreview();
}
window.moveBlock = moveBlock;

function selectBlock(elementId) {
    selectedBlockId = selectedBlockId === elementId ? null : elementId;
    renderBuilder();
}
window.selectBlock = selectBlock;

function updateBlockProp(elementId, key, value) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) return;
    const el = page.elements.find(e => e.id === elementId);
    if (!el) return;
    el.properties[key] = value;
    renderBuilderCanvas();
    renderPropsPanel();
    updateLivePreview();
}
window.updateBlockProp = updateBlockProp;

function updateBlockStyle(elementId, key, value) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) return;
    const el = page.elements.find(e => e.id === elementId);
    if (!el) return;
    if (value === '' || value === undefined) { delete el.styles[key]; }
    else { el.styles[key] = value; }
    renderBuilderCanvas();
    renderPropsPanel();
    updateLivePreview();
}
window.updateBlockStyle = updateBlockStyle;

function updateBlockLabel(elementId, value) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) return;
    const el = page.elements.find(e => e.id === elementId);
    if (!el) return;
    el.label = value;
}
window.updateBlockLabel = updateBlockLabel;

function updateBlockAction(elementId, actionKey, field, value) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) return;
    const el = page.elements.find(e => e.id === elementId);
    if (!el) return;
    if (!el.actions) el.actions = {};
    if (!el.actions[actionKey]) el.actions[actionKey] = { type: 'none' };
    el.actions[actionKey][field] = value;
}
window.updateBlockAction = updateBlockAction;

// ── Render Builder ──

function renderBuilder() {
    renderBuilderPageTabs();
    renderPalette();
    renderBuilderCanvas();
    renderPropsPanel();
}

function renderBuilderPageTabs() {
    const container = document.getElementById('builderPageTabs');
    container.innerHTML = formPages.map(p =>
        '<div class="builder-page-tab' + (p.id === builderActivePageId ? ' active' : '') + '" onclick="selectBuilderPage(\'' + p.id + '\')">' +
        esc(p.icon || '▤') + ' ' + esc(p.name) +
        '<button class="tab-close" onclick="event.stopPropagation();removePage(\'' + p.id + '\')">&times;</button>' +
        '</div>'
    ).join('');
    if (formPages.length === 0) {
        container.innerHTML = '<div style="font-size:0.75rem;color:var(--text-muted);padding:6px 0">No pages. Click "Add" to create one.</div>';
    }
}

function renderPalette() {
    const sections = document.getElementById('paletteSections');
    sections.innerHTML = BLOCK_CATEGORIES.map(cat =>
        '<div class="palette-section">' +
        '<div class="palette-title">' + esc(cat.name) + '</div>' +
        '<div class="palette-items">' +
        cat.items.map(item =>
            '<div class="palette-item" onclick="addBlock(\'' + item.type + '\')" title="' + esc(item.label) + '">' +
            '<span class="palette-item-icon">' + item.icon + '</span> ' + esc(item.label) +
            '</div>'
        ).join('') +
        '</div></div>'
    ).join('');
}

function filterPalette(query) {
    document.querySelectorAll('.palette-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = !query || text.includes(query.toLowerCase()) ? '' : 'none';
    });
    document.querySelectorAll('.palette-section').forEach(section => {
        const visible = section.querySelectorAll('.palette-item[style*="display: none"]').length < section.querySelectorAll('.palette-item').length;
        section.style.display = visible || !query ? '' : 'none';
    });
}
window.filterPalette = filterPalette;

function renderBuilderCanvas() {
    const screen = document.getElementById('builderCanvas');
    const page = formPages.find(p => p.id === builderActivePageId);
    const nameEl = document.getElementById('builderPageName');
    const countEl = document.getElementById('builderBlockCount');

    if (!page) {
        screen.innerHTML = '<div class="builder-empty">Select a page or create one</div>';
        nameEl.textContent = 'No page selected';
        countEl.textContent = '';
        return;
    }

    nameEl.textContent = esc(page.icon || '▤') + ' ' + esc(page.name);
    countEl.textContent = page.elements.length + ' blocks';

    if (page.elements.length === 0) {
        screen.innerHTML = '<div class="builder-empty">Click blocks from the palette to add them</div>';
        return;
    }

    screen.innerHTML = page.elements.map((el, idx) => {
        const selected = el.id === selectedBlockId;
        const preview = renderMiniBlock(el);
        return '<div class="builder-block' + (selected ? ' selected' : '') + '" onclick="selectBlock(\'' + el.id + '\')" data-id="' + el.id + '">' +
            '<div class="builder-block-toolbar">' +
            (idx > 0 ? '<button onclick="event.stopPropagation();moveBlock(\'' + el.id + '\',' + (-1) + ')" title="Move up">↑</button>' : '') +
            (idx < page.elements.length - 1 ? '<button onclick="event.stopPropagation();moveBlock(\'' + el.id + '\',' + 1 + ')" title="Move down">↓</button>' : '') +
            '<button class="danger" onclick="event.stopPropagation();removeBlock(\'' + el.id + '\')" title="Delete">✕</button>' +
            '</div>' +
            '<div class="builder-block-content">' + preview + '</div>' +
            '</div>';
    }).join('');
}

function renderMiniBlock(el) {
    const props = el.properties || {};
    const icon = getBlockIcon(el.type);
    switch (el.type) {
        case 'heading': return '<div style="font-size:' + (el.styles.fontSize || '13') + 'px;font-weight:' + (el.styles.fontWeight || '700') + ';color:' + (el.styles.color || '#0f172a') + '">' + esc(props.value || 'Heading') + '</div>';
        case 'text': return '<div style="font-size:' + (el.styles.fontSize || '10') + 'px;color:' + (el.styles.color || '#475569') + ';line-height:1.4">' + esc(props.value || 'Text') + '</div>';
        case 'button': return '<div style="padding:8px;background:' + (el.styles.backgroundColor || '#6366f1') + ';color:' + (el.styles.color || '#fff') + ';border-radius:' + (el.styles.borderRadius || '6') + 'px;text-align:center;font-size:10px;font-weight:600">' + esc(props.value || 'Button') + '</div>';
        case 'image': return '<div style="height:50px;background:#e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8">▩ ' + esc(props.src || 'No image') + '</div>';
        case 'divider': return '<div style="border-top:1px solid #e2e8f0;margin:4px 0"></div>';
        case 'banner': return '<div style="padding:16px 10px;background:' + (el.styles.backgroundColor || '#6366f1') + ';color:#fff;border-radius:8px;font-size:10px;font-weight:600;text-align:center">' + esc(props.value || 'Banner') + '</div>';
        case 'grid': return '<div style="font-size:9px;color:#94a3b8;padding:4px 0">⊞ Grid (' + (props.gridCols || 2) + ' cols)</div>';
        case 'card': return '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:9px;color:#94a3b8">▢ Card container</div>';
        case 'container': return '<div style="border:1px dashed #e2e8f0;border-radius:4px;padding:6px;font-size:9px;color:#94a3b8">▣ Container</div>';
        case 'icon': return '<div style="font-size:9px;color:#94a3b8">♡ ' + esc(props.iconName || 'Heart') + '</div>';
        case 'input': return '<div style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:9px;color:#94a3b8">⌨ ' + esc(props.placeholder || 'Input') + '</div>';
        case 'textarea': return '<div style="padding:10px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:9px;color:#94a3b8">☰ ' + esc(props.placeholder || 'Textarea') + '</div>';
        case 'select': return '<div style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:9px;color:#94a3b8">▼ ' + esc(props.options || 'Select') + '</div>';
        case 'checkbox': return '<div style="font-size:9px;color:#475569">☐ ' + esc(el.label || 'Checkbox') + '</div>';
        case 'switch': return '<div style="font-size:9px;color:#475569">⬡ ' + esc(el.label || 'Switch') + '</div>';
        case 'tabs': return '<div style="display:flex;gap:2px">' + (props.tabHeaders || 'Tab 1,Tab 2').split(',').slice(0, 3).map(t => '<div style="padding:4px 6px;font-size:8px;background:#e2e8f0;border-radius:4px">' + esc(t.trim()) + '</div>').join('') + '</div>';
        case 'table': return '<div style="font-size:9px;color:#94a3b8">⊟ Table: ' + esc(props.dataSource || 'No data') + '</div>';
        case 'list': return '<div style="font-size:9px;color:#94a3b8">☰ List: ' + esc(props.dataSource || 'No data') + '</div>';
        case 'chart': return '<div style="font-size:9px;color:#94a3b8">⬚ Chart (' + esc(props.chartType || 'bar') + ')</div>';
        case 'carousel': return '<div style="font-size:9px;color:#94a3b8">❮ Carousel</div>';
        case 'map': return '<div style="font-size:9px;color:#94a3b8">⌖ Map: ' + esc(props.mapLocation || 'Location') + '</div>';
        case 'video': return '<div style="font-size:9px;color:#94a3b8">▶ Video</div>';
        default: return '<div style="font-size:9px;color:#94a3b8">' + icon + ' ' + esc(el.type) + '</div>';
    }
}

function getBlockIcon(type) {
    for (const cat of BLOCK_CATEGORIES) {
        const found = cat.items.find(i => i.type === type);
        if (found) return found.icon;
    }
    return '•';
}

// ── Properties Panel ──

function renderPropsPanel() {
    const body = document.getElementById('propsBody');
    const title = document.getElementById('propsTitle');
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page || !selectedBlockId) {
        title.textContent = 'Properties';
        body.innerHTML = '<div class="props-empty">Select a block to edit its properties</div>';
        return;
    }
    const el = page.elements.find(e => e.id === selectedBlockId);
    if (!el) {
        title.textContent = 'Properties';
        body.innerHTML = '<div class="props-empty">Block not found</div>';
        return;
    }

    title.textContent = getBlockIcon(el.type) + ' ' + esc(el.label || el.type);

    const props = el.properties || {};
    const styles = el.styles || {};
    const actions = el.actions || {};

    let html = '';

    // Label
    html += '<div class="prop-group"><label class="prop-label">Label</label>' +
        '<div class="prop-row"><input type="text" value="' + esc(el.label) + '" onchange="updateBlockLabel(\'' + el.id + '\',this.value)"></div></div>';

    // Type-specific properties
    html += '<div class="prop-section-title">Properties</div>';

    switch (el.type) {
        case 'heading': case 'text':
            html += propInput(el.id, 'value', 'Text', props.value);
            break;
        case 'button':
            html += propInput(el.id, 'value', 'Label', props.value);
            html += propActionSelect(el.id, 'onClick', actions.onClick);
            if (actions.onClick && actions.onClick.type !== 'none') {
                html += renderActionFields(el.id, 'onClick', actions.onClick);
            }
            break;
        case 'image': case 'video': case 'banner':
            html += propInput(el.id, 'src', 'Source URL', props.src);
            if (el.type === 'banner') {
                html += propInput(el.id, 'value', 'Title', props.value);
                html += propInput(el.id, 'placeholder', 'Subtitle', props.placeholder);
            }
            break;
        case 'input': case 'textarea':
            html += propInput(el.id, 'placeholder', 'Placeholder', props.placeholder);
            html += propActionSelect(el.id, 'onChange', actions.onChange);
            break;
        case 'select':
            html += propInput(el.id, 'options', 'Options (comma sep)', props.options);
            html += propActionSelect(el.id, 'onChange', actions.onChange);
            break;
        case 'icon':
            html += propInput(el.id, 'iconName', 'Icon Name', props.iconName);
            html += propInput(el.id, 'iconSize', 'Size (px)', props.iconSize);
            break;
        case 'grid':
            html += propInput(el.id, 'gridCols', 'Columns', props.gridCols);
            break;
        case 'tabs':
            html += propInput(el.id, 'tabHeaders', 'Tabs (comma sep)', props.tabHeaders);
            break;
        case 'table':
            html += propInput(el.id, 'dataSource', 'Collection', props.dataSource);
            html += propInput(el.id, 'columns', 'Columns (comma sep)', props.columns);
            break;
        case 'list':
            html += propInput(el.id, 'dataSource', 'Collection', props.dataSource);
            break;
        case 'chart':
            html += '<div class="prop-row"><label>Type</label><select onchange="updateBlockProp(\'' + el.id + '\',\'chartType\',this.value)">' +
                '<option value="bar"' + (props.chartType === 'bar' ? ' selected' : '') + '>Bar</option>' +
                '<option value="line"' + (props.chartType === 'line' ? ' selected' : '') + '>Line</option>' +
                '<option value="pie"' + (props.chartType === 'pie' ? ' selected' : '') + '>Pie</option>' +
                '</select></div>';
            break;
        case 'carousel':
            html += propInput(el.id, 'src', 'Image URLs (comma sep)', props.src);
            break;
        case 'map':
            html += propInput(el.id, 'mapLocation', 'Location', props.mapLocation);
            break;
        case 'checkbox': case 'switch':
            html += propInput(el.id, 'label', 'Label', el.label);
            html += propActionSelect(el.id, 'onChange', actions.onChange);
            break;
    }

    // Styles
    html += '<div class="prop-section-title">Styles</div>';
    html += propStyle(el.id, 'backgroundColor', 'Background', styles.backgroundColor, 'color');
    html += propStyle(el.id, 'color', 'Text Color', styles.color, 'color');
    html += propStyle(el.id, 'fontSize', 'Font Size', styles.fontSize);
    html += propStyle(el.id, 'fontWeight', 'Weight', styles.fontWeight, 'select', ['400', '500', '600', '700', '800']);
    html += propStyle(el.id, 'padding', 'Padding', styles.padding);
    html += propStyle(el.id, 'margin', 'Margin', styles.margin);
    html += propStyle(el.id, 'borderRadius', 'Border Radius', styles.borderRadius);
    html += propStyle(el.id, 'textAlign', 'Align', styles.textAlign, 'select', ['left', 'center', 'right']);

    body.innerHTML = html;
}

function propInput(elId, key, label, value) {
    return '<div class="prop-row"><label>' + esc(label) + '</label>' +
        '<input type="text" value="' + esc(value !== undefined ? String(value) : '') + '" onchange="updateBlockProp(\'' + elId + '\',\'' + key + '\',this.value)">' +
        '</div>';
}

function propStyle(elId, key, label, value, type, options) {
    const val = value !== undefined ? String(value) : '';
    if (type === 'color') {
        return '<div class="prop-row"><label>' + esc(label) + '</label>' +
            '<input type="color" value="' + (val || '#000000') + '" onchange="updateBlockStyle(\'' + elId + '\',\'' + key + '\',this.value)">' +
            '<input type="text" value="' + val + '" style="flex:1" onchange="updateBlockStyle(\'' + elId + '\',\'' + key + '\',this.value)">' +
            '</div>';
    }
    if (type === 'select' && options) {
        return '<div class="prop-row"><label>' + esc(label) + '</label>' +
            '<select onchange="updateBlockStyle(\'' + elId + '\',\'' + key + '\',this.value)">' +
            options.map(o => '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>').join('') +
            '</select></div>';
    }
    return '<div class="prop-row"><label>' + esc(label) + '</label>' +
        '<input type="text" value="' + esc(val) + '" onchange="updateBlockStyle(\'' + elId + '\',\'' + key + '\',this.value)">' +
        '</div>';
}

function propActionSelect(elId, actionKey, action) {
    const current = (action && action.type) || 'none';
    return '<div class="prop-row"><label>On ' + esc(actionKey === 'onClick' ? 'Click' : 'Change') + '</label>' +
        '<select onchange="updateBlockAction(\'' + elId + '\',\'' + actionKey + '\',\'type\',this.value);renderPropsPanel();">' +
        '<option value="none"' + (current === 'none' ? ' selected' : '') + '>None</option>' +
        '<option value="navigate"' + (current === 'navigate' ? ' selected' : '') + '>Navigate</option>' +
        '<option value="toast"' + (current === 'toast' ? ' selected' : '') + '>Toast</option>' +
        '<option value="modal"' + (current === 'modal' ? ' selected' : '') + '>Alert</option>' +
        '<option value="state"' + (current === 'state' ? ' selected' : '') + '>Set State</option>' +
        '</select></div>';
}

function renderActionFields(elId, actionKey, action) {
    if (!action || action.type === 'none') return '';
    let html = '';
    if (action.type === 'navigate') {
        const pages = formPages;
        html += '<div class="prop-row"><label>Target</label>' +
            '<select onchange="updateBlockAction(\'' + elId + '\',\'' + actionKey + '\',\'targetPage\',this.value)">' +
            pages.map(p => '<option value="' + p.id + '"' + (action.targetPage === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') +
            '</select></div>';
    }
    if (action.type === 'toast') {
        html += propActionInput(elId, actionKey, 'toastText', 'Message', action.toastText);
    }
    if (action.type === 'modal') {
        html += propActionInput(elId, actionKey, 'modalContent', 'Content', action.modalContent);
    }
    if (action.type === 'state') {
        html += propActionInput(elId, actionKey, 'stateKey', 'State Key', action.stateKey);
        html += propActionInput(elId, actionKey, 'stateValue', 'State Value', action.stateValue);
    }
    return html;
}

function propActionInput(elId, actionKey, field, label, value) {
    return '<div class="prop-row"><label>' + esc(label) + '</label>' +
        '<input type="text" value="' + esc(value || '') + '" onchange="updateBlockAction(\'' + elId + '\',\'' + actionKey + '\',\'' + field + '\',this.value)">' +
        '</div>';
}

// ── Update page name from builder page tab ──

function updateBuilderPageName(pageId, name) {
    const page = formPages.find(p => p.id === pageId);
    if (page) { page.name = name; renderBuilderPageTabs(); updateLivePreview(); }
}
window.updateBuilderPageName = updateBuilderPageName;

// ── Theme Presets ──

function selectThemePreset(primary, secondary, el) {
    document.querySelectorAll('.theme-preset').forEach(p => p.classList.remove('selected'));
    (el || event?.currentTarget)?.classList.add('selected');
    document.getElementById('primaryColor').value = primary;
    document.getElementById('primaryColorText').value = primary;
    document.getElementById('secondaryColor').value = secondary;
    document.getElementById('secondaryColorText').value = secondary;
    updateColorPreview();
    updateLivePreview();
}
window.selectThemePreset = selectThemePreset;

function updateColorPreview() {
    const primary = document.getElementById('primaryColor').value;
    const secondary = document.getElementById('secondaryColor').value;
    const box = document.getElementById('colorPreview');
    box.style.setProperty('--primary-color', primary);
    box.style.setProperty('--secondary-color', secondary);
    box.querySelector('.color-preview-primary').textContent = primary;
    box.querySelector('.color-preview-secondary').textContent = secondary;
}

['primaryColor', 'secondaryColor'].forEach(id => {
    const color = document.getElementById(id);
    const text = document.getElementById(id + 'Text');
    color.addEventListener('input', () => { text.value = color.value; updateColorPreview(); updateLivePreview(); });
    text.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(text.value)) { color.value = text.value; updateColorPreview(); updateLivePreview(); } });
});

// ── Live Preview ──

function updateLivePreview() {
    const screen = document.getElementById('miniScreen');
    const pages = formPages;
    const primary = document.getElementById('primaryColor').value || '#6366f1';
    const displayName = document.getElementById('displayName').value || 'My App';

    // Update page chips
    const chipsContainer = document.getElementById('previewPageList');
    chipsContainer.innerHTML = pages.map((p, i) =>
        '<span class="preview-page-chip' + (i === 0 ? ' active' : '') + '">' + esc(p.icon || '▤') + ' ' + esc(p.name) + '</span>'
    ).join('');

    if (!pages.length) {
        screen.innerHTML = '<div class="mini-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Add some pages to see a preview</span></div>';
        return;
    }

    // Render first page elements
    const firstPage = pages[0];
    screen.innerHTML = '';
    const container = document.createElement('div');
    container.style.cssText = 'padding:8px;display:flex;flex-direction:column;gap:4px;min-height:100%';

    if (firstPage.elements && firstPage.elements.length > 0) {
        firstPage.elements.forEach(el => {
            const elm = document.createElement('div');
            const props = el.properties || {};
            switch (el.type) {
                case 'heading':
                    elm.textContent = props.value || 'Heading';
                    elm.style.cssText = 'font-size:14px;font-weight:700;margin:4px 0;color:#e2e8f0';
                    break;
                case 'text':
                    elm.textContent = props.value || 'Text content';
                    elm.style.cssText = 'font-size:10px;color:#94a3b8;line-height:1.4';
                    break;
                case 'banner':
                    elm.textContent = (props.value || 'Banner') + ' | ' + (props.placeholder || '');
                    elm.style.cssText = 'font-size:10px;padding:16px 12px;border-radius:8px;background:' + primary + ';color:#fff;text-align:center;font-weight:600';
                    break;
                case 'grid':
                    elm.textContent = 'Grid layout';
                    elm.style.cssText = 'font-size:9px;padding:8px;background:rgba(255,255,255,0.04);border-radius:4px;text-align:center;color:#64748b';
                    break;
                default:
                    elm.textContent = '▸ ' + (props.value || el.type);
                    elm.style.cssText = 'font-size:10px;color:#94a3b8';
            }
            container.appendChild(elm);
        });
    } else {
        const placeholder = document.createElement('div');
        placeholder.textContent = firstPage.name;
        placeholder.style.cssText = 'font-size:12px;font-weight:600;color:#e2e8f0;text-align:center;padding:24px 8px';
        container.appendChild(placeholder);
    }

    screen.appendChild(container);
}

// ── Review ──

function updateReview() {
    document.getElementById('reviewAppName').textContent = document.getElementById('appName').value || '-';
    document.getElementById('reviewDisplayName').textContent = document.getElementById('displayName').value || '-';
    document.getElementById('reviewPackage').textContent = document.getElementById('packageName').value || '-';
    document.getElementById('reviewVersion').textContent = document.getElementById('version').value || '-';

    const color = document.getElementById('primaryColor').value;
    document.getElementById('reviewColor').innerHTML = '<span class="color-dot" style="background:' + color + '"></span> ' + color;
    document.getElementById('reviewPages').textContent = formPages.map(p => p.name).join(', ') || '-';
}

// ── Render Pages Grid (legacy page list in step 1) ──

function renderPagesGrid() {
    const grid = document.getElementById('pagesGrid');
    if (!grid) return;
    if (!formPages.length) {
        grid.innerHTML = '<div class="pages-empty">No pages yet. Select a purpose above or add pages in step 3.</div>';
        return;
    }
    grid.innerHTML = formPages.map(p =>
        '<div class="page-card">' +
        '<div class="page-card-icon">' + esc(p.icon || '▤') + '</div>' +
        '<div class="page-card-name">' + esc(p.name) + '</div>' +
        '<span class="page-card-badge">' + p.elements.length + ' blocks</span>' +
        '</div>'
    ).join('');
}

// ── Form Submit ──

document.getElementById('appForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editAppId').value;
    const project_config = {
        appName: document.getElementById('displayName').value,
        homePageId: formPages.length > 0 ? formPages[0].id : '',
        pages: formPages.map(p => ({ id: p.id, name: p.name, elements: p.elements || [] })),
        collections: [],
        globalStates: [],
        device_id: getDeviceId(),
        theme: {
            mode: 'light',
            primaryColor: document.getElementById('primaryColor').value,
            backgroundColor: '#f8fafc',
            surfaceColor: '#ffffff',
            textColor: '#0f172a',
        },
        build: {},
    };
    const data = {
        app_name: document.getElementById('appName').value,
        display_name: document.getElementById('displayName').value,
        package_name: document.getElementById('packageName').value,
        version: document.getElementById('version').value,
        primary_color: document.getElementById('primaryColor').value,
        project_config,
    };

    const btn = document.getElementById('formSubmitBtn');
    btn.disabled = true;
    btn.textContent = editId ? 'Updating...' : 'Generating...';

    try {
        let newAppId;
        if (editId) {
            await api('PUT', '/apps/' + editId, data);
            newAppId = editId;
        } else {
            const res = await api('POST', '/generate', data);
            newAppId = res.app_id;
        }
        document.body.dispatchEvent(new Event('appsUpdated'));
        resetForm();
        switchView('apps');
        showSuccessModal(newAppId, editId ? 'App Updated!' : 'App Created!');
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = editId ? 'Update App' : 'Generate App';
    }
});

function showSuccessModal(appId, title) {
    const titleEl = document.getElementById('successTitle');
    const openBtn = document.getElementById('successOpenBtn');
    const modal = document.getElementById('successModal');
    if (!titleEl || !openBtn || !modal) {
        toast('App created! (refresh to open)', 'success');
        return;
    }
    titleEl.textContent = title;
    openBtn.onclick = function () {
        closeModal('successModal');
        navigateToApp(appId);
    };
    modal.classList.remove('hidden');
}

function resetForm() {
    document.getElementById('appForm').reset();
    document.getElementById('editAppId').value = '';
    document.getElementById('primaryColor').value = '#6366f1';
    document.getElementById('primaryColorText').value = '#6366f1';
    document.getElementById('secondaryColor').value = '#ffffff';
    document.getElementById('secondaryColorText').value = '#ffffff';
    document.getElementById('version').value = '1.0.0';
    document.getElementById('formSubmitBtn').textContent = 'Generate App';
    document.getElementById('formCancelBtn').classList.add('hidden');
    formPages = [];
    selectedPurpose = null;
    document.querySelectorAll('.purpose-card').forEach(c => c.classList.remove('selected'));
    renderPagesGrid();
    updateLivePreview();
    goToStep(1);
}

function cancelEdit() {
    resetForm();
    switchView('apps');
}
window.cancelEdit = cancelEdit;

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
}

function formatDate(d) {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

// ── App Detail ──

async function viewAppDetails(appId) {
    try {
        const [app, builds, published] = await Promise.all([
            api('GET', '/apps/' + appId),
            api('GET', '/apps/' + appId + '/builds'),
            api('GET', '/v1/apps/' + appId + '/publish').catch(() => []),
        ]);
        const cfg = app.config || {};
        document.getElementById('detailAppName').textContent = cfg.display_name || cfg.app_name || app.app_name || 'App Details';

        let html = '<div class="detail-section"><h4>Configuration</h4>' +
            '<div class="detail-row"><span class="detail-label">App Name</span><span class="detail-value">' + esc(cfg.app_name || '-') + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Display Name</span><span class="detail-value">' + esc(cfg.display_name || '-') + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Package</span><span class="detail-value">' + esc(cfg.package_name || '-') + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Version</span><span class="detail-value">' + esc(cfg.version || '-') + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">App ID</span><span class="detail-value" style="font-size:0.8rem;font-family:monospace">' + esc(app.id) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">' + formatDate(app.created_at) + '</span></div>' +
            '</div>';

        html += '<div class="detail-section"><h4>Actions</h4>' +
            '<div class="detail-actions">' +
            '<button class="btn btn-sm btn-accent" onclick="closeModal(\'appDetailModal\');openAppBuilder(\'' + app.id + '\')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' +
            'Builder</button>' +
            '<button class="btn btn-sm btn-primary" onclick="closeModal(\'appDetailModal\');editApp(\'' + app.id + '\')">Edit App</button>' +
            '<button class="btn btn-sm btn-primary" onclick="closeModal(\'appDetailModal\');openPreview(\'' + app.id + '\')">Preview</button>' +
            '<button class="btn btn-sm btn-warning" onclick="closeModal(\'appDetailModal\');buildApp(\'' + app.id + '\')">Build APK</button>' +
            '<button class="btn btn-sm btn-accent" onclick="closeModal(\'appDetailModal\');publishConfig(\'' + app.id + '\')">Publish</button>' +
            '<a href="' + API + '/apps/' + app.id + '/download" class="btn btn-sm btn-success">Download Source</a>' +
            '</div></div>';

        // Published versions
        html += '<div class="detail-section"><h4>Published Versions (' + (published.length || 0) + ')</h4>';
        if (!published.length) {
            html += '<p style="color:var(--text-muted);font-size:0.85rem">No published versions yet. Click "Publish" above.</p>';
        } else {
            html += '<div class="detail-builds">';
            published.forEach(v => {
                html += '<div class="detail-build-item">' +
                    '<div style="display:flex;align-items:center;gap:8px">' +
                    '<span class="build-platform">v' + esc(v.version) + '</span>' +
                    (v.is_current ? '<span class="build-status completed">current</span>' : '') +
                    '<span class="build-time">' + formatDate(v.published_at) + '</span>' +
                    '</div></div>';
            });
            html += '</div>';
        }
        html += '</div>';

        html += '<div class="detail-section"><h4>Build History (' + builds.length + ')</h4>';
        if (builds.length === 0) {
            html += '<p style="color:var(--text-muted);font-size:0.85rem">No builds yet. Click "Build Android APK" above.</p>';
        } else {
            html += '<div class="detail-builds">';
            builds.forEach(b => {
                const statusClass = (b.status || 'queued').toLowerCase();
                html += '<div class="detail-build-item">' +
                    '<div style="display:flex;align-items:center;gap:8px">' +
                    '<span class="build-platform">' + esc(b.platform || 'android') + '</span>' +
                    '<span class="build-status ' + statusClass + '">' + esc(b.status) + '</span>' +
                    '<span class="build-time">' + formatDate(b.created_at) + '</span>' +
                    '</div>';
                if (b.status === 'completed' && b.output_file) {
                    html += '<a href="' + API + '/builds/' + b.id + '/download" class="btn btn-sm btn-success">Download</a>';
                }
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';

        document.getElementById('detailBody').innerHTML = html;
        openModal('appDetailModal');
    } catch (err) {
        toast(err.message, 'error');
    }
}
window.viewAppDetails = viewAppDetails;

async function publishConfig(appId) {
    try {
        const res = await api('POST', '/v1/apps/' + appId + '/publish', {});
        toast('Published version ' + res.version, 'success');
        viewAppDetails(appId);
    } catch (err) {
        toast(err.message, 'error');
    }
}
window.publishConfig = publishConfig;

// ── Edit App ──

async function editApp(appId) {
    try {
        const app = await api('GET', '/apps/' + appId);
        const cfg = app.config || {};
        const pc = cfg.project_config || {};
        const pages = pc.pages || [];

        document.getElementById('editAppId').value = appId;
        document.getElementById('appName').value = cfg.app_name || '';
        document.getElementById('displayName').value = cfg.display_name || '';
        document.getElementById('packageName').value = cfg.package_name || '';
        document.getElementById('version').value = cfg.version || '1.0.0';
        document.getElementById('primaryColor').value = cfg.primary_color || '#6366f1';
        document.getElementById('primaryColorText').value = cfg.primary_color || '#6366f1';
        document.getElementById('secondaryColor').value = cfg.secondary_color || '#ffffff';
        document.getElementById('secondaryColorText').value = cfg.secondary_color || '#ffffff';
        document.getElementById('description').value = '';

        // Load pages
        formPages = pages.map(p => ({ id: p.id, name: p.name, icon: '▤', elements: p.elements || [] }));
        pageIdCounter = pages.reduce((max, p) => {
            const num = parseInt(p.id.replace('page_', ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        renderPagesGrid();

        selectedPurpose = null;
        document.querySelectorAll('.purpose-card').forEach(c => c.classList.remove('selected'));

        document.getElementById('formSubmitBtn').textContent = 'Update App';
        document.getElementById('formCancelBtn').classList.remove('hidden');
        goToStep(1);
        updateLivePreview();
        switchView('create');
    } catch (err) {
        toast(err.message, 'error');
    }
}
window.editApp = editApp;

// ── Delete (HTMX Handled) ──

// ── Build ──

async function buildApp(appId) {
    try {
        const res = await api('POST', '/apps/' + appId + '/build', { platform: 'android', app_id: appId });
        toast('Build submitted: ' + res.build_id);
        switchView('builds');
        pollBuild(res.build_id);
    } catch (err) {
        toast(err.message, 'error');
    }
}
window.buildApp = buildApp;

const polling = {};

function pollBuild(buildId) {
    if (polling[buildId]) return;
    polling[buildId] = true;

    const interval = setInterval(async () => {
        try {
            const status = await api('GET', '/builds/' + buildId);
            updateBuildInList(buildId, status);
            if (status.status === 'completed' || status.status === 'failed') {
                clearInterval(interval);
                delete polling[buildId];
                loadAllBuilds();
                if (status.status === 'completed') toast('Build completed!');
                else toast('Build failed', 'error');
            }
        } catch {
            clearInterval(interval);
            delete polling[buildId];
        }
    }, 3000);
}

function updateBuildInList(buildId, status) {
    const items = document.querySelectorAll('.build-item');
    items.forEach(item => {
        if (item.dataset.buildId === buildId) {
            const statusEl = item.querySelector('.build-status');
            if (statusEl) {
                statusEl.className = 'build-status ' + (status.status || 'queued');
                statusEl.textContent = status.message || status.status;
            }
        }
    });
}

async function loadAllBuilds() {
    const container = document.getElementById('buildsList');
    container.innerHTML = '<div class="loading"><span class="spinner"></span> Loading builds...</div>';
    try {
        const apps = await api('GET', '/apps');
        let allBuilds = [];
        for (const app of apps) {
            try {
                const builds = await api('GET', '/apps/' + app.id + '/builds');
                builds.forEach(b => { b.app_name = (app.config || {}).display_name || app.app_name; });
                allBuilds = allBuilds.concat(builds);
            } catch {}
        }
        allBuilds.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        if (!allBuilds.length) {
            container.innerHTML = '<div class="empty-state"><h3>No builds yet</h3><p>Generate an app and click "Build APK" to start.</p></div>';
            return;
        }
        container.innerHTML = allBuilds.map(b => {
            const statusClass = (b.status || 'queued').toLowerCase();
            return '<div class="build-item" data-build-id="' + b.id + '">' +
                '<div class="build-info">' +
                '<span class="build-platform">' + esc(b.platform || 'android') + '</span>' +
                '<span style="font-size:0.85rem;font-weight:500">' + esc(b.app_name || b.app_id || '') + '</span>' +
                '<span class="build-status ' + statusClass + '">' + esc(b.status) + '</span>' +
                '<span class="build-time">' + formatDate(b.created_at) + '</span>' +
                '</div>' +
                '<div class="build-actions">' +
                (b.status === 'completed' && b.output_file ? '<a href="' + API + '/builds/' + b.id + '/download" class="btn btn-sm btn-success">Download</a>' : '') +
                '</div></div>';
        }).join('');
    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p style="color:var(--danger)">Failed to load: ' + err.message + '</p></div>';
    }
}

// ── Preview / Simulator ──

const previewState = {
    appId: null,
    config: null,
    pages: [],
    collections: [],
    globalStates: [],
    stateValues: {},
    activePageId: null,
    theme: {},
    buildSettings: {},
};

async function openPreview(appId) {
    try {
        const app = await api('GET', '/apps/' + appId);
        const cfg = app.config || {};
        const pc = cfg.project_config || {};
        const pages = pc.pages || [];
        const collections = pc.collections || [];
        const globalStates = pc.globalStates || [];
        const theme = pc.theme || {};
        const build = pc.build || {};

        previewState.appId = appId;
        previewState.config = app;
        previewState.pages = pages;
        previewState.collections = collections;
        previewState.globalStates = globalStates;
        previewState.theme = theme;
        previewState.buildSettings = build;

        const vals = {};
        globalStates.forEach(s => { vals[s.name] = s.defaultValue; });
        previewState.stateValues = vals;

        const homeId = pc.homePageId || (pages[0] && pages[0].id) || '';
        previewState.activePageId = homeId;

        const sel = document.getElementById('previewPageSelect');
        sel.innerHTML = pages.map(p => '<option value="' + p.id + '"' + (p.id === homeId ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('');

        document.getElementById('previewAppName').textContent = cfg.display_name || cfg.app_name || app.app_name || 'Preview';

        openModal('previewModal');
        renderPhoneScreen();
    } catch (err) {
        toast(err.message, 'error');
    }
}
window.openPreview = openPreview;

function previewNavigateTo(pageId) {
    previewState.activePageId = pageId;
    document.getElementById('previewPageSelect').value = pageId;
    renderPhoneScreen();
}
window.previewNavigateTo = previewNavigateTo;

function renderPhoneScreen() {
    const screen = document.getElementById('phoneScreen');
    const page = previewState.pages.find(p => p.id === previewState.activePageId);
    const theme = previewState.theme || {};

    const mode = theme.mode || 'light';
    const primary = theme.primaryColor || '#6366f1';
    const bg = mode === 'dark' ? (theme.backgroundColor || '#0f172a') : (theme.backgroundColor || '#f8fafc');
    const surface = mode === 'dark' ? (theme.surfaceColor || '#1e293b') : (theme.surfaceColor || '#ffffff');
    const text = mode === 'dark' ? (theme.textColor || '#e2e8f0') : (theme.textColor || '#0f172a');

    const container = document.querySelector('.phone-screen-container');
    if (container) {
      container.style.setProperty('--phone-primary', primary);
      container.style.setProperty('--phone-bg', bg);
      container.style.setProperty('--phone-text', text);
    }
    screen.style.setProperty('--phone-primary', primary);
    screen.className = 'phone-screen' + (mode === 'dark' ? ' theme-dark' : '');

    document.getElementById('previewPageName').textContent = page ? page.name : '';

    if (!page) {
        screen.innerHTML = '<div class="preview-empty">No pages</div>';
        return;
    }

    if (!page.elements || page.elements.length === 0) {
        screen.innerHTML = '<div class="preview-empty">Empty screen</div>';
        return;
    }

    // iOS nav bar
    const navBar = document.createElement('div');
    navBar.style.cssText = 'position:sticky;top:0;z-index:10;background:' + (mode === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)') + ';-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-bottom:0.5px solid ' + (mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(60,60,67,0.12)') + ';padding:8px 16px 10px;text-align:center';
    const navTitle = document.createElement('div');
    navTitle.style.cssText = 'font-size:16px;font-weight:600;letter-spacing:-0.02em;color:' + text;
    navTitle.textContent = page.name || 'Screen';
    navBar.appendChild(navTitle);
    screen.appendChild(navBar);

    const contentEl = document.createElement('div');
    contentEl.style.cssText = 'padding:12px;display:flex;flex-direction:column;gap:12px;min-height:100%;color:' + text;

    page.elements.forEach(el => {
        renderElement(el, contentEl, previewState.stateValues, {
            pages: previewState.pages,
            collections: previewState.collections,
            globalStates: previewState.globalStates,
            primary, bg, surface, text, mode,
        });
    });

    screen.innerHTML = '';
    screen.appendChild(contentEl);
}

function renderElement(el, parent, state, ctx) {
    const elm = document.createElement('div');
    applyStyles(elm, el.styles, ctx);
    const actions = el.actions || {};
    const props = el.properties || {};

    switch (el.type) {
        case 'container':
            elm.className = 'sim-container';
            (el.children || []).forEach(child => renderElement(child, elm, state, ctx));
            break;
        case 'grid':
            elm.className = 'sim-grid';
            elm.style.gridTemplateColumns = 'repeat(' + (props.gridCols || 2) + ', minmax(0, 1fr))';
            (el.children || []).forEach(child => renderElement(child, elm, state, ctx));
            break;
        case 'card':
            elm.className = 'sim-card';
            elm.style.background = ctx.surface;
            (el.children || []).forEach(child => renderElement(child, elm, state, ctx));
            break;
        case 'tabs':
            elm.className = 'sim-tabs';
            const headers = document.createElement('div');
            headers.className = 'sim-tab-headers';
            (props.tabHeaders || ['Tab 1', 'Tab 2']).forEach((label, i) => {
                const h = document.createElement('div');
                h.className = 'sim-tab-header' + (i === (props.activeTab || 0) ? ' active' : '');
                h.textContent = evalInterpolation(label, state);
                h.style.setProperty('--phone-primary', ctx.primary);
                h.addEventListener('click', () => {
                    elm.querySelectorAll('.sim-tab-content').forEach((c, ci) => c.style.display = ci === i ? 'block' : 'none');
                    h.parentElement.querySelectorAll('.sim-tab-header').forEach(th => th.classList.remove('active'));
                    h.classList.add('active');
                });
                headers.appendChild(h);
            });
            elm.appendChild(headers);
            (el.children || []).forEach((child, i) => {
                const tc = document.createElement('div');
                tc.className = 'sim-tab-content';
                tc.style.display = i === (props.activeTab || 0) ? 'block' : 'none';
                (child.children || []).forEach(c => renderElement(c, tc, state, ctx));
                elm.appendChild(tc);
            });
            break;
        case 'heading':
            elm.className = 'sim-heading';
            const hTag = document.createElement('h2');
            hTag.textContent = evalInterpolation(props.value || 'Title', state);
            hTag.style.cssText = 'font-size:20px;font-weight:700;margin:0;letter-spacing:-0.03em;color:' + (el.styles?.color || ctx.text);
            elm.appendChild(hTag);
            break;
        case 'text':
            elm.className = 'sim-text';
            const p = document.createElement('p');
            p.textContent = evalInterpolation(props.value || 'Text', state);
            p.style.cssText = 'font-size:15px;margin:0;line-height:1.5;color:' + (el.styles?.color || ctx.text);
            elm.appendChild(p);
            break;
        case 'divider':
            elm.className = 'sim-divider';
            elm.style.cssText = 'height:0.5px;background:' + (ctx.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(60,60,67,0.12)') + ';margin:4px 0';
            break;
        case 'image':
            const img = document.createElement('img');
            img.className = 'sim-image';
            img.src = props.src || '';
            img.alt = '';
            img.style.cssText = 'width:100%;border-radius:12px;';
            elm.appendChild(img);
            break;
        case 'video':
            const vid = document.createElement('video');
            vid.className = 'sim-video';
            vid.src = props.src || '';
            vid.controls = true;
            elm.appendChild(vid);
            break;
        case 'card':
            elm.className = 'sim-card';
            elm.style.cssText = 'background:' + ctx.surface + ';border-radius:12px;padding:16px;border:0.5px solid ' + (ctx.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(60,60,67,0.12)');
            (el.children || []).forEach(child => renderElement(child, elm, state, ctx));
            break;
        case 'row':
        case 'columns':
            elm.className = 'sim-row';
            elm.style.cssText = 'display:flex;gap:12px';
            (el.children || []).forEach(child => renderElement(child, elm, state, ctx));
            break;
        case 'icon':
            elm.className = 'sim-icon';
            elm.innerHTML = getIconSvg(props.iconName || 'Heart', props.iconSize || 24);
            elm.style.color = el.styles?.color || ctx.primary;
            break;
        case 'button': {
            const btn = document.createElement('button');
            btn.className = 'sim-button';
            btn.textContent = evalInterpolation(props.value || 'Button', state);
            if (actions.onClick && actions.onClick.type !== 'none') {
                btn.addEventListener('click', (e) => { e.stopPropagation(); handlePreviewAction(actions.onClick, state, ctx); });
            }
            elm.appendChild(btn);
            break;
        }
        case 'input': {
            const inp = document.createElement('input');
            inp.className = 'sim-input';
            inp.type = 'text';
            inp.placeholder = props.placeholder || '';
            if (actions.onChange && actions.onChange.type !== 'none') {
                inp.addEventListener('change', (e) => handlePreviewAction(actions.onChange, state, ctx, e.target.value));
            }
            elm.appendChild(inp);
            break;
        }
        case 'textarea': {
            const ta = document.createElement('textarea');
            ta.className = 'sim-textarea';
            ta.placeholder = props.placeholder || '';
            if (actions.onChange && actions.onChange.type !== 'none') {
                ta.addEventListener('change', (e) => handlePreviewAction(actions.onChange, state, ctx, e.target.value));
            }
            elm.appendChild(ta);
            break;
        }
        case 'select': {
            const sel = document.createElement('select');
            sel.className = 'sim-select';
            (props.options || ['Option 1', 'Option 2']).forEach(o => {
                const opt = document.createElement('option');
                opt.textContent = evalInterpolation(o, state);
                sel.appendChild(opt);
            });
            if (actions.onChange && actions.onChange.type !== 'none') {
                sel.addEventListener('change', (e) => handlePreviewAction(actions.onChange, state, ctx, e.target.value));
            }
            elm.appendChild(sel);
            break;
        }
        case 'checkbox': {
            elm.className = 'sim-checkbox';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            const lbl = document.createElement('span');
            lbl.textContent = el.label || 'Checkbox';
            elm.appendChild(cb);
            elm.appendChild(lbl);
            if (actions.onChange && actions.onChange.type !== 'none') {
                cb.addEventListener('change', (e) => handlePreviewAction(actions.onChange, state, ctx, e.target.checked));
            }
            break;
        }
        case 'switch': {
            elm.className = 'sim-switch';
            const track = document.createElement('div');
            track.className = 'sim-switch-track';
            const thumb = document.createElement('div');
            thumb.className = 'sim-switch-thumb';
            track.appendChild(thumb);
            let on = false;
            track.addEventListener('click', () => {
                on = !on;
                track.classList.toggle('on', on);
                if (actions.onChange && actions.onChange.type !== 'none') handlePreviewAction(actions.onChange, state, ctx, on);
            });
            const lbl2 = document.createElement('span');
            lbl2.textContent = el.label || 'Toggle';
            elm.appendChild(track);
            elm.appendChild(lbl2);
            break;
        }
        case 'table': {
            const col = ctx.collections.find(c => c.name === props.dataSource);
            if (col) {
                const table = document.createElement('table');
                table.className = 'sim-table';
                const thead = document.createElement('thead');
                const thr = document.createElement('tr');
                col.fields.forEach(f => { const th = document.createElement('th'); th.textContent = f.name; thr.appendChild(th); });
                thead.appendChild(thr);
                table.appendChild(thead);
                const tbody = document.createElement('tbody');
                (col.records || []).forEach(rec => {
                    const tr = document.createElement('tr');
                    col.fields.forEach(f => { const td = document.createElement('td'); td.textContent = rec[f.name] !== undefined ? String(rec[f.name]) : ''; tr.appendChild(td); });
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                elm.appendChild(table);
            } else {
                elm.textContent = 'Table: ' + (props.dataSource || 'No data source');
                elm.style.cssText = 'font-size:0.8rem;color:#94a3b8;padding:8px';
            }
            break;
        }
        case 'list': {
            const col2 = ctx.collections.find(c => c.name === props.dataSource);
            if (col2) {
                const list = document.createElement('div');
                (col2.records || []).forEach(rec => {
                    const item = document.createElement('div');
                    item.className = 'sim-list-item';
                    const firstField = col2.fields[0];
                    item.textContent = firstField ? (rec[firstField.name] !== undefined ? String(rec[firstField.name]) : 'Item') : 'Item';
                    if (actions.onClick && actions.onClick.type !== 'none') item.addEventListener('click', () => handlePreviewAction(actions.onClick, state, ctx));
                    list.appendChild(item);
                });
                elm.appendChild(list);
            } else {
                elm.textContent = 'List: ' + (props.dataSource || 'No data');
                elm.style.cssText = 'font-size:0.8rem;color:#94a3b8;padding:8px';
            }
            break;
        }
        case 'chart': {
            elm.className = 'sim-chart';
            const chartType = props.chartType || 'bar';
            if (chartType === 'bar' || chartType === 'line') {
                const data = [30, 55, 42, 78, 63, 90];
                const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                const max = Math.max(...data);
                const barContainer = document.createElement('div');
                barContainer.className = 'sim-chart-bar';
                data.forEach((v, i) => {
                    const col3 = document.createElement('div');
                    const bar = document.createElement('div');
                    bar.className = 'sim-chart-bar-item';
                    bar.style.height = ((v / max) * 100) + '%';
                    bar.style.background = ctx.primary;
                    col3.appendChild(bar);
                    const lbl3 = document.createElement('div');
                    lbl3.className = 'sim-chart-bar-label';
                    lbl3.textContent = labels[i];
                    col3.appendChild(lbl3);
                    barContainer.appendChild(col3);
                });
                elm.appendChild(barContainer);
            } else if (chartType === 'pie') {
                elm.innerHTML = '<div style="text-align:center;padding:20px"><div style="width:120px;height:120px;border-radius:50%;margin:0 auto;background:conic-gradient(' + ctx.primary + ' 0deg 120deg, #22c55e 120deg 240deg, #f59e0b 240deg 360deg)"></div><p style="font-size:0.7rem;color:#94a3b8;margin-top:8px">Pie Chart</p></div>';
            }
            break;
        }
        case 'map':
            elm.className = 'sim-map';
            elm.textContent = 'Location: ' + (props.mapLocation || 'Map Location');
            break;
        case 'carousel': {
            elm.className = 'sim-carousel';
            let urls = (props.src || '').split(',').map(s => s.trim()).filter(Boolean);
            if (urls.length === 0) urls.push('https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80');
            urls.forEach(url => {
                const img2 = document.createElement('img');
                img2.className = 'sim-carousel-img';
                img2.src = url;
                img2.alt = '';
                elm.appendChild(img2);
            });
            break;
        }
        case 'banner': {
            elm.className = 'sim-banner';
            const bgImg = props.src || '';
            elm.innerHTML = '<div class="sim-banner-bg" style="background-image:url(' + bgImg + ');background-color:' + ctx.primary + '"></div>' +
                '<div class="sim-banner-content"><div class="sim-banner-title">' + evalInterpolation(props.value || '', state) + '</div>' +
                '<div class="sim-banner-sub">' + evalInterpolation(props.placeholder || '', state) + '</div></div>';
            elm.style.minHeight = '140px';
            break;
        }
        default:
            elm.textContent = el.type;
            elm.style.cssText = 'font-size:0.75rem;color:#94a3b8;padding:4px 8px;background:rgba(0,0,0,0.03);border-radius:4px';
    }

    parent.appendChild(elm);
}

function applyStyles(elm, styles, ctx) {
    if (!styles) return;
    const s = elm.style;
    if (styles.width) s.width = styles.width;
    if (styles.height) s.height = styles.height;
    if (styles.padding) s.padding = styles.padding;
    if (styles.margin) s.margin = styles.margin;
    if (styles.backgroundColor) s.background = styles.backgroundColor;
    if (styles.color) s.color = styles.color;
    if (styles.fontSize) s.fontSize = styles.fontSize;
    if (styles.fontWeight) s.fontWeight = styles.fontWeight;
    if (styles.borderRadius) s.borderRadius = styles.borderRadius;
    if (styles.border) s.border = styles.border;
    if (styles.borderTop) s.borderTop = styles.borderTop;
    if (styles.borderBottom) s.borderBottom = styles.borderBottom;
    if (styles.display) s.display = styles.display;
    if (styles.flexDirection) s.flexDirection = styles.flexDirection;
    if (styles.justifyContent) s.justifyContent = styles.justifyContent;
    if (styles.alignItems) s.alignItems = styles.alignItems;
    if (styles.gap) s.gap = styles.gap;
    if (styles.position) s.position = styles.position;
    if (styles.top) s.top = styles.top;
    if (styles.left) s.left = styles.left;
    if (styles.right) s.right = styles.right;
    if (styles.bottom) s.bottom = styles.bottom;
    if (styles.boxShadow) s.boxShadow = styles.boxShadow;
    if (styles.borderWidth) s.borderWidth = styles.borderWidth;
    if (styles.borderColor) s.borderColor = styles.borderColor;
}

function evalInterpolation(text, state) {
    if (!text || typeof text !== 'string') return text || '';
    return text.replace(/\{\{state\.([^}]+)\}\}/g, (_, key) => {
        return state[key.trim()] !== undefined ? String(state[key.trim()]) : '{{state.' + key + '}}';
    });
}

function handlePreviewAction(action, state, ctx, value) {
    switch (action.type) {
        case 'navigate':
            if (action.targetPage) {
                const page = ctx.pages.find(p => p.id === action.targetPage || p.name === action.targetPage);
                if (page) previewNavigateTo(page.id);
            }
            break;
        case 'state':
            if (action.stateKey) {
                const val = action.stateValue !== undefined ? evalInterpolation(action.stateValue, state) : value;
                state[action.stateKey] = val;
                renderPhoneScreen();
            }
            break;
        case 'toast':
            toast(evalInterpolation(action.toastText || '', state));
            break;
        case 'modal':
            if (action.modalContent) alert(evalInterpolation(action.modalContent, state));
            break;
        case 'script':
            if (action.code) {
                try { const fn = new Function('state', 'value', action.code); fn(state, value); renderPhoneScreen(); }
                catch (err) { toast('Script error: ' + err.message, 'error'); }
            }
            break;
        case 'db_add':
            if (action.collectionName && action.collectionData) {
                const col = ctx.collections.find(c => c.name === action.collectionName);
                if (col) {
                    const rec = { _id: 'rec-' + Date.now() };
                    action.collectionData.split(',').forEach(pair => {
                        const parts = pair.split('=');
                        if (parts.length === 2) rec[parts[0].trim()] = evalInterpolation(parts[1].trim(), state);
                    });
                    col.records = col.records || [];
                    col.records.push(rec);
                    renderPhoneScreen();
                    toast('Added to ' + action.collectionName);
                }
            }
            break;
        case 'db_delete':
            if (action.collectionName) {
                const col = ctx.collections.find(c => c.name === action.collectionName);
                if (col && value) {
                    col.records = (col.records || []).filter(r => r._id !== value);
                    renderPhoneScreen();
                    toast('Deleted from ' + action.collectionName);
                }
            }
            break;
    }
}

function getIconSvg(name, size) {
    const icons = {
        Heart: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        Star: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        Bell: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
        Settings: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        User: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        Home: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        Search: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
        Plus: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        Trash2: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        Edit3: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        Download: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        Smartphone: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
        Package: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
        CheckCircle: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        AlertCircle: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };
    return icons[name] || icons.Heart;
}

// ── App Dashboard ──

let currentAppId = null;

function navigateToApp(appId) {
    window.open('/app-dashboard.html?id=' + appId, '_blank');
}

window.navigateToApp = navigateToApp;

function exitAppDashboard() {
    currentAppId = null;
    if (builderAppId) {
        builderAppId = null;
    }
    switchView('apps');
}

window.exitAppDashboard = exitAppDashboard;

function switchAppView(view) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelector('.app-view[data-appview="' + view + '"]')?.classList.add('active');
    document.querySelectorAll('.app-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector('.app-nav-item[data-appview="' + view + '"]')?.classList.add('active');

    // Load data for specific views
    if (view === 'builds' && currentAppId) {
        loadAppBuilds(currentAppId);
    }
}

window.switchAppView = switchAppView;

async function loadAppDashboard(appId) {
    try {
        const app = await api('GET', '/apps/' + appId);
        const cfg = app.config || {};
        const name = cfg.display_name || cfg.app_name || app.app_name || 'App';
        const slug = cfg.app_name || app.app_name || 'app';
        const avatar = (name.charAt(0) || 'A').toUpperCase();

        document.getElementById('appDashboardName').textContent = name;
        document.getElementById('appDashboardAvatar').textContent = avatar;
        document.getElementById('appDashboardSlug').textContent = slug;

        // Populate overview
        const overviewActions = document.getElementById('overviewActions');
        overviewActions.innerHTML =
            '<button class="btn btn-sm btn-primary" onclick="openPreview(\'' + appId + '\')">Preview</button>' +
            '<button class="btn btn-sm btn-accent" onclick="openAppBuilder(\'' + appId + '\')">Builder</button>' +
            '<button class="btn btn-sm btn-success" onclick="publishConfig(\'' + appId + '\')">Publish</button>' +
            '<button class="btn btn-sm btn-warning" onclick="buildApp(\'' + appId + '\')">Build APK</button>' +
            '<a href="' + API + '/apps/' + appId + '/download" class="btn btn-sm btn-success">Download</a>';

        const infoCard = document.getElementById('appInfoCard');
        infoCard.innerHTML =
            '<div class="app-info-row"><span class="label">App Name</span><span class="value">' + esc(cfg.app_name || '-') + '</span></div>' +
            '<div class="app-info-row"><span class="label">Display Name</span><span class="value">' + esc(cfg.display_name || '-') + '</span></div>' +
            '<div class="app-info-row"><span class="label">Package</span><span class="value">' + esc(cfg.package_name || '-') + '</span></div>' +
            '<div class="app-info-row"><span class="label">Version</span><span class="value">' + esc(cfg.version || '-') + '</span></div>' +
            '<div class="app-info-row"><span class="label">App ID</span><span class="value" style="font-size:0.78rem;font-family:monospace">' + esc(app.id) + '</span></div>' +
            '<div class="app-info-row"><span class="label">Created</span><span class="value">' + formatDate(app.created_at) + '</span></div>';

        const quickActions = document.getElementById('appQuickActions');
        quickActions.innerHTML =
            '<button class="btn btn-outline" onclick="editApp(\'' + appId + '\')">Edit Config</button>' +
            '<button class="btn btn-outline" onclick="deleteApp(\'' + appId + '\')" style="color:var(--danger)">Delete App</button>';

        // Load pages
        loadAppPages(appId);

        // Load config form
        loadAppConfigForm(appId);

    } catch (err) {
        toast('Failed to load app: ' + err.message, 'error');
    }
}

async function loadAppPages(appId) {
    const container = document.getElementById('appPagesList');
    try {
        const app = await api('GET', '/apps/' + appId);
        const pc = (app.config || {}).project_config || {};
        const pages = pc.pages || [];

        if (!pages.length) {
            container.innerHTML = '<div class="empty-state"><h3>No pages yet</h3><p>Add pages to your app to get started</p></div>';
            return;
        }

        container.innerHTML = pages.map(p => {
            const blockCount = (p.elements || []).length;
            return '<div class="app-page-item">' +
                '<div><div class="page-name">' + esc(p.name || 'Unnamed') + '</div><div class="page-blocks">' + blockCount + ' block' + (blockCount !== 1 ? 's' : '') + '</div></div>' +
                '<div class="page-actions">' +
                '<button class="btn btn-sm btn-secondary" onclick="openAppBuilder(\'' + appId + '\');switchView(\'builder\')">Edit</button>' +
                '</div></div>';
        }).join('');
    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Failed to load pages</p></div>';
    }
}

async function loadAppBuilds(appId) {
    const container = document.getElementById('appBuildsList');
    try {
        const builds = await api('GET', '/apps/' + appId + '/builds');
        if (!builds.length) {
            container.innerHTML = '<div class="empty-state"><h3>No builds yet</h3><p>Trigger a build to generate your APK</p></div>';
            return;
        }
        container.innerHTML = builds.map(b =>
            '<div class="build-item">' +
            '<div class="build-item-left">' +
            '<span class="build-status ' + (b.status || 'unknown') + '">' + esc(b.status || 'Unknown') + '</span>' +
            '<span class="build-info">' + esc(b.platform || 'android') + ' — v' + esc(b.version || '?') + '</span>' +
            '</div>' +
            '<div class="build-item-right">' +
            '<span class="build-date">' + formatDate(b.created_at) + '</span>' +
            (b.download_url ? '<a href="' + esc(b.download_url) + '" class="btn btn-sm btn-success">Download</a>' : '') +
            '</div></div>'
        ).join('');
    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Failed to load builds</p></div>';
    }
}

async function loadAppConfigForm(appId) {
    const container = document.getElementById('appConfigForm');
    try {
        const app = await api('GET', '/apps/' + appId);
        const cfg = app.config || {};
        container.innerHTML =
            '<div class="form-group"><label for="appConfigJson">Config JSON</label>' +
            '<textarea id="appConfigJson">' + esc(JSON.stringify(cfg, null, 2)) + '</textarea></div>' +
            '<p style="font-size:0.78rem;color:var(--text-muted)">Edit the config JSON directly. Be careful — invalid JSON will be rejected.</p>';
    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Failed to load config</p></div>';
    }
}

function appDashboardAddPage() {
    if (!currentAppId) return;
    openAppBuilder(currentAppId);
    switchView('builder');
    // Add a page after builder loads
    setTimeout(() => {
        builderAddPage('New Page');
    }, 500);
}

window.appDashboardAddPage = appDashboardAddPage;

async function appDashboardTriggerBuild() {
    if (!currentAppId) { toast('No app selected', 'error'); return; }
    await buildApp(currentAppId);
    if (document.querySelector('.app-view[data-appview="builds"].active')) {
        loadAppBuilds(currentAppId);
    }
}

window.appDashboardTriggerBuild = appDashboardTriggerBuild;

async function appDashboardSaveConfig() {
    if (!currentAppId) { toast('No app selected', 'error'); return; }
    const textarea = document.getElementById('appConfigJson');
    if (!textarea) return;
    try {
        const config = JSON.parse(textarea.value);
        await api('PUT', '/apps/' + currentAppId, { config });
        toast('Config saved!');
    } catch (err) {
        toast('Invalid JSON: ' + err.message, 'error');
    }
}

window.appDashboardSaveConfig = appDashboardSaveConfig;

// ── Standalone App Builder ──

let builderAppId = null;

function openAppBuilder(appId) {
    builderAppId = appId;
    switchView('builder');
    loadAppIntoBuilder(appId);
}

async function loadAppIntoBuilder(appId) {
    try {
        const app = await api('GET', '/apps/' + appId);
        const cfg = app.config || {};
        const pc = cfg.project_config || {};
        const pages = pc.pages || [];

        document.getElementById('builderAppName').textContent = cfg.display_name || cfg.app_name || app.app_name || 'App Builder';

        formPages = pages.map(p => ({
            id: p.id,
            name: p.name,
            icon: '▤',
            elements: JSON.parse(JSON.stringify(p.elements || [])),
        }));
        pageIdCounter = formPages.length;
        blockIdCounter = countAllBlocks();
        builderActivePageId = formPages.length > 0 ? formPages[0].id : null;
        selectedBlockId = null;
        renderBuilderView();
    } catch (err) {
        toast('Failed to load app: ' + err.message, 'error');
    }
}

window.openAppBuilder = openAppBuilder;

function exitBuilder() {
    builderAppId = null;
    if (currentAppId) {
        switchView('app-dashboard');
    } else {
        switchView('apps');
    }
}

window.exitBuilder = exitBuilder;

async function saveBuilderChanges() {
    if (!builderAppId) { toast('No app loaded', 'error'); return; }
    try {
        const app = await api('GET', '/apps/' + builderAppId);
        const cfg = app.config || {};
        const pc = cfg.project_config || {};

        pc.pages = formPages.map(p => ({
            id: p.id,
            name: p.name,
            elements: p.elements || [],
        }));

        const data = {
            config: {
                app_name: cfg.app_name || '',
                display_name: cfg.display_name || '',
                package_name: cfg.package_name || '',
                version: cfg.version || '1.0.0',
                primary_color: cfg.primary_color || '#7c5cfc',
            },
            project_config: pc,
        };

        await api('PUT', '/apps/' + builderAppId, data);
        toast('App saved!');
    } catch (err) {
        toast('Save failed: ' + err.message, 'error');
    }
}

window.saveBuilderChanges = saveBuilderChanges;

function builderAddPage(name) {
    addPage(name);
    renderBuilderView();
}

window.builderAddPage = builderAddPage;

function builderAddBlock(type) {
    addBlock(type);
    renderBuilderView();
}

window.builderAddBlock = builderAddBlock;

function builderRemoveBlock(elementId) {
    removeBlock(elementId);
    renderBuilderView();
}

window.builderRemoveBlock = builderRemoveBlock;

function builderMoveBlock(elementId, dir) {
    moveBlock(elementId, dir);
    renderBuilderView();
}

window.builderMoveBlock = builderMoveBlock;

function builderSelectBlock(elementId) {
    selectedBlockId = selectedBlockId === elementId ? null : elementId;
    renderBuilderView();
}

window.builderSelectBlock = builderSelectBlock;

function builderUpdateBlockProp(elementId, key, value) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) return;
    const el = page.elements.find(e => e.id === elementId);
    if (!el) return;
    el.properties[key] = value;
    renderBuilderView();
}

window.builderUpdateBlockProp = builderUpdateBlockProp;

function builderUpdateBlockStyle(elementId, key, value) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) return;
    const el = page.elements.find(e => e.id === elementId);
    if (!el) return;
    if (value === '' || value === undefined) { delete el.styles[key]; }
    else { el.styles[key] = value; }
    renderBuilderView();
}

window.builderUpdateBlockStyle = builderUpdateBlockStyle;

function builderUpdateBlockLabel(elementId, value) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) return;
    const el = page.elements.find(e => e.id === elementId);
    if (!el) return;
    el.label = value;
}

window.builderUpdateBlockLabel = builderUpdateBlockLabel;

function builderUpdateBlockAction(elementId, actionKey, field, value) {
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page) return;
    const el = page.elements.find(e => e.id === elementId);
    if (!el) return;
    if (!el.actions) el.actions = {};
    if (!el.actions[actionKey]) el.actions[actionKey] = { type: 'none' };
    el.actions[actionKey][field] = value;
}

window.builderUpdateBlockAction = builderUpdateBlockAction;

function renderBuilderView() {
    renderBuilderViewPageTabs();
    renderBuilderViewPalette();
    renderBuilderViewCanvas();
    renderBuilderViewPropsPanel();
}

function renderBuilderViewPageTabs() {
    const container = document.getElementById('builderViewPageTabs');
    container.innerHTML = formPages.map(p =>
        '<div class="builder-page-tab' + (p.id === builderActivePageId ? ' active' : '') + '" onclick="selectBuilderViewPage(\'' + p.id + '\')">' +
        esc(p.icon || '▤') + ' ' + esc(p.name) +
        '<button class="tab-close" onclick="event.stopPropagation();builderRemovePage(\'' + p.id + '\')">&times;</button>' +
        '</div>'
    ).join('');
    if (formPages.length === 0) {
        container.innerHTML = '<div style="font-size:0.75rem;color:var(--text-muted);padding:6px 0">No pages. Click "Add" to create one.</div>';
    }
}

function selectBuilderViewPage(pageId) {
    builderActivePageId = pageId;
    selectedBlockId = null;
    renderBuilderView();
}

window.selectBuilderViewPage = selectBuilderViewPage;

function builderRemovePage(pageId) {
    if (formPages.length <= 1) { toast('Need at least one page', 'error'); return; }
    formPages = formPages.filter(p => p.id !== pageId);
    if (builderActivePageId === pageId) builderActivePageId = formPages.length > 0 ? formPages[formPages.length - 1].id : null;
    selectedBlockId = null;
    renderBuilderView();
}

window.builderRemovePage = builderRemovePage;

function renderBuilderViewPalette() {
    const sections = document.getElementById('builderViewPaletteSections');
    sections.innerHTML = BLOCK_CATEGORIES.map(cat =>
        '<div class="palette-section">' +
        '<div class="palette-title">' + esc(cat.name) + '</div>' +
        '<div class="palette-items">' +
        cat.items.map(item =>
            '<div class="palette-item" onclick="builderAddBlock(\'' + item.type + '\')" title="' + esc(item.label) + '">' +
            '<span class="palette-item-icon">' + item.icon + '</span> ' + esc(item.label) +
            '</div>'
        ).join('') +
        '</div></div>'
    ).join('');
}

function builderFilterPalette(query) {
    document.querySelectorAll('#builderViewPalette .palette-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = !query || text.includes(query.toLowerCase()) ? '' : 'none';
    });
    document.querySelectorAll('#builderViewPalette .palette-section').forEach(section => {
        const visible = section.querySelectorAll('.palette-item[style*="display: none"]').length < section.querySelectorAll('.palette-item').length;
        section.style.display = visible || !query ? '' : 'none';
    });
}

window.builderFilterPalette = builderFilterPalette;

function renderBuilderViewCanvas() {
    const screen = document.getElementById('builderViewCanvas');
    const page = formPages.find(p => p.id === builderActivePageId);
    const nameEl = document.getElementById('builderViewPageName');
    const countEl = document.getElementById('builderViewBlockCount');

    if (!page) {
        screen.innerHTML = '<div class="builder-empty">Select a page or create one</div>';
        nameEl.textContent = 'No page selected';
        countEl.textContent = '';
        return;
    }

    nameEl.textContent = esc(page.icon || '▤') + ' ' + esc(page.name);
    countEl.textContent = page.elements.length + ' blocks';

    if (page.elements.length === 0) {
        screen.innerHTML = '<div class="builder-empty">Click blocks from the palette to add them</div>';
        return;
    }

    screen.innerHTML = page.elements.map((el, idx) => {
        const selected = el.id === selectedBlockId;
        const preview = renderMiniBlock(el);
        return '<div class="builder-block' + (selected ? ' selected' : '') + '" onclick="builderSelectBlock(\'' + el.id + '\')" data-id="' + el.id + '">' +
            '<div class="builder-block-toolbar">' +
            (idx > 0 ? '<button onclick="event.stopPropagation();builderMoveBlock(\'' + el.id + '\',' + (-1) + ')" title="Move up">↑</button>' : '') +
            (idx < page.elements.length - 1 ? '<button onclick="event.stopPropagation();builderMoveBlock(\'' + el.id + '\',' + 1 + ')" title="Move down">↓</button>' : '') +
            '<button class="danger" onclick="event.stopPropagation();builderRemoveBlock(\'' + el.id + '\')" title="Delete">✕</button>' +
            '</div>' +
            '<div class="builder-block-content">' + preview + '</div>' +
            '</div>';
    }).join('');
}

function renderBuilderViewPropsPanel() {
    const body = document.getElementById('builderViewPropsBody');
    const title = document.getElementById('builderViewPropsTitle');
    const page = formPages.find(p => p.id === builderActivePageId);
    if (!page || !selectedBlockId) {
        title.textContent = 'Properties';
        body.innerHTML = '<div class="props-empty">Select a block to edit its properties</div>';
        return;
    }
    const el = page.elements.find(e => e.id === selectedBlockId);
    if (!el) {
        title.textContent = 'Properties';
        body.innerHTML = '<div class="props-empty">Block not found</div>';
        return;
    }

    title.textContent = getBlockIcon(el.type) + ' ' + esc(el.label || el.type);

    const props = el.properties || {};
    const styles = el.styles || {};
    const actions = el.actions || {};

    let html = '';

    html += '<div class="prop-group"><label class="prop-label">Label</label>' +
        '<div class="prop-row"><input type="text" value="' + esc(el.label) + '" onchange="builderUpdateBlockLabel(\'' + el.id + '\',this.value)"></div></div>';

    html += '<div class="prop-section-title">Properties</div>';

    switch (el.type) {
        case 'heading': case 'text':
            html += builderPropInput(el.id, 'value', 'Text', props.value);
            break;
        case 'button':
            html += builderPropInput(el.id, 'value', 'Label', props.value);
            html += builderPropActionSelect(el.id, 'onClick', actions.onClick);
            if (actions.onClick && actions.onClick.type !== 'none') {
                html += builderRenderActionFields(el.id, 'onClick', actions.onClick);
            }
            break;
        case 'image': case 'video': case 'banner':
            html += builderPropInput(el.id, 'src', 'Source URL', props.src);
            if (el.type === 'banner') {
                html += builderPropInput(el.id, 'value', 'Title', props.value);
                html += builderPropInput(el.id, 'placeholder', 'Subtitle', props.placeholder);
            }
            break;
        case 'input': case 'textarea':
            html += builderPropInput(el.id, 'placeholder', 'Placeholder', props.placeholder);
            html += builderPropActionSelect(el.id, 'onChange', actions.onChange);
            break;
        case 'select':
            html += builderPropInput(el.id, 'options', 'Options (comma sep)', props.options);
            html += builderPropActionSelect(el.id, 'onChange', actions.onChange);
            break;
        case 'icon':
            html += builderPropInput(el.id, 'iconName', 'Icon Name', props.iconName);
            html += builderPropInput(el.id, 'iconSize', 'Size (px)', props.iconSize);
            break;
        case 'grid':
            html += builderPropInput(el.id, 'gridCols', 'Columns', props.gridCols);
            break;
        case 'tabs':
            html += builderPropInput(el.id, 'tabHeaders', 'Tabs (comma sep)', props.tabHeaders);
            break;
        case 'table':
            html += builderPropInput(el.id, 'dataSource', 'Collection', props.dataSource);
            html += builderPropInput(el.id, 'columns', 'Columns (comma sep)', props.columns);
            break;
        case 'list':
            html += builderPropInput(el.id, 'dataSource', 'Collection', props.dataSource);
            break;
        case 'chart':
            html += '<div class="prop-row"><label>Type</label><select onchange="builderUpdateBlockProp(\'' + el.id + '\',\'chartType\',this.value)">' +
                '<option value="bar"' + (props.chartType === 'bar' ? ' selected' : '') + '>Bar</option>' +
                '<option value="line"' + (props.chartType === 'line' ? ' selected' : '') + '>Line</option>' +
                '<option value="pie"' + (props.chartType === 'pie' ? ' selected' : '') + '>Pie</option>' +
                '</select></div>';
            break;
        case 'carousel':
            html += builderPropInput(el.id, 'src', 'Image URLs (comma sep)', props.src);
            break;
        case 'map':
            html += builderPropInput(el.id, 'mapLocation', 'Location', props.mapLocation);
            break;
        case 'checkbox': case 'switch':
            html += builderPropInput(el.id, 'label', 'Label', el.label);
            html += builderPropActionSelect(el.id, 'onChange', actions.onChange);
            break;
    }

    html += '<div class="prop-section-title">Styles</div>';
    html += builderPropStyle(el.id, 'backgroundColor', 'Background', styles.backgroundColor, 'color');
    html += builderPropStyle(el.id, 'color', 'Text Color', styles.color, 'color');
    html += builderPropStyle(el.id, 'fontSize', 'Font Size', styles.fontSize);
    html += builderPropStyle(el.id, 'fontWeight', 'Weight', styles.fontWeight, 'select', ['400', '500', '600', '700', '800']);
    html += builderPropStyle(el.id, 'padding', 'Padding', styles.padding);
    html += builderPropStyle(el.id, 'margin', 'Margin', styles.margin);
    html += builderPropStyle(el.id, 'borderRadius', 'Border Radius', styles.borderRadius);
    html += builderPropStyle(el.id, 'textAlign', 'Align', styles.textAlign, 'select', ['left', 'center', 'right']);

    body.innerHTML = html;
}

function builderPropInput(elId, key, label, value) {
    return '<div class="prop-row"><label>' + esc(label) + '</label>' +
        '<input type="text" value="' + esc(value !== undefined ? String(value) : '') + '" onchange="builderUpdateBlockProp(\'' + elId + '\',\'' + key + '\',this.value)">' +
        '</div>';
}

function builderPropStyle(elId, key, label, value, type, options) {
    const val = value !== undefined ? String(value) : '';
    if (type === 'color') {
        return '<div class="prop-row"><label>' + esc(label) + '</label>' +
            '<input type="color" value="' + (val || '#000000') + '" onchange="builderUpdateBlockStyle(\'' + elId + '\',\'' + key + '\',this.value)">' +
            '<input type="text" value="' + val + '" style="flex:1" onchange="builderUpdateBlockStyle(\'' + elId + '\',\'' + key + '\',this.value)">' +
            '</div>';
    }
    if (type === 'select' && options) {
        return '<div class="prop-row"><label>' + esc(label) + '</label>' +
            '<select onchange="builderUpdateBlockStyle(\'' + elId + '\',\'' + key + '\',this.value)">' +
            options.map(o => '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>').join('') +
            '</select></div>';
    }
    return '<div class="prop-row"><label>' + esc(label) + '</label>' +
        '<input type="text" value="' + esc(val) + '" onchange="builderUpdateBlockStyle(\'' + elId + '\',\'' + key + '\',this.value)">' +
        '</div>';
}

function builderPropActionSelect(elId, actionKey, action) {
    const current = (action && action.type) || 'none';
    return '<div class="prop-row"><label>On ' + esc(actionKey === 'onClick' ? 'Click' : 'Change') + '</label>' +
        '<select onchange="builderUpdateBlockAction(\'' + elId + '\',\'' + actionKey + '\',\'type\',this.value);renderBuilderViewPropsPanel();">' +
        '<option value="none"' + (current === 'none' ? ' selected' : '') + '>None</option>' +
        '<option value="navigate"' + (current === 'navigate' ? ' selected' : '') + '>Navigate</option>' +
        '<option value="toast"' + (current === 'toast' ? ' selected' : '') + '>Toast</option>' +
        '<option value="modal"' + (current === 'modal' ? ' selected' : '') + '>Alert</option>' +
        '<option value="state"' + (current === 'state' ? ' selected' : '') + '>Set State</option>' +
        '</select></div>';
}

function builderRenderActionFields(elId, actionKey, action) {
    if (!action || action.type === 'none') return '';
    let html = '';
    if (action.type === 'navigate') {
        const pages = formPages;
        html += '<div class="prop-row"><label>Target</label>' +
            '<select onchange="builderUpdateBlockAction(\'' + elId + '\',\'' + actionKey + '\',\'targetPage\',this.value)">' +
            pages.map(p => '<option value="' + p.id + '"' + (action.targetPage === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') +
            '</select></div>';
    }
    if (action.type === 'toast') {
        html += builderPropActionInput(elId, actionKey, 'toastText', 'Message', action.toastText);
    }
    if (action.type === 'modal') {
        html += builderPropActionInput(elId, actionKey, 'modalContent', 'Content', action.modalContent);
    }
    if (action.type === 'state') {
        html += builderPropActionInput(elId, actionKey, 'stateKey', 'State Key', action.stateKey);
        html += builderPropActionInput(elId, actionKey, 'stateValue', 'State Value', action.stateValue);
    }
    return html;
}

function builderPropActionInput(elId, actionKey, field, label, value) {
    return '<div class="prop-row"><label>' + esc(label) + '</label>' +
        '<input type="text" value="' + esc(value || '') + '" onchange="builderUpdateBlockAction(\'' + elId + '\',\'' + actionKey + '\',\'' + field + '\',this.value)">' +
        '</div>';
}

// ── Keyboard Shortcuts ──

document.addEventListener('keydown', (e) => {
    // Ctrl+Enter on form
    if (e.ctrlKey && e.key === 'Enter') {
        const form = document.getElementById('appForm');
        if (!form.classList.contains('hidden')) { form.requestSubmit(); return; }
    }
    // Ctrl+N for new app
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        const view = document.getElementById('view-create');
        if (view && !view.classList.contains('active')) { resetForm(); switchView('create'); }
        return;
    }
    // Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => closeModal(m.id));
    }
});

// ── Init ──

goToStep(1);
updateColorPreview();
checkAuth();
loadApps();

// Handle URL params: ?builder=xxx or ?edit=xxx
const urlParams = new URLSearchParams(window.location.search);
const builderId = urlParams.get('builder');
const editId_param = urlParams.get('edit');
const isEmbedded = urlParams.get('embedded') === '1';
if (isEmbedded) {
    document.body.classList.add('builder-embedded');
}
if (builderId) {
    openAppBuilder(builderId);
    switchView('builder');
} else if (editId_param) {
    editApp(editId_param);
}
