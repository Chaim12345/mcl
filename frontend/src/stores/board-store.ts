import { create } from 'zustand';
import { Board } from '@/types';

interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  favoriteBoards: Board[];
  recentBoards: Board[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setBoards: (boards: Board[]) => void;
  setCurrentBoard: (board: Board | null) => void;
  setFavoriteBoards: (boards: Board[]) => void;
  setRecentBoards: (boards: Board[]) => void;
  addBoard: (board: Board) => void;
  updateBoard: (board: Board) => void;
  removeBoard: (boardId: string) => void;
  addFavorite: (board: Board) => void;
  removeFavorite: (boardId: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Item actions
  updateItem: (itemId: string, changes: any) => void;
  moveItem: (itemId: string, fromPosition: number, toPosition: number) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  boards: [],
  currentBoard: null,
  favoriteBoards: [],
  recentBoards: [],
  isLoading: false,
  error: null,
  
  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (board) => set({ currentBoard: board }),
  setFavoriteBoards: (boards) => set({ favoriteBoards: boards }),
  setRecentBoards: (boards) => set({ recentBoards: boards }),
  
  addBoard: (board) => 
    set((state) => ({ 
      boards: [...state.boards, board] 
    })),
    
  updateBoard: (board) => 
    set((state) => ({ 
      boards: state.boards.map(b => 
        b.id === board.id ? board : b
      ),
      currentBoard: state.currentBoard?.id === board.id 
        ? board 
        : state.currentBoard,
      favoriteBoards: state.favoriteBoards.map(b => 
        b.id === board.id ? board : b
      ),
      recentBoards: state.recentBoards.map(b => 
        b.id === board.id ? board : b
      ),
    })),
    
  removeBoard: (boardId) => 
    set((state) => ({ 
      boards: state.boards.filter(b => b.id !== boardId),
      currentBoard: state.currentBoard?.id === boardId 
        ? null 
        : state.currentBoard,
      favoriteBoards: state.favoriteBoards.filter(b => b.id !== boardId),
      recentBoards: state.recentBoards.filter(b => b.id !== boardId),
    })),
    
  addFavorite: (board) =>
    set((state) => ({
      favoriteBoards: [...state.favoriteBoards, board]
    })),
    
  removeFavorite: (boardId) =>
    set((state) => ({
      favoriteBoards: state.favoriteBoards.filter(b => b.id !== boardId)
    })),
    
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // Item actions
  updateItem: (itemId, changes) => set((state) => {
    if (!state.currentBoard) return state;
    
    const updatedItems = state.currentBoard.items?.map(item => 
      item.id === itemId ? { ...item, ...changes } : item
    ) || [];
    
    return {
      currentBoard: {
        ...state.currentBoard,
        items: updatedItems
      }
    };
  }),
  
  moveItem: (itemId, fromPosition, toPosition) => set((state) => {
    if (!state.currentBoard || !state.currentBoard.items) return state;
    
    const items = [...state.currentBoard.items];
    const itemToMove = items.find(item => item.id === itemId);
    
    if (!itemToMove) return state;
    
    // Remove the item from its current position
    const newItems = items.filter(item => item.id !== itemId);
    
    // Insert the item at the new position
    newItems.splice(toPosition, 0, itemToMove);
    
    return {
      currentBoard: {
        ...state.currentBoard,
        items: newItems
      }
    };
  }),
}));