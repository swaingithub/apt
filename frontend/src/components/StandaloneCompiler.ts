import type { ProjectConfig } from '../types';

export const exportStandaloneHTML = (config: ProjectConfig) => {
  const cleanConfig = JSON.stringify(config, null, 2);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.appName}</title>
  <!-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Lucide Icons CDN -->
  <script src="https://unpkg.com/lucide@latest"></script>
  
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    
    /* Scrollbar style */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }
    
    /* Custom components styling */
    .btn-action:hover {
      opacity: 0.9;
      transform: translateY(-0.5px);
    }
    .btn-action:active {
      transform: translateY(0);
    }
    
    /* Glassmorphism elements */
    .glass-effect {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
    }
    
    /* Toast styles */
    .toast-notif {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.875rem;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast-notif.active {
      transform: translateY(0);
      opacity: 1;
    }
  </style>
  
  <script>
    // Inject visual Tailwind Configurations
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: '#6366f1'
          }
        }
      }
    };
  </script>
</head>
<body class="bg-slate-50 text-slate-800 antialiased min-h-screen">

  <!-- Core App Layout Frame -->
  <div id="app-root" class="min-h-screen w-full flex flex-col">
    <!-- Active page will be dynamically injected here -->
  </div>

  <!-- Shared Modal Overlay Dialog -->
  <div id="modal-overlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden">
    <div class="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-11/12 p-6 text-center transform scale-95 transition-all">
      <div id="modal-body-text" class="text-slate-700 font-medium mb-5">Modal Info Description</div>
      <button onclick="closeModal()" class="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition">
        Understood
      </button>
    </div>
  </div>

  <!-- Shared Toast Alert Notifications -->
  <div id="toast-alert" class="toast-notif">
    <i data-lucide="info" class="text-brand w-5 h-5"></i>
    <span id="toast-text">Success message</span>
  </div>

  <!-- Interactive Database and Navigation State Engine -->
  <script>
    // Active App Config State
    const config = ${cleanConfig};
    
    // Core Local states
    let activePageId = config.homePageId;
    let state = {};
    let collections = {};
    
    // Initialise Global States
    config.globalStates.forEach(s => {
      state[s.name] = s.defaultValue;
    });
    
    // Initialise Local Database Collections (Sync with localStorage)
    const dbKey = 'apt_' + config.appName.replace(/\\s+/g, '_') + '_db';
    const cachedDb = localStorage.getItem(dbKey);
    if (cachedDb) {
      try {
        collections = JSON.parse(cachedDb);
      } catch(e) {
        console.error("Local database error, resetting.", e);
        collections = {};
      }
    }
    
    config.collections.forEach(col => {
      if (!collections[col.name]) {
        collections[col.name] = [...col.records];
      }
      
      // Expand collections database helpers
      const collectionName = col.name;
      collections[collectionName].add = function(record) {
        const _id = 'rec-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const newRecord = { _id, ...record };
        collections[collectionName].push(newRecord);
        saveDatabase();
        renderActivePage();
      };
      
      collections[collectionName].delete = function(id) {
        const idx = collections[collectionName].findIndex(r => r._id === id);
        if (idx !== -1) {
          collections[collectionName].splice(idx, 1);
          saveDatabase();
          renderActivePage();
        }
      };
    });
    
    function saveDatabase() {
      // Create a plain object representation to save (omitting prototype functions)
      const plainDb = {};
      Object.keys(collections).forEach(k => {
        plainDb[k] = collections[k].map(r => ({...r}));
      });
      localStorage.setItem(dbKey, JSON.stringify(plainDb));
    }
    
    // Toast logic
    function toast(text) {
      const toastEl = document.getElementById('toast-alert');
      const toastTextEl = document.getElementById('toast-text');
      toastTextEl.innerText = text;
      toastEl.classList.add('active');
      
      setTimeout(() => {
        toastEl.classList.remove('active');
      }, 3000);
    }
    
    // Modal logic
    function openModal(text) {
      const modal = document.getElementById('modal-overlay');
      const modalText = document.getElementById('modal-body-text');
      modalText.innerText = text;
      modal.classList.remove('hidden');
    }
    
    function closeModal() {
      document.getElementById('modal-overlay').classList.add('hidden');
    }
    
    // Navigation engine
    function navigate(pageId) {
      const targetPage = config.pages.find(p => p.id === pageId || p.name === pageId);
      if (targetPage) {
        activePageId = targetPage.id;
        renderActivePage();
      } else {
        console.error("Target page not found: " + pageId);
      }
    }
    
    // Custom Script Runner Context
    function runCustomScript(jsCode) {
      try {
        // Build isolated functional runtime executor
        const executor = new Function('state', 'collections', 'navigate', 'toast', 'openModal', jsCode);
        executor(state, collections, navigate, toast, openModal);
      } catch (err) {
        console.error("Action Script error: ", err);
        toast("Script Error: " + err.message);
      }
    }
    
    // Visual text template string interpolation evaluator
    function interpolateText(rawText) {
      if (!rawText) return '';
      return rawText.replace(/\\{\\{([^}]+)\\}\\}/g, (match, expression) => {
        try {
          const cleanExpr = expression.trim();
          if (cleanExpr.startsWith('state.')) {
            const key = cleanExpr.substring(6);
            return state[key] !== undefined ? state[key] : '';
          }
          if (cleanExpr.startsWith('collection.')) {
            // Evaluates count length, fields, etc.
            const parts = cleanExpr.split('.');
            const colName = parts[1];
            const property = parts[2];
            
            if (collections[colName]) {
              if (property === 'length') {
                return collections[colName].length;
              }
              return JSON.stringify(collections[colName]);
            }
          }
          return '';
        } catch(e) {
          return match;
        }
      });
    }

    // Interactive Action dispatcher
    function triggerAction(action, elementValue) {
      if (!action || action.type === 'none') return;
      
      switch (action.type) {
        case 'navigate':
          if (action.targetPage) {
            navigate(action.targetPage);
          }
          break;
        case 'state':
          if (action.stateKey) {
            state[action.stateKey] = elementValue;
            renderActivePage();
          }
          break;
        case 'toast':
          if (action.toastText) {
            toast(interpolateText(action.toastText));
          }
          break;
        case 'modal':
          if (action.modalContent) {
            openModal(interpolateText(action.modalContent));
          }
          break;
        case 'script':
          if (action.code) {
            runCustomScript(action.code);
          }
          break;
      }
    }

    // Dynamic Element CSS Mapper
    function parseStyles(element) {
      let stylesStr = '';
      const styleKeys = Object.keys(element.styles || {});
      styleKeys.forEach(k => {
        let val = element.styles[k];
        // Convert JS camelCase styles to CSS dash-case
        const cssKey = k.replace(/([A-Z])/g, "-$1").toLowerCase();
        
        if (cssKey === 'custom-gradient' && val) {
          stylesStr += \`background: \${val};\`;
          return;
        }
        
        if (typeof val === 'number' && !['zIndex', 'opacity', 'flex', 'fontWeight'].includes(k)) {
          val = val + 'px';
        }
        stylesStr += \`\${cssKey}: \${val};\`;
      });
      return stylesStr;
    }

    // dynamic compiler tree mapping elements into HTML
    function compileElementToHtml(element) {
      const inlineStyles = parseStyles(element);
      const isContainer = ['container', 'grid', 'card', 'tabs'].includes(element.type);
      
      let elementHtml = '';
      
      // Inline children compilation resolver
      let childrenHtml = '';
      if (element.children && element.children.length > 0) {
        childrenHtml = element.children.map(compileElementToHtml).join('');
      }

      switch (element.type) {
        case 'container':
          elementHtml = \`<div style="\${inlineStyles}">\${childrenHtml}</div>\`;
          break;
        case 'grid':
          const cols = element.properties.gridCols || 2;
          elementHtml = \`<div class="grid" style="grid-template-columns: repeat(\${cols}, minmax(0, 1fr)); \${inlineStyles}">\${childrenHtml}</div>\`;
          break;
        case 'card':
          elementHtml = \`<div class="shadow-sm border border-slate-100 bg-white" style="\${inlineStyles}">\${childrenHtml}</div>\`;
          break;
        case 'tabs':
          const activeTabIdx = element.properties.activeTab || 0;
          const headers = element.properties.tabHeaders || ['Tab 1'];
          
          let tabsHeaderHtml = \`<div class="flex border-b border-slate-100 mb-4">\`;
          headers.forEach((h, idx) => {
            const isActive = idx === activeTabIdx;
            const borderCol = isActive ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700';
            tabsHeaderHtml += \`
              <button onclick="state.activeTab = \${idx}; renderActivePage()" class="px-5 py-3 border-b-2 font-medium text-sm transition \${borderCol}">
                \${h}
              </button>
            \`;
          });
          tabsHeaderHtml += \`</div>\`;
          
          elementHtml = \`
            <div style="\${inlineStyles}">
              \${tabsHeaderHtml}
              <div>\${compileElementToHtml(element.children[activeTabIdx] || element.children[0])}</div>
            </div>
          \`;
          break;
          
        case 'heading':
          elementHtml = \`<h1 style="\${inlineStyles}">\${interpolateText(element.properties.value || element.label)}</h1>\`;
          break;
        case 'text':
          elementHtml = \`<p style="\${inlineStyles}">\${interpolateText(element.properties.value || element.label)}</p>\`;
          break;
        case 'divider':
          elementHtml = \`<hr style="\${inlineStyles}" class="my-4 border-slate-200" />\`;
          break;
        case 'image':
          const imgSrc = element.properties.src || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80';
          elementHtml = \`<img src="\${imgSrc}" style="object-fit: cover; width: 100%; height: auto; \${inlineStyles}" class="rounded-lg shadow-sm" alt="Appmaker Media" />\`;
          break;
        case 'video':
          const vidSrc = element.properties.src || 'https://www.w3schools.com/html/mov_bbb.mp4';
          elementHtml = \`
            <video controls style="width: 100%; height: auto; \${inlineStyles}" class="rounded-lg shadow-sm">
              <source src="\${vidSrc}" type="video/mp4">
              Your browser does not support HTML video.
            </video>
          \`;
          break;
        case 'icon':
          const iconName = (element.properties.iconName || 'Heart').toLowerCase();
          elementHtml = \`<i data-lucide="\${iconName}" style="\${inlineStyles}"></i>\`;
          break;
          
        case 'button':
          const clickActionStr = element.actions.onClick ? \`onclick="triggerAction(\${JSON.stringify(element.actions.onClick).replace(/"/g, '&quot;')})"\` : '';
          elementHtml = \`
            <button \${clickActionStr} style="\${inlineStyles}" class="btn-action flex items-center justify-center transition select-none">
              \${interpolateText(element.properties.value || element.label)}
            </button>
          \`;
          break;
          
        case 'input':
          const changeActionStr1 = element.actions.onChange ? \`oninput="triggerAction(\${JSON.stringify(element.actions.onChange).replace(/"/g, '&quot;')}, this.value)"\` : '';
          const stateKeyVal1 = element.actions.onChange?.stateKey ? (state[element.actions.onChange.stateKey] || '') : '';
          elementHtml = \`
            <input type="text" \${changeActionStr1} value="\${stateKeyVal1}" placeholder="\${element.properties.placeholder || 'Type here...'}" style="\${inlineStyles}" class="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white px-3.5 py-2.5 rounded-lg text-sm outline-none transition" />
          \`;
          break;
          
        case 'textarea':
          const changeActionStr2 = element.actions.onChange ? \`oninput="triggerAction(\${JSON.stringify(element.actions.onChange).replace(/"/g, '&quot;')}, this.value)"\` : '';
          const stateKeyVal2 = element.actions.onChange?.stateKey ? (state[element.actions.onChange.stateKey] || '') : '';
          elementHtml = \`
            <textarea \${changeActionStr2} placeholder="\${element.properties.placeholder || 'Type here...'}" style="\${inlineStyles}" class="w-full min-h-[100px] bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white px-3.5 py-2.5 rounded-lg text-sm outline-none transition">\${stateKeyVal2}</textarea>
          \`;
          break;
          
        case 'select':
          const changeActionStr3 = element.actions.onChange ? \`onchange="triggerAction(\${JSON.stringify(element.actions.onChange).replace(/"/g, '&quot;')}, this.value)"\` : '';
          const stateKeyVal3 = element.actions.onChange?.stateKey ? (state[element.actions.onChange.stateKey] || '') : '';
          const opts = element.properties.options || ['Option 1', 'Option 2'];
          let optsHtml = '';
          opts.forEach(opt => {
            const isSel = stateKeyVal3 === opt ? 'selected' : '';
            optsHtml += \`<option value="\${opt}" \${isSel}>\${opt}</option>\`;
          });
          
          elementHtml = \`
            <select \${changeActionStr3} style="\${inlineStyles}" class="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white px-3.5 py-2.5 rounded-lg text-sm outline-none cursor-pointer transition">
              \${optsHtml}
            </select>
          \`;
          break;
          
        case 'checkbox':
          const checkboxId = 'chk-' + element.id;
          const changeActionStr4 = element.actions.onChange ? \`onchange="triggerAction(\${JSON.stringify(element.actions.onChange).replace(/"/g, '&quot;')}, this.checked)"\` : '';
          const isChecked = element.actions.onChange?.stateKey ? (state[element.actions.onChange.stateKey] === true ? 'checked' : '') : '';
          elementHtml = \`
            <div class="flex items-center gap-3.5 select-none" style="\${inlineStyles}">
              <input type="checkbox" id="\${checkboxId}" \${changeActionStr4} \${isChecked} class="w-4.5 h-4.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer" />
              <label for="\${checkboxId}" class="text-sm font-medium text-slate-700 cursor-pointer">\${interpolateText(element.label)}</label>
            </div>
          \`;
          break;
          
        case 'switch':
          const switchId = 'sw-' + element.id;
          const changeActionStr5 = element.actions.onChange ? \`onchange="triggerAction(\${JSON.stringify(element.actions.onChange).replace(/"/g, '&quot;')}, this.checked)"\` : '';
          const isSwOn = element.actions.onChange?.stateKey ? (state[element.actions.onChange.stateKey] === true) : false;
          elementHtml = \`
            <div class="flex items-center gap-3 select-none" style="\${inlineStyles}">
              <div class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="\${switchId}" \${changeActionStr5} \${isSwOn ? 'checked' : ''} class="sr-only peer" />
                <div class="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </div>
              <label for="\${switchId}" class="text-sm font-medium text-slate-700 cursor-pointer">\${interpolateText(element.label)}</label>
            </div>
          \`;
          break;

        case 'table':
          const dataSourceName = element.properties.dataSource;
          const columnsToRender = element.properties.columns || [];
          
          if (!dataSourceName || !collections[dataSourceName]) {
            elementHtml = \`<div class="p-6 bg-slate-50 text-center text-slate-400 text-sm border rounded-lg border-dashed">Table not configured: binding missing.</div>\`;
            break;
          }
          
          const recordsToRender = collections[dataSourceName];
          
          let tableHeadersHtml = '';
          columnsToRender.forEach(c => {
            tableHeadersHtml += \`<th class="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">\${c}</th>\`;
          });
          tableHeadersHtml += \`<th class="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Delete</th>\`;
          
          let tableBodyHtml = '';
          if (recordsToRender.length === 0) {
            tableBodyHtml = \`
              <tr>
                <td colspan="\${columnsToRender.length + 1}" class="px-6 py-10 text-center text-slate-400 text-sm">
                  Collection database has no active rows. Use custom forms to append records.
                </td>
              </tr>
            \`;
          } else {
            recordsToRender.forEach(row => {
              tableBodyHtml += \`<tr class="hover:bg-slate-50 border-b border-slate-100 transition">\`;
              columnsToRender.forEach(c => {
                const val = row[c] !== undefined ? row[c] : '';
                tableBodyHtml += \`<td class="px-6 py-4 text-sm text-slate-700 font-medium">\${val}</td>\`;
              });
              // Row deletion action
              tableBodyHtml += \`
                <td class="px-6 py-4 text-right text-sm">
                  <button onclick="collections.\${dataSourceName}.delete('\${row._id}')" class="text-red-500 hover:text-red-700 font-semibold transition">
                    Delete
                  </button>
                </td>
              \`;
              tableBodyHtml += \`</tr>\`;
            });
          }
          
          elementHtml = \`
            <div class="overflow-x-auto w-full border border-slate-100 rounded-xl bg-white shadow-sm" style="\${inlineStyles}">
              <table class="min-w-full divide-y divide-slate-100 text-left">
                <thead class="bg-slate-50">
                  <tr>\${tableHeadersHtml}</tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  \${tableBodyHtml}
                </tbody>
              </table>
            </div>
          \`;
          break;
          
        case 'chart':
          // Visual Mock Charts in SVG
          const chartTitle = element.label || 'Analytics Record';
          const chartType = element.properties.chartType || 'bar';
          
          let svgContent = '';
          if (chartType === 'bar') {
            svgContent = \`
              <rect x="20" y="30" width="30" height="110" rx="4" fill="#6366f1" />
              <rect x="70" y="50" width="30" height="90" rx="4" fill="#a855f7" />
              <rect x="120" y="20" width="30" height="120" rx="4" fill="#6366f1" />
              <rect x="170" y="70" width="30" height="70" rx="4" fill="#10b981" />
              <rect x="220" y="40" width="30" height="100" rx="4" fill="#f59e0b" />
              <line x1="10" y1="140" x2="270" y2="140" stroke="#cbd5e1" stroke-width="2" />
            \`;
          } else if (chartType === 'line') {
            svgContent = \`
              <path d="M 20 120 L 70 80 L 120 100 L 170 30 L 220 70 L 260 20" fill="none" stroke="#6366f1" stroke-width="4" stroke-linecap="round" />
              <circle cx="20" cy="120" r="5" fill="#ffffff" stroke="#6366f1" stroke-width="3" />
              <circle cx="70" cy="80" r="5" fill="#ffffff" stroke="#6366f1" stroke-width="3" />
              <circle cx="120" cy="100" r="5" fill="#ffffff" stroke="#6366f1" stroke-width="3" />
              <circle cx="170" cy="30" r="5" fill="#ffffff" stroke="#6366f1" stroke-width="3" />
              <circle cx="220" cy="70" r="5" fill="#ffffff" stroke="#6366f1" stroke-width="3" />
              <circle cx="260" cy="20" r="5" fill="#ffffff" stroke="#6366f1" stroke-width="3" />
              <line x1="10" y1="140" x2="270" y2="140" stroke="#cbd5e1" stroke-width="2" />
            \`;
          } else {
            // Pie
            svgContent = \`
              <circle cx="140" cy="80" r="60" fill="#f1f5f9" />
              <path d="M 140 80 L 140 20 A 60 60 0 0 1 200 80 Z" fill="#6366f1" />
              <path d="M 140 80 L 200 80 A 60 60 0 1 1 140 20 Z" fill="#a855f7" />
            \`;
          }
          
          elementHtml = \`
            <div style="\${inlineStyles}" class="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex flex-col gap-3">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">\${chartTitle}</span>
              <div class="flex justify-center items-center h-[160px]">
                <svg width="280" height="150" viewBox="0 0 280 150">\${svgContent}</svg>
              </div>
            </div>
          \`;
          break;
          
        case 'map':
          const mapLoc = element.properties.mapLocation || 'San Francisco, CA';
          elementHtml = \`
            <div style="\${inlineStyles}" class="bg-slate-100 border border-slate-200 rounded-xl relative overflow-hidden flex flex-col justify-end p-4 min-h-[180px] shadow-sm">
              <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-122.4194,37.7749,12,0/400x300?access_token=mock')">
                <div class="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                  <div class="w-8 h-8 rounded-full bg-brand/35 border-2 border-brand flex items-center justify-center animate-bounce">
                    <div class="w-3 h-3 rounded-full bg-brand"></div>
                  </div>
                </div>
              </div>
              <div class="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow border border-slate-200/50 z-10">
                <div class="text-xs font-bold text-slate-800">Map Destination</div>
                <div class="text-[10px] text-slate-500 font-medium">\${mapLoc}</div>
              </div>
            </div>
          \`;
          break;
      }

      return elementHtml;
    }

    // Render active screen function
    function renderActivePage() {
      const activePage = config.pages.find(p => p.id === activePageId);
      if (!activePage) {
        document.getElementById('app-root').innerHTML = '<div class="p-10 text-center text-slate-400">Home Screen not found</div>';
        return;
      }
      
      let pageHtml = '';
      activePage.elements.forEach(element => {
        pageHtml += compileElementToHtml(element);
      });
      
      document.getElementById('app-root').innerHTML = pageHtml;
      
      // Re-trigger Lucide Icons rendering on page updates
      lucide.createIcons();
    }
    
    // Initialise App Render
    window.addEventListener('load', () => {
      renderActivePage();
    });
  </script>
</body>
</html>`;

  // Visual in-browser downloader
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${config.appName.replace(/\s+/g, '_')}_published_app.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
