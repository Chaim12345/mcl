// DnD item types
export const ItemTypes = {
  BOARD_ITEM: 'boardItem',
};

// DnD item interface
export interface DragItem {
  type: string;
  id: string;
  index: number;
  originalIndex: number;
  columnId?: string; // For status column drag and drop
}