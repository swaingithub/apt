import React from 'react';
import styled from 'styled-components';
import { useDrop } from 'react-dnd';
import { Component, ComponentTemplate } from '../types';
import { Plus, Trash2, Copy } from 'lucide-react';

const CanvasContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: hidden;
`;

const CanvasHeader = styled.div`
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CanvasTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
`;

const CanvasContent = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
`;

const DropZone = styled.div<{ isOver: boolean }>`
  min-height: 400px;
  background: white;
  border: 2px dashed ${props => props.isOver ? '#4F46E5' : '#e0e0e0'};
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  text-align: center;
`;

const EmptyStateIcon = styled.div`
  margin-bottom: 16px;
  color: #ccc;
`;

const EmptyStateText = styled.p`
  margin: 0;
  font-size: 14px;
`;

const ComponentWrapper = styled.div<{ selected: boolean }>`
  position: relative;
  border: 2px solid ${props => props.selected ? '#4F46E5' : 'transparent'};
  border-radius: 8px;
  padding: 8px;
  transition: all 0.2s;
  
  &:hover {
    border-color: #4F46E5;
  }
`;

const ComponentActions = styled.div`
  position: absolute;
  top: -12px;
  right: -12px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  
  ${ComponentWrapper}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #4F46E5;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  
  &:hover {
    background: #3b3b9f;
  }
`;

const ComponentLabel = styled.div`
  position: absolute;
  top: -24px;
  left: 8px;
  font-size: 11px;
  color: #666;
  background: white;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
`;

const RenderedComponent = styled.div`
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
`;

interface BuilderCanvasProps {
  components: Component[];
  onComponentsChange: (components: Component[]) => void;
  selectedComponent: string | null;
  onSelectComponent: (id: string | null) => void;
}

const BuilderCanvas: React.FC<BuilderCanvasProps> = ({
  components,
  onComponentsChange,
  selectedComponent,
  onSelectComponent,
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'COMPONENT',
    drop: (item: ComponentTemplate) => {
      const newComponent: Component = {
        ...item.defaultComponent,
        id: `component-${Date.now()}`,
      };
      onComponentsChange([...components, newComponent]);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const handleDeleteComponent = (id: string) => {
    onComponentsChange(components.filter(c => c.id !== id));
    if (selectedComponent === id) {
      onSelectComponent(null);
    }
  };

  const handleDuplicateComponent = (component: Component) => {
    const newComponent: Component = {
      ...component,
      id: `component-${Date.now()}`,
    };
    onComponentsChange([...components, newComponent]);
  };

  const renderComponent = (component: Component) => {
    const isSelected = selectedComponent === component.id;

    return (
      <ComponentWrapper
        key={component.id}
        selected={isSelected}
        onClick={() => onSelectComponent(component.id)}
      >
        <ComponentLabel>{component.type}</ComponentLabel>
        <ComponentActions>
          <ActionButton onClick={(e) => {
            e.stopPropagation();
            handleDuplicateComponent(component);
          }}>
            <Copy size={12} />
          </ActionButton>
          <ActionButton onClick={(e) => {
            e.stopPropagation();
            handleDeleteComponent(component.id);
          }}>
            <Trash2 size={12} />
          </ActionButton>
        </ComponentActions>
        <RenderedComponent>
          {component.type === 'Text' && component.props.text}
          {component.type === 'Button' && component.props.title}
          {component.type === 'Container' && 'Container'}
          {component.type === 'Image' && 'Image'}
          {component.type === 'TextInput' && component.props.placeholder}
          {component.type === 'ScrollView' && 'Scroll View'}
          {component.type === 'TabBar' && 'Tab Bar'}
          {component.type === 'NavigationBar' && component.props.title}
          {component.type === 'Card' && 'Card'}
          {component.type === 'Switch' && 'Switch'}
          {component.type === 'Checkbox' && component.props.label}
          {component.type === 'Slider' && 'Slider'}
          {component.type === 'WebView' && 'Web View'}
          {component.type === 'Map' && 'Map'}
        </RenderedComponent>
      </ComponentWrapper>
    );
  };

  return (
    <CanvasContainer>
      <CanvasHeader>
        <CanvasTitle>Builder Canvas</CanvasTitle>
      </CanvasHeader>
      <CanvasContent>
        <DropZone ref={drop} isOver={isOver}>
          {components.length === 0 ? (
            <EmptyState>
              <EmptyStateIcon>
                <Plus size={48} />
              </EmptyStateIcon>
              <EmptyStateText>
                Drag components from the library to start building your app
              </EmptyStateText>
            </EmptyState>
          ) : (
            components.map(renderComponent)
          )}
        </DropZone>
      </CanvasContent>
    </CanvasContainer>
  );
};

export default BuilderCanvas;
