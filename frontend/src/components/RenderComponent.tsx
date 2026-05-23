import React from 'react';
import type { AppElement, Collection, GlobalState } from '../types';
import * as LucideIcons from 'lucide-react';
import { Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';

interface RenderComponentProps {
  element: AppElement;
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onMoveElement: (id: string, direction: 'up' | 'down') => void;
  isPlayMode: boolean;
  globalStates: GlobalState[];
  collections: Collection[];
  onUpdateState: (key: string, value: any) => void;
  onRunScript: (code: string) => void;
  onNavigate: (pageId: string) => void;
  onShowToast: (text: string) => void;
  stateValues: Record<string, any>;
  onTriggerCollectionAction: (actionType: 'add' | 'delete', colName: string, data?: any) => void;
}

export const RenderComponent: React.FC<RenderComponentProps> = ({
  element,
  selectedElementId,
  onSelectElement,
  onDeleteElement,
  onDuplicateElement,
  onMoveElement,
  isPlayMode,
  globalStates,
  collections,
  onUpdateState,
  onRunScript,
  onNavigate,
  onShowToast,
  stateValues,
  onTriggerCollectionAction
}) => {
  const isSelected = selectedElementId === element.id;

  // Visual text template string interpolation evaluator
  const evalInterpolation = (text: string | undefined): string => {
    if (!text) return '';
    return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      try {
        const cleanExpr = expression.trim();
        if (cleanExpr.startsWith('state.')) {
          const stateKey = cleanExpr.substring(6);
          return stateValues[stateKey] !== undefined ? String(stateValues[stateKey]) : '';
        }
        if (cleanExpr.startsWith('collection.')) {
          const parts = cleanExpr.split('.');
          const colName = parts[1];
          const property = parts[2];
          const foundCollection = collections.find(c => c.name === colName);
          if (foundCollection) {
            if (property === 'length') {
              return String(foundCollection.records.length);
            }
            return JSON.stringify(foundCollection.records);
          }
        }
        return '';
      } catch (e) {
        return match;
      }
    });
  };

  // Convert visual camelCase properties back to standard styles
  const getCompiledStyles = (el: AppElement): React.CSSProperties => {
    const rawStyles = { ...el.styles };
    
    // Gradient custom support
    if (rawStyles.customGradient) {
      rawStyles.background = rawStyles.customGradient;
      delete rawStyles.customGradient;
    }

    // Grid details
    if (el.type === 'grid' && el.properties.gridCols) {
      return {
        ...rawStyles,
        display: 'grid',
        gridTemplateColumns: `repeat(${el.properties.gridCols || 2}, minmax(0, 1fr))`,
        gap: rawStyles.gap || '16px'
      };
    }

    return rawStyles as React.CSSProperties;
  };

  // Action dispatcher
  const handleTriggerAction = (action: any, elementValue?: any) => {
    if (!action || action.type === 'none') return;

    switch (action.type) {
      case 'navigate':
        if (action.targetPage) onNavigate(action.targetPage);
        break;
      case 'state':
        if (action.stateKey) onUpdateState(action.stateKey, elementValue);
        break;
      case 'toast':
        if (action.toastText) onShowToast(evalInterpolation(action.toastText));
        break;
      case 'modal':
        if (action.modalContent) {
          alert(evalInterpolation(action.modalContent)); // Standard elegant browser dialogue fallback
        }
        break;
      case 'script':
        if (action.code) onRunScript(action.code);
        break;
    }
  };

  // Helper structure to recursively compile child layout components
  const renderChildren = () => {
    if (!element.children) return null;
    return element.children.map(child => (
      <RenderComponent
        key={child.id}
        element={child}
        selectedElementId={selectedElementId}
        onSelectElement={onSelectElement}
        onDeleteElement={onDeleteElement}
        onDuplicateElement={onDuplicateElement}
        onMoveElement={onMoveElement}
        isPlayMode={isPlayMode}
        globalStates={globalStates}
        collections={collections}
        onUpdateState={onUpdateState}
        onRunScript={onRunScript}
        onNavigate={onNavigate}
        onShowToast={onShowToast}
        stateValues={stateValues}
        onTriggerCollectionAction={onTriggerCollectionAction}
      />
    ));
  };

  // Compile individual canvas HTML element types
  const renderCoreElement = () => {
    const inlineStyles = getCompiledStyles(element);

    switch (element.type) {
      case 'container':
        return (
          <div style={inlineStyles}>
            {renderChildren()}
            {!isPlayMode && element.children?.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.8rem' }}>
                Empty Layout Container (Click components to append)
              </div>
            )}
          </div>
        );
        
      case 'grid':
        return (
          <div style={inlineStyles}>
            {renderChildren()}
            {!isPlayMode && element.children?.length === 0 && (
              <div style={{ padding: '20px', gridColumn: 'span 12', textAlign: 'center', color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.8rem' }}>
                Empty Grid Column Layout
              </div>
            )}
          </div>
        );

      case 'card':
        return (
          <div
            className="shadow-sm border border-slate-100 bg-white"
            style={inlineStyles}
          >
            {renderChildren()}
            {!isPlayMode && element.children?.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.8rem' }}>
                Empty Graphic Card
              </div>
            )}
          </div>
        );

      case 'tabs':
        const activeTabIdx = element.properties.activeTab || 0;
        const tabHeaders = element.properties.tabHeaders || ['Tab 1'];
        return (
          <div style={inlineStyles}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
              {tabHeaders.map((header, idx) => {
                const isActive = idx === activeTabIdx;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isPlayMode) {
                        // Simply update visual tab selector
                        element.properties.activeTab = idx;
                        onUpdateState('_tabs_' + element.id, idx);
                      }
                    }}
                    style={{
                      padding: '10px 16px',
                      border: 'none',
                      background: 'transparent',
                      borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                      color: isActive ? '#6366f1' : '#64748b',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {header}
                  </button>
                );
              })}
            </div>
            <div>
              {element.children && element.children[activeTabIdx] ? (
                <RenderComponent
                  element={element.children[activeTabIdx]}
                  selectedElementId={selectedElementId}
                  onSelectElement={onSelectElement}
                  onDeleteElement={onDeleteElement}
                  onDuplicateElement={onDuplicateElement}
                  onMoveElement={onMoveElement}
                  isPlayMode={isPlayMode}
                  globalStates={globalStates}
                  collections={collections}
                  onUpdateState={onUpdateState}
                  onRunScript={onRunScript}
                  onNavigate={onNavigate}
                  onShowToast={onShowToast}
                  stateValues={stateValues}
                  onTriggerCollectionAction={onTriggerCollectionAction}
                />
              ) : (
                <div style={{ padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>Tab Screen Content Empty</div>
              )}
            </div>
          </div>
        );

      case 'heading':
        return (
          <h2 style={inlineStyles}>
            {evalInterpolation(element.properties.value || element.label)}
          </h2>
        );

      case 'text':
        return (
          <p style={inlineStyles}>
            {evalInterpolation(element.properties.value || element.label)}
          </p>
        );

      case 'divider':
        return <hr style={{ border: 0, borderBottom: '1px solid #cbd5e1', ...inlineStyles }} />;

      case 'image':
        const imgSrc = element.properties.src || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80';
        return (
          <img
            src={imgSrc}
            alt={element.label}
            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', ...inlineStyles }}
            className="rounded-lg shadow-sm"
          />
        );

      case 'video':
        const vidSrc = element.properties.src || 'https://www.w3schools.com/html/mov_bbb.mp4';
        return (
          <video controls style={{ width: '100%', height: 'auto', display: 'block', ...inlineStyles }} className="rounded-lg shadow-sm">
            <source src={vidSrc} type="video/mp4" />
          </video>
        );

      case 'icon':
        const IconComponent = (LucideIcons as any)[element.properties.iconName || 'Heart'] || LucideIcons.HelpCircle;
        const size = element.properties.iconSize || 24;
        return (
          <div style={{ display: 'inline-flex', ...inlineStyles }}>
            <IconComponent size={size} />
          </div>
        );

      case 'button':
        return (
          <button
            style={inlineStyles}
            onClick={() => handleTriggerAction(element.actions.onClick)}
            className="btn-action flex items-center justify-center transition select-none"
          >
            {evalInterpolation(element.properties.value || element.label)}
          </button>
        );

      case 'input':
        const valBindKey1 = element.actions.onChange?.stateKey || '';
        const currentVal1 = valBindKey1 ? (stateValues[valBindKey1] || '') : '';
        return (
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white px-3.5 py-2.5 rounded-lg text-sm outline-none transition"
            placeholder={element.properties.placeholder || 'Type here...'}
            style={inlineStyles}
            value={currentVal1}
            onChange={(e) => handleTriggerAction(element.actions.onChange, e.target.value)}
          />
        );

      case 'textarea':
        const valBindKey2 = element.actions.onChange?.stateKey || '';
        const currentVal2 = valBindKey2 ? (stateValues[valBindKey2] || '') : '';
        return (
          <textarea
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white px-3.5 py-2.5 rounded-lg text-sm outline-none transition"
            placeholder={element.properties.placeholder || 'Type here...'}
            style={{ minHeight: '80px', ...inlineStyles }}
            value={currentVal2}
            onChange={(e) => handleTriggerAction(element.actions.onChange, e.target.value)}
          />
        );

      case 'select':
        const valBindKey3 = element.actions.onChange?.stateKey || '';
        const currentVal3 = valBindKey3 ? (stateValues[valBindKey3] || '') : '';
        const options = element.properties.options || ['Option 1', 'Option 2'];
        return (
          <select
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white px-3.5 py-2.5 rounded-lg text-sm outline-none cursor-pointer transition"
            style={inlineStyles}
            value={currentVal3}
            onChange={(e) => handleTriggerAction(element.actions.onChange, e.target.value)}
          >
            {options.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'checkbox':
        const valBindKey4 = element.actions.onChange?.stateKey || '';
        const isChecked4 = valBindKey4 ? !!stateValues[valBindKey4] : false;
        return (
          <div className="flex items-center gap-3 select-none" style={inlineStyles}>
            <input
              type="checkbox"
              id={`chk-${element.id}`}
              checked={isChecked4}
              onChange={(e) => handleTriggerAction(element.actions.onChange, e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor={`chk-${element.id}`} className="text-sm font-medium text-slate-700 cursor-pointer">
              {evalInterpolation(element.label)}
            </label>
          </div>
        );

      case 'switch':
        const valBindKey5 = element.actions.onChange?.stateKey || '';
        const isChecked5 = valBindKey5 ? !!stateValues[valBindKey5] : false;
        return (
          <div className="flex items-center gap-3 select-none" style={inlineStyles}>
            <div
              className="relative inline-flex items-center cursor-pointer"
              onClick={() => handleTriggerAction(element.actions.onChange, !isChecked5)}
            >
              <div
                style={{
                  width: '40px',
                  height: '20px',
                  background: isChecked5 ? '#6366f1' : '#cbd5e1',
                  borderRadius: '20px',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    background: '#fff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: isChecked5 ? '22px' : '2px',
                    transition: 'left 0.2s'
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-slate-700">{evalInterpolation(element.label)}</span>
          </div>
        );

      case 'table':
        const colSource = element.properties.dataSource;
        const columns = element.properties.columns || [];
        const matchedCol = collections.find(c => c.name === colSource);

        if (!colSource || !matchedCol) {
          return (
            <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}>
              Database Table not configured (Select datasource in Properties tab)
            </div>
          );
        }

        return (
          <div className="overflow-x-auto w-full border border-slate-100 rounded-xl bg-white shadow-sm" style={inlineStyles}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  {columns.map((col, idx) => (
                    <th key={idx} style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                      {col}
                    </th>
                  ))}
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {matchedCol.records.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                      No records inside Database collection.
                    </td>
                  </tr>
                ) : (
                  matchedCol.records.map((row) => (
                    <tr key={row._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                      {columns.map((col, colIdx) => (
                        <td key={colIdx} style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>
                          {row[col] !== undefined ? String(row[col]) : ''}
                        </td>
                      ))}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => onTriggerCollectionAction('delete', colSource, row._id)}
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );

      case 'chart':
        const chartTitle = element.label || 'Analytics Record';
        const chartType = element.properties.chartType || 'bar';

        return (
          <div style={inlineStyles} className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex flex-col gap-3">
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {chartTitle}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
              <svg width="240" height="130" viewBox="0 0 240 130">
                {chartType === 'bar' ? (
                  <>
                    <rect x="20" y="30" width="24" height="80" rx="3" fill="#6366f1" />
                    <rect x="60" y="50" width="24" height="60" rx="3" fill="#a855f7" />
                    <rect x="100" y="20" width="24" height="90" rx="3" fill="#6366f1" />
                    <rect x="140" y="70" width="24" height="40" rx="3" fill="#10b981" />
                    <rect x="180" y="40" width="24" height="70" rx="3" fill="#f59e0b" />
                    <line x1="10" y1="110" x2="220" y2="110" stroke="#cbd5e1" strokeWidth="1.5" />
                  </>
                ) : chartType === 'line' ? (
                  <>
                    <path d="M 20 90 L 60 60 L 100 80 L 140 30 L 180 50 L 220 20" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="20" cy="90" r="4" fill="#fff" stroke="#6366f1" strokeWidth="2.5" />
                    <circle cx="60" cy="60" r="4" fill="#fff" stroke="#6366f1" strokeWidth="2.5" />
                    <circle cx="100" cy="80" r="4" fill="#fff" stroke="#6366f1" strokeWidth="2.5" />
                    <circle cx="140" cy="30" r="4" fill="#fff" stroke="#6366f1" strokeWidth="2.5" />
                    <circle cx="180" cy="50" r="4" fill="#fff" stroke="#6366f1" strokeWidth="2.5" />
                    <line x1="10" y1="110" x2="220" y2="110" stroke="#cbd5e1" strokeWidth="1.5" />
                  </>
                ) : (
                  <>
                    <circle cx="120" cy="65" r="45" fill="#f1f5f9" />
                    <path d="M 120 65 L 120 20 A 45 45 0 0 1 165 65 Z" fill="#6366f1" />
                    <path d="M 120 65 L 165 65 A 45 45 0 1 1 120 20 Z" fill="#a855f7" />
                  </>
                )}
              </svg>
            </div>
          </div>
        );

      case 'map':
        const mapLoc = element.properties.mapLocation || 'San Francisco, CA';
        return (
          <div style={{ position: 'relative', overflow: 'hidden', minHeight: '160px', ...inlineStyles }} className="bg-slate-100 border border-slate-200 rounded-xl flex flex-col justify-end p-4 shadow-sm">
            <div style={{ position: 'absolute', inset: 0, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <LucideIcons.MapPin size={28} style={{ color: '#6366f1' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4f46e5' }}>{mapLoc}</span>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', zIndex: 5 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>Map</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{mapLoc}</div>
            </div>
          </div>
        );

      case 'carousel': {
        const slides = element.properties.src?.split(',').filter(Boolean) || [
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=600&q=80',
        ];
        return (
          <div style={{ position: 'relative', overflow: 'hidden', ...inlineStyles }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', padding: '4px 0' }}>
              {slides.map((src, i) => (
                <div key={i} style={{ flex: '0 0 80%', scrollSnapAlign: 'start', borderRadius: '10px', overflow: 'hidden', background: '#f1f5f9', minHeight: '120px' }}>
                  <img src={src.trim()} alt={`Slide ${i + 1}`} style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '8px 0 0' }}>
              {slides.map((_, i) => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '99px', background: i === 0 ? '#6366f1' : '#cbd5e1' }} />
              ))}
            </div>
          </div>
        );
      }

      case 'banner': {
        const bgSrc = element.properties.src || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
        return (
          <div style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            minHeight: '160px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            ...inlineStyles
          }}>
            <img src={bgSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
            <div style={{ position: 'relative', zIndex: 1, padding: '20px', color: '#fff' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>{element.properties.value || 'Banner Title'}</h3>
              <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>{element.properties.placeholder || 'Promotional subtitle'}</p>
            </div>
            {renderChildren()}
          </div>
        );
      }

      case 'list': {
        const listSource = element.properties.dataSource;
        const listCol = listSource ? collections.find(c => c.name === listSource) : null;
        const listItems = listCol?.records || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', ...inlineStyles }}>
            {listItems.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                {listSource ? 'No items' : 'Configure data source in Props'}
              </div>
            ) : (
              listItems.map((item, i) => {
                const fieldKeys = Object.keys(item).filter(k => k !== '_id');
                return (
                  <div key={item._id || i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', background: '#fff',
                    borderBottom: i < listItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: isPlayMode ? 'pointer' : 'default'
                  }}
                    onClick={() => isPlayMode && handleTriggerAction(element.actions.onClick, item)}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: `hsl(${(i * 60) % 360}, 55%, 60%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0
                    }}>
                      {String(item[fieldKeys[0]] || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{item[fieldKeys[0]] || 'Item'}</div>
                      {fieldKeys[1] && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{String(item[fieldKeys[1]] || '')}</div>}
                    </div>
                    <LucideIcons.ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  </div>
                );
              })
            )}
          </div>
        );
      }

      default:
        return <div>Unknown Component: {element.type}</div>;
    }
  };

  // Edit Mode wrapping outlines & badges
  if (!isPlayMode) {
    return (
      <div
        className={`canvas-element-wrapper ${isSelected ? 'selected' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement(element.id);
        }}
      >
        {isSelected && (
          <>
            <span className="canvas-element-badge">{element.type}</span>
            <div className="canvas-element-actions">
              <button
                className="canvas-action-btn"
                onClick={(e) => { e.stopPropagation(); onMoveElement(element.id, 'up'); }}
                title="Move Up"
              >
                <ArrowUp size={11} />
              </button>
              <button
                className="canvas-action-btn"
                onClick={(e) => { e.stopPropagation(); onMoveElement(element.id, 'down'); }}
                title="Move Down"
              >
                <ArrowDown size={11} />
              </button>
              <button
                className="canvas-action-btn"
                onClick={(e) => { e.stopPropagation(); onDuplicateElement(element.id); }}
                title="Duplicate"
              >
                <Copy size={11} />
              </button>
              <button
                className="canvas-action-btn"
                onClick={(e) => { e.stopPropagation(); onDeleteElement(element.id); }}
                style={{ color: '#f87171' }}
                title="Delete"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </>
        )}
        {renderCoreElement()}
      </div>
    );
  }

  // Play Mode - Render raw output directly
  return renderCoreElement();
};
