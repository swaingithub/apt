import React from 'react';
import styled from 'styled-components';
import { Component, ComponentStyles } from '../types';
import { Settings, X } from 'lucide-react';

const EditorContainer = styled.div`
  width: 320px;
  height: 100%;
  background: white;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
`;

const EditorHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const EditorTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: #f5f5f5;
  }
`;

const EditorContent = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PropertyRow = styled.div`
  margin-bottom: 12px;
`;

const PropertyLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #333;
`;

const PropertyInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #4F46E5;
  }
`;

const PropertySelect = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #4F46E5;
  }
`;

const PropertyColor = styled.input`
  width: 100%;
  height: 40px;
  padding: 4px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
`;

const PropertySlider = styled.input`
  width: 100%;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  text-align: center;
  padding: 24px;
`;

const EmptyStateIcon = styled.div`
  margin-bottom: 12px;
  color: #ccc;
`;

const EmptyStateText = styled.p`
  margin: 0;
  font-size: 14px;
`;

interface PropertyEditorProps {
  component: Component | null;
  onComponentChange: (component: Component) => void;
  onClose: () => void;
}

const PropertyEditor: React.FC<PropertyEditorProps> = ({
  component,
  onComponentChange,
  onClose,
}) => {
  if (!component) {
    return (
      <EditorContainer>
        <EditorHeader>
          <EditorTitle>Properties</EditorTitle>
        </EditorHeader>
        <EmptyState>
          <EmptyStateIcon>
            <Settings size={48} />
          </EmptyStateIcon>
          <EmptyStateText>
            Select a component to edit its properties
          </EmptyStateText>
        </EmptyState>
      </EditorContainer>
    );
  }

  const handlePropChange = (key: string, value: any) => {
    onComponentChange({
      ...component,
      props: {
        ...component.props,
        [key]: value,
      },
    });
  };

  const handleStyleChange = (key: keyof ComponentStyles, value: any) => {
    onComponentChange({
      ...component,
      styles: {
        ...component.styles,
        [key]: value,
      },
    });
  };

  const renderPropEditor = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <PropertySelect
          value={value.toString()}
          onChange={(e) => handlePropChange(key, e.target.value === 'true')}
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </PropertySelect>
      );
    }

    if (typeof value === 'number') {
      return (
        <PropertySlider
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => handlePropChange(key, parseInt(e.target.value))}
        />
      );
    }

    if (key === 'source' || key === 'color' || key === 'backgroundColor') {
      return (
        <PropertyColor
          type="color"
          value={value}
          onChange={(e) => handlePropChange(key, e.target.value)}
        />
      );
    }

    return (
      <PropertyInput
        type="text"
        value={value}
        onChange={(e) => handlePropChange(key, e.target.value)}
      />
    );
  };

  const renderStyleEditor = (key: keyof ComponentStyles, value: any) => {
    if (key === 'backgroundColor' || key === 'color' || key === 'borderColor') {
      return (
        <PropertyColor
          type="color"
          value={value || '#000000'}
          onChange={(e) => handleStyleChange(key, e.target.value)}
        />
      );
    }

    if (typeof value === 'number') {
      return (
        <PropertyInput
          type="number"
          value={value}
          onChange={(e) => handleStyleChange(key, parseInt(e.target.value))}
        />
      );
    }

    if (key === 'flexDirection' || key === 'justifyContent' || key === 'alignItems' || key === 'position') {
      const options = {
        flexDirection: ['row', 'column'],
        justifyContent: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around'],
        alignItems: ['flex-start', 'flex-end', 'center', 'stretch'],
        position: ['relative', 'absolute'],
      };

      return (
        <PropertySelect
          value={value || ''}
          onChange={(e) => handleStyleChange(key, e.target.value)}
        >
          <option value="">Select...</option>
          {(options[key as keyof typeof options] || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </PropertySelect>
      );
    }

    return (
      <PropertyInput
        type="text"
        value={value || ''}
        onChange={(e) => handleStyleChange(key, e.target.value)}
      />
    );
  };

  return (
    <EditorContainer>
      <EditorHeader>
        <EditorTitle>Properties - {component.type}</EditorTitle>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>
      </EditorHeader>
      <EditorContent>
        <Section>
          <SectionTitle>Component Properties</SectionTitle>
          {Object.entries(component.props).map(([key, value]) => (
            <PropertyRow key={key}>
              <PropertyLabel>{key}</PropertyLabel>
              {renderPropEditor(key, value)}
            </PropertyRow>
          ))}
        </Section>

        <Section>
          <SectionTitle>Styles</SectionTitle>
          {Object.entries(component.styles).map(([key, value]) => (
            <PropertyRow key={key}>
              <PropertyLabel>{key}</PropertyLabel>
              {renderStyleEditor(key as keyof ComponentStyles, value)}
            </PropertyRow>
          ))}
        </Section>
      </EditorContent>
    </EditorContainer>
  );
};

export default PropertyEditor;
