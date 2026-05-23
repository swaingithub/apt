import React, { useState } from 'react';
import type { AppElement, AppPage, Collection, GlobalState, ActiveTabRight, AppAction } from '../types';
import { Sliders, Settings, Zap, HelpCircle, X } from 'lucide-react';
import { IconSelector } from './IconSelector';

interface SidebarRightProps {
  selectedElement: AppElement | null;
  onUpdateElement: (updated: AppElement) => void;
  pages: AppPage[];
  collections: Collection[];
  globalStates: GlobalState[];
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  selectedElement, onUpdateElement, pages, collections, globalStates
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTabRight>('design');
  const [showIconPicker, setShowIconPicker] = useState(false);

  if (!selectedElement) {
    return (
      <div className="right-sidebar">
        <div className="sidebar-tabs">
          <div className="sidebar-tab-btn active" style={{ flex: 1, borderBottomColor: 'transparent', cursor: 'default' }}>
            <Sliders size={14} /> Inspector
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Sliders size={28} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <h4 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>No element selected</h4>
          <p style={{ fontSize: '0.68rem', lineHeight: '1.5' }}>Click a component on the canvas to edit its properties.</p>
        </div>
      </div>
    );
  }

  const handleUpdateStyle = (key: string, value: any) => {
    onUpdateElement({ ...selectedElement, styles: { ...selectedElement.styles, [key]: value === '' ? undefined : value } });
  };

  const handleUpdateProperty = (key: string, value: any) => {
    onUpdateElement({ ...selectedElement, properties: { ...selectedElement.properties, [key]: value } });
  };

  const handleUpdateAction = (eventKey: 'onClick' | 'onChange', updatedAction: AppAction) => {
    onUpdateElement({ ...selectedElement, actions: { ...selectedElement.actions, [eventKey]: updatedAction } });
  };

  const currentAction = (key: 'onClick' | 'onChange') => selectedElement.actions[key] || { type: 'none' };

  return (
    <div className="right-sidebar">
      <div className="sidebar-tabs">
        <button className={`sidebar-tab-btn ${activeTab === 'design' ? 'active' : ''}`} onClick={() => setActiveTab('design')}>
          <Sliders size={14} /> Design
        </button>
        <button className={`sidebar-tab-btn ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>
          <Settings size={14} /> Props
        </button>
        <button className={`sidebar-tab-btn ${activeTab === 'actions' ? 'active' : ''}`} onClick={() => setActiveTab('actions')}>
          <Zap size={14} /> Actions
        </button>
      </div>

      <div className="sidebar-content">

        {/* ── DESIGN ── */}
        {activeTab === 'design' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>Element</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.65rem', background: 'var(--accent-subtle)', color: 'var(--accent-hover)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                  {selectedElement.type}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{selectedElement.label}</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '8px' }}>Dimensions</h4>
              <div className="property-row" style={{ marginBottom: 0 }}>
                <div style={{ flex: 1 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Width</span>
                  <input type="text" className="form-input" placeholder="auto" value={selectedElement.styles.width || ''} onChange={(e) => handleUpdateStyle('width', e.target.value)} style={{ padding: '6px 8px', fontSize: '0.72rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Height</span>
                  <input type="text" className="form-input" placeholder="auto" value={selectedElement.styles.height || ''} onChange={(e) => handleUpdateStyle('height', e.target.value)} style={{ padding: '6px 8px', fontSize: '0.72rem' }} />
                </div>
              </div>
            </div>

            {['container', 'grid', 'card'].includes(selectedElement.type) && (
              <div>
                <h4 style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '8px' }}>Flex Layout</h4>
                <div className="property-row" style={{ marginBottom: 0 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Direction</span>
                  <div className="property-control-group">
                    <button className={`property-control-btn ${selectedElement.styles.flexDirection === 'row' ? 'active' : ''}`} onClick={() => handleUpdateStyle('flexDirection', 'row')} style={{ padding: '4px 8px', fontSize: '0.65rem' }}>Row</button>
                    <button className={`property-control-btn ${selectedElement.styles.flexDirection === 'column' ? 'active' : ''}`} onClick={() => handleUpdateStyle('flexDirection', 'column')} style={{ padding: '4px 8px', fontSize: '0.65rem' }}>Col</button>
                  </div>
                </div>
                <div className="property-row" style={{ marginBottom: 0 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Align</span>
                  <select className="form-select" style={{ width: '100px', padding: '5px 6px', fontSize: '0.7rem' }} value={selectedElement.styles.alignItems || 'stretch'} onChange={(e) => handleUpdateStyle('alignItems', e.target.value)}>
                    <option value="stretch">Stretch</option><option value="center">Center</option><option value="flex-start">Start</option><option value="flex-end">End</option>
                  </select>
                </div>
                <div className="property-row" style={{ marginBottom: 0 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Justify</span>
                  <select className="form-select" style={{ width: '100px', padding: '5px 6px', fontSize: '0.7rem' }} value={selectedElement.styles.justifyContent || 'flex-start'} onChange={(e) => handleUpdateStyle('justifyContent', e.target.value)}>
                    <option value="flex-start">Start</option><option value="center">Center</option><option value="flex-end">End</option><option value="space-between">Between</option><option value="space-around">Around</option>
                  </select>
                </div>
                <div className="property-row" style={{ marginBottom: 0 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Gap</span>
                  <input type="text" className="form-input" style={{ width: '80px', padding: '5px 8px', fontSize: '0.72rem' }} placeholder="12px" value={selectedElement.styles.gap || ''} onChange={(e) => handleUpdateStyle('gap', e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '8px' }}>Spacing</h4>
              <div className="property-row" style={{ marginBottom: 0 }}>
                <div style={{ flex: 1 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Padding</span>
                  <input type="text" className="form-input" placeholder="16px" value={selectedElement.styles.padding || ''} onChange={(e) => handleUpdateStyle('padding', e.target.value)} style={{ padding: '6px 8px', fontSize: '0.72rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Margin</span>
                  <input type="text" className="form-input" placeholder="0" value={selectedElement.styles.margin || ''} onChange={(e) => handleUpdateStyle('margin', e.target.value)} style={{ padding: '6px 8px', fontSize: '0.72rem' }} />
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '8px' }}>Colors</h4>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: '0.6rem' }}>Background</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="color" style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }} value={selectedElement.styles.backgroundColor?.startsWith('#') ? selectedElement.styles.backgroundColor : '#ffffff'} onChange={(e) => handleUpdateStyle('backgroundColor', e.target.value)} />
                  <input type="text" className="form-input" placeholder="Hex/RGB" value={selectedElement.styles.backgroundColor || ''} onChange={(e) => handleUpdateStyle('backgroundColor', e.target.value)} style={{ padding: '5px 8px', fontSize: '0.72rem' }} />
                </div>
              </div>
              <div className="property-row" style={{ marginBottom: 0 }}>
                <div style={{ flex: 1 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Radius</span>
                  <input type="text" className="form-input" placeholder="8px" value={selectedElement.styles.borderRadius || ''} onChange={(e) => handleUpdateStyle('borderRadius', e.target.value)} style={{ padding: '6px 8px', fontSize: '0.72rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Border</span>
                  <input type="text" className="form-input" placeholder="1px solid" value={selectedElement.styles.border || ''} onChange={(e) => handleUpdateStyle('border', e.target.value)} style={{ padding: '6px 8px', fontSize: '0.72rem' }} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0, marginTop: 8 }}>
                <span className="form-label" style={{ fontSize: '0.6rem' }}>Shadow</span>
                <select className="form-select" value={selectedElement.styles.boxShadow || 'none'} onChange={(e) => handleUpdateStyle('boxShadow', e.target.value)} style={{ padding: '5px 8px', fontSize: '0.72rem' }}>
                  <option value="none">None</option>
                  <option value="0 1px 3px rgba(0,0,0,0.05)">Small</option>
                  <option value="0 4px 6px -1px rgba(0,0,0,0.1)">Medium</option>
                  <option value="0 10px 15px -3px rgba(0,0,0,0.15)">Large</option>
                </select>
              </div>
            </div>

            {['heading', 'text', 'button', 'input', 'select', 'textarea', 'checkbox', 'switch'].includes(selectedElement.type) && (
              <div>
                <h4 style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '8px' }}>Typography</h4>
                <div className="property-row" style={{ marginBottom: 0 }}>
                  <div style={{ flex: 1 }}>
                    <span className="form-label" style={{ fontSize: '0.6rem' }}>Size</span>
                    <input type="text" className="form-input" placeholder="14px" value={selectedElement.styles.fontSize || ''} onChange={(e) => handleUpdateStyle('fontSize', e.target.value)} style={{ padding: '6px 8px', fontSize: '0.72rem' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="form-label" style={{ fontSize: '0.6rem' }}>Weight</span>
                    <select className="form-select" value={selectedElement.styles.fontWeight || '400'} onChange={(e) => handleUpdateStyle('fontWeight', e.target.value)} style={{ padding: '5px 6px', fontSize: '0.72rem' }}>
                      <option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semi</option><option value="700">Bold</option><option value="800">Black</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0, marginTop: 8 }}>
                  <span className="form-label" style={{ fontSize: '0.6rem' }}>Color</span>
                  <input type="text" className="form-input" placeholder="#000" value={selectedElement.styles.color || ''} onChange={(e) => handleUpdateStyle('color', e.target.value)} style={{ padding: '5px 8px', fontSize: '0.72rem' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PROPS ── */}
        {activeTab === 'content' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {['heading', 'text', 'button'].includes(selectedElement.type) && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">Text Content <span style={{ color: 'var(--accent-hover)', fontSize: '0.6rem' }}>Supports {'{{state.var}}'}</span></span>
                <textarea className="form-input" style={{ minHeight: '70px', padding: '8px', fontSize: '0.75rem' }} placeholder="Enter text..." value={selectedElement.properties.value || ''} onChange={(e) => handleUpdateProperty('value', e.target.value)} />
              </div>
            )}

            {selectedElement.type === 'grid' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">Columns</span>
                <select className="form-select" value={selectedElement.properties.gridCols || 2} onChange={(e) => handleUpdateProperty('gridCols', Number(e.target.value))} style={{ padding: '7px 8px', fontSize: '0.75rem' }}>
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={6}>6</option>
                </select>
              </div>
            )}

            {['image', 'video'].includes(selectedElement.type) && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">Source URL</span>
                <input type="text" className="form-input" placeholder="https://..." value={selectedElement.properties.src || ''} onChange={(e) => handleUpdateProperty('src', e.target.value)} style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
              </div>
            )}

            {['input', 'textarea'].includes(selectedElement.type) && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">Placeholder</span>
                <input type="text" className="form-input" placeholder="Hint text..." value={selectedElement.properties.placeholder || ''} onChange={(e) => handleUpdateProperty('placeholder', e.target.value)} style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
              </div>
            )}

            {selectedElement.type === 'select' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">Options (comma-separated)</span>
                <input type="text" className="form-input" placeholder="A, B, C" value={selectedElement.properties.options?.join(', ') || ''} onChange={(e) => handleUpdateProperty('options', e.target.value.split(',').map(s => s.trim()))} style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
              </div>
            )}

            {selectedElement.type === 'tabs' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">Tab Headers (comma-separated)</span>
                <input type="text" className="form-input" placeholder="Tab 1, Tab 2" value={selectedElement.properties.tabHeaders?.join(', ') || ''} onChange={(e) => handleUpdateProperty('tabHeaders', e.target.value.split(',').map(s => s.trim()))} style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
              </div>
            )}

            {selectedElement.type === 'table' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <span className="form-label">Bind Collection</span>
                  <select className="form-select" value={selectedElement.properties.dataSource || ''} onChange={(e) => {
                    const selCol = collections.find(c => c.name === e.target.value);
                    handleUpdateProperty('dataSource', e.target.value);
                    if (selCol) handleUpdateProperty('columns', selCol.fields.map(f => f.name));
                  }} style={{ padding: '7px 8px', fontSize: '0.75rem' }}>
                    <option value="">-- Select --</option>
                    {collections.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                  </select>
                </div>
                {selectedElement.properties.dataSource && (
                  <div style={{ padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span className="form-label" style={{ fontSize: '0.65rem' }}>Columns</span>
                    {collections.find(c => c.name === selectedElement.properties.dataSource)?.fields.map(field => {
                      const isChecked = selectedElement.properties.columns?.includes(field.name);
                      return (
                        <label key={field.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={isChecked} onChange={(e) => {
                            let cols = selectedElement.properties.columns || [];
                            if (e.target.checked) cols = [...cols, field.name];
                            else cols = cols.filter(c => c !== field.name);
                            handleUpdateProperty('columns', cols);
                          }} />
                          <span>{field.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>({field.type})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {selectedElement.type === 'chart' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">Chart Type</span>
                <select className="form-select" value={selectedElement.properties.chartType || 'bar'} onChange={(e) => handleUpdateProperty('chartType', e.target.value)} style={{ padding: '7px 8px', fontSize: '0.75rem' }}>
                  <option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option>
                </select>
              </div>
            )}

            {selectedElement.type === 'map' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">Location</span>
                <input type="text" className="form-input" placeholder="City, Country" value={selectedElement.properties.mapLocation || ''} onChange={(e) => handleUpdateProperty('mapLocation', e.target.value)} style={{ padding: '7px 8px', fontSize: '0.75rem' }} />
              </div>
            )}

            {selectedElement.type === 'icon' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <span className="form-label">Icon</span>
                  <button className="glow-btn" onClick={() => setShowIconPicker(true)} style={{ padding: '7px 10px', fontSize: '0.72rem', width: '100%', justifyContent: 'center' }}>
                    Choose ({selectedElement.properties.iconName || 'Heart'})
                  </button>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <span className="form-label">Size ({selectedElement.properties.iconSize || 24}px)</span>
                  <input type="range" min="14" max="80" style={{ width: '100%' }} value={selectedElement.properties.iconSize || 24} onChange={(e) => handleUpdateProperty('iconSize', Number(e.target.value))} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIONS ── */}
        {activeTab === 'actions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {['button', 'icon'].includes(selectedElement.type) && (
              <div>
                <h4 style={{ fontSize: '0.72rem', color: 'var(--accent-hover)', fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Zap size={12} /> On Click
                </h4>
                {renderActionInspector('onClick')}
              </div>
            )}
            {['input', 'textarea', 'select', 'checkbox', 'switch'].includes(selectedElement.type) && (
              <div>
                <h4 style={{ fontSize: '0.72rem', color: 'var(--accent-hover)', fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Zap size={12} /> On Change
                </h4>
                {renderActionInspector('onChange')}
              </div>
            )}
          </div>
        )}
      </div>

      {showIconPicker && <IconSelector currentIcon={selectedElement.properties.iconName || 'Heart'} onSelectIcon={(iconName) => handleUpdateProperty('iconName', iconName)} onClose={() => setShowIconPicker(false)} />}
    </div>
  );

  function renderActionInspector(eventKey: 'onClick' | 'onChange') {
    const action = currentAction(eventKey);
    return (
      <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <span className="form-label" style={{ fontSize: '0.65rem' }}>Trigger</span>
          <select className="form-select" value={action.type} onChange={(e) => handleUpdateAction(eventKey, { type: e.target.value as any })} style={{ padding: '6px 8px', fontSize: '0.72rem' }}>
            <option value="none">None</option>
            <option value="navigate">Navigate</option>
            {eventKey === 'onChange' && <option value="state">Set Variable</option>}
            <option value="toast">Toast</option>
            <option value="modal">Modal</option>
            <option value="script">Custom JS</option>
          </select>
        </div>

        {action.type === 'navigate' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <span className="form-label" style={{ fontSize: '0.65rem' }}>Target Page</span>
            <select className="form-select" value={action.targetPage || ''} onChange={(e) => handleUpdateAction(eventKey, { ...action, targetPage: e.target.value })} style={{ padding: '6px 8px', fontSize: '0.72rem' }}>
              <option value="">-- Select --</option>
              {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {action.type === 'state' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <span className="form-label" style={{ fontSize: '0.65rem' }}>Variable</span>
            <select className="form-select" value={action.stateKey || ''} onChange={(e) => handleUpdateAction(eventKey, { ...action, stateKey: e.target.value })} style={{ padding: '6px 8px', fontSize: '0.72rem' }}>
              <option value="">-- Select --</option>
              {globalStates.map(v => <option key={v.name} value={v.name}>{v.name} ({v.type})</option>)}
            </select>
          </div>
        )}

        {action.type === 'toast' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <span className="form-label" style={{ fontSize: '0.65rem' }}>Message</span>
            <input type="text" className="form-input" placeholder="Success!" value={action.toastText || ''} onChange={(e) => handleUpdateAction(eventKey, { ...action, toastText: e.target.value })} style={{ padding: '6px 8px', fontSize: '0.72rem' }} />
          </div>
        )}

        {action.type === 'modal' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <span className="form-label" style={{ fontSize: '0.65rem' }}>Content</span>
            <textarea className="form-input" placeholder="Warning..." value={action.modalContent || ''} onChange={(e) => handleUpdateAction(eventKey, { ...action, modalContent: e.target.value })} style={{ padding: '6px 8px', fontSize: '0.72rem', minHeight: '60px' }} />
          </div>
        )}

        {action.type === 'script' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="form-label" style={{ margin: 0, fontSize: '0.65rem' }}>JavaScript</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', background: 'var(--accent-subtle)', padding: '1px 5px', borderRadius: '3px', fontFamily: "'JetBrains Mono', monospace" }}>JS</span>
            </div>
            <textarea className="custom-code-editor" style={{ height: '140px', fontSize: '0.68rem' }} value={action.code || ''} onChange={(e) => handleUpdateAction(eventKey, { ...action, code: e.target.value })}
              placeholder={`// Available:\n// state, collections, navigate, toast\n\nstate.count = 1;\nnavigate("page-2");`} />
            <div style={{ marginTop: '8px', padding: '8px', background: 'var(--accent-subtle)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-sm)', fontSize: '0.6rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <div style={{ fontWeight: 500, marginBottom: '2px', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <HelpCircle size={9} /> Available:
              </div>
              <div>• state, collections.Name.add(rec), collections.Name.delete(id)</div>
              <div>• navigate(pageId), toast(text)</div>
            </div>
          </div>
        )}
      </div>
    );
  }
};
