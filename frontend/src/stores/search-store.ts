import { create } from 'zustand';
import { BoardItem } from '@/types';

interface SearchState {
  searchQuery: string;
  searchResults: BoardItem[];
  searchHistory: { query: string; count: number; lastSearched: string }[];
  suggestions: string[];
  isSearching: boolean;
  isSearchOpen: boolean;
  highlightedIndex: number;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: BoardItem[]) => void;
  setSearchHistory: (history: { query: string; count: number; lastSearched: string }[]) => void;
  setSuggestions: (suggestions: string[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  setIsSearchOpen: (isOpen: boolean) => void;
  setHighlightedIndex: (index: number) => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchQuery: '',
  searchResults: [],
  searchHistory: [],
  suggestions: [],
  isSearching: false,
  isSearchOpen: false,
  highlightedIndex: -1,
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setSearchResults: (results) => set({ searchResults: results }),
  
  setSearchHistory: (history) => set({ searchHistory: history }),
  
  setSuggestions: (suggestions) => set({ suggestions }),
  
  setIsSearching: (isSearching) => set({ isSearching }),
  
  setIsSearchOpen: (isOpen) => set({ 
    isSearchOpen: isOpen,
    // Reset highlighted index when closing search
    highlightedIndex: isOpen ? -1 : -1,
  }),
  
  setHighlightedIndex: (index) => set({ highlightedIndex: index }),
  
  clearSearch: () => set({ 
    searchQuery: '',
    searchResults: [],
    highlightedIndex: -1,
  }),
}));