import React from 'react';
import styled from 'styled-components';
import { Smartphone, RotateCw } from 'lucide-react';
import { Component } from '../types';

const PreviewContainer = styled.div`
  width: 400px;
  height: 100%;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  padding: 24px;
`;

const PreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const PreviewTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
`;

const RotateButton = styled.button`
  background: #333;
  border: none;
  color: #fff;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  
  &:hover {
    background: #444;
  }
`;

const PhoneFrame = styled.div<{ landscape: boolean }>`
  width: ${props => props.landscape ? '600px' : '375px'};
  height: ${props => props.landscape ? '375px' : '667px'};
  background: #000;
  border-radius: ${props => props.landscape ? '24px' : '40px'};
  padding: ${props => props.landscape ? '12px' : '12px'};
  box-shadow: 0 0 0 2px #333, 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  transition: all 0.3s;
`;

const PhoneScreen = styled.div`
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 32px;
  overflow: hidden;
  position: relative;
`;

const StatusBar = styled.div`
  height: 44px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  color: #fff;
  font-size: 12px;
`;

const StatusBarTime = styled.span`
  font-weight: 600;
`;

const StatusBarIcons = styled.div`
  display: flex;
  gap: 6px;
`;

const ScreenContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`;

const RenderedComponent = styled.div<{ styles: any }>`
  ${props => props.styles};
  min-height: 20px;
`;

interface PreviewPanelProps {
  components: Component[];
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ components }) => {
  const [landscape, setLandscape] = React.useState(false);
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const renderComponent = (component: Component) => {
    const { type, props, styles, children } = component;

    const styleProps: any = {};
    Object.entries(styles || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        styleProps[key] = value;
      }
    });

    switch (type) {
      case 'Container':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            {children.map(renderComponent)}
          </RenderedComponent>
        );

      case 'Text':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            {props.text}
          </RenderedComponent>
        );

      case 'Button':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            {props.title}
          </RenderedComponent>
        );

      case 'Image':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            <img 
              src={props.source} 
              alt="Component" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </RenderedComponent>
        );

      case 'TextInput':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            <input 
              type="text" 
              placeholder={props.placeholder}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
              }}
            />
          </RenderedComponent>
        );

      case 'ScrollView':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            {children.map(renderComponent)}
          </RenderedComponent>
        );

      case 'Card':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            {children.map(renderComponent)}
          </RenderedComponent>
        );

      case 'Switch':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            <input type="checkbox" checked={props.value} readOnly />
          </RenderedComponent>
        );

      case 'Checkbox':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={props.checked} readOnly />
              {props.label}
            </label>
          </RenderedComponent>
        );

      case 'Slider':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            <input 
              type="range" 
              min={props.min} 
              max={props.max} 
              value={props.value}
              readOnly
            />
          </RenderedComponent>
        );

      case 'WebView':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            <iframe 
              src={props.source} 
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </RenderedComponent>
        );

      case 'Map':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: '#e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}>
              Map Component
            </div>
          </RenderedComponent>
        );

      case 'TabBar':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px' }}>
              <span>Tab 1</span>
              <span>Tab 2</span>
              <span>Tab 3</span>
            </div>
          </RenderedComponent>
        );

      case 'NavigationBar':
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            <div style={{ padding: '12px', textAlign: 'center' }}>
              {props.title}
            </div>
          </RenderedComponent>
        );

      default:
        return (
          <RenderedComponent key={component.id} styles={styleProps}>
            {type}
          </RenderedComponent>
        );
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <PreviewContainer>
      <PreviewHeader>
        <PreviewTitle>Live Preview</PreviewTitle>
        <RotateButton onClick={() => setLandscape(!landscape)}>
          <RotateCw size={16} />
        </RotateButton>
      </PreviewHeader>
      <PhoneFrame landscape={landscape}>
        <PhoneScreen>
          <StatusBar>
            <StatusBarTime>{formatTime(time)}</StatusBarTime>
            <StatusBarIcons>
              <span>📶</span>
              <span>🔋</span>
            </StatusBarIcons>
          </StatusBar>
          <ScreenContent>
            {components.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#999', 
                marginTop: '100px' 
              }}>
                <Smartphone size={48} style={{ marginBottom: '16px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Preview will appear here
                </p>
              </div>
            ) : (
              components.map(renderComponent)
            )}
          </ScreenContent>
        </PhoneScreen>
      </PhoneFrame>
    </PreviewContainer>
  );
};

export default PreviewPanel;
