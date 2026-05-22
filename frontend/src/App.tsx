import React from 'react';
import styled from 'styled-components';
import { Provider } from 'react-redux';
import { store } from './store';
import ComponentLibrary from './components/ComponentLibrary';
import BuilderCanvas from './components/BuilderCanvas';
import PropertyEditor from './components/PropertyEditor';
import PreviewPanel from './components/PreviewPanel';
import ScreenManager from './components/ScreenManager';
import { Component, Screen } from './types';
import { 
  setComponents, 
  setSelectedComponent, 
  updateComponent,
  addScreen,
  setCurrentScreen,
  deleteScreen,
  updateScreen
} from './store';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store';
import { v4 as uuidv4 } from 'uuid';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
`;

const AppHeader = styled.header`
  height: 60px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LogoIcon = styled.div`
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
`;

const LogoText = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #333;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const HeaderButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  transition: all 0.2s;
  
  &:hover {
    background: #f5f5f5;
    border-color: #4F46E5;
  }
`;

const PrimaryButton = styled(HeaderButton)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  
  &:hover {
    background: linear-gradient(135deg, #5568d3 0%, #653a91 100%);
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const BuilderArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const PreviewArea = styled.div`
  width: 400px;
  background: #1a1a1a;
`;

const BuilderContent: React.FC = () => {
  const dispatch = useDispatch();
  const screens = useSelector((state: RootState) => state.builder.screens);
  const currentScreen = useSelector((state: RootState) => state.builder.currentScreen);
  const components = useSelector((state: RootState) => state.builder.components);
  const selectedComponent = useSelector((state: RootState) => state.builder.selectedComponent);

  const handleComponentsChange = (newComponents: Component[]) => {
    dispatch(setComponents(newComponents));
    };

  const handleSelectComponent = (id: string | null) => {
    dispatch(setSelectedComponent(id));
  };

  const handleComponentChange = (component: Component) => {
    dispatch(updateComponent(component));
  };

  const handleScreenSelect = (screenId: string) => {
    const screen = screens.find(s => s.id === screenId);
    if (screen) {
      dispatch(setCurrentScreen(screen));
    }
  };

  const handleScreenAdd = () => {
    const newScreen: Screen = {
      id: uuidv4(),
      name: `Screen ${screens.length + 1}`,
      components: [],
      layout: { type: 'flex' },
      navigation: { type: 'stack' },
    };
    dispatch(addScreen(newScreen));
    dispatch(setCurrentScreen(newScreen));
  };

  const handleScreenDelete = (screenId: string) => {
    dispatch(deleteScreen(screenId));
  };

  const handleScreenRename = (screenId: string, name: string) => {
    const screen = screens.find(s => s.id === screenId);
    if (screen) {
      dispatch(updateScreen({ ...screen, name }));
    }
  };

  const selectedComponentData = components.find(c => c.id === selectedComponent);

  return (
    <>
      <ScreenManager
        screens={screens}
        activeScreen={currentScreen?.id || null}
        onScreenSelect={handleScreenSelect}
        onScreenAdd={handleScreenAdd}
        onScreenDelete={handleScreenDelete}
        onScreenRename={handleScreenRename}
      />
      <ComponentLibrary />
      <BuilderArea>
        <BuilderCanvas
          components={components}
          onComponentsChange={handleComponentsChange}
          selectedComponent={selectedComponent}
          onSelectComponent={handleSelectComponent}
        />
      </BuilderArea>
      <PropertyEditor
        component={selectedComponentData || null}
        onComponentChange={handleComponentChange}
        onClose={() => handleSelectComponent(null)}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContainer>
        <AppHeader>
          <Logo>
            <LogoIcon>A</LogoIcon>
            <LogoText>AppMake</LogoText>
          </Logo>
          <HeaderActions>
            <HeaderButton>Templates</HeaderButton>
            <HeaderButton>Save</HeaderButton>
            <PrimaryButton>Export</PrimaryButton>
          </HeaderActions>
        </AppHeader>
        <MainContent>
          <BuilderContent />
          <PreviewArea>
            <PreviewPanel components={useSelector((state: RootState) => state.builder.components)} />
          </PreviewArea>
        </MainContent>
      </AppContainer>
    </Provider>
  );
};

export default App;
