import React from 'react';
import type { AppPage, Collection, GlobalState } from '../types';
import { RenderComponent } from './RenderComponent';
import { Smartphone, Info } from 'lucide-react';

interface WorkspaceCanvasProps {
  activePage: AppPage | null;
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

export const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  activePage, selectedElementId, onSelectElement,
  onDeleteElement, onDuplicateElement, onMoveElement,
  isPlayMode, globalStates, collections, onUpdateState,
  onRunScript, onNavigate, onShowToast,
  stateValues, onTriggerCollectionAction
}) => {

  if (!activePage) {
    return (
      <div className="canvas-panel">
        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
          <Info size={32} style={{ marginBottom: '10px', opacity: 0.4 }} />
          <h3 style={{ fontSize: '0.85rem', fontWeight: 500 }}>No Active Page</h3>
          <p style={{ fontSize: '0.7rem', marginTop: '4px' }}>Add a page from the Pages tab</p>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-panel">
      <div className="phone-frame">
        <div className="phone-notch" />
        {!isPlayMode && <div className="phone-status-bar"><Smartphone size={10} /> <span>App Preview</span></div>}
        <div className="viewport-frame">
          <div
            className="viewport-body"
            onClick={() => onSelectElement('')}
          >
            {activePage.elements.length === 0 ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '32px', textAlign: 'center', color: '#94a3b8'
              }}>
                <Smartphone size={28} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <h4 style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 600, marginBottom: '4px' }}>
                  Screen is empty
                </h4>
                <p style={{ fontSize: '0.68rem', maxWidth: '240px', lineHeight: '1.5', color: '#64748b' }}>
                  Tap the <b>Components</b> tab below to add elements.
                </p>
              </div>
            ) : (
              activePage.elements.map((element) => (
                <RenderComponent
                  key={element.id}
                  element={element}
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
              ))
            )}
          </div>
        </div>
        <div className="phone-home-bar" />
      </div>
    </div>
  );
};
