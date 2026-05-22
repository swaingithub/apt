import React from 'react';
import styled from 'styled-components';
import { useDrag } from 'react-dnd';
import { ComponentTemplate } from '../types';
import {
  Layout, Type, Image as ImageIcon,
  Navigation, Square,
  List, Layers, Smartphone,
  ToggleLeft, CheckSquare, Sliders,
  Globe, Map
} from 'lucide-react';

const LibraryContainer = styled.div`
  width: 280px;
  height: 100%;
  background: #f8f9fa;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
`;

const LibraryHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
`;

const LibraryTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const CategorySection = styled.div`
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
`;

const CategoryTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ComponentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const DraggableComponent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
  
  &:hover {
    border-color: #4F46E5;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.1);
  }
  
  &:active {
    cursor: grabbing;
  }
`;

const ComponentIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  color: #4F46E5;
`;

const ComponentName = styled.span`
  font-size: 11px;
  color: #333;
  text-align: center;
  font-weight: 500;
`;

const componentTemplates: ComponentTemplate[] = [
  // Layout Components
  {
    id: 'container',
    name: 'Container',
    category: 'Layout',
    icon: 'Layout',
    defaultComponent: {
      id: '',
      type: 'Container',
      props: {},
      children: [],
      styles: {
        padding: 16,
        backgroundColor: '#ffffff',
        borderRadius: 8,
      },
    },
    defaultProps: {},
  },
  {
    id: 'scroll-view',
    name: 'Scroll View',
    category: 'Layout',
    icon: 'Layers',
    defaultComponent: {
      id: '',
      type: 'ScrollView',
      props: {},
      children: [],
      styles: {
        flex: 1,
      },
    },
    defaultProps: {},
  },
  {
    id: 'stack',
    name: 'Stack',
    category: 'Layout',
    icon: 'Layers',
    defaultComponent: {
      id: '',
      type: 'Container',
      props: {},
      children: [],
      styles: {
        flexDirection: 'column',
        gap: 8,
      },
    },
    defaultProps: {},
  },
  
  // Display Components
  {
    id: 'text',
    name: 'Text',
    category: 'Display',
    icon: 'Type',
    defaultComponent: {
      id: '',
      type: 'Text',
      props: {
        text: 'Hello World',
      },
      children: [],
      styles: {
        fontSize: 16,
        color: '#333333',
      },
    },
    defaultProps: {
      text: 'Hello World',
    },
  },
  {
    id: 'button',
    name: 'Button',
    category: 'Display',
    icon: 'Smartphone',
    defaultComponent: {
      id: '',
      type: 'Button',
      props: {
        title: 'Click Me',
      },
      children: [],
      styles: {
        backgroundColor: '#4F46E5',
        color: '#ffffff',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        fontWeight: '600',
      },
    },
    defaultProps: {
      title: 'Click Me',
    },
  },
  {
    id: 'image',
    name: 'Image',
    category: 'Display',
    icon: 'ImageIcon',
    defaultComponent: {
      id: '',
      type: 'Image',
      props: {
        source: 'https://via.placeholder.com/300x200',
      },
      children: [],
      styles: {
        width: '100%',
        height: 200,
        borderRadius: 8,
      },
    },
    defaultProps: {
      source: 'https://via.placeholder.com/300x200',
    },
  },
  {
    id: 'card',
    name: 'Card',
    category: 'Display',
    icon: 'Layout',
    defaultComponent: {
      id: '',
      type: 'Container',
      props: {},
      children: [],
      styles: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    },
    defaultProps: {},
  },
  
  // Input Components
  {
    id: 'text-input',
    name: 'Text Input',
    category: 'Input',
    icon: 'InputIcon',
    defaultComponent: {
      id: '',
      type: 'TextInput',
      props: {
        placeholder: 'Enter text...',
      },
      children: [],
      styles: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        fontSize: 16,
      },
    },
    defaultProps: {
      placeholder: 'Enter text...',
    },
  },
  {
    id: 'switch',
    name: 'Switch',
    category: 'Input',
    icon: 'ToggleLeft',
    defaultComponent: {
      id: '',
      type: 'Switch',
      props: {
        value: false,
      },
      children: [],
      styles: {},
    },
    defaultProps: {
      value: false,
    },
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    category: 'Input',
    icon: 'CheckSquare',
    defaultComponent: {
      id: '',
      type: 'Checkbox',
      props: {
        label: 'Check me',
        checked: false,
      },
      children: [],
      styles: {},
    },
    defaultProps: {
      label: 'Check me',
      checked: false,
    },
  },
  {
    id: 'slider',
    name: 'Slider',
    category: 'Input',
    icon: 'Sliders',
    defaultComponent: {
      id: '',
      type: 'Slider',
      props: {
        min: 0,
        max: 100,
        value: 50,
      },
      children: [],
      styles: {},
    },
    defaultProps: {
      min: 0,
      max: 100,
      value: 50,
    },
  },
  
  // Navigation Components
  {
    id: 'tab-bar',
    name: 'Tab Bar',
    category: 'Navigation',
    icon: 'Navigation',
    defaultComponent: {
      id: '',
      type: 'TabBar',
      props: {},
      children: [],
      styles: {
        height: 60,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
      },
    },
    defaultProps: {},
  },
  {
    id: 'nav-bar',
    name: 'Navigation Bar',
    category: 'Navigation',
    icon: 'Navigation',
    defaultComponent: {
      id: '',
      type: 'NavigationBar',
      props: {
        title: 'My App',
      },
      children: [],
      styles: {
        height: 56,
        backgroundColor: '#4F46E5',
        color: '#ffffff',
      },
    },
    defaultProps: {
      title: 'My App',
    },
  },
  
  // Advanced Components
  {
    id: 'web-view',
    name: 'Web View',
    category: 'Advanced',
    icon: 'Globe',
    defaultComponent: {
      id: '',
      type: 'WebView',
      props: {
        source: 'https://example.com',
      },
      children: [],
      styles: {
        flex: 1,
      },
    },
    defaultProps: {
      source: 'https://example.com',
    },
  },
  {
    id: 'map',
    name: 'Map',
    category: 'Advanced',
    icon: 'Map',
    defaultComponent: {
      id: '',
      type: 'Map',
      props: {},
      children: [],
      styles: {
        flex: 1,
        height: 300,
      },
    },
    defaultProps: {},
  },
];

const iconMap: Record<string, React.ElementType> = {
  Layout,
  Type,
  ImageIcon,
  Navigation,
  Square,
  List,
  Layers,
  Smartphone,
  ToggleLeft,
  CheckSquare,
  Sliders,
  Globe,
  Map,
};

const DraggableItem: React.FC<{ template: ComponentTemplate }> = ({ template }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'COMPONENT',
    item: template,
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const Icon = iconMap[template.icon] || Layout;

  return (
    <DraggableComponent ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <ComponentIcon>
        <Icon size={20} />
      </ComponentIcon>
      <ComponentName>{template.name}</ComponentName>
    </DraggableComponent>
  );
};

const ComponentLibrary: React.FC = () => {
  const categories = Array.from(new Set(componentTemplates.map(t => t.category)));

  return (
    <LibraryContainer>
      <LibraryHeader>
        <LibraryTitle>Components</LibraryTitle>
      </LibraryHeader>
      
      {categories.map(category => (
        <CategorySection key={category}>
          <CategoryTitle>{category}</CategoryTitle>
          <ComponentGrid>
            {componentTemplates
              .filter(t => t.category === category)
              .map(template => (
                <DraggableItem key={template.id} template={template} />
              ))}
          </ComponentGrid>
        </CategorySection>
      ))}
    </LibraryContainer>
  );
};

export default ComponentLibrary;
