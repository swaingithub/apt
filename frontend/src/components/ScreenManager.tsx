import React from 'react';
import styled from 'styled-components';
import { Plus, Trash2, Edit, Layers } from 'lucide-react';
import { Screen } from '../types';

const ScreenManagerContainer = styled.div`
  width: 280px;
  height: 100%;
  background: #f8f9fa;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
`;

const ScreenManagerHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ScreenManagerTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const AddScreenButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #4F46E5;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #3b3b9f;
  }
`;

const ScreenList = styled.div`
  flex: 1;
  padding: 12px;
  overflow-y: auto;
`;

const ScreenItem = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: ${props => props.active ? '#e8e8ff' : 'white'};
  border: 2px solid ${props => props.active ? '#4F46E5' : '#e0e0e0'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #4F46E5;
  }
`;

const ScreenIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: #4F46E5;
`;

const ScreenInfo = styled.div`
  flex: 1;
`;

const ScreenName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

const ScreenId = styled.div`
  font-size: 11px;
  color: #999;
  margin-top: 2px;
`;

const ScreenActions = styled.div`
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  
  ${ScreenItem}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: #f5f5f5;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #e0e0e0;
    color: #333;
  }
`;

const DeleteButton = styled(ActionButton)`
  &:hover {
    background: #fee2e2;
    color: #dc2626;
  }
`;

interface ScreenManagerProps {
  screens: Screen[];
  activeScreen: string | null;
  onScreenSelect: (screenId: string) => void;
  onScreenAdd: () => void;
  onScreenDelete: (screenId: string) => void;
  onScreenRename: (screenId: string, name: string) => void;
}

const ScreenManager: React.FC<ScreenManagerProps> = ({
  screens,
  activeScreen,
  onScreenSelect,
  onScreenAdd,
  onScreenDelete,
  onScreenRename,
}) => {
  return (
    <ScreenManagerContainer>
      <ScreenManagerHeader>
        <ScreenManagerTitle>Screens</ScreenManagerTitle>
        <AddScreenButton onClick={onScreenAdd}>
          <Plus size={16} />
        </AddScreenButton>
      </ScreenManagerHeader>
      <ScreenList>
        {screens.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '24px' }}>
            <Layers size={32} style={{ marginBottom: '12px', color: '#ccc' }} />
            <p style={{ margin: 0, fontSize: '13px' }}>
              No screens yet. Click + to add one.
            </p>
          </div>
        ) : (
          screens.map(screen => (
            <ScreenItem
              key={screen.id}
              active={activeScreen === screen.id}
              onClick={() => onScreenSelect(screen.id)}
            >
              <ScreenIcon>
                <Layers size={16} />
              </ScreenIcon>
              <ScreenInfo>
                <ScreenName>{screen.name}</ScreenName>
                <ScreenId>{screen.id}</ScreenId>
              </ScreenInfo>
              <ScreenActions>
                <ActionButton onClick={(e) => {
                  e.stopPropagation();
                  const newName = prompt('Enter screen name:', screen.name);
                  if (newName) onScreenRename(screen.id, newName);
                }}>
                  <Edit size={12} />
                </ActionButton>
                <DeleteButton onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this screen?')) {
                    onScreenDelete(screen.id);
                  }
                }}>
                  <Trash2 size={12} />
                </DeleteButton>
              </ScreenActions>
            </ScreenItem>
          ))
        )}
      </ScreenList>
    </ScreenManagerContainer>
  );
};

export default ScreenManager;
