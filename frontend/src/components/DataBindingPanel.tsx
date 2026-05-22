import React from 'react';
import styled from 'styled-components';
import { Database, Link2, Trash2, Plus } from 'lucide-react';
import { DataBinding } from '../types';

const DataBindingPanelContainer = styled.div`
  width: 320px;
  height: 100%;
  background: white;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const PanelContent = styled.div`
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

const BindingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 8px;
`;

const BindingProperty = styled.span`
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #333;
`;

const BindingSource = styled.span`
  flex: 1;
  font-size: 12px;
  color: #666;
  font-family: monospace;
`;

const RemoveButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #fecaca;
  }
`;

const AddButton = styled.button`
  width: 100%;
  padding: 8px;
  border: 1px dashed #e0e0e0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
  
  &:hover {
    border-color: #4F46E5;
    color: #4F46E5;
  }
`;

const DataSourceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DataSourceItem = styled.div`
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #e8e8ff;
  }
`;

const DataSourceName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

const DataSourceType = styled.div`
  font-size: 11px;
  color: #666;
  margin-top: 4px;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #999;
  padding: 24px;
`;

interface DataBindingPanelProps {
  bindings: DataBinding[];
  onBindingsChange: (bindings: DataBinding[]) => void;
}

const DataBindingPanel: React.FC<DataBindingPanelProps> = ({
  bindings,
  onBindingsChange,
}) => {
  const dataSources = [
    { id: 'user', name: 'User Data', type: 'object' },
    { id: 'products', name: 'Products', type: 'array' },
    { id: 'settings', name: 'App Settings', type: 'object' },
    { id: 'api', name: 'API Response', type: 'dynamic' },
  ];

  const handleAddBinding = () => {
    const newBinding: DataBinding = {
      property: '',
      source: '',
      transform: '',
    };
    onBindingsChange([...bindings, newBinding]);
  };

  const handleRemoveBinding = (index: number) => {
    onBindingsChange(bindings.filter((_, i) => i !== index));
  };

  return (
    <DataBindingPanelContainer>
      <PanelHeader>
        <PanelTitle>Data Binding</PanelTitle>
      </PanelHeader>
      <PanelContent>
        <Section>
          <SectionTitle>Data Sources</SectionTitle>
          <DataSourceList>
            {dataSources.map(source => (
              <DataSourceItem key={source.id}>
                <DataSourceName>{source.name}</DataSourceName>
                <DataSourceType>{source.type}</DataSourceType>
              </DataSourceItem>
            ))}
          </DataSourceList>
        </Section>

        <Section>
          <SectionTitle>Active Bindings</SectionTitle>
          {bindings.length === 0 ? (
            <EmptyState>
              <Database size={32} style={{ marginBottom: '12px', color: '#ccc' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>
                No data bindings yet
              </p>
            </EmptyState>
          ) : (
            bindings.map((binding, index) => (
              <BindingRow key={index}>
                <Link2 size={16} style={{ color: '#4F46E5' }} />
                <BindingProperty>{binding.property}</BindingProperty>
                <BindingSource>{binding.source}</BindingSource>
                <RemoveButton onClick={() => handleRemoveBinding(index)}>
                  <Trash2 size={12} />
                </RemoveButton>
              </BindingRow>
            ))
          )}
          <AddButton onClick={handleAddBinding}>
            <Plus size={16} />
            Add Binding
          </AddButton>
        </Section>

        <Section>
          <SectionTitle>Quick Actions</SectionTitle>
          <DataSourceList>
            <DataSourceItem>
              <DataSourceName>Bind to API</DataSourceName>
              <DataSourceType>Connect to REST API</DataSourceType>
            </DataSourceItem>
            <DataSourceItem>
              <DataSourceName>Local Storage</DataSourceName>
              <DataSourceType>Persist data locally</DataSourceType>
            </DataSourceItem>
            <DataSourceItem>
              <DataSourceName>State Management</DataSourceName>
              <DataSourceType>Global app state</DataSourceType>
            </DataSourceItem>
          </DataSourceList>
        </Section>
      </PanelContent>
    </DataBindingPanelContainer>
  );
};

export default DataBindingPanel;
