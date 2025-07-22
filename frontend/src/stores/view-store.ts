import { create } from 'zustand';
import { ViewDefinition, FilterGroup, SortDefinition } from '@/types/filter';

interface ViewState {
  views: ViewDefinition[];
  currentView: ViewDefinition | null;
  defaultView: ViewDefinition | null;
  isViewModalOpen: boolean;
  
  // Actions
  setViews: (views: ViewDefinition[]) => void;
  setCurrentView: (view: ViewDefinition | null) => void;
  setDefaultView: (view: ViewDefinition | null) => void;
  addView: (view: ViewDefinition) => void;
  updateView: (view: ViewDefinition) => void;
  removeView: (viewId: string) => void;
  setIsViewModalOpen: (isOpen: boolean) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  views: [],
  currentView: null,
  defaultView: null,
  isViewModalOpen: false,
  
  setViews: (views) => set({ views }),
  
  setCurrentView: (view) => set({ currentView: view }),
  
  setDefaultView: (view) => set({ defaultView: view }),
  
  addView: (view) => set((state) => ({ 
    views: [...state.views, view] 
  })),
  
  updateView: (view) => set((state) => ({ 
    views: state.views.map(v => v.id === view.id ? view : v),
    currentView: state.currentView?.id === view.id ? view : state.currentView,
    defaultView: state.defaultView?.id === view.id ? view : state.defaultView,
  })),
  
  removeView: (viewId) => set((state) => ({ 
    views: state.views.filter(v => v.id !== viewId),
    currentView: state.currentView?.id === viewId ? null : state.currentView,
    defaultView: state.defaultView?.id === viewId ? null : state.defaultView,
  })),
  
  setIsViewModalOpen: (isOpen) => set({ isViewModalOpen: isOpen }),
}));