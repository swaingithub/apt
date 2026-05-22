import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Component, Project, Screen } from '../types';

interface BuilderState {
  project: Project | null;
  screens: Screen[];
  currentScreen: Screen | null;
  selectedComponent: string | null;
  components: Component[];
  isPreviewMode: boolean;
}

const initialState: BuilderState = {
  project: null,
  screens: [],
  currentScreen: null,
  selectedComponent: null,
  components: [],
  isPreviewMode: false,
};

const builderSlice = createSlice({
  name: 'builder',
  initialState,
  reducers: {
    setProject: (state, action: PayloadAction<Project>) => {
      state.project = action.payload;
      state.screens = action.payload.screens;
    },
    setScreens: (state, action: PayloadAction<Screen[]>) => {
      state.screens = action.payload;
    },
    setCurrentScreen: (state, action: PayloadAction<Screen>) => {
      state.currentScreen = action.payload;
      state.components = action.payload.components;
    },
    addScreen: (state, action: PayloadAction<Screen>) => {
      state.screens.push(action.payload);
    },
    updateScreen: (state, action: PayloadAction<Screen>) => {
      const index = state.screens.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.screens[index] = action.payload;
      }
    },
    deleteScreen: (state, action: PayloadAction<string>) => {
      state.screens = state.screens.filter(s => s.id !== action.payload);
      if (state.currentScreen?.id === action.payload) {
        state.currentScreen = null;
        state.components = [];
      }
    },
    setSelectedComponent: (state, action: PayloadAction<string | null>) => {
      state.selectedComponent = action.payload;
    },
    setComponents: (state, action: PayloadAction<Component[]>) => {
      state.components = action.payload;
    },
    addComponent: (state, action: PayloadAction<Component>) => {
      state.components.push(action.payload);
    },
    updateComponent: (state, action: PayloadAction<Component>) => {
      const index = state.components.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.components[index] = action.payload;
      }
    },
    deleteComponent: (state, action: PayloadAction<string>) => {
      state.components = state.components.filter(c => c.id !== action.payload);
      if (state.selectedComponent === action.payload) {
        state.selectedComponent = null;
      }
    },
    togglePreviewMode: (state) => {
      state.isPreviewMode = !state.isPreviewMode;
    },
    resetBuilder: () => initialState,
  },
});

export const {
  setProject,
  setScreens,
  setCurrentScreen,
  addScreen,
  updateScreen,
  deleteScreen,
  setSelectedComponent,
  setComponents,
  addComponent,
  updateComponent,
  deleteComponent,
  togglePreviewMode,
  resetBuilder,
} = builderSlice.actions;

export const store = configureStore({
  reducer: {
    builder: builderSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
